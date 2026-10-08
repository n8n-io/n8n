import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { shareThread } from '../threadSharing.api';

const { makeRestApiRequest } = vi.hoisted(() => ({ makeRestApiRequest: vi.fn() }));

vi.mock('@n8n/rest-api-client', () => ({ makeRestApiRequest }));

const context: IRestApiContext = { baseUrl: 'http://localhost:5678/rest', pushRef: 'push-ref' };

const sharedThread = {
	id: 'thread-1',
	title: 'Weekly digest',
	resourceId: 'owner-1',
	projectId: 'project-1',
	createdAt: '2026-10-01T09:30:00.000Z',
	updatedAt: '2026-10-01T09:31:00.000Z',
	metadata: { creditsUsed: 2 },
	state: 'idle',
	needsInput: false,
	lastActivityAt: '2026-10-01T09:31:00.000Z',
	sharedWith: { projectId: 'project-1', projectName: 'Marketing' },
	owner: { id: 'owner-1', name: 'Alice Owner' },
};

describe('shareThread', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('posts to the share route of the thread and returns the shared thread', async () => {
		makeRestApiRequest.mockResolvedValue({ thread: sharedThread });

		await expect(shareThread(context, 'thread-1')).resolves.toEqual(sharedThread);
		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/instance-ai/threads/thread-1/share',
		);
	});

	it('encodes the thread id as one path segment', async () => {
		makeRestApiRequest.mockResolvedValue({ thread: sharedThread });

		await shareThread(context, 'a/b?c');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/instance-ai/threads/a%2Fb%3Fc/share',
		);
	});

	it('keeps the share when the server sends a thread state that this client does not know', async () => {
		makeRestApiRequest.mockResolvedValue({ thread: { ...sharedThread, state: 'paused' } });

		const thread = await shareThread(context, 'thread-1');

		expect(thread.state).toBeUndefined();
		expect(thread.sharedWith).toEqual(sharedThread.sharedWith);
	});

	it.each([
		['without the shared project', { ...sharedThread, sharedWith: undefined }],
		['without the owner', { ...sharedThread, owner: undefined }],
		['without an id', { ...sharedThread, id: '' }],
	])('rejects a response %s', async (_, thread) => {
		makeRestApiRequest.mockResolvedValue({ thread });

		await expect(shareThread(context, 'thread-1')).rejects.toThrow();
	});

	it('passes on the error of a refused share', async () => {
		const refused = new Error('Move this chat to a team project to share it.');
		makeRestApiRequest.mockRejectedValue(refused);

		await expect(shareThread(context, 'thread-1')).rejects.toBe(refused);
	});
});
