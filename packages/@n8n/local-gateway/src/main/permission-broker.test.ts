vi.mock('@n8n/computer-use/logger', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

import type { AffectedResource } from '@n8n/computer-use/tools/types';
import type { Mock } from 'vitest';

import { PermissionBroker } from './permission-broker';
import type { LocalPermissionPromptRequest } from '../shared/types';

const RESOURCE: AffectedResource = {
	toolGroup: 'filesystemWrite',
	resource: '/tmp/ok.txt',
	description: 'Write file /tmp/ok.txt',
};

describe('PermissionBroker', () => {
	let pushRequested: Mock<(prompt: LocalPermissionPromptRequest) => void>;
	let pushWithdrawn: Mock<(id: string) => void>;
	let onPrompt: Mock<(prompt: LocalPermissionPromptRequest) => void>;
	let broker: PermissionBroker;

	beforeEach(() => {
		pushRequested = vi.fn();
		pushWithdrawn = vi.fn();
		onPrompt = vi.fn();
		broker = new PermissionBroker({ pushRequested, pushWithdrawn, onPrompt });
	});

	it('pushes the prompt and resolves the request with the responded decision', async () => {
		const request = broker.request(RESOURCE);

		expect(pushRequested).toHaveBeenCalledTimes(1);
		const prompt = pushRequested.mock.calls[0][0];
		expect(prompt).toMatchObject({
			resource: RESOURCE,
			options: ['denyOnce', 'allowOnce', 'allowForSession'],
		});
		expect(onPrompt).toHaveBeenCalledWith(prompt);

		expect(broker.respond(prompt.id, 'allowOnce')).toBe(true);
		await expect(request).resolves.toBe('allowOnce');
		expect(pushWithdrawn).toHaveBeenCalledWith(prompt.id);
	});

	it('returns false for an unknown or already-resolved prompt id', () => {
		expect(broker.respond('nope', 'allowOnce')).toBe(false);

		void broker.request(RESOURCE);
		const prompt = pushRequested.mock.calls[0][0];
		expect(broker.respond(prompt.id, 'denyOnce')).toBe(true);
		expect(broker.respond(prompt.id, 'allowOnce')).toBe(false);
		expect(pushWithdrawn).toHaveBeenCalledTimes(1);
	});

	it('lists pending prompts oldest first and drops resolved ones', () => {
		void broker.request(RESOURCE);
		void broker.request({ ...RESOURCE, resource: '/tmp/second.txt' });
		const [first, second] = pushRequested.mock.calls.map((call) => call[0]);

		expect(broker.list()).toEqual([first, second]);

		broker.respond(first.id, 'denyOnce');
		expect(broker.list()).toEqual([second]);
	});

	it('clear denies everything pending and withdraws each prompt', async () => {
		const requests = [broker.request(RESOURCE), broker.request(RESOURCE)];
		const ids = pushRequested.mock.calls.map((call) => call[0].id);

		broker.clear();

		await expect(Promise.all(requests)).resolves.toEqual(['denyOnce', 'denyOnce']);
		expect(broker.list()).toEqual([]);
		expect(pushWithdrawn.mock.calls.map((call) => call[0])).toEqual(ids);
	});
});
