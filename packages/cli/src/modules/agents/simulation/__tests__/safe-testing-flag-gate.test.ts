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
	it('is on only when the flag is exactly true for the user', async () => {
		await expect(gateWith({ [AGENT_SAFE_TESTING_FLAG]: true }).isEnabled(user)).resolves.toBe(true);
		await expect(gateWith({ [AGENT_SAFE_TESTING_FLAG]: 'true' }).isEnabled(user)).resolves.toBe(
			false,
		);
		await expect(gateWith({}).isEnabled(user)).resolves.toBe(false);
		await expect(gateWith(undefined).isEnabled(user)).resolves.toBe(false);
	});

	it('answers 404 while the flag is off, so the surface looks unknown', async () => {
		await expect(gateWith({}).assertEnabled(user)).rejects.toThrow(NotFoundError);
		await expect(
			gateWith({ [AGENT_SAFE_TESTING_FLAG]: true }).assertEnabled(user),
		).resolves.toBeUndefined();
	});
});
