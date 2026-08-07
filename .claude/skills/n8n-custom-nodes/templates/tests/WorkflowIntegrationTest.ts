/**
 * TEMPLATE: Workflow Integration Test (NodeTestHarness)
 *
 * Uses NodeTestHarness to run a full workflow execution with real node code
 * but mocked HTTP responses (via nock). Workflow definitions are stored as
 * JSON files with pinData containing expected output.
 *
 * File structure:
 *   nodes/ServiceName/test/
 *     ServiceName.node.test.ts    ← This file
 *     workflow.json               ← Workflow definition with pinData
 *     create-item.workflow.json   ← Additional workflow tests
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service class name (PascalCase)
 *   - __serviceNameApi__  → Your credential name (camelCase)
 */
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('__ServiceName__ Node', () => {
	const testHarness = new NodeTestHarness();

	const credentials = {
		__serviceNameApi__: {
			apiKey: 'test-api-key',
			baseUrl: 'https://api.example.com',
		},
	};

	// ---- Test: Create Item ----
	describe('Create Item', () => {
		beforeEach(() => {
			nock('https://api.example.com')
				.post('/api/v1/items', {
					name: 'New Item',
				})
				.reply(201, {
					id: 'item-123',
					name: 'New Item',
					createdAt: '2024-01-01T00:00:00Z',
				});
		});

		// This reads create-item.workflow.json from the same directory
		// and compares actual output against pinData in the JSON
		testHarness.setupTests({
			credentials,
			workflowFiles: ['create-item.workflow.json'],
		});
	});

	// ---- Test: Get Item ----
	describe('Get Item', () => {
		beforeEach(() => {
			nock('https://api.example.com')
				.get('/api/v1/items/item-123')
				.reply(200, {
					id: 'item-123',
					name: 'Existing Item',
					status: 'active',
				});
		});

		testHarness.setupTests({
			credentials,
			workflowFiles: ['get-item.workflow.json'],
		});
	});

	// ---- Test: List Items ----
	describe('List Items', () => {
		beforeEach(() => {
			nock('https://api.example.com')
				.get('/api/v1/items')
				.query({ limit: 50 })
				.reply(200, {
					data: [
						{ id: '1', name: 'Item 1' },
						{ id: '2', name: 'Item 2' },
					],
				});
		});

		testHarness.setupTests({
			credentials,
			workflowFiles: ['list-items.workflow.json'],
		});
	});

	// ---- Test: Using inline WorkflowTestData (no JSON file) ----
	describe('Delete Item', () => {
		beforeEach(() => {
			nock('https://api.example.com')
				.delete('/api/v1/items/item-123')
				.reply(204);
		});

		const testData = {
			description: 'should delete an item',
			input: {
				workflowData: testHarness.readWorkflowJSON('delete-item.workflow.json'),
			},
			output: {
				nodeData: {
					'Delete Item': [
						[{ json: { success: true, id: 'item-123' } }],
					],
				},
			},
		};

		testHarness.setupTest(testData, { credentials });
	});
});
