/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { AgentTeamsPublishDto } from '@n8n/api-types';
import type { TeamsAzureSubscription, TeamsCatalogState } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '@n8n/db';

import { AgentTeamsIntegrationsController } from '../agent-teams-integrations.controller';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';
import type { TeamsCredentialCheckService } from '../integrations/platforms/teams/teams-credential-check.service';
import type { TeamsBotProvisioningService } from '../integrations/platforms/teams/teams-bot-provisioning.service';
import type { TeamsCatalogService } from '../integrations/platforms/teams/teams-catalog.service';
import type { TeamsEntraProvisioningService } from '../integrations/platforms/teams/teams-entra-provisioning.service';
import type { TeamsSetupTelemetryService } from '../integrations/platforms/teams/teams-setup-telemetry.service';
import type { TeamsManagedSetupService } from '../integrations/platforms/teams/teams-managed-setup.service';
import type { TeamsSetupService } from '../integrations/platforms/teams/teams-setup.service';

/** Reached by the Azure portal and the browser's save dialog, not by the app. */
const UNAUTHENTICATED_HANDLERS = new Set(['getArmTemplate', 'armTemplatePreflight']);

const TEMPLATE = { $schema: 'https://schema.management.azure.com/…', resources: [] };

describe('AgentTeamsIntegrationsController', () => {
	expectProjectScopedAgentRoutes(AgentTeamsIntegrationsController, UNAUTHENTICATED_HANDLERS);

	const routes = getRoutesByHandlerName(AgentTeamsIntegrationsController);

	// All three hand back or act on a credential the caller names, so none of
	// them is a read of the agent alone.
	it.each([
		['getSetupState', 'agent:update'],
		['downloadPackage', 'agent:update'],
		['checkCredential', 'agent:update'],
		['listAzureSubscriptions', 'agent:update'],
		['provisionBot', 'agent:update'],
		['provisionApp', 'agent:update'],
		['getManagedSetupState', 'agent:update'],
		['createManagerCredential', 'agent:update'],
		['publishApp', 'agent:update'],
		['getCatalogState', 'agent:update'],
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
					mock<TeamsManagedSetupService>(),
					mock<TeamsEntraProvisioningService>(),
					mock<TeamsBotProvisioningService>(),
					mock<TeamsCatalogService>(),
					mock<TeamsSetupTelemetryService>(),
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

		it('serves it as JSON', async () => {
			const { controller } = buildController();
			const res = mock<Response>();

			await controller.getArmTemplate(request(), res, 'agent-1');

			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
		});

		// Azure fetches this from the user's browser, so without CORS it reports
		// the template as unreachable. Declared on the route rather than set in
		// the handler, so a request that never reaches the handler still carries
		// the headers.
		it.each(['getArmTemplate', 'armTemplatePreflight'])('declares CORS on %s', (handlerName) => {
			const cors = routes.get(handlerName)?.cors;

			expect(cors).toMatchObject({ allowedOrigins: ['*'], allowedMethods: ['get', 'options'] });
		});

		it('rate limits the route, which anyone can reach', () => {
			expect(routes.get('getArmTemplate')?.ipRateLimit).toBeDefined();
		});

		it('answers a preflight without touching the agent', async () => {
			const { controller, setupService } = buildController();
			const res = mock<Response>();
			res.status.mockReturnValue(res);

			controller.armTemplatePreflight(mock<Request>(), res);

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

	/**
	 * Which rung of the bot ladder people land on is the question the ladder
	 * exists to answer, and the no-subscription rung is chosen here: the browser
	 * switches to the manual flow without reporting a step.
	 */
	describe('the Azure subscription lookup', () => {
		const buildController = (subscriptions: TeamsAzureSubscription[]) => {
			const botProvisioningService = mock<TeamsBotProvisioningService>();
			botProvisioningService.listSubscriptions.mockResolvedValue(subscriptions);
			const setupTelemetry = mock<TeamsSetupTelemetryService>();
			return {
				setupTelemetry,
				controller: new AgentTeamsIntegrationsController(
					mock<TeamsSetupService>(),
					mock<TeamsCredentialCheckService>(),
					mock<TeamsManagedSetupService>(),
					mock<TeamsEntraProvisioningService>(),
					botProvisioningService,
					mock<TeamsCatalogService>(),
					setupTelemetry,
				),
			};
		};

		const request = () =>
			mock<AuthenticatedRequest<{ projectId: string }, {}, {}, { managerCredentialId?: string }>>({
				params: { projectId: 'project-1' },
				query: { managerCredentialId: 'manager-1' },
				user: mock<User>({ id: 'user-1' }),
			});

		it('records the manual rung when the account reaches no subscription', async () => {
			const { controller, setupTelemetry } = buildController([]);

			await expect(
				controller.listAzureSubscriptions(request(), mock<Response>(), 'agent-1'),
			).resolves.toEqual([]);

			expect(setupTelemetry.succeeded).toHaveBeenCalledWith({
				agentId: 'agent-1',
				projectId: 'project-1',
				userId: 'user-1',
				step: 'create_bot',
				botRoute: 'manual',
			});
		});

		it('records nothing while the bot step can still run here', async () => {
			const { controller, setupTelemetry } = buildController([{ id: 'sub-1', name: 'Production' }]);

			await controller.listAzureSubscriptions(request(), mock<Response>(), 'agent-1');

			expect(setupTelemetry.succeeded).not.toHaveBeenCalled();
		});
	});
	/**
	 * The publish call is where the two routes Microsoft offers are told apart,
	 * and the route is what the ladder reports. The service answers four states
	 * and only two of them are routes.
	 */
	describe('the catalogue publish', () => {
		const buildController = () => {
			const catalogService = mock<TeamsCatalogService>();
			const setupTelemetry = mock<TeamsSetupTelemetryService>();
			return {
				catalogService,
				setupTelemetry,
				controller: new AgentTeamsIntegrationsController(
					mock<TeamsSetupService>(),
					mock<TeamsCredentialCheckService>(),
					mock<TeamsManagedSetupService>(),
					mock<TeamsEntraProvisioningService>(),
					mock<TeamsBotProvisioningService>(),
					catalogService,
					setupTelemetry,
				),
			};
		};

		const request = () =>
			mock<AuthenticatedRequest<{ projectId: string }>>({
				params: { projectId: 'project-1' },
				user: mock<User>({ id: 'user-1' }),
			});

		const payload = () =>
			new AgentTeamsPublishDto({
				managerCredentialId: 'manager-1',
				credentialId: 'cred-1',
				settings: { displayName: 'Support Bot' },
			});

		it('publishes with the credentials and settings the caller named', async () => {
			const { controller, catalogService } = buildController();
			catalogService.publish.mockResolvedValue({ status: 'published', teamsAppId: 'app-1' });

			await expect(
				controller.publishApp(request(), mock<Response>(), 'agent-1', payload()),
			).resolves.toEqual({ status: 'published', teamsAppId: 'app-1' });

			expect(catalogService.publish).toHaveBeenCalledWith({
				user: expect.objectContaining({ id: 'user-1' }),
				projectId: 'project-1',
				agentId: 'agent-1',
				managerCredentialId: 'manager-1',
				credentialId: 'cred-1',
				settings: { displayName: 'Support Bot' },
			});
		});

		it.each(['published', 'submitted'] as const)(
			'records %s as the install route',
			async (status) => {
				const { controller, catalogService, setupTelemetry } = buildController();
				catalogService.publish.mockResolvedValue({ status, teamsAppId: 'app-1' });

				await controller.publishApp(request(), mock<Response>(), 'agent-1', payload());

				expect(setupTelemetry.succeeded).toHaveBeenCalledWith({
					agentId: 'agent-1',
					projectId: 'project-1',
					userId: 'user-1',
					step: 'install',
					installRoute: status,
				});
			},
		);

		// Neither answer took a route: the app is not listed yet, or Microsoft
		// refused it. Reporting one here would claim an install that never ran.
		it.each(['unknown', 'rejected'] as const)('records no install route for %s', async (status) => {
			const { controller, catalogService, setupTelemetry } = buildController();
			catalogService.publish.mockResolvedValue({ status, teamsAppId: null });

			await controller.publishApp(request(), mock<Response>(), 'agent-1', payload());

			expect(setupTelemetry.succeeded).toHaveBeenCalledWith(
				expect.not.objectContaining({ installRoute: expect.anything() }),
			);
		});

		it('records a failed publish and still fails the request', async () => {
			const { controller, catalogService, setupTelemetry } = buildController();
			const error = new Error('Microsoft refused the upload');
			catalogService.publish.mockRejectedValue(error);

			await expect(
				controller.publishApp(request(), mock<Response>(), 'agent-1', payload()),
			).rejects.toThrow(error);

			expect(setupTelemetry.failed).toHaveBeenCalledWith(
				{ agentId: 'agent-1', projectId: 'project-1', userId: 'user-1', step: 'install' },
				error,
			);
		});
		it('reads the catalogue state for the credentials the caller named', async () => {
			const { controller, catalogService } = buildController();
			const state: TeamsCatalogState = { status: 'submitted', teamsAppId: 'app-1' };
			catalogService.getState.mockResolvedValue(state);

			const req = mock<
				AuthenticatedRequest<
					{ projectId: string },
					{},
					{},
					{ managerCredentialId?: string; credentialId?: string }
				>
			>({
				params: { projectId: 'project-1' },
				query: { managerCredentialId: 'manager-1', credentialId: 'cred-1' },
				user: mock<User>({ id: 'user-1' }),
			});

			await expect(controller.getCatalogState(req, mock<Response>(), 'agent-1')).resolves.toBe(
				state,
			);

			expect(catalogService.getState).toHaveBeenCalledWith({
				user: expect.objectContaining({ id: 'user-1' }),
				projectId: 'project-1',
				agentId: 'agent-1',
				managerCredentialId: 'manager-1',
				credentialId: 'cred-1',
			});
		});

		// The setup asks for the state before the user signs in, and without a
		// manager credential there is nothing to ask Microsoft with.
		it('answers unknown without reaching Microsoft when no manager credential is named', async () => {
			const { controller, catalogService } = buildController();

			const req = mock<
				AuthenticatedRequest<
					{ projectId: string },
					{},
					{},
					{ managerCredentialId?: string; credentialId?: string }
				>
			>({
				params: { projectId: 'project-1' },
				query: {},
				user: mock<User>({ id: 'user-1' }),
			});

			await expect(controller.getCatalogState(req, mock<Response>(), 'agent-1')).resolves.toEqual({
				status: 'unknown',
				teamsAppId: null,
			});

			expect(catalogService.getState).not.toHaveBeenCalled();
		});
	});
});
