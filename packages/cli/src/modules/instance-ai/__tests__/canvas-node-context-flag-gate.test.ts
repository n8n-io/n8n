import { CANVAS_NODE_CONTEXT_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';

import { CanvasNodeContextFlagGate } from '../canvas-node-context-flag-gate';

describe('CanvasNodeContextFlagGate', () => {
	let postHogClient: Mocked<PostHogClient>;
	let gate: CanvasNodeContextFlagGate;
	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		postHogClient = mock<PostHogClient>();
		gate = new CanvasNodeContextFlagGate(postHogClient);
	});

	it('resolves true when the flag is on for the user', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({ [CANVAS_NODE_CONTEXT_FLAG]: true });

		expect(await gate.isEnabled(user)).toBe(true);
	});

	it('resolves false when the flag is absent', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({});

		expect(await gate.isEnabled(user)).toBe(false);
	});

	it('resolves false when the flag is explicitly off', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({ [CANVAS_NODE_CONTEXT_FLAG]: false });

		expect(await gate.isEnabled(user)).toBe(false);
	});

	it('resolves false (fail-closed) when getFeatureFlags rejects', async () => {
		postHogClient.getFeatureFlags.mockRejectedValue(new Error('PostHog unreachable'));

		await expect(gate.isEnabled(user)).resolves.toBe(false);
	});
});
