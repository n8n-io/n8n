/**
 * Regression test for GHC-7036
 *
 * Bug: When two workflows have webhook nodes with the same custom path pattern
 * (e.g., /:workspaceid) but different webhookId values, only the last activated
 * workflow retains its webhook registration.
 *
 * Root cause: webhook_entity table uses (webhookPath, method) as primary key,
 * which doesn't include webhookId. When both webhooks resolve to the same
 * primary key (":workspaceid", "POST"), the second upsert overwrites the first.
 *
 * Expected: Both webhooks should be independently registered since each has
 * a unique webhookId that produces a unique full URL.
 */

import { testDb } from '@n8n/backend-test-utils';
import { WebhookEntity, WebhookRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { WebhookService } from '@/webhooks/webhook.service';

let webhookService: WebhookService;
let webhookRepository: WebhookRepository;

beforeAll(async () => {
	await testDb.init();

	webhookService = Container.get(WebhookService);
	webhookRepository = Container.get(WebhookRepository);
});

afterEach(async () => {
	await testDb.truncate(['WebhookEntity']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Webhook registration with duplicate paths (GHC-7036)', () => {
	/**
	 * Creates a webhook entity with the specified parameters
	 */
	const createWebhook = (
		workflowId: string,
		webhookPath: string,
		method: string,
		webhookId?: string,
	): WebhookEntity => {
		return Object.assign(new WebhookEntity(), {
			workflowId,
			webhookPath,
			method,
			node: 'Webhook',
			webhookId,
			pathLength: webhookPath.split('/').length,
		});
	};

	it('should allow multiple webhooks with the same dynamic path but different webhookIds', async () => {
		// This is the core bug: two workflows use the same custom path pattern
		// (e.g., /:workspaceid) but have different webhookIds
		const customPath = ':workspaceid';
		const webhookId1 = uuid();
		const webhookId2 = uuid();
		const workflowId1 = uuid();
		const workflowId2 = uuid();

		// Create first webhook
		const webhook1 = createWebhook(workflowId1, customPath, 'POST', webhookId1);
		await webhookService.storeWebhook(webhook1);

		// Create second webhook with same path but different webhookId
		const webhook2 = createWebhook(workflowId2, customPath, 'POST', webhookId2);
		await webhookService.storeWebhook(webhook2);

		// Query the database
		const allWebhooks = await webhookRepository.findBy({
			webhookPath: customPath,
			method: 'POST',
		});

		// BUG: This will fail - only 1 webhook is registered instead of 2
		// The second upsert overwrites the first because the primary key is
		// (webhookPath, method) which doesn't include webhookId
		expect(allWebhooks).toHaveLength(2);

		// Verify both webhookIds are present
		const registeredWebhookIds = allWebhooks.map((w) => w.webhookId);
		expect(registeredWebhookIds).toContain(webhookId1);
		expect(registeredWebhookIds).toContain(webhookId2);

		// Verify each webhook points to correct workflow
		const storedWebhook1 = allWebhooks.find((w) => w.webhookId === webhookId1);
		const storedWebhook2 = allWebhooks.find((w) => w.webhookId === webhookId2);

		expect(storedWebhook1?.workflowId).toBe(workflowId1);
		expect(storedWebhook2?.workflowId).toBe(workflowId2);
	});

	it('should allow webhooks with different dynamic paths to coexist', async () => {
		// Verify that webhooks with different paths work fine (this should pass)
		const path1 = ':workspaceid';
		const path2 = ':userid';
		const webhookId1 = uuid();
		const webhookId2 = uuid();
		const workflowId1 = uuid();
		const workflowId2 = uuid();

		const webhook1 = createWebhook(workflowId1, path1, 'POST', webhookId1);
		await webhookService.storeWebhook(webhook1);

		const webhook2 = createWebhook(workflowId2, path2, 'POST', webhookId2);
		await webhookService.storeWebhook(webhook2);

		const allWebhooks = await webhookRepository.find();

		// This should work fine since paths are different
		expect(allWebhooks).toHaveLength(2);
	});

	it('should allow webhook lookup by full path including webhookId', async () => {
		const customPath = ':userid';
		const webhookId1 = uuid();
		const webhookId2 = uuid();
		const workflowId1 = uuid();
		const workflowId2 = uuid();

		const webhook1 = createWebhook(workflowId1, customPath, 'POST', webhookId1);
		await webhookService.storeWebhook(webhook1);

		const webhook2 = createWebhook(workflowId2, customPath, 'POST', webhookId2);
		await webhookService.storeWebhook(webhook2);

		// Try to find webhooks by their full paths (webhookId + path)
		// Full path format: webhookId/actual-value
		const fullPath1 = `${webhookId1}/12345`;
		const fullPath2 = `${webhookId2}/67890`;

		const foundWebhook1 = await webhookService.findWebhook('POST', fullPath1);
		const foundWebhook2 = await webhookService.findWebhook('POST', fullPath2);

		// Both webhooks should be found
		expect(foundWebhook1).toBeDefined();
		expect(foundWebhook2).toBeDefined();
		expect(foundWebhook1?.workflowId).toBe(workflowId1);
		expect(foundWebhook2?.workflowId).toBe(workflowId2);
	});

	it('should correctly handle static webhooks (current behavior - last write wins)', async () => {
		// Static paths don't have dynamic segments or webhookId
		// For static paths, the current behavior of last-write-wins is expected
		const staticPath = 'my-static-webhook';
		const workflowId1 = uuid();
		const workflowId2 = uuid();

		const webhook1 = createWebhook(workflowId1, staticPath, 'POST');
		await webhookService.storeWebhook(webhook1);

		const webhook2 = createWebhook(workflowId2, staticPath, 'POST');
		await webhookService.storeWebhook(webhook2);

		const registeredWebhooks = await webhookRepository.findBy({
			webhookPath: staticPath,
			method: 'POST',
		});

		// For static paths, upsert is expected to replace
		expect(registeredWebhooks).toHaveLength(1);
		expect(registeredWebhooks[0].workflowId).toBe(workflowId2);
	});
});
