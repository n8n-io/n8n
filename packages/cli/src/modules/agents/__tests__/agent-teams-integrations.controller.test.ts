/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mock } from 'vitest-mock-extended';
import type { Request, Response } from 'express';

import { AgentTeamsIntegrationsController } from '../agent-teams-integrations.controller';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';
import type { TeamsCredentialCheckService } from '../integrations/platforms/teams/teams-credential-check.service';
import type { TeamsSetupService } from '../integrations/platforms/teams/teams-setup.service';

/** Reached by the Azure portal and the browser's save dialog, not by the app. */
const UNAUTHENTICATED_HANDLERS = new Set(['getArmTemplate', 'armTemplatePreflight']);

const TEMPLATE = { $schema: 'https://schema.management.azure.com/…', resources: [] };

describe('AgentTeamsIntegrationsController', () => {
	expectProjectScopedAgentRoutes(AgentTeamsIntegrationsController, UNAUTHENTICATED_HANDLERS);

	const routes = getRoutesByHandlerName(AgentTeamsIntegrationsController);

	it.each([
		['getSetupState', 'agent:read'],
		['downloadPackage', 'agent:read'],
		['checkCredential', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});

	describe('the ARM template route', () => {
		const buildController = () => {
			const setupService = mock<TeamsSetupService>();
			setupService.buildArmTemplate.mockResolvedValue(TEMPLATE);
			return {
				setupService,
				controller: new AgentTeamsIntegrationsController(
					setupService,
					mock<TeamsCredentialCheckService>(),
				),
			};
		};

		const request = () =>
			mock<Request<{ projectId: string }>>({
				params: { projectId: 'project-1' },
				query: { token: 'a-token', credentialId: 'cred-1' },
			});

		it('serves the template at the root, not wrapped in a data envelope', async () => {
			const { controller } = buildController();
			const res = mock<Response>();

			await controller.getArmTemplate(request(), res, 'agent-1');

			// The portal answers "this is not a valid template" for anything else,
			// because the ARM schema has to be the top-level object.
			expect(res.send).toHaveBeenCalledWith(JSON.stringify(TEMPLATE));
		});

		it('allows the portal to read it from the browser', async () => {
			const { controller } = buildController();
			const res = mock<Response>();

			await controller.getArmTemplate(request(), res, 'agent-1');

			// Azure fetches this client-side, so without CORS it reports the
			// template as unreachable.
			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
		});

		it('answers a preflight without touching the agent', async () => {
			const { controller, setupService } = buildController();
			const res = mock<Response>();
			res.status.mockReturnValue(res);

			controller.armTemplatePreflight(mock<Request>(), res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.status).toHaveBeenCalledWith(204);
			expect(setupService.buildArmTemplate).not.toHaveBeenCalled();
		});

		it('passes the signed token and credential through, so neither can be assumed', async () => {
			const { controller, setupService } = buildController();

			await controller.getArmTemplate(request(), mock<Response>(), 'agent-1');

			expect(setupService.buildArmTemplate).toHaveBeenCalledWith({
				projectId: 'project-1',
				agentId: 'agent-1',
				token: 'a-token',
				credentialId: 'cred-1',
			});
		});
	});
});
