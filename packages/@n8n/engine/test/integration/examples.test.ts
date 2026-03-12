import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import {
	createTestEngine,
	destroyTestEngine,
	saveWorkflow,
	executeAndWait,
	cleanDatabase,
} from './test-engine';
import type { TestEngine } from './test-engine';

const EXAMPLES_DIR = join(__dirname, '../../examples');

/**
 * Integration tests that compile and execute the example workflows from
 * the examples/ directory against a real PostgreSQL database.
 *
 * These tests are skipped when DATABASE_URL is not set (e.g. `pnpm test:unit`).
 * Run with `pnpm test` or `pnpm test:db` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)('Example workflow execution', () => {
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

	/**
	 * Read an example file, compile it, save it to the database, execute it,
	 * and wait for a terminal state. Returns the execution result.
	 */
	async function runExample(
		fileName: string,
		options?: {
			triggerData?: unknown;
			timeoutMs?: number;
		},
	) {
		const source = readFileSync(join(EXAMPLES_DIR, fileName), 'utf-8');
		const workflowId = await saveWorkflow(engine, source, { name: fileName });
		return executeAndWait(engine, workflowId, options?.triggerData, options?.timeoutMs ?? 30_000);
	}

	// -----------------------------------------------------------------------
	// 01 - Hello World
	// -----------------------------------------------------------------------

	it('01-hello-world executes successfully', async () => {
		const result = await runExample('01-hello-world.ts');

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns { formatted: "..." } from the Format Message step
		expect(result.result).toHaveProperty('formatted');
	}, 30_000);

	// -----------------------------------------------------------------------
	// 02 - Conditional Logic
	// -----------------------------------------------------------------------

	it('02-conditional-logic executes successfully', async () => {
		const result = await runExample('02-conditional-logic.ts');

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns the product data with product, amount, category
		const output = result.result as Record<string, unknown>;
		expect(output).toHaveProperty('product');
		expect(output).toHaveProperty('amount');
		expect(output).toHaveProperty('category');
	}, 30_000);

	// -----------------------------------------------------------------------
	// 03 - Helper Functions
	// -----------------------------------------------------------------------

	it('03-helper-functions executes successfully', async () => {
		const result = await runExample('03-helper-functions.ts');

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns an array of category report objects
		const output = result.result as Array<Record<string, unknown>>;
		expect(Array.isArray(output)).toBe(true);
		expect(output.length).toBeGreaterThan(0);
		expect(output[0]).toHaveProperty('category');
		expect(output[0]).toHaveProperty('count');
		expect(output[0]).toHaveProperty('totalValue');
	}, 30_000);

	// -----------------------------------------------------------------------
	// 04 - Parallel Steps
	// -----------------------------------------------------------------------

	it('04-parallel-steps executes successfully', async () => {
		const result = await runExample('04-parallel-steps.ts');

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns merged results with query, totalResults, products, users
		const output = result.result as Record<string, unknown>;
		expect(output).toHaveProperty('query', 'phone');
		expect(output).toHaveProperty('totalResults');
		expect(output).toHaveProperty('products');
		expect(output).toHaveProperty('users');
	}, 30_000);

	// -----------------------------------------------------------------------
	// 05 - Retry with Backoff
	// -----------------------------------------------------------------------

	it('05-retry-backoff executes successfully after retries', async () => {
		const result = await runExample('05-retry-backoff.ts', { timeoutMs: 30_000 });

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns a summary including attemptsNeeded: 3
		const output = result.result as Record<string, unknown>;
		expect(output).toHaveProperty('success', true);
		expect(output).toHaveProperty('attemptsNeeded', 3);
	}, 30_000);

	// -----------------------------------------------------------------------
	// 06 - Error Handling (expects failure)
	// -----------------------------------------------------------------------

	it('06-error-handling fails with TypeError as expected', async () => {
		const result = await runExample('06-error-handling.ts', { timeoutMs: 30_000 });

		expect(result.status).toBe('failed');
		// The first step retries and succeeds, the second step throws a TypeError
		expect(result.error).toBeDefined();
	}, 30_000);

	// -----------------------------------------------------------------------
	// 07 - Streaming Output
	// -----------------------------------------------------------------------

	it('07-streaming-output executes successfully', async () => {
		const result = await runExample('07-streaming-output.ts');

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns { fullText, totalChunks }
		const output = result.result as Record<string, unknown>;
		expect(output).toHaveProperty('fullText');
		expect(output).toHaveProperty('totalChunks', 11);
		expect(output.fullText).toBe('Hello world, this is streaming!');
	}, 30_000);

	// -----------------------------------------------------------------------
	// 08 - Webhook Echo
	// -----------------------------------------------------------------------

	it('08-webhook-echo executes successfully with trigger data', async () => {
		const result = await runExample('08-webhook-echo.ts', {
			triggerData: {
				body: { message: 'test' },
				headers: { 'x-sender': 'integration-test' },
				query: { urgent: 'true' },
			},
		});

		expect(result.status).toBe('completed');
	}, 30_000);

	// -----------------------------------------------------------------------
	// 09 - Data Pipeline
	// -----------------------------------------------------------------------

	it('09-data-pipeline executes successfully', async () => {
		const result = await runExample('09-data-pipeline.ts');

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns { valid, report, count, completedAt }
		const output = result.result as Record<string, unknown>;
		expect(output).toHaveProperty('valid', true);
		expect(output).toHaveProperty('report');
		expect(output).toHaveProperty('count');
		expect(output).toHaveProperty('completedAt');
		expect(typeof output.report).toBe('string');
		expect(output.count).toBeGreaterThan(0);
	}, 30_000);

	// -----------------------------------------------------------------------
	// 10 - Approval Flow (skipped: requires human interaction)
	// -----------------------------------------------------------------------

	it.skip('10-approval-flow (requires human interaction)', () => {});

	// -----------------------------------------------------------------------
	// 11 - Sleep and Resume (skipped: requires waiting for sleep timer)
	// -----------------------------------------------------------------------

	it.skip('11-sleep-and-resume (requires waiting for sleep timer)', () => {});

	// -----------------------------------------------------------------------
	// 12 - Multi Wait Pipeline (skipped: requires waiting for sleep/waitUntil)
	// -----------------------------------------------------------------------

	it.skip('12-multi-wait-pipeline (requires waiting for sleep/waitUntil)', () => {});

	// -----------------------------------------------------------------------
	// 13 - AI Chat Streaming (skipped: requires credentials / webhook)
	// -----------------------------------------------------------------------

	it.skip('13-ai-chat-streaming (requires credentials / webhook)', () => {});

	// -----------------------------------------------------------------------
	// 14 - Reference Error (expects failure)
	// -----------------------------------------------------------------------

	it('14-reference-error fails with ReferenceError as expected', async () => {
		const result = await runExample('14-reference-error.ts');

		expect(result.status).toBe('failed');
		expect(result.error).toBeDefined();
	}, 30_000);

	// -----------------------------------------------------------------------
	// 15 - Retriable Error
	// -----------------------------------------------------------------------

	it('15-retriable-error completes successfully after retries', async () => {
		const result = await runExample('15-retriable-error.ts', { timeoutMs: 30_000 });

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns { success, totalAttempts, message }
		const output = result.result as Record<string, unknown>;
		expect(output).toHaveProperty('success', true);
		expect(output).toHaveProperty('totalAttempts', 3);
	}, 30_000);

	// -----------------------------------------------------------------------
	// 16 - Pausable Workflow (skipped: requires long-running steps)
	// -----------------------------------------------------------------------

	it.skip('16-pausable-workflow (requires long-running steps)', () => {});

	// -----------------------------------------------------------------------
	// 17 - Streaming Webhook (skipped: requires webhook interaction)
	// -----------------------------------------------------------------------

	it.skip('17-streaming-webhook (requires webhook interaction)', () => {});

	// -----------------------------------------------------------------------
	// 18 - Batch Processing
	// -----------------------------------------------------------------------

	it('18-batch-processing executes successfully', async () => {
		const result = await runExample('18-batch-processing.ts');

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns { total, succeeded, failed, topScores }
		const output = result.result as Record<string, unknown>;
		expect(output).toHaveProperty('total');
		expect(output).toHaveProperty('succeeded');
		expect(output).toHaveProperty('failed');
		expect(output).toHaveProperty('topScores');
		expect(output.total as number).toBeGreaterThan(0);
		expect(output.succeeded as number).toBeGreaterThan(0);
	}, 30_000);

	// -----------------------------------------------------------------------
	// 19 - Trigger Workflow (skipped: requires target workflow to exist)
	// -----------------------------------------------------------------------

	it.skip('19-trigger-workflow (requires target workflow to exist)', () => {});

	// -----------------------------------------------------------------------
	// 20 - Order Routing
	// -----------------------------------------------------------------------

	it('20-order-routing executes successfully with trigger data', async () => {
		const result = await runExample('20-order-routing.ts', {
			triggerData: {
				body: { type: 'order', id: 'ORD-001', amount: 99.99 },
			},
		});

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The workflow returns { status: 'processed', orderId, total }
		const output = result.result as Record<string, unknown>;
		expect(output).toHaveProperty('status', 'processed');
		expect(output).toHaveProperty('orderId', 'ORD-001');
		expect(output).toHaveProperty('total');
	}, 30_000);

	// -----------------------------------------------------------------------
	// 21 - Product Catalog
	// -----------------------------------------------------------------------

	it('21-product-catalog executes successfully with trigger data', async () => {
		const result = await runExample('21-product-catalog.ts', {
			triggerData: {
				query: { category: 'books' },
			},
		});

		expect(result.status).toBe('completed');
		expect(result.result).toBeDefined();
		// The 'books' branch returns { products: [...], category: 'books' }
		const output = result.result as Record<string, unknown>;
		expect(output).toHaveProperty('products');
		expect(output).toHaveProperty('category', 'books');
	}, 30_000);
});
