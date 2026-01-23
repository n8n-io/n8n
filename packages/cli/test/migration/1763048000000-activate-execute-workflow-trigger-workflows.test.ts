import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'ActivateExecuteWorkflowTriggerWorkflows1763048000000';

interface WorkflowData {
	id: string;
	name: string;
	nodes: object[];
	connections: object;
	active: boolean;
	versionId: string;
	createdAt: Date;
	updatedAt: Date;
}

interface WorkflowRow {
	id: string;
	name: string;
	active: boolean;
	nodes: string;
	versionId: string;
	activeVersionId: string | null;
}

describe('ActivateExecuteWorkflowTriggerWorkflows Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertTestWorkflow(
		context: TestMigrationContext,
		workflowData: WorkflowData,
	): Promise<void> {
		const tableName = context.escape.tableName('workflow_entity');
		const idColumn = context.escape.columnName('id');
		const nameColumn = context.escape.columnName('name');
		const nodesColumn = context.escape.columnName('nodes');
		const connectionsColumn = context.escape.columnName('connections');
		const activeColumn = context.escape.columnName('active');
		const versionIdColumn = context.escape.columnName('versionId');
		const createdAtColumn = context.escape.columnName('createdAt');
		const updatedAtColumn = context.escape.columnName('updatedAt');

		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${idColumn}, ${nameColumn}, ${nodesColumn}, ${connectionsColumn}, ${activeColumn}, ${versionIdColumn}, ${createdAtColumn}, ${updatedAtColumn}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				workflowData.id,
				workflowData.name,
				JSON.stringify(workflowData.nodes),
				JSON.stringify(workflowData.connections),
				workflowData.active,
				workflowData.versionId,
				workflowData.createdAt,
				workflowData.updatedAt,
			],
		);
	}

	async function getWorkflowById(
		context: TestMigrationContext,
		id: string,
	): Promise<WorkflowRow | undefined> {
		const tableName = context.escape.tableName('workflow_entity');
		const idColumn = context.escape.columnName('id');
		const nameColumn = context.escape.columnName('name');
		const activeColumn = context.escape.columnName('active');
		const nodesColumn = context.escape.columnName('nodes');
		const versionIdColumn = context.escape.columnName('versionId');
		const activeVersionIdColumn = context.escape.columnName('activeVersionId');

		const [workflow] = await context.queryRunner.query(
			`SELECT ${idColumn} as id, ${nameColumn} as name, ${activeColumn} as active, ${nodesColumn} as nodes, ${versionIdColumn} as versionId, ${activeVersionIdColumn} as activeVersionId FROM ${tableName} WHERE ${idColumn} = ?`,
			[id],
		);

		return workflow;
	}

	describe('Up Migration', () => {
		const workflowIds = {
			passthrough: randomUUID(),
			jsonExample: randomUUID(),
			legacy: randomUUID(),
			version1NoParams: randomUUID(),
			version11MissingType: randomUUID(),
			invalid: randomUUID(),
			errorTrigger: randomUUID(),
			multipleTriggers: randomUUID(),
			normalWorkflow: randomUUID(),
			bothTriggers: randomUUID(),
			disabledExecuteWorkflowTrigger: randomUUID(),
			disabledErrorTrigger: randomUUID(),
			invalidJson: randomUUID(),
		};

		beforeAll(async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestWorkflow(context, {
				id: workflowIds.passthrough,
				name: 'Test Execute Workflow Trigger',
				nodes: [
					{
						id: randomUUID(),
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: { inputSource: 'passthrough' },
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.jsonExample,
				name: 'Test Execute Workflow Trigger JSON',
				nodes: [
					{
						id: randomUUID(),
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: { inputSource: 'jsonExample' },
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.legacy,
				name: 'Test Legacy Execute Workflow Trigger',
				nodes: [
					{
						id: randomUUID(),
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {
							workflowInputs: {
								values: [{ name: 'input1', type: 'string' }],
							},
						},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.invalid,
				name: 'Test Invalid Execute Workflow Trigger',
				nodes: [
					{
						id: randomUUID(),
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {
							workflowInputs: {
								values: [{ type: 'string' }], // missing 'name' field
							},
						},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.version1NoParams,
				name: 'Test Version 1 No Parameters',
				nodes: [
					{
						id: randomUUID(),
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.version11MissingType,
				name: 'Test Version 1.1 Missing Type',
				nodes: [
					{
						id: randomUUID(),
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {
							workflowInputs: {
								values: [{ name: 'chatInput' }, { name: 'sessionId' }, { name: 'env' }],
							},
						},
						typeVersion: 1.1,
						position: [0, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.errorTrigger,
				name: 'Test Error Trigger',
				nodes: [
					{
						id: randomUUID(),
						name: 'Error Trigger',
						type: 'n8n-nodes-base.errorTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.multipleTriggers,
				name: 'Test Multiple Triggers',
				nodes: [
					{
						id: randomUUID(),
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: { inputSource: 'passthrough' },
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: randomUUID(),
						name: 'Schedule Trigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
					{
						id: randomUUID(),
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						parameters: {},
						typeVersion: 1,
						position: [400, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.normalWorkflow,
				name: 'Test Normal Workflow',
				nodes: [
					{
						id: randomUUID(),
						name: 'Schedule Trigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.bothTriggers,
				name: 'Test Both Triggers',
				nodes: [
					{
						id: randomUUID(),
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: { inputSource: 'passthrough' },
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: randomUUID(),
						name: 'Error Trigger',
						type: 'n8n-nodes-base.errorTrigger',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.disabledExecuteWorkflowTrigger,
				name: 'Test Disabled Execute Workflow Trigger',
				nodes: [
					{
						id: randomUUID(),
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: { inputSource: 'passthrough' },
						typeVersion: 1,
						position: [0, 0],
						disabled: true,
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await insertTestWorkflow(context, {
				id: workflowIds.disabledErrorTrigger,
				name: 'Test Disabled Error Trigger',
				nodes: [
					{
						id: randomUUID(),
						name: 'Error Trigger',
						type: 'n8n-nodes-base.errorTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
						disabled: true,
					},
				],
				connections: {},
				active: false,
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			// Insert workflow with invalid JSON containing unescaped control characters
			const tableName = context.escape.tableName('workflow_entity');
			const idColumn = context.escape.columnName('id');
			const nameColumn = context.escape.columnName('name');
			const nodesColumn = context.escape.columnName('nodes');
			const connectionsColumn = context.escape.columnName('connections');
			const activeColumn = context.escape.columnName('active');
			const versionIdColumn = context.escape.columnName('versionId');
			const createdAtColumn = context.escape.columnName('createdAt');
			const updatedAtColumn = context.escape.columnName('updatedAt');

			await context.queryRunner.query(
				`INSERT INTO ${tableName} (${idColumn}, ${nameColumn}, ${nodesColumn}, ${connectionsColumn}, ${activeColumn}, ${versionIdColumn}, ${createdAtColumn}, ${updatedAtColumn}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					workflowIds.invalidJson,
					'Test Invalid JSON with Control Characters',
					// Invalid JSON with unescaped newline (simulating the production issue)
					'[{"id":"test","type":"n8n-nodes-base.executeWorkflowTrigger","parameters":{"inputSource":"passthrough","description":"MEASUREMENT DETAILS: \\"N/A\\"\\nMEASUREMENT TYPE: \\"N/A\\"\n"},"typeVersion":1,"position":[0,0]}]',
					'{}',
					false,
					randomUUID(),
					new Date(),
					new Date(),
				],
			);

			await runSingleMigration(MIGRATION_NAME);
			await context.queryRunner.release();
		});

		it('should activate workflows with Execute Workflow Trigger (passthrough)', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.passthrough);

			expect(workflow?.active).toBeTruthy();
			expect(workflow?.activeVersionId).toBeTruthy();

			await context.queryRunner.release();
		});

		it('should activate workflows with Execute Workflow Trigger (jsonExample)', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.jsonExample);

			expect(workflow?.active).toBeTruthy();

			await context.queryRunner.release();
		});

		it('should activate workflows with legacy Execute Workflow Trigger (with parameters)', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.legacy);

			expect(workflow?.active).toBeTruthy();

			await context.queryRunner.release();
		});

		it('should activate workflows with Version 1 Execute Workflow Trigger (no parameters)', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.version1NoParams);

			expect(workflow?.active).toBeTruthy();
			expect(workflow?.activeVersionId).toBeTruthy();

			await context.queryRunner.release();
		});

		it('should activate workflows with Version 1.1 Execute Workflow Trigger (missing type fields)', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.version11MissingType);

			expect(workflow?.active).toBeTruthy();
			expect(workflow?.activeVersionId).toBeTruthy();

			await context.queryRunner.release();
		});

		it('should NOT activate Execute Workflow Trigger without valid parameters', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.invalid);

			expect(workflow?.active).toBeFalsy();
			expect(workflow?.activeVersionId).toBeNull();

			await context.queryRunner.release();
		});

		it('should activate workflows with Error Trigger', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.errorTrigger);

			expect(workflow?.active).toBeTruthy();
			expect(workflow?.activeVersionId).toBeTruthy();

			await context.queryRunner.release();
		});

		it('should disable other trigger nodes in activated workflows', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.multipleTriggers);

			expect(workflow?.active).toBeTruthy();

			const nodes = JSON.parse(workflow!.nodes);
			const executeWorkflowTrigger = nodes.find(
				(n: { type: string }) => n.type === 'n8n-nodes-base.executeWorkflowTrigger',
			);
			const scheduleTrigger = nodes.find(
				(n: { type: string }) => n.type === 'n8n-nodes-base.scheduleTrigger',
			);
			const webhook = nodes.find((n: { type: string }) => n.type === 'n8n-nodes-base.webhook');

			expect(executeWorkflowTrigger.disabled).toBeUndefined();
			expect(scheduleTrigger.disabled).toBe(true);
			expect(webhook.disabled).toBeUndefined(); // Webhooks are not disabled

			await context.queryRunner.release();
		});

		it('should NOT activate workflows without Execute Workflow or Error Trigger', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.normalWorkflow);

			expect(workflow?.active).toBeFalsy();
			expect(workflow?.activeVersionId).toBeNull();

			await context.queryRunner.release();
		});

		it('should activate workflow with both Execute Workflow and Error Trigger', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.bothTriggers);

			expect(workflow?.active).toBeTruthy();

			await context.queryRunner.release();
		});

		it('should NOT activate workflow with disabled Execute Workflow Trigger', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.disabledExecuteWorkflowTrigger);

			expect(workflow?.active).toBeFalsy();
			expect(workflow?.activeVersionId).toBeNull();

			await context.queryRunner.release();
		});

		it('should NOT activate workflow with disabled Error Trigger', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.disabledErrorTrigger);

			expect(workflow?.active).toBeFalsy();
			expect(workflow?.activeVersionId).toBeNull();

			await context.queryRunner.release();
		});

		it('should skip workflows with invalid JSON containing unescaped control characters', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflow = await getWorkflowById(context, workflowIds.invalidJson);

			// Workflow should remain inactive and unchanged
			expect(workflow?.active).toBeFalsy();
			expect(workflow?.activeVersionId).toBeNull();

			// Verify the invalid JSON is still in the database (unchanged)
			expect(workflow?.nodes).toContain('MEASUREMENT DETAILS');

			await context.queryRunner.release();
		});
	});
});
