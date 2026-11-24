import type { GymManifest, Tenant } from '@n8n/ai-gym';
import type { Logger } from '@n8n/backend-common';
import type { INode } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { SimulationServiceConfig } from '../simulation-service.config';
import { SimulationServiceRuntimeService } from '../simulation-service-runtime.service';
import {
	composeEvalHttpHandlers,
	createSimulationServiceEvalHttpHandler,
} from '../eval-http-handler';

const dummyNode = { name: 'Tool', type: 'n8n-nodes-base.slackTool' } as INode;

describe('createSimulationServiceEvalHttpHandler', () => {
	it('simulates Slack, Linear, and Gmail calls in-process with lazy credential minting and excludes LLM hosts', async () => {
		const config = new SimulationServiceConfig();
		config.maxTenants = 4;
		const runtime = new SimulationServiceRuntimeService(config, mock<Logger>());

		try {
			const session = await runtime.createSession({ id: 'eval-http-handler-integration' });
			try {
				const handler = createSimulationServiceEvalHttpHandler({
					tenant: session.tenant,
					manifest: session.manifest,
					logger: mock<Logger>(),
				});

				// Slack: list channels, then post into the default channel.
				const channelsRes = await handler(
					{ url: 'https://slack.com/api/conversations.list', method: 'GET' },
					dummyNode,
				);
				expect(channelsRes?.statusCode).toBe(200);
				const channelsBody = channelsRes?.body as { ok: boolean; channels: Array<{ id: string }> };
				expect(channelsBody.ok).toBe(true);
				expect(channelsBody.channels.length).toBeGreaterThan(0);

				const postRes = await handler(
					{
						url: 'https://slack.com/api/chat.postMessage',
						method: 'POST',
						body: { channel: channelsBody.channels[0].id, text: 'eval message' },
					},
					dummyNode,
				);
				expect(postRes?.statusCode).toBe(200);
				expect((postRes?.body as { ok?: boolean } | undefined)?.ok).toBe(true);

				// Linear: GraphQL query using raw apiKey auth.
				const linearRes = await handler(
					{
						url: 'https://api.linear.app/graphql',
						method: 'POST',
						body: { query: '{ teams { nodes { id name } } }' },
					},
					dummyNode,
				);
				expect(linearRes?.statusCode).toBe(200);
				const linearBody = linearRes?.body as
					| { data?: { teams?: { nodes?: unknown[] } } }
					| undefined;
				expect(Array.isArray(linearBody?.data?.teams?.nodes)).toBe(true);

				// Gmail: auto-seeds before minting and exchanges OAuth2 refresh_token in-process.
				const gmailRes = await handler(
					{
						url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
						method: 'GET',
					},
					dummyNode,
				);
				expect(gmailRes?.statusCode).toBe(200);

				// LLM providers and unknown hosts return undefined so callers fall back.
				const openAiRes = await handler(
					{ url: 'https://api.openai.com/v1/chat/completions', method: 'POST', body: {} },
					dummyNode,
				);
				expect(openAiRes).toBeUndefined();

				const customRes = await handler(
					{ url: 'https://internal.example.test/orders/123', method: 'GET' },
					dummyNode,
				);
				expect(customRes).toBeUndefined();
			} finally {
				await session.close();
			}
		} finally {
			runtime.shutdown();
		}
	});

	it('falls back when the gym returns 501 Not Implemented or throws', async () => {
		const requestHandler = vi
			.fn()
			.mockResolvedValueOnce({ statusCode: 501, headers: {}, body: { error: 'not_implemented' } })
			.mockRejectedValueOnce(new Error('dispatch boom'));

		const tenant = {
			id: 't-1',
			mintCredential: vi.fn().mockResolvedValue({ token: 'tok-1' }),
			requestHandler: vi.fn().mockReturnValue(requestHandler),
		} as unknown as Tenant;

		const manifest = {
			version: '1',
			vendors: [{ slug: 'slack', hosts: ['slack.com'], routes: [] }],
		} as unknown as GymManifest;

		const primary = createSimulationServiceEvalHttpHandler({
			tenant,
			manifest,
			logger: mock<Logger>(),
		});
		const fallback = vi
			.fn()
			.mockResolvedValue({ statusCode: 200, headers: {}, body: { fallback: true } });
		const composed = composeEvalHttpHandlers(primary, fallback);

		const first = await composed(
			{ url: 'https://slack.com/api/unimplemented.method', method: 'POST' },
			dummyNode,
		);
		expect(first?.body).toEqual({ fallback: true });

		const second = await composed(
			{ url: 'https://slack.com/api/chat.postMessage', method: 'POST' },
			dummyNode,
		);
		expect(second?.body).toEqual({ fallback: true });
		expect(fallback).toHaveBeenCalledTimes(2);
	});
});
