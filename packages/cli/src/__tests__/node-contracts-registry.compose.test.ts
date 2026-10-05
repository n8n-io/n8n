import type { GlobalConfig } from '@n8n/config';
import { versionsOf } from '@n8n/nodes-base-next';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import type { INodeProperties, INodeTypeDescription, IVersionedNodeType } from 'n8n-workflow';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { LoadNodesAndCredentials } from '../load-nodes-and-credentials';
import { NodeTypes } from '../node-types';
import { ContractNodeLoader } from '../node-contracts-registry';

const PACKAGES = path.resolve(__dirname, '../../..');
const NOTION = 'n8n-nodes-base.notion';

async function postProcessed(nodeContractsEnabled: boolean, excludeContractNodes: string[] = []) {
	const globalConfig = mock<GlobalConfig>({
		instanceAi: { nodeContractsEnabled },
		nodes: { exclude: [], include: [] },
	});
	const instance = new LoadNodesAndCredentials(
		mock(),
		mock(),
		mock(),
		globalConfig,
		mock(),
		mock(),
	);
	const nodesBase = new LazyPackageDirectoryLoader(path.join(PACKAGES, 'nodes-base'));
	const legacyLoaders = { 'n8n-nodes-base': nodesBase };
	await nodesBase.loadAll();
	// As in production, n8n builds no contract loader when node contracts are off.
	if (nodeContractsEnabled) {
		const next = new ContractNodeLoader(
			excludeContractNodes,
			[],
			async () => ({ versions: async () => new Map(), credentials: async () => new Map() }),
			[],
			undefined,
			() => legacyLoaders,
		);
		await next.loadAll();
		instance.loaders = { ...legacyLoaders, '@n8n/nodes-base-next': next };
	} else {
		instance.loaders = legacyLoaders;
	}
	await instance.postProcessLoaders();
	return instance;
}

const versionOf = ({ version }: INodeTypeDescription) => [version].flat().join(',');

/** The actions the nodes panel lists: each operation option shown for each resource option. */
function panelActions({ properties }: INodeTypeDescription) {
	const resource = properties.find(({ name }) => name === 'resource');
	const resources = (resource?.options ?? []).flatMap((option) =>
		'value' in option ? [String(option.value)] : [],
	);
	const shownFor = (value: string) => (property: INodeProperties) =>
		property.name === 'operation' && property.displayOptions?.show?.resource?.includes(value);
	return resources.flatMap((value) =>
		properties
			.filter(shownFor(value))
			.flatMap(({ options }) => options ?? [])
			.flatMap((option) =>
				'value' in option ? [`${value}.${String(option.value)}: ${option.action}`] : [],
			),
	);
}

describe('composeContractNodes', () => {
	it('serves Notion v4 as the default version in the types and in the node class', async () => {
		const instance = await postProcessed(true);
		const notion = instance.types.nodes.filter(({ name }) => name === NOTION);

		expect(notion.map(versionOf)).toEqual(['2,2.1,2.2', '3', '1', '4']);
		expect(notion.map(({ defaultVersion }) => defaultVersion)).toEqual([4, 4, 4, 4]);
		const v4 = notion.find((description) => description.version === 4);
		expect(v4).toMatchObject({ displayName: 'Notion', codex: expect.anything() });
		expect(panelActions(v4!)).toContain('databasePage.getAll: Get many database pages');
		expect(panelActions(v4!)).toContain('databasePage.create: Create a database page');
		// The latest version gets the Custom API Call option, as v3 did before.
		expect(panelActions(v4!)).toContain('databasePage.__CUSTOM_API_CALL__: undefined');

		const loaded = instance.getNode(NOTION).type as IVersionedNodeType;
		expect(loaded.description.defaultVersion).toBe(4);
		expect(loaded.getNodeType(4).description.properties.map(({ name }) => name)).toEqual(
			expect.arrayContaining(['database', 'where', 'limit', 'sort']),
		);
		expect(loaded.getNodeType(3)).toBe(
			(instance.loaders['n8n-nodes-base'].getNode('notion').type as IVersionedNodeType).getNodeType(
				3,
			),
		);
	});

	it('hides the node type of each single action from the nodes panel', async () => {
		const instance = await postProcessed(true);
		const next = instance.types.nodes.filter(({ name }) =>
			name.startsWith('@n8n/nodes-base-next.'),
		);
		expect(next.length).toBeGreaterThan(0);
		expect(next.every(({ hidden }) => hidden === true)).toBe(true);
		expect(instance.getNode('@n8n/nodes-base-next.notionDatabasePageGetAll').type).toBeDefined();
	});

	it('adds an agent tool node type for each tool action, which supplies its tool', async () => {
		const instance = await postProcessed(true);
		const tool = '@n8n/nodes-base-next.httpRequestGetTool';
		const description = instance.types.nodes.find(({ name }) => name === tool);

		expect(description).toMatchObject({ outputs: ['ai_tool'], inputs: [], hidden: true });
		expect(description?.properties.map(({ name }) => name)).toContain('toolDescription');
		expect(instance.types.nodes.some(({ name }) => name.endsWith('httpRequestDownloadTool'))).toBe(
			false,
		);
		expect(instance.recognizesNode(tool)).toBe(true);
		const nodeTypes = new NodeTypes(mock(), instance);
		const [head] = versionsOf('httpRequest.get');
		const version = head?.manifest.contract.version;
		const resolved = nodeTypes.getByNameAndVersion(tool, version);
		expect(resolved.description).toMatchObject({ name: tool, outputs: ['ai_tool'] });
		expect(typeof resolved.supplyData).toBe('function');
		// An agent that has the engine run its tool calls runs the node.
		expect(typeof resolved.execute).toBe('function');
		expect(nodeTypes.getSupportedVersions(tool)).toEqual([version]);
	});

	it('shows the icon, codex and color of the legacy node that a contract node stands for', async () => {
		const instance = await postProcessed(true);
		const typeOf = (name: string) => instance.types.nodes.find((type) => type.name === name);
		const legacyOf = (name: string) =>
			instance.types.nodes.find(
				(type) =>
					type.name === name &&
					!type.hidden &&
					[type.version].flat().includes(type.defaultVersion ?? -1),
			);
		const pairs = [
			['slackMessageSend', 'slack', 'Send a message'],
			['notionDatabasePageGetAll', 'notion', 'Get many database pages'],
			['itemsSet', 'set', 'Edit fields'],
			['httpRequestGet', 'httpRequest', 'GET a URL'],
		] as const;

		for (const [contract, legacy, action] of pairs) {
			const type = typeOf(`@n8n/nodes-base-next.${contract}`);
			const twin = legacyOf(`n8n-nodes-base.${legacy}`);
			expect(twin?.codex?.categories?.length).toBeGreaterThan(0);
			expect(type).toMatchObject({
				subtitle: action,
				defaults: { name: action, ...(twin?.defaults.color && { color: twin.defaults.color }) },
				codex: { categories: twin?.codex?.categories },
			});
			expect([type?.icon, type?.iconUrl, type?.iconColor]).toEqual([
				twin?.icon,
				twin?.iconUrl,
				twin?.iconColor,
			]);
			expect(type?.codex?.alias).toBeUndefined();
			const loaded = instance.getNode(`@n8n/nodes-base-next.${contract}`)
				.type as IVersionedNodeType;
			const { icon, iconUrl, codex } = loaded.getNodeType().description;
			expect([icon, iconUrl, codex]).toEqual([type?.icon, type?.iconUrl, type?.codex]);
		}
		expect(typeOf('@n8n/nodes-base-next.slackMessageSend')?.iconUrl).toBe(
			'icons/n8n-nodes-base/dist/nodes/Slack/slack.svg',
		);
		const tool = '@n8n/nodes-base-next.httpRequestGetTool';
		const nodeTypes = new NodeTypes(mock(), instance);
		expect([typeOf(tool)?.icon, nodeTypes.getByNameAndVersion(tool).description.icon]).toEqual([
			'node:http-request',
			'node:http-request',
		]);
	});

	it('shows the icon of the node definition, or no icon, for a contract node without a legacy node', async () => {
		const instance = await postProcessed(true);
		const typeOf = (name: string) => instance.types.nodes.find((type) => type.name === name);

		expect(typeOf('@n8n/nodes-base-next.aiPrompt')).toMatchObject({
			icon: 'node:basic-llm-chain',
			subtitle: 'Prompt a model',
		});
		expect(typeOf('@n8n/nodes-base-next.aiPrompt')?.codex).toBeUndefined();
		const xAi = typeOf('@n8n/nodes-base-next.xAiChatModel');
		expect([xAi?.icon, xAi?.iconUrl, xAi?.codex]).toEqual([undefined, undefined, undefined]);
	});

	it('keeps the legacy node types unchanged when node contracts are on', async () => {
		const legacyTypes = (instance: LoadNodesAndCredentials) =>
			instance.types.nodes.filter(({ name }) =>
				['n8n-nodes-base.slack', 'n8n-nodes-base.set', 'n8n-nodes-base.httpRequest'].includes(name),
			);
		const off = legacyTypes(await postProcessed(false));
		expect(off.length).toBeGreaterThan(0);
		expect(legacyTypes(await postProcessed(true))).toEqual(off);
	});

	it('keeps the types unchanged when node contracts are off', async () => {
		const instance = await postProcessed(false);
		const notion = instance.types.nodes.filter(({ name }) => name === NOTION);
		expect(notion.map(versionOf)).toEqual(['2,2.1,2.2', '3', '1']);
		expect(notion.map(({ defaultVersion }) => defaultVersion)).toEqual([3, 3, 3]);
		expect(
			instance.types.nodes.some(({ hidden, name }) => hidden && name.startsWith('@n8n/')),
		).toBe(false);
		expect(
			instance.types.nodes
				.filter(({ name }) => name === 'n8n-nodes-base.noOp')
				.map(({ hidden }) => hidden ?? false),
		).toEqual([false]);
		const loaded = instance.getNode(NOTION).type as IVersionedNodeType;
		expect(Object.keys(loaded.nodeVersions)).not.toContain('4');
	});

	it('does not add Notion v4 when the contract loader does not load the action of its slot', async () => {
		const instance = await postProcessed(true, ['@n8n/nodes-base-next.notionDatabasePageGetAll']);
		const notion = instance.types.nodes.filter(({ name }) => name === NOTION);

		expect(notion.map(versionOf)).toEqual(['2,2.1,2.2', '3', '1']);
		expect(notion.map(({ defaultVersion }) => defaultVersion)).toEqual([3, 3, 3]);
		const loaded = instance.getNode(NOTION).type as IVersionedNodeType;
		expect(Object.keys(loaded.nodeVersions)).not.toContain('4');
	});
});
