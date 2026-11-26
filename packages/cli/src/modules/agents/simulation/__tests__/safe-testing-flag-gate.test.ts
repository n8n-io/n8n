import { AGENT_SAFE_TESTING_FLAG } from '@n8n/api-types';
import type { PostHogClient } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { SafeTestingFlagGate } from '../safe-testing-flag-gate';

const user = mock<User>({ id: 'user-1' });

function gateWith(flags: Record<string, unknown> | undefined) {
	const postHogClient = mock<PostHogClient>();
	postHogClient.getFeatureFlags.mockResolvedValue(flags as never);
	return new SafeTestingFlagGate(postHogClient);
}

describe('SafeTestingFlagGate', () => {
	it('reads the flag for the user it checks', async () => {
		const postHogClient = mock<PostHogClient>();
		postHogClient.getFeatureFlags.mockResolvedValue({ [AGENT_SAFE_TESTING_FLAG]: 'test' });
		const gate = new SafeTestingFlagGate(postHogClient);

		await expect(gate.isEnabled(user)).resolves.toBe(true);
		await expect(gate.assertEnabled(user)).resolves.toBeUndefined();

		// The same user object, not only an equal one, so the flag is never read for someone else.
		expect(postHogClient.getFeatureFlags.mock.calls).toHaveLength(2);
		for (const [calledWith] of postHogClient.getFeatureFlags.mock.calls) {
			expect(calledWith).toBe(user);
		}
	});

	it('is on only when the user is in the test variant', async () => {
		await expect(gateWith({ [AGENT_SAFE_TESTING_FLAG]: 'test' }).isEnabled(user)).resolves.toBe(
			true,
		);
		await expect(gateWith({ [AGENT_SAFE_TESTING_FLAG]: true }).isEnabled(user)).resolves.toBe(
			false,
		);
		await expect(gateWith({ [AGENT_SAFE_TESTING_FLAG]: 'control' }).isEnabled(user)).resolves.toBe(
			false,
		);
		await expect(gateWith({}).isEnabled(user)).resolves.toBe(false);
		await expect(gateWith(undefined).isEnabled(user)).resolves.toBe(false);
	});

	it('answers 404 while the flag is off, so the surface looks unknown', async () => {
		await expect(gateWith({}).assertEnabled(user)).rejects.toThrow(NotFoundError);
		await expect(
			gateWith({ [AGENT_SAFE_TESTING_FLAG]: 'test' }).assertEnabled(user),
		).resolves.toBeUndefined();
	});
});
