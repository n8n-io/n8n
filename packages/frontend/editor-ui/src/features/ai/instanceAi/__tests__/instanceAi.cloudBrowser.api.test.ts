import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockInstance } from 'vitest';
import * as apiUtils from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import { fetchCloudBrowserLiveView } from '../instanceAi.api';

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
});
