import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import {
	createTestEngine,
	destroyTestEngine,
	saveWorkflow,
	saveWorkflowVersion,
	executeAndWait,
	getExecution,
	cleanDatabase,
} from './test-engine';
import type { TestEngine } from './test-engine';
import { WorkflowEntity } from '../../src/database/entities/workflow.entity';
import type { ExecutionCompletedEvent } from '../../src/engine/event-bus.types';

describe.skipIf(!process.env.DATABASE_URL)('Versioning', () => {
	let engine: TestEngine;

	beforeAll(async () => {
		engine = await createTestEngine();
	});

	afterAll(async () => {
		await destroyTestEngine(engine);
	});

	afterEach(async () => {
		await cleanDatabase(engine.dataSource);
		engine.stepProcessor.clearModuleCache();
	});

	// -----------------------------------------------------------------------
	// First save creates version 1
	// -----------------------------------------------------------------------

	it('creates version 1 on first save', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'V1',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ v: 1 }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);

		const workflow = await engine.dataSource
			.getRepository(WorkflowEntity)
			.createQueryBuilder('w')
			.where('w.id = :id', { id: workflowId })
			.getOne();

		expect(workflow).toBeDefined();
		expect(workflow!.version).toBe(1);
	});

	// -----------------------------------------------------------------------
	// Subsequent save creates version 2 (new row, version 1 unchanged)
	// -----------------------------------------------------------------------

	it('creates version 2 on subsequent save, preserving version 1', async () => {
		const sourceV1 = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'V1',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ v: 1 }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, sourceV1);

		const sourceV2 = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'V2',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ v: 2 }));
		return result;
	},
});
`;

		const v2 = await saveWorkflowVersion(engine, workflowId, sourceV2, { name: 'V2' });
		expect(v2).toBe(2);

		// Both versions should exist in the database
		const versions = await engine.dataSource
			.getRepository(WorkflowEntity)
			.createQueryBuilder('w')
			.where('w.id = :id', { id: workflowId })
			.orderBy('w.version', 'ASC')
			.getMany();

		expect(versions).toHaveLength(2);
		expect(versions[0].version).toBe(1);
		expect(versions[0].name).toBe('Test Workflow');
		expect(versions[1].version).toBe(2);
		expect(versions[1].name).toBe('V2');
	});

	// -----------------------------------------------------------------------
	// Execution pins workflow version
	// -----------------------------------------------------------------------

	it('execution pins workflow_version at creation time', async () => {
		const sourceV1 = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Pin',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ version: 1 }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, sourceV1);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ version: 1 });

		const execution = await getExecution(engine, result.executionId);
		expect(execution.workflowVersion).toBe(1);
	});

	// -----------------------------------------------------------------------
	// Modifying workflow after execution start doesn't affect running execution
	// -----------------------------------------------------------------------

	it('modifying workflow after execution does not affect previous execution', async () => {
		const sourceV1 = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Pinned',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ version: 1, data: 'original' }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, sourceV1);

		// Execute v1
		const result1 = await executeAndWait(engine, workflowId);
		expect(result1.status).toBe('completed');
		expect(result1.result).toEqual({ version: 1, data: 'original' });

		// Save v2 with different output
		const sourceV2 = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Pinned',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ version: 2, data: 'modified' }));
		return result;
	},
});
`;

		await saveWorkflowVersion(engine, workflowId, sourceV2);
		engine.stepProcessor.clearModuleCache();

		// Execute again -- should use v2
		const result2 = await executeAndWait(engine, workflowId);
		expect(result2.status).toBe('completed');
		expect(result2.result).toEqual({ version: 2, data: 'modified' });

		// Verify the first execution still has v1
		const exec1 = await getExecution(engine, result1.executionId);
		expect(exec1.workflowVersion).toBe(1);

		// Verify the second execution has v2
		const exec2 = await getExecution(engine, result2.executionId);
		expect(exec2.workflowVersion).toBe(2);
	});

	// -----------------------------------------------------------------------
	// Old versions are never deleted
	// -----------------------------------------------------------------------

	it('old versions are never deleted when new versions are created', async () => {
		const makeSource = (v: number) => `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Versioned',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ version: ${v} }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, makeSource(1));
		await saveWorkflowVersion(engine, workflowId, makeSource(2));
		await saveWorkflowVersion(engine, workflowId, makeSource(3));
		await saveWorkflowVersion(engine, workflowId, makeSource(4));

		// All 4 versions should exist
		const versions = await engine.dataSource
			.getRepository(WorkflowEntity)
			.createQueryBuilder('w')
			.where('w.id = :id', { id: workflowId })
			.orderBy('w.version', 'ASC')
			.getMany();

		expect(versions).toHaveLength(4);
		expect(versions.map((v) => v.version)).toEqual([1, 2, 3, 4]);

		// Each version should have its own compiled code
		for (const v of versions) {
			expect(v.code).toContain(`version: ${v.version}`);
			expect(v.compiledCode).toBeTruthy();
		}
	});

	// -----------------------------------------------------------------------
	// Specific version can be loaded
	// -----------------------------------------------------------------------

	it('can execute a specific version', async () => {
		const sourceV1 = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Specific',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ version: 1 }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, sourceV1);

		const sourceV2 = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Specific',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ version: 2 }));
		return result;
	},
});
`;

		await saveWorkflowVersion(engine, workflowId, sourceV2);
		engine.stepProcessor.clearModuleCache();

		// Execute with explicit version 1
		const result = await new Promise<{
			executionId: string;
			status: string;
			result?: unknown;
		}>((resolve, reject) => {
			engine.engineService
				.startExecution(workflowId, undefined, 'test', 1)
				.then((executionId) => {
					const timeout = setTimeout(() => reject(new Error('Timeout')), 15_000);
					engine.eventBus.on<ExecutionCompletedEvent>('execution:completed', (event) => {
						if (event.executionId === executionId) {
							clearTimeout(timeout);
							resolve({
								executionId,
								status: 'completed',
								result: (event as ExecutionCompletedEvent).result,
							});
						}
					});
					engine.eventBus.on('execution:failed', (event) => {
						if (event.executionId === executionId) {
							clearTimeout(timeout);
							resolve({ executionId, status: 'failed' });
						}
					});
				})
				.catch(reject);
		});

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ version: 1 });

		// Verify the execution pinned to version 1
		const execution = await getExecution(engine, result.executionId);
		expect(execution.workflowVersion).toBe(1);
	});
});
