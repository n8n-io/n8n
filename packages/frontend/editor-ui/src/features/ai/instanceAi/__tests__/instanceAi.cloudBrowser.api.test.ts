import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockInstance } from 'vitest';
import * as apiUtils from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import {
	deleteSavedLogin,
	fetchCloudBrowserLiveView,
	fetchSavedLogins,
	postCloudBrowserReturnControl,
} from '../instanceAi.api';

vi.mock('@n8n/rest-api-client');

// The live view tests mock this wrapper, so the endpoint path is pinned here.
describe('cloud browser API', () => {
	const context = { baseUrl: '/rest', pushRef: 'x' } as IRestApiContext;
	let makeRestApiRequestSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		makeRestApiRequestSpy = vi.spyOn(apiUtils, 'makeRestApiRequest');
	});

	it("fetchCloudBrowserLiveView gets the task's live view", async () => {
		const response = { status: 'live', liveViewUrl: 'https://live.example.com/1' };
		makeRestApiRequestSpy.mockResolvedValue(response);

		const result = await fetchCloudBrowserLiveView(context, 'thread-1', 'task-1');

		expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
			context,
			'GET',
			'/instance-ai/chat/thread-1/tasks/task-1/cloud-browser-live-view',
		);
		expect(result).toEqual(response);
	});
	describe('postCloudBrowserReturnControl', () => {
		const path = '/instance-ai/chat/thread-1/tasks/task-1/cloud-browser-return-control';

		it('sends an empty body without a note or a save', async () => {
			makeRestApiRequestSpy.mockResolvedValue({ ok: true, loginWillBeSaved: false });

			const result = await postCloudBrowserReturnControl(context, 'thread-1', 'task-1');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(context, 'POST', path, {});
			expect(result).toEqual({ ok: true, loginWillBeSaved: false });
		});

		it('leaves out an empty note and a save of false', async () => {
			makeRestApiRequestSpy.mockResolvedValue({ ok: true, loginWillBeSaved: false });

			await postCloudBrowserReturnControl(context, 'thread-1', 'task-1', {
				note: '',
				shouldSaveLogin: false,
			});

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(context, 'POST', path, {});
		});

		it('sends the note and the save choice', async () => {
			makeRestApiRequestSpy.mockResolvedValue({ ok: true, loginWillBeSaved: true });

			const result = await postCloudBrowserReturnControl(context, 'thread-1', 'task-1', {
				note: 'I signed in',
				shouldSaveLogin: true,
			});

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(context, 'POST', path, {
				note: 'I signed in',
				shouldSaveLogin: true,
			});
			expect(result).toEqual({ ok: true, loginWillBeSaved: true });
		});
	});

	it("fetchSavedLogins gets the user's saved logins", async () => {
		const response = { savedLogins: [] };
		makeRestApiRequestSpy.mockResolvedValue(response);

		const result = await fetchSavedLogins(context);

		expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
			context,
			'GET',
			'/instance-ai/cloud-browser/saved-logins',
		);
		expect(result).toEqual(response);
	});

	it('deleteSavedLogin deletes the login and encodes its id', async () => {
		makeRestApiRequestSpy.mockResolvedValue(undefined);

		await deleteSavedLogin(context, 'login/1');

		expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
			context,
			'DELETE',
			'/instance-ai/cloud-browser/saved-logins/login%2F1',
		);
	});
});
