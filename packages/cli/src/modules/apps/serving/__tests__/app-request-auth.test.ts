import type { AppVersionSnapshot } from '@n8n/api-types';
import type { Request } from 'express';
import { mock } from 'vitest-mock-extended';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import type { AppVersionRepository } from '../../app-version.repository';
import type { Page } from '../../page.entity';
import type { PageRepository } from '../../page.repository';
import { AppRequestAuth } from '../app-request-auth';
import type { AppAccessPayload, AppTokenService } from '../app-token.service';
import type { ViewerService } from '../viewer.service';

const app = mock<App>({
	id: 'app-1',
	auth: 'public',
	activeVersionId: 'v1',
	components: 'export const Card = () => null;',
});

const snapshot: AppVersionSnapshot = {
	pages: [{ id: 'p1', route: '', title: null, parentPageId: null, content: [], layout: null }],
	theme: null,
	components: 'published components',
};

const header = { id: 'h1', type: 'header', data: { text: 'Draft', level: 1 } };
const draftRows = [
	mock<Page>({
		id: 'p1',
		route: '',
		title: null,
		parentPageId: null,
		content: [header],
		layout: null,
	}),
	mock<Page>({
		id: 'p2',
		route: 'x',
		title: null,
		parentPageId: 'p1',
		content: [{ type: 'nope' }],
		layout: null,
	}),
];

describe('AppRequestAuth', () => {
	const appTokenService = mock<AppTokenService>();
	const appRepository = mock<AppRepository>();
	const appVersionRepository = mock<AppVersionRepository>();
	const pageRepository = mock<PageRepository>();
	const viewerService = mock<ViewerService>();
	const auth = new AppRequestAuth(
		appTokenService,
		appRepository,
		appVersionRepository,
		pageRepository,
		viewerService,
	);
	const req = mock<Request>({ headers: { authorization: 'Bearer token' } });

	const withPayload = (payload: AppAccessPayload) => {
		appTokenService.verifyAccess.mockReturnValue(payload);
		appRepository.findByNamespace.mockResolvedValue(app);
		viewerService.fromToken.mockResolvedValue({ id: 'user-1', email: 'a@b.c' });
	};

	beforeEach(() => {
		vi.resetAllMocks();
		appVersionRepository.findSnapshot.mockResolvedValue(
			mock({ id: 'v1', appId: 'app-1', snapshot }),
		);
		pageRepository.findManyByAppId.mockResolvedValue(draftRows);
	});

	test('a published token resolves the active snapshot', async () => {
		withPayload({ appId: 'app-1', viewerId: 'user-1', mode: 'published' });

		const result = await auth.authorize(req, 'acme');

		expect(result).toMatchObject({ pages: snapshot.pages, components: 'published components' });
		expect(pageRepository.findManyByAppId).not.toHaveBeenCalled();
	});

	test('a draft token resolves the current page rows and the app components', async () => {
		withPayload({ appId: 'app-1', viewerId: 'user-1', mode: 'draft' });

		const result = await auth.authorize(req, 'acme');

		expect(result).toMatchObject({
			pages: [
				{ id: 'p1', route: '', title: null, parentPageId: null, content: [header], layout: null },
				{ id: 'p2', route: 'x', title: null, parentPageId: 'p1', content: null, layout: null },
			],
			components: app.components,
		});
		expect(appVersionRepository.findSnapshot).not.toHaveBeenCalled();
	});

	test('a draft token works on an app without a published version', async () => {
		withPayload({ appId: 'app-1', viewerId: 'user-1', mode: 'draft' });
		appRepository.findByNamespace.mockResolvedValue(mock<App>({ ...app, activeVersionId: null }));

		const result = await auth.authorize(req, 'acme');

		expect(result).not.toHaveProperty('error');
	});

	test('a published token on an unpublished app is a 404', async () => {
		withPayload({ appId: 'app-1', viewerId: 'user-1', mode: 'published' });
		appRepository.findByNamespace.mockResolvedValue(mock<App>({ ...app, activeVersionId: null }));

		await expect(auth.authorize(req, 'acme')).resolves.toEqual({
			status: 404,
			error: 'This app has no published version',
		});
	});

	test('rejects a token of another app', async () => {
		withPayload({ appId: 'other', viewerId: null, mode: 'draft' });

		await expect(auth.authorize(req, 'acme')).resolves.toEqual({
			status: 401,
			error: 'Invalid access token',
		});
	});
});
