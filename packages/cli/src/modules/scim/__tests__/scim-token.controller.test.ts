import type { ScimDeprovisioningPolicy } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { NextFunction, Request, Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ScimConnectionService } from '../scim-connection.service';
import type { ScimDeprovisioningService } from '../scim-deprovisioning.service';
import { scimOptInGate } from '../scim-opt-in';
import type { ScimSettingsService } from '../scim-settings.service';
import type { ScimSsoService } from '../scim-sso.service';
import { ScimTokenController } from '../scim-token.controller';
import type { ScimTokenService } from '../scim-token.service';
import { ScimInvalidTransferTargetError, ScimTokenConflictError } from '../scim.errors';
import type { ScimService } from '../scim.service';

vi.mock('../scim-opt-in', () => ({ scimOptInGate: vi.fn() }));

describe('ScimTokenController', () => {
	let scimTokenService: Mocked<ScimTokenService>;
	let scimSettingsService: Mocked<ScimSettingsService>;
	let moduleRegistry: Mocked<ModuleRegistry>;
	let scimConnectionService: Mocked<ScimConnectionService>;
	let scimSsoService: Mocked<ScimSsoService>;
	let scimService: Mocked<ScimService>;
	let scimDeprovisioningService: Mocked<ScimDeprovisioningService>;
	let controller: ScimTokenController;

	const defaultPolicy = {
		onDelete: 'disable',
		dataAction: 'transfer',
		transferProjectId: null,
	} as const;

	const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: 'user-1' }) });

	const makeRes = () => {
		const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: typeof res.json };
	};

	beforeEach(() => {
		vi.clearAllMocks();
		scimTokenService = mock<ScimTokenService>();
		scimSettingsService = mock<ScimSettingsService>();
		moduleRegistry = mock<ModuleRegistry>();
		scimConnectionService = mock<ScimConnectionService>();
		scimSsoService = mock<ScimSsoService>();
		scimSsoService.isSsoEnabled.mockReturnValue(true);
		scimService = mock<ScimService>();
		scimService.getProvisioningCounts.mockResolvedValue({ provisioned: 0, deactivated: 0 });
		scimTokenService.getScimBaseUrl.mockReturnValue('https://n8n.example.com/scim/v2');
		scimDeprovisioningService = mock<ScimDeprovisioningService>();
		scimDeprovisioningService.describePolicy.mockResolvedValue({
			onDelete: 'disable',
			dataAction: 'transfer',
			transferTarget: null,
		});
		controller = new ScimTokenController(
			mock<Logger>(),
			scimTokenService,
			scimSettingsService,
			moduleRegistry,
			scimConnectionService,
			scimSsoService,
			scimService,
			scimDeprovisioningService,
		);
	});

	describe('opt-in gate', () => {
		it('runs the shared opt-in gate before every route', () => {
			const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
				ScimTokenController as never,
			);
			const [gateReq, gateRes] = [mock<Request>(), mock<Response>()];
			const next: NextFunction = vi.fn();

			controller.requireOptIn(gateReq, gateRes, next);

			expect(metadata.middlewares).toEqual(['requireOptIn']);
			expect(scimOptInGate).toHaveBeenCalledWith(gateReq, gateRes, next);
		});
	});

	// Every one of these routes administers the credential an IdP uses to
	// provision users, so none may be reachable without `scim:manage`.
	describe('route access scopes', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			ScimTokenController as never,
		);
		const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
			handlerName,
			route,
		}));

		it.each(routeCases)('$handlerName is gated by scim:manage', ({ route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(true);
			expect(route.accessScope?.scope).toBe('scim:manage');
		});

		it('covers every route on the controller', () => {
			expect(routeCases.map(({ handlerName }) => handlerName).sort()).toEqual([
				'deleteToken',
				'generateToken',
				'getConfig',
				'getTransferTargets',
				'updateConfig',
			]);
		});
	});

	describe('GET /transfer-targets', () => {
		it('returns the transfer targets for the query', async () => {
			const response = { people: { total: 1, items: [] } };
			scimDeprovisioningService.findTransferTargets.mockResolvedValue(response);
			const query = { search: 'ada', type: 'people' as const, skip: 0, take: 50 };

			await expect(controller.getTransferTargets(req, makeRes(), query)).resolves.toBe(response);
			expect(scimDeprovisioningService.findTransferTargets).toHaveBeenCalledWith(query);
		});
	});

	describe('GET /config', () => {
		const details = {
			createdAt: '2026-10-05T10:00:00.000Z',
			createdBy: { id: 'user-1', firstName: 'Ada', lastName: 'Admin' },
			lastUsedAt: '2026-10-06T10:00:00.000Z',
		};

		it('reports the instance token state and its connection status', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimSettingsService.getLastAuthFailure.mockResolvedValue(null);
			scimTokenService.getTokenInfo.mockResolvedValue({
				hasToken: true,
				lastFour: 'ab12',
				details,
			});
			const res = makeRes();

			await controller.getConfig(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const { data } = res.json.mock.calls[0][0];
			expect(data).toEqual({
				enabled: true,
				hasToken: true,
				tokenHint: 'ab12',
				baseUrl: 'https://n8n.example.com/scim/v2',
				token: details,
				lastAuthFailure: null,
				status: 'connected',
				provisionedCount: 0,
				deactivatedCount: 0,
				onDelete: 'disable',
				dataAction: 'transfer',
				transferTarget: null,
			});
		});

		it('returns the deprovisioning policy and its transfer target', async () => {
			const transferTarget = {
				projectId: 'team-1',
				kind: 'project',
				name: 'Platform',
				icon: null,
				valid: false,
			} as const;
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimSettingsService.getLastAuthFailure.mockResolvedValue(null);
			scimTokenService.getTokenInfo.mockResolvedValue({
				hasToken: false,
				lastFour: null,
				details: null,
			});
			scimDeprovisioningService.describePolicy.mockResolvedValue({
				onDelete: 'delete',
				dataAction: 'transfer',
				transferTarget,
			});
			const res = makeRes();

			await controller.getConfig(req, res);

			expect(res.json.mock.calls[0][0].data).toMatchObject({
				onDelete: 'delete',
				dataAction: 'transfer',
				transferTarget,
			});
		});

		it('returns the number of provisioned and deactivated SCIM users', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimSettingsService.getLastAuthFailure.mockResolvedValue(null);
			scimTokenService.getTokenInfo.mockResolvedValue({
				hasToken: true,
				lastFour: 'ab12',
				details,
			});
			scimService.getProvisioningCounts.mockResolvedValue({ provisioned: 42, deactivated: 3 });
			const res = makeRes();

			await controller.getConfig(req, res);

			expect(res.json.mock.calls[0][0].data).toMatchObject({
				provisionedCount: 42,
				deactivatedCount: 3,
			});
		});

		it('returns the stored failure and the status that it causes', async () => {
			const lastAuthFailure = {
				at: '2026-10-07T10:00:00.000Z',
				reason: 'superseded_token',
			} as const;
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimSettingsService.getLastAuthFailure.mockResolvedValue(lastAuthFailure);
			scimTokenService.getTokenInfo.mockResolvedValue({
				hasToken: true,
				lastFour: 'ab12',
				details,
			});
			const res = makeRes();

			await controller.getConfig(req, res);

			expect(res.json.mock.calls[0][0].data).toMatchObject({ lastAuthFailure, status: 'error' });
		});

		it('returns no token details and the status waiting without a token', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(false);
			scimSettingsService.getLastAuthFailure.mockResolvedValue(null);
			scimTokenService.getTokenInfo.mockResolvedValue({
				hasToken: false,
				lastFour: null,
				details: null,
			});
			const res = makeRes();

			await controller.getConfig(req, res);

			expect(res.json.mock.calls[0][0].data).toMatchObject({
				hasToken: false,
				token: null,
				status: 'waiting',
			});
		});

		it('returns 500 rather than leaking the error to the client', async () => {
			scimSettingsService.isEnabled.mockRejectedValue(new Error('db down'));
			const res = makeRes();

			await controller.getConfig(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
		});
	});

	describe('PATCH /config', () => {
		/** The switch before the request, as the settings service reads it in its transaction. */
		const savedSettings = (
			wasEnabled: boolean,
			policy: ScimDeprovisioningPolicy = { ...defaultPolicy },
		) =>
			scimSettingsService.update.mockImplementation(async ({ enabled }) => ({
				wasEnabled,
				enabled: enabled ?? wasEnabled,
				policy,
			}));

		beforeEach(() => {
			savedSettings(true);
		});

		it.each([true, false])('persists enabled=%s and echoes it back', async (enabled) => {
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled });

			expect(scimSettingsService.update).toHaveBeenCalledExactlyOnceWith({
				enabled,
				policy: { onDelete: undefined, dataAction: undefined, transferProjectId: undefined },
				assertCanEnable: expect.any(Function),
			});
			// Without this the settings snapshot keeps serving the previous value.
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ data: { enabled, ...defaultPolicy } });
		});

		it('saves the switch and the policy in one update', async () => {
			const policy = { onDelete: 'delete', dataAction: 'delete', transferProjectId: null } as const;
			savedSettings(false, policy);
			const res = makeRes();

			await controller.updateConfig(req, res, {
				enabled: true,
				onDelete: 'delete',
				dataAction: 'delete',
			});

			expect(scimSettingsService.update).toHaveBeenCalledExactlyOnceWith({
				enabled: true,
				policy: { onDelete: 'delete', dataAction: 'delete', transferProjectId: undefined },
				assertCanEnable: expect.any(Function),
			});
			expect(res.json).toHaveBeenCalledWith({ data: { enabled: true, ...policy } });
		});

		it('changes only the policy and keeps enabled when the body has no enabled', async () => {
			const policy = { ...defaultPolicy, onDelete: 'delete' } as const;
			savedSettings(true, policy);
			const res = makeRes();

			await controller.updateConfig(req, res, { onDelete: 'delete' });

			expect(scimSettingsService.update).toHaveBeenCalledWith({
				enabled: undefined,
				policy: { onDelete: 'delete', dataAction: undefined, transferProjectId: undefined },
				assertCanEnable: expect.any(Function),
			});
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ data: { enabled: true, ...policy } });
		});

		it('checks the transfer target before it saves', async () => {
			await controller.updateConfig(req, makeRes(), { transferProjectId: 'team-1' });

			expect(scimDeprovisioningService.assertValidTransferTarget).toHaveBeenCalledWith('team-1');
			expect(
				scimDeprovisioningService.assertValidTransferTarget.mock.invocationCallOrder[0],
			).toBeLessThan(scimSettingsService.update.mock.invocationCallOrder[0]);
		});

		it('returns 400 and saves nothing when the transfer target is not valid', async () => {
			scimDeprovisioningService.assertValidTransferTarget.mockRejectedValue(
				new ScimInvalidTransferTargetError('The transfer project missing does not exist.'),
			);
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled: true, transferProjectId: 'missing' });

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				message: 'The transfer project missing does not exist.',
			});
			expect(scimSettingsService.update).not.toHaveBeenCalled();
		});

		// The change is saved, so only the settings snapshot is late.
		it('returns 200 when the settings refresh fails after the save', async () => {
			moduleRegistry.refreshModuleSettings.mockRejectedValue(new Error('PostHog down'));
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled: false });

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ data: { enabled: false, ...defaultPolicy } });
		});

		it('returns 500 when the save fails', async () => {
			scimSettingsService.update.mockRejectedValue(new Error('db down'));
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled: false, onDelete: 'delete' });

			expect(res.status).toHaveBeenCalledWith(500);
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
		});

		it('returns 400 and keeps SCIM off when single sign-on is off', async () => {
			scimSsoService.isSsoEnabled.mockReturnValue(false);
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled: true });

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Turn on SAML or OIDC single sign-on before you enable SCIM provisioning.',
			});
			expect(scimSettingsService.update).not.toHaveBeenCalled();
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
			expect(scimConnectionService.resetAuthFailure).not.toHaveBeenCalled();
		});

		// The SSO-off cascade takes the same lock as the save, so the check
		// under the lock sees single sign-on that turned off after the first check.
		it('returns 400 and saves nothing when single sign-on turns off before the save', async () => {
			const ctx = {};
			scimSettingsService.update.mockImplementation(async ({ assertCanEnable }) => {
				scimSsoService.isSsoEnabledInTransaction.mockResolvedValue(false);
				await assertCanEnable?.(ctx);
				return { wasEnabled: false, enabled: true, policy: { ...defaultPolicy } };
			});
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled: true });

			expect(scimSsoService.isSsoEnabledInTransaction).toHaveBeenCalledWith(ctx);
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Turn on SAML or OIDC single sign-on before you enable SCIM provisioning.',
			});
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
			expect(scimConnectionService.resetAuthFailure).not.toHaveBeenCalled();
		});

		it('turns SCIM off when single sign-on is off', async () => {
			scimSsoService.isSsoEnabled.mockReturnValue(false);
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled: false });

			expect(scimSettingsService.update).toHaveBeenCalledWith(
				expect.objectContaining({ enabled: false }),
			);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		// Single sign-on on never turns SCIM on. The admin enables it again, and
		// the stored token works with no change.
		it('turns SCIM on again after single sign-on is back on', async () => {
			savedSettings(false);
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled: true });

			expect(scimSsoService.isSsoEnabled).toHaveBeenCalled();
			expect(scimSettingsService.update).toHaveBeenCalledWith(
				expect.objectContaining({ enabled: true }),
			);
			expect(scimTokenService.rotateToken).not.toHaveBeenCalled();
			expect(scimTokenService.revokeToken).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('resets the stored failure when SCIM turns on', async () => {
			savedSettings(false);

			await controller.updateConfig(req, makeRes(), { enabled: true });

			expect(scimConnectionService.resetAuthFailure).toHaveBeenCalledTimes(1);
		});

		it.each([
			['SCIM is already on', true, true],
			['SCIM turns off', true, false],
		])('keeps the stored failure when %s', async (_, wasEnabled, enabled) => {
			savedSettings(wasEnabled);

			await controller.updateConfig(req, makeRes(), { enabled });

			expect(scimConnectionService.resetAuthFailure).not.toHaveBeenCalled();
		});
	});

	describe('POST /token', () => {
		it('returns 201 with the token and base URL', async () => {
			scimTokenService.rotateToken.mockResolvedValue('the-token');
			const res = makeRes();

			await controller.generateToken(req, res);

			expect(scimTokenService.rotateToken).toHaveBeenCalledWith(req.user);
			expect(scimConnectionService.resetAuthFailure).toHaveBeenCalledTimes(1);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({
				data: { token: 'the-token', baseUrl: 'https://n8n.example.com/scim/v2' },
			});
		});

		it('returns 409 when another request changed the token at the same time', async () => {
			scimTokenService.rotateToken.mockRejectedValue(new ScimTokenConflictError());
			const res = makeRes();

			await controller.generateToken(req, res);

			expect(res.status).toHaveBeenCalledWith(409);
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
			expect(scimConnectionService.resetAuthFailure).not.toHaveBeenCalled();
		});

		it('still returns the new token when the failure reset fails', async () => {
			scimTokenService.rotateToken.mockResolvedValue('the-token');
			scimConnectionService.resetAuthFailure.mockRejectedValue(new Error('db down'));
			const res = makeRes();

			await controller.generateToken(req, res);

			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({
				data: { token: 'the-token', baseUrl: 'https://n8n.example.com/scim/v2' },
			});
		});

		it('still returns the new token when the settings refresh fails', async () => {
			scimTokenService.rotateToken.mockResolvedValue('the-token');
			moduleRegistry.refreshModuleSettings.mockRejectedValue(new Error('db down'));
			const res = makeRes();

			await controller.generateToken(req, res);

			// The response is the only copy of the new token.
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({
				data: { token: 'the-token', baseUrl: 'https://n8n.example.com/scim/v2' },
			});
		});

		it('returns 500 on any other failure', async () => {
			scimTokenService.rotateToken.mockRejectedValue(new Error('db down'));
			const res = makeRes();

			await controller.generateToken(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
		});
	});

	describe('DELETE /token', () => {
		it('revokes the instance token and refreshes the settings', async () => {
			const res = makeRes();

			await controller.deleteToken(req, res);

			expect(scimTokenService.revokeToken).toHaveBeenCalledWith();
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
			expect(res.status).toHaveBeenCalledWith(200);
		});
	});
});
