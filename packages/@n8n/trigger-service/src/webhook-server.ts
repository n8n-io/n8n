/**
 * Webhook server setup for trigger-service
 * This code was moved from packages/cli/src/abstract-server.ts
 */

import { Container } from '@n8n/di';
import type express from 'express';

import { LiveWebhooks } from './webhooks/live-webhooks';
import { TestWebhooks } from './webhooks/test-webhooks';
import { WaitingForms } from './webhooks/waiting-forms';
import { WaitingWebhooks } from './webhooks/waiting-webhooks';
import { createWebhookHandlerFor } from './webhooks/webhook-request-handler';

export interface WebhookServerConfig {
	app: express.Application;
	endpointForm: string;
	endpointFormTest: string;
	endpointFormWaiting: string;
	endpointWebhook: string;
	endpointWebhookTest: string;
	endpointWebhookWaiting: string;
	endpointMcp: string;
	endpointMcpTest: string;
	restEndpoint: string;
	webhooksEnabled: boolean;
	testWebhooksEnabled: boolean;
}

/**
 * Setup webhook routes on the Express app
 * This replaces the webhook route setup that was previously in CLI's abstract-server
 */
export function setupWebhookRoutes(config: WebhookServerConfig): void {
	const {
		app,
		endpointForm,
		endpointFormTest,
		endpointFormWaiting,
		endpointWebhook,
		endpointWebhookTest,
		endpointWebhookWaiting,
		endpointMcp,
		endpointMcpTest,
		restEndpoint,
		webhooksEnabled,
		testWebhooksEnabled,
	} = config;

	// Setup webhook handlers before bodyParser, to let the Webhook node handle binary data in requests
	if (webhooksEnabled) {
		const liveWebhooksRequestHandler = createWebhookHandlerFor(Container.get(LiveWebhooks));
		// Register a handler for live forms
		// @ts-expect-error - Express typing issue with wildcard routes
		app.all(`/${endpointForm}/*`, liveWebhooksRequestHandler);

		// Register a handler for live webhooks
		// @ts-expect-error - Express typing issue with wildcard routes
		app.all(`/${endpointWebhook}/*`, liveWebhooksRequestHandler);

		// Register a handler for waiting forms
		app.all(
			`/${endpointFormWaiting}/:path(*)`,
			// @ts-expect-error - Express typing issue with wildcard routes
			createWebhookHandlerFor(Container.get(WaitingForms)),
		);

		// Register a handler for waiting webhooks
		app.all(
			`/${endpointWebhookWaiting}/:path(*)`,
			// @ts-expect-error - Express typing issue with wildcard routes
			createWebhookHandlerFor(Container.get(WaitingWebhooks)),
		);

		// Register a handler for live MCP servers
		// @ts-expect-error - Express typing issue with wildcard routes
		app.all(`/${endpointMcp}/*`, liveWebhooksRequestHandler);
	}

	if (testWebhooksEnabled) {
		const testWebhooksRequestHandler = createWebhookHandlerFor(Container.get(TestWebhooks));

		// Register a handler
		// @ts-expect-error - Express typing issue with wildcard routes
		app.all(`/${endpointFormTest}/*`, testWebhooksRequestHandler);
		// @ts-expect-error - Express typing issue with wildcard routes
		app.all(`/${endpointWebhookTest}/*`, testWebhooksRequestHandler);

		// Register a handler for test MCP servers
		// @ts-expect-error - Express typing issue with wildcard routes
		app.all(`/${endpointMcpTest}/*`, testWebhooksRequestHandler);
	}

	if (testWebhooksEnabled) {
		const testWebhooks = Container.get(TestWebhooks);
		// Removes a test webhook
		// TODO UM: check if this needs validation with user management.
		app.delete(`/${restEndpoint}/test-webhook/:id`, async (req, res) => {
			try {
				const result = await testWebhooks.cancelWebhook(req.params.id);
				res.json(result);
			} catch (error) {
				res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
			}
		});
	}
}
