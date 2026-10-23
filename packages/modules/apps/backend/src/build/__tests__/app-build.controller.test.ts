import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AppBuildController } from '../app-build.controller';
import { AppBuildService } from '../app-build.service';

describe('AppBuildController', () => {
	const routes = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		AppBuildController as never,
	).routes;
	const scopes = new Map([
		['retry', 'app:update'],
		['status', 'app:read'],
	]);

	it.each([...routes])('%s requires a project app scope', (name, route) => {
		expect(route.skipAuth).not.toBe(true);
		expect(route.accessScope).toEqual({
			globalOnly: false,
			scope: scopes.get(name),
		});
	});

	const req = mock<AuthenticatedRequest<{ projectId: string; appId: string; versionId: string }>>({
		params: { projectId: 'project', appId: 'app', versionId: 'version' },
	});

	it('returns an accepted response for a started retry', async () => {
		const builds = mock<AppBuildService>();
		const res = mock<Response>();
		const status = {
			versionId: 'version',
			status: 'running' as const,
			attempts: 1,
			statusUpdatedAt: null,
		};
		builds.startBuild.mockResolvedValue(status);

		expect(await new AppBuildController(builds).retry(req, res)).toEqual(status);
		expect(builds.startBuild).toHaveBeenCalledWith('project', 'app', 'version', true);
		expect(res.status).toHaveBeenCalledWith(202);
	});
});
