import type { User } from '@n8n/db';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { AppVersion } from '../../app-version.entity';
import type { App } from '../../app.entity';
import { AppServingController } from '../app-serving.controller';
import type { AppServingService, ResolvedAppFile } from '../app-serving.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('node:fs/promises', () => ({
	readFile: vi.fn(async () => await Promise.resolve('<html><body></body></html>')),
}));

const app = mock<App>({ id: 'app-1', projectId: 'project-1', activeVersionId: 'v1' });
const resolved = (versionId: string): ResolvedAppFile => ({
	filePath: `/cache/apps/${versionId}/index.html`,
	app,
	version: mock<AppVersion>({ id: versionId, appId: 'app-1' }),
});

describe('AppServingController', () => {
	const appServingService = mock<AppServingService>();
	const authService = mock<AuthService>();
	const controller = new AppServingController(appServingService, authService);
	let res: ReturnType<typeof mock<Response>>;

	const request = (query: Record<string, string> = {}, cookie?: string) =>
		mock<Request>({
			params: { namespace: 'acme', path: undefined },
			query,
			originalUrl: '/apps/acme/',
			cookies: cookie ? { 'n8n-auth': cookie } : {},
		});

	beforeEach(() => {
		vi.clearAllMocks();
		res = mock<Response>();
		res.status.mockReturnValue(res);
		res.type.mockReturnValue(res);
		authService.getCookieToken.mockImplementation((req) => req.cookies?.['n8n-auth']);
	});

	it('serves the active version to anyone', async () => {
		appServingService.resolve.mockResolvedValue(resolved('v1'));

		await controller.serve(request(), res);

		expect(appServingService.resolve).toHaveBeenCalledWith('acme', [], undefined);
		expect(authService.authenticateUserByCookie).not.toHaveBeenCalled();
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('apps-inspector.js'));
		expect(res.setHeader).not.toHaveBeenCalledWith(
			'Access-Control-Allow-Origin',
			expect.anything(),
		);
	});

	it('lets the sandboxed document load an asset as a module', async () => {
		appServingService.resolve.mockResolvedValue({
			...resolved('v1'),
			filePath: '/cache/apps/v1/assets/index-abc.js',
		});

		await controller.serve(request(), res);

		expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'null');
		expect(res.sendFile).toHaveBeenCalled();
	});

	it('answers 404 for an unpublished build without a session', async () => {
		appServingService.resolve.mockResolvedValue(resolved('v2'));

		await controller.serve(request({ v: 'v2' }), res);

		expect(appServingService.resolve).toHaveBeenCalledWith('acme', [], 'v2');
		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.send).toHaveBeenCalledWith('Not found');
	});

	it('answers 404 for an unpublished build when the session may not read the app', async () => {
		appServingService.resolve.mockResolvedValue(resolved('v2'));
		authService.authenticateUserByCookie.mockResolvedValue(mock<User>({ id: 'user-1' }));
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await controller.serve(request({ v: 'v2' }, 'jwt'), res);

		expect(userHasScopes).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			['app:read'],
			false,
			{
				projectId: 'project-1',
			},
		);
		expect(res.status).toHaveBeenCalledWith(404);
	});

	it('answers 404 when the cookie does not validate', async () => {
		appServingService.resolve.mockResolvedValue(resolved('v2'));
		authService.authenticateUserByCookie.mockRejectedValue(new Error('Unauthorized'));

		await controller.serve(request({ v: 'v2' }, 'jwt'), res);

		expect(res.status).toHaveBeenCalledWith(404);
	});

	it('serves an unpublished build to a session that may read the app', async () => {
		appServingService.resolve.mockResolvedValue(resolved('v2'));
		authService.authenticateUserByCookie.mockResolvedValue(mock<User>({ id: 'user-1' }));
		vi.mocked(userHasScopes).mockResolvedValue(true);

		await controller.serve(request({ v: 'v2' }, 'jwt'), res);

		expect(res.status).not.toHaveBeenCalledWith(404);
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('apps-inspector.js'));
	});
});
