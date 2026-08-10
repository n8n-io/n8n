/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mock } from 'vitest-mock-extended';

import { AgentSlackIntegrationsController } from '../agent-slack-integrations.controller';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';
import type { SlackManualSetupService } from '../integrations/platforms/slack/slack-manual-setup.service';

const UNAUTHENTICATED_HANDLERS = new Set(['handleSlackAppOAuthCallback']);

describe('AgentSlackIntegrationsController', () => {
	expectProjectScopedAgentRoutes(AgentSlackIntegrationsController, UNAUTHENTICATED_HANDLERS);

	const routes = getRoutesByHandlerName(AgentSlackIntegrationsController);

	it.each([
		['createSlackApp', 'agent:update'],
		['getSlackAppManifest', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});

	it('keeps the manual Slack route contracts', () => {
		expect([...routes.values()].map((route) => route.path).sort()).toEqual([
			'/:agentId/integrations/slack/app',
			'/:agentId/integrations/slack/manifest',
			'/:agentId/integrations/slack/oauth/callback',
		]);
	});

	it('binds the callback state to the route project and agent', async () => {
		const manualSetup = mock<SlackManualSetupService>();
		const controller = new AgentSlackIntegrationsController(manualSetup);
		const response = mock<{ render: (template: string, data?: unknown) => void }>();

		await controller.handleSlackAppOAuthCallback(
			{
				params: { projectId: 'project-1', agentId: 'agent-1' },
				query: { code: 'code-1', state: 'state-1' },
			} as never,
			response as never,
			'agent-1',
		);

		expect(manualSetup.completeInstall).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: 'agent-1',
			code: 'code-1',
			state: 'state-1',
		});
		expect(response.render).toHaveBeenCalledWith('oauth-callback');
	});
});
