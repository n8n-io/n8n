import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INodeType, INodeTypeDescription, INodeTypes } from 'n8n-workflow';

import { buildPreviewNodeTypes } from '../tools/preview-node-types.utils';

const createDescription = (overrides: Partial<INodeTypeDescription>): INodeTypeDescription => ({
	// Runtime descriptions carry the short, un-prefixed name.
	name: 'googleSheets',
	displayName: 'Google Sheets',
	group: ['input'],
	description: 'Read and write Google Sheets',
	version: [4, 4.1, 4.2],
	defaults: { name: 'Google Sheets' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{ displayName: 'Resource', name: 'resource', type: 'options', default: 'sheet', options: [] },
	],
	...overrides,
});

const createNodeTypes = (descriptionsByType: Record<string, INodeTypeDescription>): INodeTypes =>
	({
		getByNameAndVersion: (type: string) => {
			const description = descriptionsByType[type];
			if (!description) throw new Error(`Unknown node type: ${type}`);
			return { description } as INodeType;
		},
	}) as INodeTypes;

const noopIconResolver = { resolveIcon: () => undefined };

describe('buildPreviewNodeTypes', () => {
	test('ships the fully-qualified workflow node type as the description name', async () => {
		const nodeTypes = createNodeTypes({
			'n8n-nodes-base.googleSheets': createDescription({}),
		});

		const result = await buildPreviewNodeTypes(
			[{ type: 'n8n-nodes-base.googleSheets', typeVersion: 4.2 }],
			nodeTypes,
			noopIconResolver,
		);

		expect(result).toHaveLength(1);
		// The canvas looks node types up by the workflow node's `type`; the
		// short runtime name (`googleSheets`) would never match.
		expect(result[0].name).toBe('n8n-nodes-base.googleSheets');
		expect(result[0].version).toEqual([4, 4.1, 4.2]);
	});

	test('keeps connection shape and visuals', async () => {
		const nodeTypes = createNodeTypes({
			'n8n-nodes-base.if': createDescription({
				name: 'if',
				displayName: 'If',
				version: [2, 2.1, 2.2],
				inputs: ['main'],
				outputs: ['main', 'main'],
				outputNames: ['true', 'false'],
				icon: 'fa:map-signs',
				iconColor: 'green',
			}),
		});

		const [result] = await buildPreviewNodeTypes(
			[{ type: 'n8n-nodes-base.if', typeVersion: 2.2 }],
			nodeTypes,
			noopIconResolver,
		);

		expect(result.outputs).toEqual(['main', 'main']);
		expect(result.outputNames).toEqual(['true', 'false']);
		expect(result.icon).toBe('fa:map-signs');
		expect(result.iconColor).toBe('green');
	});

	test('trims properties to structural fields, preserving nesting and defaults', async () => {
		const nodeTypes = createNodeTypes({
			'n8n-nodes-base.slack': createDescription({
				name: 'slack',
				displayName: 'Slack',
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						default: 'message',
						description: 'The resource to operate on',
						placeholder: 'Select a resource',
						options: [
							{ name: 'Message', value: 'message', description: 'Send messages' },
							{ name: 'Channel', value: 'channel', description: 'Manage channels' },
						],
					},
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'fixedCollection',
						default: {},
						typeOptions: { multipleValues: true, sortable: true },
						displayOptions: { show: { resource: ['message'] } },
						options: [
							{
								displayName: 'Field',
								name: 'field',
								values: [
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: 'hello',
										hint: 'A hint',
									},
								],
							},
						],
					},
				],
			}),
		});

		const [result] = await buildPreviewNodeTypes(
			[{ type: 'n8n-nodes-base.slack', typeVersion: 2.2 }],
			nodeTypes,
			noopIconResolver,
		);

		expect(result.properties).toEqual([
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'message',
				options: [
					{ name: 'Message', value: 'message' },
					{ name: 'Channel', value: 'channel' },
				],
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				displayOptions: { show: { resource: ['message'] } },
				options: [
					{
						displayName: 'Field',
						name: 'field',
						values: [{ displayName: 'Value', name: 'value', type: 'string', default: 'hello' }],
					},
				],
			},
		]);
	});

	test('deduplicates by type and version and skips unknown node types', async () => {
		const nodeTypes = createNodeTypes({
			'n8n-nodes-base.googleSheets': createDescription({}),
		});

		const result = await buildPreviewNodeTypes(
			[
				{ type: 'n8n-nodes-base.googleSheets', typeVersion: 4.2 },
				{ type: 'n8n-nodes-base.googleSheets', typeVersion: 4.2 },
				{ type: 'n8n-nodes-base.doesNotExist', typeVersion: 1 },
			],
			nodeTypes,
			noopIconResolver,
		);

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('n8n-nodes-base.googleSheets');
	});

	test('inlines resolvable icons as data URIs and drops unresolvable ones', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'preview-node-types-'));
		const iconPath = join(dir, 'sheets.svg');
		writeFileSync(iconPath, '<svg xmlns="http://www.w3.org/2000/svg"/>');

		const nodeTypes = createNodeTypes({
			'n8n-nodes-base.googleSheets': createDescription({
				iconUrl: 'icons/n8n-nodes-base/dist/nodes/Google/Sheet/sheets.svg',
			}),
			'n8n-nodes-base.slack': createDescription({
				name: 'slack',
				displayName: 'Slack',
				iconUrl: 'icons/n8n-nodes-base/dist/nodes/Slack/slack.svg',
			}),
		});

		const iconResolver = {
			resolveIcon: (_packageName: string, url: string) =>
				url.includes('sheets.svg') ? iconPath : undefined,
		};

		const [sheets, slack] = await buildPreviewNodeTypes(
			[
				{ type: 'n8n-nodes-base.googleSheets', typeVersion: 4.2 },
				{ type: 'n8n-nodes-base.slack', typeVersion: 2.2 },
			],
			nodeTypes,
			iconResolver,
		);

		expect(sheets.iconUrl).toMatch(/^data:image\/svg\+xml;base64,/);
		expect(slack.iconUrl).toBeUndefined();
	});
});
