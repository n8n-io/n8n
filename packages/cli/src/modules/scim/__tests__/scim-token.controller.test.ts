import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest, User } from '@n8n/db';
import type { ApiKey } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ScimSettingsService } from '../scim-settings.service';
import { ScimTokenController } from '../scim-token.controller';
import type { ScimTokenService } from '../scim-token.service';

describe('ScimTokenController', () => {
	let scimTokenService: Mocked<ScimTokenService>;
	let scimSettingsService: Mocked<ScimSettingsService>;
	let moduleRegistry: Mocked<ModuleRegistry>;
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
		scimTokenService.getScimBaseUrl.mockReturnValue('https://n8n.example.com/scim/v2');
		controller = new ScimTokenController(
			mock<Logger>(),
			scimTokenService,
			scimSettingsService,
			moduleRegistry,
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
		it('reports state without ever exposing the token', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimTokenService.getTokenInfoForUser.mockResolvedValue({ hasToken: true, lastFour: 'ab12' });
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
		it.each([true, false])('persists enabled=%s and echoes it back', async (enabled) => {
			const res = makeRes();

			await controller.updateConfig(req, res, { enabled });

			expect(scimSettingsService.setEnabled).toHaveBeenCalledWith(enabled);
			// Without this the settings snapshot keeps serving the previous value.
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ data: { enabled } });
		});
	});

	describe('POST /token', () => {
		it('returns 201 with the token and base URL', async () => {
			scimTokenService.rotateScimApiKey.mockResolvedValue(mock<ApiKey>({ apiKey: 'the-token' }));
			const res = makeRes();

			await controller.generateToken(req, res);

			expect(scimTokenService.rotateScimApiKey).toHaveBeenCalledWith(req.user);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({
				data: { token: 'the-token', baseUrl: 'https://n8n.example.com/scim/v2' },
			});
		});
	});

	describe('DELETE /token', () => {
		it('deletes only the calling user keys', async () => {
			const res = makeRes();

			await controller.deleteToken(req, res);

			expect(scimTokenService.deleteAllScimApiKeysForUser).toHaveBeenCalledWith(req.user);
			expect(res.status).toHaveBeenCalledWith(200);
		});
	});
});
