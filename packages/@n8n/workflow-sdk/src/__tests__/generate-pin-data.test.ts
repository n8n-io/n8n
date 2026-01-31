import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import * as outputSchemaResolver from '../output-schema-resolver';
import type { OutputSchemaEntry } from '../output-schema-resolver';

// Mock the output schema loading
jest.mock('../output-schema-resolver', () => {
	const actual = jest.requireActual('../output-schema-resolver');
	return {
		...actual,
		loadOutputSchemas: jest.fn(),
	};
});

const mockLoadOutputSchemas = outputSchemaResolver.loadOutputSchemas as jest.Mock;

describe('generatePinData', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('basic generation', () => {
		it('generates pin data for nodes with schemas', () => {
			const testSchema: OutputSchemaEntry[] = [
				{
					parameters: { resource: 'channel', operation: 'get' },
					schema: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							name: { type: 'string' },
						},
					},
				},
			];
			mockLoadOutputSchemas.mockReturnValue(testSchema);

			const wf = workflow('id', 'Test')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: {
							name: 'Slack',
							parameters: { resource: 'channel', operation: 'get' },
						},
					}),
				)
				.generatePinData();

			const json = wf.toJSON();
			expect(json.pinData).toBeDefined();
			expect(json.pinData!['Slack']).toBeDefined();
			expect(json.pinData!['Slack']).toHaveLength(1);
			expect(json.pinData!['Slack'][0]).toHaveProperty('id');
			expect(json.pinData!['Slack'][0]).toHaveProperty('name');
		});

		it('returns this for chaining', () => {
			mockLoadOutputSchemas.mockReturnValue([]);

			const wf = workflow('id', 'Test');
			const result = wf.generatePinData();
			expect(result).toBe(wf);
		});

		it('silently skips nodes without output schemas', () => {
			// Return undefined to simulate no schema found
			mockLoadOutputSchemas.mockReturnValue(undefined);

			const wf = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.noOp',
						version: 1,
						config: { name: 'No Op' },
					}),
				)
				.generatePinData();

			const json = wf.toJSON();
			// No pin data should be generated (either empty object or undefined)
			expect(json.pinData?.['No Op']).toBeUndefined();
		});
	});

	describe('item count', () => {
		it('generates 1 item for non-getAll operations', () => {
			const testSchema: OutputSchemaEntry[] = [
				{
					schema: {
						type: 'object',
						properties: { id: { type: 'string' } },
					},
				},
			];
			mockLoadOutputSchemas.mockReturnValue(testSchema);

			const wf = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: {
							name: 'Slack',
							parameters: { resource: 'channel', operation: 'get' },
						},
					}),
				)
				.generatePinData();

			const json = wf.toJSON();
			expect(json.pinData!['Slack']).toHaveLength(1);
		});

		it('generates 2 items for getAll operations', () => {
			const testSchema: OutputSchemaEntry[] = [
				{
					schema: {
						type: 'object',
						properties: { id: { type: 'string' } },
					},
				},
			];
			mockLoadOutputSchemas.mockReturnValue(testSchema);

			const wf = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: {
							name: 'Slack',
							parameters: { resource: 'channel', operation: 'getAll' },
						},
					}),
				)
				.generatePinData();

			const json = wf.toJSON();
			expect(json.pinData!['Slack']).toHaveLength(2);
		});
	});

	describe('filtering by nodes option', () => {
		it('only generates for specified node names', () => {
			const testSchema: OutputSchemaEntry[] = [
				{
					schema: {
						type: 'object',
						properties: { id: { type: 'string' } },
					},
				},
			];
			mockLoadOutputSchemas.mockReturnValue(testSchema);

			const wf = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: { name: 'Slack 1' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: { name: 'Slack 2' },
					}),
				)
				.generatePinData({ nodes: ['Slack 1'] });

			const json = wf.toJSON();
			expect(json.pinData!['Slack 1']).toBeDefined();
			expect(json.pinData!['Slack 2']).toBeUndefined();
		});
	});

	describe('filtering by hasNoCredentials option', () => {
		it('only generates for nodes without credentials', () => {
			const testSchema: OutputSchemaEntry[] = [
				{
					schema: {
						type: 'object',
						properties: { id: { type: 'string' } },
					},
				},
			];
			mockLoadOutputSchemas.mockReturnValue(testSchema);

			const wf = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: {
							name: 'With Creds',
							credentials: { slackApi: { id: '1', name: 'Slack' } },
						},
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.code',
						version: 2,
						config: { name: 'No Creds' },
					}),
				)
				.generatePinData({ hasNoCredentials: true });

			const json = wf.toJSON();
			expect(json.pinData!['With Creds']).toBeUndefined();
			expect(json.pinData!['No Creds']).toBeDefined();
		});

		it('treats empty credentials object as having no credentials', () => {
			const testSchema: OutputSchemaEntry[] = [
				{
					schema: {
						type: 'object',
						properties: { id: { type: 'string' } },
					},
				},
			];
			mockLoadOutputSchemas.mockReturnValue(testSchema);

			const wf = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.code',
						version: 2,
						config: { name: 'Empty Creds', credentials: {} },
					}),
				)
				.generatePinData({ hasNoCredentials: true });

			const json = wf.toJSON();
			expect(json.pinData!['Empty Creds']).toBeDefined();
		});
	});

	describe('filtering by beforeWorkflow option', () => {
		it('only generates for nodes not in the before workflow', () => {
			const testSchema: OutputSchemaEntry[] = [
				{
					schema: {
						type: 'object',
						properties: { id: { type: 'string' } },
					},
				},
			];
			mockLoadOutputSchemas.mockReturnValue(testSchema);

			const beforeWorkflow = {
				name: 'Before',
				nodes: [
					{
						id: '1',
						name: 'Existing Node',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			};

			const wf = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: { name: 'Existing Node' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: { name: 'New Node' },
					}),
				)
				.generatePinData({ beforeWorkflow });

			const json = wf.toJSON();
			expect(json.pinData!['Existing Node']).toBeUndefined();
			expect(json.pinData!['New Node']).toBeDefined();
		});
	});

	describe('combining filters', () => {
		it('combines filters with AND logic', () => {
			const testSchema: OutputSchemaEntry[] = [
				{
					schema: {
						type: 'object',
						properties: { id: { type: 'string' } },
					},
				},
			];
			mockLoadOutputSchemas.mockReturnValue(testSchema);

			const beforeWorkflow = {
				name: 'Before',
				nodes: [
					{
						id: '1',
						name: 'Old',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			};

			const wf = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: { name: 'Old' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: {
							name: 'New With Creds',
							credentials: { slackApi: { id: '1', name: 'Slack' } },
						},
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.code',
						version: 2,
						config: { name: 'New No Creds' },
					}),
				)
				.generatePinData({ beforeWorkflow, hasNoCredentials: true });

			const json = wf.toJSON();
			// Old: filtered out by beforeWorkflow
			expect(json.pinData!['Old']).toBeUndefined();
			// New With Creds: filtered out by hasNoCredentials
			expect(json.pinData!['New With Creds']).toBeUndefined();
			// New No Creds: passes both filters
			expect(json.pinData!['New No Creds']).toBeDefined();
		});
	});

	describe('seeded generation', () => {
		it('generates deterministic data with seed', () => {
			const testSchema: OutputSchemaEntry[] = [
				{
					schema: {
						type: 'object',
						properties: { id: { type: 'string' } },
					},
				},
			];
			mockLoadOutputSchemas.mockReturnValue(testSchema);

			const wf1 = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: { name: 'Slack' },
					}),
				)
				.generatePinData({ seed: 42 });

			const wf2 = workflow('id', 'Test')
				.add(
					node({
						type: 'n8n-nodes-base.slack',
						version: 2,
						config: { name: 'Slack' },
					}),
				)
				.generatePinData({ seed: 42 });

			expect(wf1.toJSON().pinData).toEqual(wf2.toJSON().pinData);
		});
	});
});
