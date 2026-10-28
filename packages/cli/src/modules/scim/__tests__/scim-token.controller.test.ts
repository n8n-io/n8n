import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ScimSettingsService } from '../scim-settings.service';
import type { ScimSsoService } from '../scim-sso.service';
import { ScimTokenController } from '../scim-token.controller';
import type { ScimTokenService } from '../scim-token.service';
import { ScimTokenConflictError } from '../scim.errors';

describe('ScimTokenController', () => {
	let scimTokenService: Mocked<ScimTokenService>;
	let scimSettingsService: Mocked<ScimSettingsService>;
	let moduleRegistry: Mocked<ModuleRegistry>;
	let scimSsoService: Mocked<ScimSsoService>;
	let controller: ScimTokenController;

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
		scimSsoService = mock<ScimSsoService>();
		scimSsoService.isSsoEnabled.mockReturnValue(true);
		scimTokenService.getScimBaseUrl.mockReturnValue('https://n8n.example.com/scim/v2');
		controller = new ScimTokenController(
			mock<Logger>(),
			scimTokenService,
			scimSettingsService,
			moduleRegistry,
			scimSsoService,
		);
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
				'updateConfig',
			]);
		});
	});

	describe('GET /config', () => {
		it('reports the instance token state without ever exposing the token', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimTokenService.getTokenInfo.mockResolvedValue({ hasToken: true, lastFour: 'ab12' });
			const res = makeRes();

			await controller.getConfig(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const { data } = res.json.mock.calls[0][0];
			expect(data).toEqual({
				enabled: true,
				hasToken: true,
				tokenHint: 'ab12',
				baseUrl: 'https://n8n.example.com/scim/v2',
			});
			expect(data).not.toHaveProperty('token');
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
		const savedSettings = (wasEnabled: boolean) =>
			scimSettingsService.update.mockImplementation(async ({ enabled }) => ({
				wasEnabled,
				enabled,
			}));

		beforeEach(() => {
			savedSettings(true);
		});

		it.each([true, false])('persists enabled=%s and echoes it back', async (enabled) => {
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled });

			expect(scimSettingsService.update).toHaveBeenCalledExactlyOnceWith({
				enabled,
				assertCanEnable: expect.any(Function),
			});
			// Without this the settings snapshot keeps serving the previous value.
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ data: { enabled } });
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
		});

		// The SSO-off cascade takes the same lock as the save, so the check
		// under the lock sees single sign-on that turned off after the first check.
		it('returns 400 and saves nothing when single sign-on turns off before the save', async () => {
			const ctx = {};
			scimSettingsService.update.mockImplementation(async ({ assertCanEnable }) => {
				scimSsoService.isSsoEnabledInTransaction.mockResolvedValue(false);
				await assertCanEnable?.(ctx);
				return { wasEnabled: false, enabled: true };
			});
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled: true });

			expect(scimSsoService.isSsoEnabledInTransaction).toHaveBeenCalledWith(ctx);
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Turn on SAML or OIDC single sign-on before you enable SCIM provisioning.',
			});
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
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
	});

	describe('POST /token', () => {
		it('returns 201 with the token and base URL', async () => {
			scimTokenService.rotateToken.mockResolvedValue('the-token');
			const res = makeRes();

			await controller.generateToken(req, res);

			expect(scimTokenService.rotateToken).toHaveBeenCalledWith(req.user);
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
