import { CUSTOM_MCP_SERVERS_FLAG } from '@n8n/api-types';
import type { PostHogClient } from '@n8n/backend-services';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { CustomMcpServersFlagGate } from '../custom-mcp-servers-flag-gate';

describe('CustomMcpServersFlagGate', () => {
	const user = { id: 'user-1', createdAt: new Date('2026-01-01') };
	const postHog = mock<PostHogClient>();
	const gate = new CustomMcpServersFlagGate(postHog);

	it.each([
		['test', true],
		['control', false],
		[true, false],
		[undefined, false],
	])('reads the variant %j as enabled %j', async (variant, enabled) => {
		postHog.getFeatureFlags.mockResolvedValue({ [CUSTOM_MCP_SERVERS_FLAG]: variant } as never);

		expect(await gate.isEnabled(user)).toBe(enabled);
		expect(postHog.getFeatureFlags).toHaveBeenCalledWith(user);
	});

	it('gives a 404 error when the flag is off, so that the feature looks unknown', async () => {
		postHog.getFeatureFlags.mockResolvedValue({ [CUSTOM_MCP_SERVERS_FLAG]: 'control' });

		await expect(gate.assertEnabled(user)).rejects.toBeInstanceOf(NotFoundError);
	});

	it('passes when the flag gives the variant test', async () => {
		postHog.getFeatureFlags.mockResolvedValue({ [CUSTOM_MCP_SERVERS_FLAG]: 'test' });

		await expect(gate.assertEnabled(user)).resolves.toBeUndefined();
	});
});
