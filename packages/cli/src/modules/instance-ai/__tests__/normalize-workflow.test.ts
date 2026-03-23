import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { extractConditionalFieldPaths, normalizeWorkflowForSave } from '../normalize-workflow';

// ---------------------------------------------------------------------------
// extractConditionalFieldPaths
// ---------------------------------------------------------------------------

describe('extractConditionalFieldPaths', () => {
	it('should return empty for properties without displayOptions', () => {
		const props: INodeProperties[] = [
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
		];
		expect(extractConditionalFieldPaths(props)).toEqual([]);
	});

	it('should skip properties with only discriminator key conditions', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Field',
				name: 'field',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['image'], operation: ['create'] } },
			},
		];
		expect(extractConditionalFieldPaths(props)).toEqual([]);
	});

	it('should return paths for properties with non-discriminator displayOptions.show', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'options',
				default: 'standard',
				displayOptions: { show: { model: ['dall-e-3'] } },
			},
		];
		expect(extractConditionalFieldPaths(props)).toEqual(['quality']);
	});

	it('should return paths for properties with non-discriminator displayOptions.hide', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Field',
				name: 'field',
				type: 'string',
				default: '',
				displayOptions: { hide: { someFlag: [true] } },
			},
		];
		expect(extractConditionalFieldPaths(props)).toEqual(['field']);
	});

	it('should extract paths from collection inner fields with displayOptions', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Size',
						name: 'size',
						type: 'options',
						default: '1024x1024',
						displayOptions: { show: { '/model': ['dall-e-3'] } },
					} as INodeProperties,
					{
						displayName: 'Plain',
						name: 'plain',
						type: 'string',
						default: '',
					} as INodeProperties,
				],
			},
		];
		expect(extractConditionalFieldPaths(props)).toEqual(['options.size']);
	});

	it('should extract paths from fixedCollection inner fields with displayOptions', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Settings',
				name: 'settings',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Image Settings',
						name: 'imageSettings',
						values: [
							{
								displayName: 'Quality',
								name: 'quality',
								type: 'options',
								default: 'standard',
								displayOptions: { show: { '/model': ['dall-e-3'] } },
							},
						],
					},
				],
			},
		];
		expect(extractConditionalFieldPaths(props)).toEqual(['settings.imageSettings.quality']);
	});

	it('should skip discriminator fields themselves', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'image',
				displayOptions: { show: { model: ['gpt-4'] } },
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'create',
				displayOptions: { show: { model: ['gpt-4'] } },
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				default: 'default',
				displayOptions: { show: { model: ['gpt-4'] } },
			},
		];
		expect(extractConditionalFieldPaths(props)).toEqual([]);
	});

	it('should skip noDataExpression fields', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Field',
				name: 'field',
				type: 'string',
				default: '',
				noDataExpression: true,
				displayOptions: { show: { model: ['dall-e-3'] } },
			},
		];
		expect(extractConditionalFieldPaths(props)).toEqual([]);
	});

	it('should detect mixed discriminator and non-discriminator keys', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Field',
				name: 'field',
				type: 'string',
				default: '',
				displayOptions: {
					show: { resource: ['image'], model: ['dall-e-3'] },
				},
			},
		];
		// Has non-discriminator key 'model', so should be included
		expect(extractConditionalFieldPaths(props)).toEqual(['field']);
	});

	it('should strip @version as a discriminator key', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Field',
				name: 'field',
				type: 'string',
				default: '',
				displayOptions: { show: { '@version': [2] } },
			},
		];
		expect(extractConditionalFieldPaths(props)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// normalizeWorkflowForSave
// ---------------------------------------------------------------------------

function makeWorkflow(nodes: WorkflowJSON['nodes']): WorkflowJSON {
	return {
		name: 'Test',
		nodes,
		connections: {},
	};
}

function makeDescription(nodeType: string, properties: INodeProperties[]): INodeTypeDescription {
	return {
		displayName: nodeType,
		name: nodeType,
		group: ['transform'],
		version: 1,
		defaults: { name: nodeType },
		inputs: ['main'],
		outputs: ['main'],
		properties,
		description: '',
	} as unknown as INodeTypeDescription;
}

describe('normalizeWorkflowForSave', () => {
	const dalleProps: INodeProperties[] = [
		{
			displayName: 'Model',
			name: 'model',
			type: 'options',
			default: 'dall-e-2',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			default: {},
			options: [
				{
					displayName: 'Size',
					name: 'size',
					type: 'options',
					default: '1024x1024',
					displayOptions: { show: { '/model': ['dall-e-3'] } },
				} as INodeProperties,
				{
					displayName: 'Quality',
					name: 'dalleQuality',
					type: 'options',
					default: 'standard',
					displayOptions: { show: { '/model': ['dall-e-3'] } },
				} as INodeProperties,
				{
					displayName: 'Style',
					name: 'style',
					type: 'options',
					default: 'vivid',
					displayOptions: { show: { '/model': ['dall-e-3'] } },
				} as INodeProperties,
			],
		},
	];

	const dalleDesc = makeDescription('n8n-nodes-base.openAi', dalleProps);

	const lookup = (nodeType: string, _version: number) =>
		nodeType === 'n8n-nodes-base.openAi' ? dalleDesc : undefined;

	it('should wrap plain string values in expression format', () => {
		const json = makeWorkflow([
			{
				id: '1',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 1,
				position: [0, 0],
				parameters: { model: 'dall-e-3', options: { size: '1792x1024' } },
			},
		]);

		normalizeWorkflowForSave(json, lookup);

		expect(json.nodes[0].parameters!.options).toEqual({
			size: '={{ "1792x1024" }}',
		});
	});

	it('should wrap plain number values in expression format', () => {
		const numProps: INodeProperties[] = [
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				default: 1,
				displayOptions: { show: { someFlag: [true] } },
			},
		];
		const desc = makeDescription('test.node', numProps);

		const json = makeWorkflow([
			{
				id: '1',
				type: 'test.node',
				typeVersion: 1,
				position: [0, 0],
				parameters: { count: 42 },
			},
		]);

		normalizeWorkflowForSave(json, (t) => (t === 'test.node' ? desc : undefined));

		expect(json.nodes[0].parameters!.count).toBe('={{ 42 }}');
	});

	it('should wrap plain boolean values in expression format', () => {
		const boolProps: INodeProperties[] = [
			{
				displayName: 'Flag',
				name: 'flag',
				type: 'boolean',
				default: false,
				displayOptions: { show: { someOther: ['value'] } },
			},
		];
		const desc = makeDescription('test.node', boolProps);

		const json = makeWorkflow([
			{
				id: '1',
				type: 'test.node',
				typeVersion: 1,
				position: [0, 0],
				parameters: { flag: true },
			},
		]);

		normalizeWorkflowForSave(json, (t) => (t === 'test.node' ? desc : undefined));

		expect(json.nodes[0].parameters!.flag).toBe('={{ true }}');
	});

	it('should not modify values that are already expressions', () => {
		const json = makeWorkflow([
			{
				id: '1',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					model: 'dall-e-3',
					options: { size: '={{ "1792x1024" }}' },
				},
			},
		]);

		normalizeWorkflowForSave(json, lookup);

		expect(json.nodes[0].parameters!.options).toEqual({
			size: '={{ "1792x1024" }}',
		});
	});

	it('should not modify undefined or null values', () => {
		const json = makeWorkflow([
			{
				id: '1',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 1,
				position: [0, 0],
				parameters: { model: 'dall-e-3', options: {} },
			},
		]);

		normalizeWorkflowForSave(json, lookup);

		expect(json.nodes[0].parameters!.options).toEqual({});
	});

	it('should not modify object or array values', () => {
		const json = makeWorkflow([
			{
				id: '1',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					model: 'dall-e-3',
					options: { size: { nested: 'value' } },
				},
			},
		]);

		normalizeWorkflowForSave(json, lookup);

		expect(json.nodes[0].parameters!.options).toEqual({
			size: { nested: 'value' },
		});
	});

	it('should handle unknown node types gracefully', () => {
		const json = makeWorkflow([
			{
				id: '1',
				type: 'unknown.node',
				typeVersion: 1,
				position: [0, 0],
				parameters: { foo: 'bar' },
			},
		]);

		normalizeWorkflowForSave(json, () => undefined);

		expect(json.nodes[0].parameters).toEqual({ foo: 'bar' });
	});

	it('should normalize multiple nodes independently', () => {
		const json = makeWorkflow([
			{
				id: '1',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 1,
				position: [0, 0],
				parameters: { model: 'dall-e-3', options: { size: '1792x1024' } },
			},
			{
				id: '2',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 1,
				position: [100, 0],
				parameters: { model: 'dall-e-3', options: { style: 'natural' } },
			},
		]);

		normalizeWorkflowForSave(json, lookup);

		expect(json.nodes[0].parameters!.options).toEqual({
			size: '={{ "1792x1024" }}',
		});
		expect(json.nodes[1].parameters!.options).toEqual({
			style: '={{ "natural" }}',
		});
	});

	it('should be a no-op for workflows without conditional fields', () => {
		const plainProps: INodeProperties[] = [
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
		];
		const desc = makeDescription('plain.node', plainProps);
		const json = makeWorkflow([
			{
				id: '1',
				type: 'plain.node',
				typeVersion: 1,
				position: [0, 0],
				parameters: { name: 'hello' },
			},
		]);

		const paramsBefore = deepCopy(json.nodes[0].parameters);
		normalizeWorkflowForSave(json, (t) => (t === 'plain.node' ? desc : undefined));

		expect(json.nodes[0].parameters).toEqual(paramsBefore);
	});

	it('should handle the concrete DALL-E scenario end-to-end', () => {
		const json = makeWorkflow([
			{
				id: 'dalle-1',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					model: 'dall-e-3',
					options: {
						size: '1792x1024',
						dalleQuality: 'hd',
						style: 'natural',
					},
				},
			},
		]);

		normalizeWorkflowForSave(json, lookup);

		expect(json.nodes[0].parameters!.options).toEqual({
			size: '={{ "1792x1024" }}',
			dalleQuality: '={{ "hd" }}',
			style: '={{ "natural" }}',
		});
	});

	it('should skip nodes without parameters', () => {
		const json = makeWorkflow([
			{
				id: '1',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 1,
				position: [0, 0],
			},
		]);

		// Should not throw
		normalizeWorkflowForSave(json, lookup);

		expect(json.nodes[0].parameters).toBeUndefined();
	});
});
