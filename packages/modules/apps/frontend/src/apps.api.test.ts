import { getFullApiResponse, makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import {
	createAppPreview,
	deleteApp,
	getApp,
	getAppBuild,
	listApps,
	listAppVersions,
} from './apps.api';

vi.mock('@n8n/rest-api-client', () => ({
	getFullApiResponse: vi.fn(),
	makeRestApiRequest: vi.fn(),
}));

const context: IRestApiContext = { baseUrl: 'http://localhost:5678/rest', pushRef: 'push-ref' };
const options = { skip: 0, take: 50, sortBy: 'updatedAt:desc' as const };

describe('apps.api', () => {
	it('lists the apps of one project', async () => {
		await listApps(context, 'project-1', options);

		expect(getFullApiResponse).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/project-1/apps',
			options,
		);
	});

	it('lists the apps of all projects without a project id', async () => {
		await listApps(context, undefined, options);

		expect(getFullApiResponse).toHaveBeenCalledWith(context, 'GET', '/apps', options);
	});

	it('gets one app of a project', async () => {
		await getApp(context, 'project-1', 'app-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/project-1/apps/app-1',
		);
	});

	it('deletes an app in its project', async () => {
		await deleteApp(context, 'project-1', 'app-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'DELETE',
			'/projects/project-1/apps/app-1',
		);
	});

	it.each([
		['lists the versions', listAppVersions, 'GET', '/projects/project-1/apps/app-1/versions'],
		[
			'gets the build of a version',
			async (ctx: IRestApiContext, p: string, a: string) => await getAppBuild(ctx, p, a, 'v-1'),
			'GET',
			'/projects/project-1/apps/app-1/versions/v-1/build',
		],
		[
			'creates a preview grant for a version',
			async (ctx: IRestApiContext, p: string, a: string) =>
				await createAppPreview(ctx, p, a, 'v-1'),
			'POST',
			'/projects/project-1/apps/app-1/versions/v-1/preview',
		],
	])('%s', async (_name, request, method, endpoint) => {
		await request(context, 'project-1', 'app-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, method, endpoint);
	});
});
