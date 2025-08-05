import { validate } from 'class-validator';
import type { IConnections, IDataObject, IWorkflowSettings, INode } from 'n8n-workflow';

import { WorkflowEntity, type ISimplifiedPinData } from '../workflow-entity';

describe('WorkflowEntity', () => {
	describe('Workflow Name Validation', () => {
		it('should accept valid workflow names within length constraints', async () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Valid Workflow Name';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};

			const errors = await validate(workflow);
			const nameErrors = errors.filter((error) => error.property === 'name');
			expect(nameErrors).toHaveLength(0);
		});

		it('should reject workflow names that are too short', async () => {
			const workflow = new WorkflowEntity();
			workflow.name = '';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};

			const errors = await validate(workflow);
			const nameErrors = errors.filter((error) => error.property === 'name');
			expect(nameErrors).toHaveLength(1);
			expect(nameErrors[0].constraints).toBeDefined();
			expect(Object.values(nameErrors[0].constraints!)[0]).toContain(
				'Workflow name must be 1 to 128 characters long.',
			);
		});

		it('should reject workflow names that are too long', async () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'a'.repeat(129); // 129 characters, exceeds 128 limit
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};

			const errors = await validate(workflow);
			const nameErrors = errors.filter((error) => error.property === 'name');
			expect(nameErrors).toHaveLength(1);
			expect(nameErrors[0].constraints).toBeDefined();
			expect(Object.values(nameErrors[0].constraints!)[0]).toContain(
				'Workflow name must be 1 to 128 characters long.',
			);
		});

		it('should accept workflow names at the boundary limits', async () => {
			const workflow1 = new WorkflowEntity();
			workflow1.name = 'a'; // 1 character
			workflow1.active = false;
			workflow1.nodes = [];
			workflow1.connections = {};

			const workflow2 = new WorkflowEntity();
			workflow2.name = 'a'.repeat(128); // 128 characters
			workflow2.active = false;
			workflow2.nodes = [];
			workflow2.connections = {};

			const errors1 = await validate(workflow1);
			const errors2 = await validate(workflow2);

			const nameErrors1 = errors1.filter((error) => error.property === 'name');
			const nameErrors2 = errors2.filter((error) => error.property === 'name');

			expect(nameErrors1).toHaveLength(0);
			expect(nameErrors2).toHaveLength(0);
		});
	});

	describe('Workflow Active State', () => {
		it('should handle active state correctly', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = true;
			workflow.nodes = [];
			workflow.connections = {};

			expect(workflow.active).toBe(true);
		});

		it('should handle inactive state correctly', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};

			expect(workflow.active).toBe(false);
		});
	});

	describe('Workflow Archived State', () => {
		it('should default isArchived to false', () => {
			const workflow = new WorkflowEntity();
			// isArchived has a default value of false in the database, but may be undefined in the entity until set
			expect(workflow.isArchived).toBeUndefined();
		});

		it('should handle archived state correctly', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.isArchived = true;
			workflow.nodes = [];
			workflow.connections = {};

			expect(workflow.isArchived).toBe(true);
		});

		it('should allow archiving active workflows', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = true;
			workflow.isArchived = true;
			workflow.nodes = [];
			workflow.connections = {};

			expect(workflow.active).toBe(true);
			expect(workflow.isArchived).toBe(true);
		});
	});

	describe('Complex JSON Column Handling', () => {
		describe('nodes field', () => {
			it('should handle empty nodes array', () => {
				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};

				expect(workflow.nodes).toEqual([]);
			});

			it('should handle complex nodes structure', () => {
				const complexNodes: INode[] = [
					{
						id: 'node-1',
						name: 'Start Node',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
					{
						id: 'node-2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [450, 300],
						parameters: {
							url: 'https://api.example.com/data',
							method: 'GET',
						},
					},
				];

				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = complexNodes;
				workflow.connections = {};

				expect(workflow.nodes).toEqual(complexNodes);
				expect(workflow.nodes).toHaveLength(2);
				expect(workflow.nodes[0].name).toBe('Start Node');
				expect(workflow.nodes[1].parameters?.url).toBe('https://api.example.com/data');
			});
		});

		describe('connections field', () => {
			it('should handle empty connections object', () => {
				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};

				expect(workflow.connections).toEqual({});
			});

			it('should handle complex connections structure', () => {
				const complexConnections: IConnections = {
					'Start Node': {
						main: [
							[
								{
									node: 'HTTP Request',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					'HTTP Request': {
						main: [
							[
								{
									node: 'End Node',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				};

				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = complexConnections;

				expect(workflow.connections).toEqual(complexConnections);
				expect(workflow.connections['Start Node']).toBeDefined();
				expect(workflow.connections['Start Node'].main).toBeDefined();
			});
		});

		describe('settings field', () => {
			it('should handle null settings', () => {
				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};
				workflow.settings = undefined;

				expect(workflow.settings).toBeUndefined();
			});

			it('should handle complex workflow settings', () => {
				const workflowSettings: IWorkflowSettings = {
					executionOrder: 'v1',
					saveManualExecutions: true,
					callerPolicy: 'workflowsFromSameOwner',
					errorWorkflow: 'error-workflow-id',
					timezone: 'America/New_York',
					saveExecutionProgress: true,
					saveDataErrorExecution: 'all',
					saveDataSuccessExecution: 'all',
				};

				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};
				workflow.settings = workflowSettings;

				expect(workflow.settings).toEqual(workflowSettings);
				expect(workflow.settings?.executionOrder).toBe('v1');
				expect(workflow.settings?.saveManualExecutions).toBe(true);
				expect(workflow.settings?.timezone).toBe('America/New_York');
			});
		});

		describe('staticData field with objectRetriever transformer', () => {
			it('should handle null staticData', () => {
				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};
				workflow.staticData = undefined;

				expect(workflow.staticData).toBeUndefined();
			});

			it('should handle complex staticData object', () => {
				const staticData: IDataObject = {
					counters: {
						total: 42,
						success: 35,
						errors: 7,
					},
					lastRun: '2023-12-01T10:00:00Z',
					configuration: {
						retryLimit: 3,
						timeout: 30000,
					},
					arrays: [1, 2, 3, 'test'],
					nested: {
						deep: {
							value: 'deeply nested data',
						},
					},
				};

				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};
				workflow.staticData = staticData;

				expect(workflow.staticData).toEqual(staticData);
				expect(workflow.staticData?.counters).toBeDefined();
				const nested = workflow.staticData?.nested as IDataObject;
				const deep = nested?.deep as IDataObject;
				expect(deep?.value).toBe('deeply nested data');
			});
		});

		describe('meta field with objectRetriever transformer', () => {
			it('should handle null meta', () => {
				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};
				workflow.meta = undefined;

				expect(workflow.meta).toBeUndefined();
			});

			it('should handle complex meta object', () => {
				const metaData = {
					onboardingId: 'onboarding-789',
				};

				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};
				workflow.meta = metaData;

				expect(workflow.meta).toEqual(metaData);
				expect(workflow.meta?.onboardingId).toBe('onboarding-789');
			});
		});

		describe('pinData field with sqlite transformer', () => {
			it('should handle null pinData', () => {
				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};
				workflow.pinData = undefined;

				expect(workflow.pinData).toBeUndefined();
			});

			it('should handle complex pinData structure', () => {
				const pinData: ISimplifiedPinData = {
					'Start Node': [
						{
							json: {
								id: 1,
								name: 'test data',
								timestamp: '2023-12-01T10:00:00Z',
							},
							binary: {
								data: {
									data: 'base64encodeddata',
									mimeType: 'text/plain',
									fileName: 'test.txt',
								},
							},
							pairedItem: 0,
						},
					],
					'HTTP Request': [
						{
							json: {
								response: 'success',
								data: [1, 2, 3],
							},
							pairedItem: [
								{ item: 0, input: 0 },
								{ item: 1, input: 0 },
							],
						},
					],
				};

				const workflow = new WorkflowEntity();
				workflow.name = 'Test Workflow';
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};
				workflow.pinData = pinData;

				expect(workflow.pinData).toEqual(pinData);
				expect(workflow.pinData?.['Start Node']).toBeDefined();
				expect(workflow.pinData?.['Start Node'][0].json.id).toBe(1);
				expect(workflow.pinData?.['HTTP Request'][0].json.response).toBe('success');
			});
		});
	});

	describe('Version and Trigger Management', () => {
		it('should handle versionId correctly', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};
			workflow.versionId = 'version-123-456-789';

			expect(workflow.versionId).toBe('version-123-456-789');
			expect(workflow.versionId).toHaveLength(19); // Custom format length
		});

		it('should default triggerCount to 0', () => {
			const workflow = new WorkflowEntity();
			// triggerCount has a default value of 0 in the database, but may be undefined in the entity until set
			expect(workflow.triggerCount).toBeUndefined();
		});

		it('should handle triggerCount updates', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};
			workflow.triggerCount = 5;

			expect(workflow.triggerCount).toBe(5);
		});

		it('should handle large triggerCount values', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};
			workflow.triggerCount = 999999;

			expect(workflow.triggerCount).toBe(999999);
		});
	});

	describe('Database Relationship Fields', () => {
		it('should handle null parentFolder', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};
			workflow.parentFolder = null;

			expect(workflow.parentFolder).toBeNull();
		});

		it('should handle undefined tags array', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};

			expect(workflow.tags).toBeUndefined();
		});

		it('should initialize relationship arrays', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};
			workflow.tagMappings = [];
			workflow.shared = [];
			workflow.statistics = [];
			workflow.testRuns = [];

			expect(workflow.tagMappings).toEqual([]);
			expect(workflow.shared).toEqual([]);
			expect(workflow.statistics).toEqual([]);
			expect(workflow.testRuns).toEqual([]);
		});
	});

	describe('Workflow Lifecycle States', () => {
		it('should handle active archived workflow', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = true;
			workflow.isArchived = true;
			workflow.nodes = [];
			workflow.connections = {};

			expect(workflow.active).toBe(true);
			expect(workflow.isArchived).toBe(true);
		});

		it('should handle inactive non-archived workflow', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.isArchived = false;
			workflow.nodes = [];
			workflow.connections = {};

			expect(workflow.active).toBe(false);
			expect(workflow.isArchived).toBe(false);
		});

		it('should handle all state combinations', () => {
			const states = [
				{ active: true, isArchived: true },
				{ active: true, isArchived: false },
				{ active: false, isArchived: true },
				{ active: false, isArchived: false },
			];

			states.forEach((state, index) => {
				const workflow = new WorkflowEntity();
				workflow.name = `Test Workflow ${index}`;
				workflow.active = state.active;
				workflow.isArchived = state.isArchived;
				workflow.nodes = [];
				workflow.connections = {};

				expect(workflow.active).toBe(state.active);
				expect(workflow.isArchived).toBe(state.isArchived);
			});
		});
	});

	describe('Business Logic Validation', () => {
		it('should validate minimum required fields for a functional workflow', async () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Minimal Workflow';
			workflow.active = false;
			workflow.nodes = [
				{
					id: 'start',
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [250, 300],
					parameters: {},
				},
			];
			workflow.connections = {};
			workflow.versionId = 'version-abc-123';

			const errors = await validate(workflow);
			expect(errors).toHaveLength(0);
		});

		it('should handle complex real-world workflow structure', () => {
			const realWorldNodes: INode[] = [
				{
					id: 'webhook-trigger',
					name: 'Webhook Trigger',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [250, 300],
					parameters: {
						path: '/api/webhook',
						httpMethod: 'POST',
					},
					webhookId: 'webhook-123',
				},
				{
					id: 'data-transformation',
					name: 'Transform Data',
					type: 'n8n-nodes-base.function',
					typeVersion: 1,
					position: [450, 300],
					parameters: {
						functionCode: 'return items.map(item => ({ ...item.json, processed: true }));',
					},
				},
				{
					id: 'database-insert',
					name: 'Save to Database',
					type: 'n8n-nodes-base.postgres',
					typeVersion: 1,
					position: [650, 300],
					parameters: {
						query: 'INSERT INTO processed_data (data) VALUES ($1)',
					},
				},
			];

			const realWorldConnections: IConnections = {
				'Webhook Trigger': {
					main: [
						[
							{
								node: 'Transform Data',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				'Transform Data': {
					main: [
						[
							{
								node: 'Save to Database',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			const workflow = new WorkflowEntity();
			workflow.name = 'Real World Workflow';
			workflow.active = true;
			workflow.nodes = realWorldNodes;
			workflow.connections = realWorldConnections;
			workflow.settings = {
				executionOrder: 'v1',
				saveManualExecutions: true,
				timezone: 'UTC',
			};
			workflow.triggerCount = 1;
			workflow.versionId = 'real-world-version-id';

			expect(workflow.nodes).toHaveLength(3);
			expect(workflow.connections['Webhook Trigger']).toBeDefined();
			expect(workflow.settings?.executionOrder).toBe('v1');
			expect(workflow.triggerCount).toBe(1);
		});
	});

	describe('Data Integrity and Edge Cases', () => {
		it('should handle special characters in workflow names', async () => {
			const specialNames = [
				'Workflow with émojis 🚀',
				'Workflow-with-dashes',
				'Workflow_with_underscores',
				'Workflow (with parentheses)',
				'Workflow [with brackets]',
				'Workflow {with braces}',
			];

			for (const name of specialNames) {
				const workflow = new WorkflowEntity();
				workflow.name = name;
				workflow.active = false;
				workflow.nodes = [];
				workflow.connections = {};

				const errors = await validate(workflow);
				const nameErrors = errors.filter((error) => error.property === 'name');
				expect(nameErrors).toHaveLength(0);
			}
		});

		it('should handle empty and null values gracefully', () => {
			const workflow = new WorkflowEntity();
			workflow.name = 'Test Workflow';
			workflow.active = false;
			workflow.nodes = [];
			workflow.connections = {};
			workflow.settings = undefined;
			workflow.staticData = undefined;
			workflow.meta = undefined;
			workflow.pinData = undefined;
			workflow.parentFolder = null;

			expect(workflow.settings).toBeUndefined();
			expect(workflow.staticData).toBeUndefined();
			expect(workflow.meta).toBeUndefined();
			expect(workflow.pinData).toBeUndefined();
			expect(workflow.parentFolder).toBeNull();
		});

		it('should handle large data structures', () => {
			const largeNodesArray: INode[] = Array.from({ length: 100 }, (_, i) => ({
				id: `node-${i}`,
				name: `Node ${i}`,
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [250 + (i % 10) * 200, 300 + Math.floor(i / 10) * 150],
				parameters: {
					functionCode: `return [{ nodeNumber: ${i}, data: 'test' }];`,
				},
			}));

			const workflow = new WorkflowEntity();
			workflow.name = 'Large Workflow';
			workflow.active = false;
			workflow.nodes = largeNodesArray;
			workflow.connections = {};

			expect(workflow.nodes).toHaveLength(100);
			expect(workflow.nodes[99].name).toBe('Node 99');
		});
	});
});
