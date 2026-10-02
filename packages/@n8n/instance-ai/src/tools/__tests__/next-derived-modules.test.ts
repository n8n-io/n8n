import { PROVIDER_FIELDS } from '@n8n/node-sdk';
import * as flowSdk from '@n8n/workflow-sdk/next';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { aiNodeTypes, derivedNodeTypes, mattermostDescription } from './derived-node-types';
import {
	derivedActionIds,
	derivedActionsNamedBy,
	derivedModulePath,
	derivedNodeModuleText,
	derivedNodeView,
	derivedReadOf,
	hasDerivedModule,
	isInstalledNodeType,
	missingNodeTypeIssue,
	nodeTypeOfModulePath,
} from '../next-modules';
import { missingNodeTypeErrors, nextWorkspaceFiles } from '../workflows/next-workflow-build';

const MATTERMOST = 'n8n-nodes-base.mattermost';

const TSC = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');

/**
 * Runs `tsc` on `source` with derived modules at their import paths: the Mattermost module, or
 * the module text of each node type in `modules`.
 */
function typeErrors(source: string, modules: string | Record<string, string>): string[] {
	const root = mkdtempSync(path.join(tmpdir(), 'next-derived-modules-'));
	try {
		const byType = typeof modules === 'string' ? { [MATTERMOST]: modules } : modules;
		for (const [nodeType, text] of Object.entries(byType)) {
			const file = path.join(root, 'nodes', `${derivedModulePath(nodeType)}.ts`);
			mkdirSync(path.dirname(file), { recursive: true });
			writeFileSync(file, text);
		}
		writeFileSync(path.join(root, 'workflow.ts'), source);
		const sdk = require.resolve('@n8n/workflow-sdk/next').replace(/\.js$/, '.d.ts');
		const compilerOptions = {
			strict: true,
			noEmit: true,
			skipLibCheck: true,
			target: 'ES2022',
			module: 'ES2022',
			moduleResolution: 'bundler',
			types: [],
			paths: { '@n8n/nodes/*': ['./nodes/*'], '@n8n/workflow-sdk/next': [sdk] },
		};
		writeFileSync(
			path.join(root, 'tsconfig.json'),
			JSON.stringify({ compilerOptions, files: ['workflow.ts'] }),
		);
		try {
			execFileSync(process.execPath, [TSC, '-p', root, '--pretty', 'false'], { encoding: 'utf8' });
			return [];
		} catch (error) {
			const output = (error as { stdout?: string }).stdout ?? String(error);
			return output
				.split('\n')
				.filter((line) => line.includes('error TS'))
				.map((line) => line.replace(/^.*?([\w.-]+\.ts)\((\d+),\d+\): /, '$1:$2 '));
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

describe('derived node modules', () => {
	it.each([
		['n8n-nodes-base.mattermost', 'n8n-nodes-base/mattermost'],
		['@n8n/n8n-nodes-langchain.openAi', '@n8n/n8n-nodes-langchain/openAi'],
	])('imports %s from @n8n/nodes/%s', (nodeType, modulePath) => {
		expect(derivedModulePath(nodeType)).toBe(modulePath);
		expect(nodeTypeOfModulePath(modulePath)).toBe(nodeType);
	});

	it('reads a typed module id as no derived module path', () => {
		expect(nodeTypeOfModulePath('notion')).toBeUndefined();
	});

	it('derives the module of a node type without a typed module, once per instance', () => {
		const nodeTypesProvider = derivedNodeTypes();
		const source = { nodeTypesProvider };
		const text = derivedNodeModuleText(MATTERMOST, source);

		expect(text).toContain('// Derived from n8n-nodes-base.mattermost version 2.3.');
		expect(text).toContain(
			'contractStep("n8n-nodes-base.mattermost", config, 2.3, {"resource":"message","operation":"post"})',
		);
		expect(text).toContain('export const mattermost = {');
		expect(derivedNodeModuleText(MATTERMOST, source)).toBe(text);
		expect(nodeTypesProvider.getByNameAndVersion).toHaveBeenCalledTimes(1);
	});

	it.each([
		['a typed module', 'n8n-nodes-base.notion'],
		['an SDK step', 'n8n-nodes-base.filter'],
		['an unknown node type', 'n8n-nodes-base.unknown'],
	])('derives no module for %s', (_case, nodeType) => {
		const name = nodeType === 'n8n-nodes-base.unknown' ? 'mattermost' : nodeType.split('.')[1];
		const nodeTypesProvider = derivedNodeTypes([{ ...mattermostDescription, name: name ?? '' }]);
		expect(hasDerivedModule(nodeType, { nodeTypesProvider })).toBe(false);
	});

	it('derives no module without the node types of an instance', () => {
		expect(hasDerivedModule(MATTERMOST, {})).toBe(false);
	});

	it('types the output from the __schema__ lookup of the instance', () => {
		const outputSchemaLookup = vi.fn(() => ({
			type: 'object',
			properties: { id: { type: 'string' }, message: { type: 'string' } },
		}));
		const text = derivedNodeModuleText(MATTERMOST, {
			nodeTypesProvider: derivedNodeTypes(),
			outputSchemaLookup,
		});

		expect(outputSchemaLookup).toHaveBeenCalledWith({
			type: MATTERMOST,
			typeVersion: 2.3,
			resource: 'message',
			operation: 'post',
		});
		expect(text).toContain(
			'export type MattermostMessagePostOutput = { id: string; message: string; [key: string]: any };',
		);
	});

	it('types at most three actions in a view and lists the others in one line each', () => {
		const source = { nodeTypesProvider: derivedNodeTypes() };
		const view = derivedNodeView(MATTERMOST, source);

		expect(view?.node).toBe(MATTERMOST);
		expect(view?.import).toBe("import { mattermost } from '@n8n/nodes/n8n-nodes-base/mattermost';");
		expect(view?.module.match(/contractStep\(/g)).toHaveLength(3);
		expect(view?.module).toContain(
			'// mattermost.channel.archive(config: MattermostChannelArchiveInput) — archive (write, per-item)',
		);
	});

	it('types the actions that a resource and an operation or the query name', () => {
		const source = { nodeTypesProvider: derivedNodeTypes() };
		const shown = derivedActionIds(MATTERMOST, source, {
			resource: 'channel',
			operation: 'archive',
		});

		expect(shown).toEqual(['mattermost.channel.archive']);
		expect(
			derivedNodeView(MATTERMOST, source, new Set(shown))?.module.match(/contractStep\(/g),
		).toHaveLength(1);
		expect(derivedActionsNamedBy(MATTERMOST, source, 'mattermost delete a message')).toEqual([
			'mattermost.message.delete',
		]);
		expect(derivedActionsNamedBy(MATTERMOST, source, 'mattermost')).toEqual([]);
	});

	it('builds the legacy node of its version with the slot and __rl on the locator value', () => {
		const text = derivedNodeModuleText(MATTERMOST, { nodeTypesProvider: derivedNodeTypes() }) ?? '';
		// The factory of mattermost.message.post, as the module text calls the flow SDK.
		const [, type = '', version = '', slot = '{}'] =
			/contractStep\("([^"]+)", config, ([\d.]+), (\{"resource":"message","operation":"post"\})\)/.exec(
				text,
			) ?? [];
		const config = {
			name: 'Post' as const,
			channelId: { mode: 'id', value: 'c1' },
			message: (item: { text: string }) => item.text,
		};
		const step = flowSdk.contractStep(
			type,
			config,
			Number(version),
			JSON.parse(slot) as { resource: string; operation: string },
		);
		const json = flowSdk.workflow('Post', flowSdk.manual().andThen(step)).toJSON();

		expect(json.nodes.find((node) => node.name === 'Post')).toMatchObject({
			type: MATTERMOST,
			typeVersion: 2.3,
			parameters: {
				resource: 'message',
				operation: 'post',
				channelId: { __rl: true, mode: 'id', value: 'c1' },
				message: '={{ $json.text }}',
			},
		});
	});

	it('reads a saved node as its derived factory and input, or gives the reason', () => {
		const source = { nodeTypesProvider: derivedNodeTypes() };
		const saved = (typeVersion: number, parameters: Record<string, unknown>) =>
			derivedReadOf({ type: MATTERMOST, typeVersion, parameters }, source);

		expect(
			saved(2.3, {
				resource: 'message',
				operation: 'post',
				channelId: { __rl: true, mode: 'id', value: 'c1' },
				message: '={{ $json.text }}',
			}),
		).toEqual({
			factory: {
				module: 'mattermost',
				from: '@n8n/nodes/n8n-nodes-base/mattermost',
				path: 'message.post',
				version: 2.3,
				groupsProviders: true,
				inputKeys: ['channelId', 'message'],
				expressionKeys: ['message'],
			},
			parameters: { channelId: { mode: 'id', value: 'c1' }, message: '={{ $json.text }}' },
		});
		expect(saved(2.3, { resource: 'message', operation: 'update' })).toEqual({
			reason: 'no derived action runs message.update',
		});
		expect(
			derivedReadOf({ type: 'n8n-nodes-base.notion', typeVersion: 2 }, source),
		).toBeUndefined();
	});

	// Each case runs a real tsc.
	it('checks a workflow against the derived module with tsc', () => {
		const module =
			derivedNodeModuleText(MATTERMOST, { nodeTypesProvider: derivedNodeTypes() }) ?? '';
		const header = [
			"import { manual, workflow } from '@n8n/workflow-sdk/next';",
			"import { mattermost } from '@n8n/nodes/n8n-nodes-base/mattermost';",
			'',
		].join('\n');
		const post = (fields: string) =>
			`${header}export default workflow('Post', manual().andThen(mattermost.message.post({ name: 'Post', ${fields} })));\n`;

		expect(
			typeErrors(post("channelId: { mode: 'id', value: 'c1' }, message: 'Hi'"), module),
		).toEqual([]);
		expect(
			typeErrors(post("channelId: { mode: 'name', value: 'c1' }, message: 'Hi'"), module),
		).toEqual([
			expect.stringContaining('workflow.ts:3 error TS2322: Type \'"name"\' is not assignable'),
		]);
		expect(typeErrors(post("channelId: { mode: 'id', value: 'c1' }"), module)).toEqual([
			expect.stringContaining('workflow.ts:3 error TS2345'),
		]);
	});

	describe('triggers, AI nodes, and community nodes', () => {
		const AGENT = '@n8n/n8n-nodes-langchain.agentRoot';
		const CHAT = '@n8n/n8n-nodes-langchain.lmChatAcme';
		const MEMORY = '@n8n/n8n-nodes-langchain.memoryAcme';
		const ACME = 'n8n-nodes-acme.acmeTrigger';
		const source = { nodeTypesProvider: derivedNodeTypes([], aiNodeTypes) };
		const moduleOf = (nodeType: string) => derivedNodeModuleText(nodeType, source) ?? '';

		it('derives a community trigger at its package path, as the build writes it', () => {
			expect(derivedModulePath(ACME)).toBe('n8n-nodes-acme/acmeTrigger');
			expect(moduleOf(ACME)).toContain(
				'contractTrigger("n8n-nodes-acme.acmeTrigger", config, 2, undefined, {',
			);
			const workspace = nextWorkspaceFiles(
				"import { acmeTrigger } from '@n8n/nodes/n8n-nodes-acme/acmeTrigger';\n",
				source,
			);
			expect(
				workspace.ok && workspace.files.get('.n8n/nodes/n8n-nodes-acme/acmeTrigger.ts'),
			).toContain('/// <reference path="../../node-outputs.d.ts" />');
		});

		it('derives a node type that the instance gets after a failed lookup', () => {
			const nodeTypesProvider = derivedNodeTypes([], aiNodeTypes);
			nodeTypesProvider.getByNameAndVersion.mockImplementationOnce(() => {
				throw new Error(`Unknown node type ${ACME}`);
			});
			expect(derivedNodeModuleText(ACME, { nodeTypesProvider })).toBeUndefined();
			expect(derivedNodeModuleText(ACME, { nodeTypesProvider })).toContain('contractTrigger(');
		});

		it('fails the build in one line for a node type the instance does not have', async () => {
			expect(isInstalledNodeType(ACME, source)).toBe(true);
			expect(isInstalledNodeType('n8n-nodes-other.widget', source)).toBe(false);
			expect(missingNodeTypeIssue('n8n-nodes-base.nope')).toBe(
				'n8n has no node type n8n-nodes-base.nope. Find the type with nodes(action="search").',
			);
			const code = [
				"import { manual, node, workflow } from '@n8n/workflow-sdk/next';",
				"import { widget } from '@n8n/nodes/n8n-nodes-other/widget';",
				"import { acmeTrigger } from '@n8n/nodes/n8n-nodes-acme/acmeTrigger';",
				"export default workflow('W', manual().andThen(node({ name: 'Scan', type: '@scope/n8n-nodes-scan.scan', version: 1 })));",
			].join('\n');
			expect(await missingNodeTypeErrors(code, source)).toEqual([
				'"@n8n/nodes/n8n-nodes-other/widget": Node type n8n-nodes-other.widget is not installed. Install package n8n-nodes-other first.',
				'"Scan" (line 4): Node type @scope/n8n-nodes-scan.scan is not installed. Install package @scope/n8n-nodes-scan first.',
			]);
			expect(
				await missingNodeTypeErrors(
					"manual().andThen(crypto.execute({ name: 'Hash', action: 'hash', type: 'SHA256' }));",
					source,
				),
			).toEqual([]);
		});

		it('reads a saved trigger, root node and provider as derived factories', () => {
			const read = (type: string, typeVersion: number, parameters: Record<string, unknown>) =>
				derivedReadOf({ type, typeVersion, parameters }, source);
			expect(read(ACME, 2, { text: 'a' })).toMatchObject({
				factory: { module: 'acmeTrigger', path: 'trigger', groupsProviders: true },
				parameters: { text: 'a' },
			});
			expect(read(AGENT, 1, { text: 'Hi' })).toMatchObject({
				factory: { module: 'agentRoot', path: 'execute', inputKeys: ['text'] },
			});
			expect(read(CHAT, 1.2, {})).toMatchObject({
				factory: { module: 'lmChatAcme', path: 'execute', version: 1.2 },
			});
		});

		it('builds a derived root node with its provider on the connection of its slot', () => {
			const model = flowSdk.contractProvider(CHAT, 'ai_languageModel', { name: 'Model' }, 1.2);
			// The config of a generated factory, which types the input fields too.
			const agentConfig = { name: 'Agent' as const, text: 'Hi', providers: { model } };
			const triggerConfig = { name: 'Event' as const, text: 'a' };
			const step = flowSdk.contractStep(AGENT, agentConfig);
			const trigger = flowSdk.contractTrigger(ACME, triggerConfig, 2);
			const json = flowSdk.workflow('Ask', trigger.andThen(step)).toJSON();

			expect(json.nodes.find((node) => node.name === 'Model')).toMatchObject({
				type: CHAT,
				typeVersion: 1.2,
			});
			expect(json.nodes.find((node) => node.name === 'Agent')?.parameters).toEqual({ text: 'Hi' });
			expect(json.connections.Model).toEqual({
				ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]],
			});
			expect(json.connections.Event).toEqual({
				main: [[{ node: 'Agent', type: 'main', index: 0 }]],
			});
		});

		it('connects each provider field of node-sdk on its connection type in the flow SDK', () => {
			for (const [connection, field] of Object.entries(PROVIDER_FIELDS)) {
				const supplied = flowSdk.contractProvider(CHAT, connection as 'ai_tool', { name: 'P' });
				const step = flowSdk.contractStep(AGENT, {
					name: 'Root',
					providers: { [field]: supplied },
				});
				const json = flowSdk.workflow('W', flowSdk.manual().andThen(step)).toJSON();
				expect(Object.keys(json.connections.P ?? {})).toEqual([connection]);
			}
		});

		// Each case runs a real tsc.
		it('checks each provider slot of a derived root node by its connection type with tsc', () => {
			const modules = Object.fromEntries([AGENT, CHAT, MEMORY, ACME].map((t) => [t, moduleOf(t)]));
			const flow = (providers: string) =>
				[
					"import { workflow } from '@n8n/workflow-sdk/next';",
					"import { acmeTrigger } from '@n8n/nodes/n8n-nodes-acme/acmeTrigger';",
					"import { agentRoot } from '@n8n/nodes/@n8n/n8n-nodes-langchain/agentRoot';",
					"import { lmChatAcme } from '@n8n/nodes/@n8n/n8n-nodes-langchain/lmChatAcme';",
					"import { memoryAcme } from '@n8n/nodes/@n8n/n8n-nodes-langchain/memoryAcme';",
					'const model = lmChatAcme.execute({ name: "Model" });',
					'const memory = memoryAcme.execute({ name: "Memory" });',
					`export default workflow('Ask', acmeTrigger.trigger({ name: 'Event', text: 'a' }).andThen(agentRoot.execute({ name: 'Agent', text: (item) => String(item.q), providers: ${providers} })));`,
					'',
				].join('\n');

			expect(typeErrors(flow('{ model, memory }'), modules)).toEqual([]);
			expect(typeErrors(flow('{ model: memory }'), modules)).toEqual([
				expect.stringMatching(/workflow\.ts:8 error TS2322: .*"ai_memory".*"ai_languageModel"/),
			]);
			expect(typeErrors(flow('{ memory }'), modules)).toEqual([
				expect.stringContaining("workflow.ts:8 error TS2741: Property 'model' is missing"),
			]);
			expect(typeErrors(flow('{ model, tools: [model] }'), modules)).toEqual([
				expect.stringMatching(/workflow\.ts:8 error TS2322: .*"ai_languageModel".*"ai_tool"/),
			]);
		});
	});
});
