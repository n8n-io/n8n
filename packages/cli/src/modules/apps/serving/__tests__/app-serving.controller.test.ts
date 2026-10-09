import type { User } from '@n8n/db';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AppAuthService } from '../../app-auth.service';
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
	const authService = mock<AppAuthService>();
	const controller = new AppServingController(appServingService, authService);
	let res: ReturnType<typeof mock<Response>>;

	const request = (query: Record<string, string> = {}, user?: User) =>
		mock<Request & { user?: User }>({
			params: { namespace: 'acme', path: undefined },
			query,
			originalUrl: '/apps/acme/',
			user,
		});

	beforeEach(() => {
		vi.clearAllMocks();
		res = mock<Response>();
		res.status.mockReturnValue(res);
		res.type.mockReturnValue(res);
	});

	it('serves the active version after route authentication', async () => {
		appServingService.resolve.mockResolvedValue(resolved('v1'));

		await controller.serve(request(), res);

		expect(appServingService.resolve).toHaveBeenCalledWith('acme', [], undefined);
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('apps-inspector.js'));
		expect(res.setHeader).not.toHaveBeenCalledWith(
			'Access-Control-Allow-Origin',
			expect.anything(),
		);
	});

	it('serves an asset from its build directory', async () => {
		appServingService.resolve.mockResolvedValue({
			...resolved('v1'),
			filePath: '/cache/apps/v1/assets/index-abc.js',
		});

		await controller.serve(request(), res);

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
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
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await controller.serve(request({ v: 'v2' }, mock<User>({ id: 'user-1' })), res);

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

	it('answers 404 when no authenticated user is available', async () => {
		appServingService.resolve.mockResolvedValue(resolved('v2'));

		await controller.serve(request({ v: 'v2' }), res);

		expect(res.status).toHaveBeenCalledWith(404);
	});

	it('serves an unpublished build to a session that may read the app', async () => {
		appServingService.resolve.mockResolvedValue(resolved('v2'));
		vi.mocked(userHasScopes).mockResolvedValue(true);

		await controller.serve(request({ v: 'v2' }, mock<User>({ id: 'user-1' })), res);

		expect(res.status).not.toHaveBeenCalledWith(404);
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('apps-inspector.js'));
	});
});
