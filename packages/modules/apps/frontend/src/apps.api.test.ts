import type { AppBinding } from '@n8n/api-types';
import { getFullApiResponse, makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import {
	createAppPreview,
	deleteApp,
	getApp,
	getAppBuild,
	listApps,
	listAppVersions,
	listBindableResources,
	publishApp,
	setAppBindings,
	unpublishApp,
	updateApp,
} from './apps.api';

vi.mock('@n8n/rest-api-client', () => ({
	getFullApiResponse: vi.fn(),
	makeRestApiRequest: vi.fn(),
}));

const context: IRestApiContext = { baseUrl: 'http://localhost:5678/rest', pushRef: 'push-ref' };
const options = { skip: 0, take: 50, sortBy: 'updatedAt:desc' as const };
const likeQuery = 'ta%sk_\\';
const sanitizedLikeQuery = 'task';

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

	it('updates an app in its project', async () => {
		await updateApp(context, 'project-1', 'app-1', { name: 'Sales' });

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'PATCH',
			'/projects/project-1/apps/app-1',
			{ name: 'Sales' },
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
		['unpublishes an app', unpublishApp, 'POST', '/projects/project-1/apps/app-1/unpublish'],
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

	it('saves the bindings on a base version', async () => {
		const bindings: AppBinding[] = [{ key: 'submit', kind: 'workflow', workflowId: 'w1' }];

		await setAppBindings(context, 'project-1', 'app-1', 'v-1', bindings);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'PUT',
			'/projects/project-1/apps/app-1/bindings',
			{ baseVersionId: 'v-1', bindings },
		);
	});

	it('lists the workflows of a project that an app can call', async () => {
		vi.mocked(getFullApiResponse).mockResolvedValue({
			count: 1,
			data: [{ id: 'w1', name: 'Submit', active: true }],
		});

		expect(await listBindableResources(context, 'project-1', 'workflow', likeQuery)).toEqual({
			count: 1,
			data: [{ id: 'w1', name: 'Submit' }],
		});
		expect(getFullApiResponse).toHaveBeenCalledWith(context, 'GET', '/workflows', {
			filter: {
				projectId: 'project-1',
				isArchived: false,
				triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'],
				query: sanitizedLikeQuery,
			},
			select: JSON.stringify(['id', 'name']),
			take: 100,
			sortBy: 'name:asc',
		});
	});

	it('lists the data tables of a project', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({
			count: 1,
			data: [{ id: 't1', name: 'Tasks' }],
		});

		expect(await listBindableResources(context, 'project-1', 'dataTable', likeQuery)).toEqual({
			count: 1,
			data: [{ id: 't1', name: 'Tasks' }],
		});
		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/project-1/data-tables',
			{ take: 100, sortBy: 'name:asc', filter: { name: sanitizedLikeQuery } },
		);
	});

	it('lists the agents of a project', async () => {
		vi.mocked(getFullApiResponse).mockResolvedValue({
			count: 1,
			data: [{ id: 'a1', name: 'Support' }],
		});

		expect(await listBindableResources(context, 'project-1', 'agent', likeQuery)).toEqual({
			count: 1,
			data: [{ id: 'a1', name: 'Support' }],
		});
		expect(getFullApiResponse).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/project-1/agents/v2',
			{ limit: 100, sortBy: 'name:asc', filter: { query: sanitizedLikeQuery } },
		);
	});

	it('omits search filters when listing bindable resources without a query', async () => {
		const response = { count: 0, data: [] };
		vi.mocked(getFullApiResponse).mockResolvedValue(response);
		vi.mocked(makeRestApiRequest).mockResolvedValue(response);

		await listBindableResources(context, 'project-1', 'workflow');
		expect(getFullApiResponse).toHaveBeenLastCalledWith(context, 'GET', '/workflows', {
			filter: {
				projectId: 'project-1',
				isArchived: false,
				triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'],
			},
			select: JSON.stringify(['id', 'name']),
			take: 100,
			sortBy: 'name:asc',
		});

		await listBindableResources(context, 'project-1', 'dataTable');
		expect(makeRestApiRequest).toHaveBeenLastCalledWith(
			context,
			'GET',
			'/projects/project-1/data-tables',
			{ take: 100, sortBy: 'name:asc' },
		);

		await listBindableResources(context, 'project-1', 'agent');
		expect(getFullApiResponse).toHaveBeenLastCalledWith(
			context,
			'GET',
			'/projects/project-1/agents/v2',
			{ limit: 100, sortBy: 'name:asc' },
		);
	});

	it('publishes a version of an app with its details', async () => {
		const publication = { versionId: 'v-1', label: 'Launch', visibility: 'instance' as const };

		await publishApp(context, 'project-1', 'app-1', publication);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/projects/project-1/apps/app-1/publish',
			publication,
		);
	});
});
