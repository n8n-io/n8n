import { CUSTOM_MCP_SERVERS_FLAG } from '@n8n/api-types';
import type { PostHogClient } from '@n8n/backend-services';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { CustomMcpServersFlagGate } from '../services/custom-mcp-servers-flag-gate';

describe('CustomMcpServersFlagGate', () => {
	const postHog = mock<PostHogClient>();
	const gate = new CustomMcpServersFlagGate(postHog);

	it.each([
		['test', true],
		['control', false],
		[true, false],
		[undefined, false],
	])('reads the variant %j as enabled %j', async (variant, enabled) => {
		postHog.getFeatureFlagForInstance.mockResolvedValue(variant);

		expect(await gate.isEnabled()).toBe(enabled);
		expect(postHog.getFeatureFlagForInstance).toHaveBeenCalledWith(CUSTOM_MCP_SERVERS_FLAG);
	});

	it('reads the flag for the instance, not for a user', async () => {
		postHog.getFeatureFlagForInstance.mockResolvedValue('test');

		await gate.isEnabled();

		expect(postHog.getFeatureFlags).not.toHaveBeenCalled();
	});

	it('gives a 404 error when the flag is off, so that the feature looks unknown', async () => {
		postHog.getFeatureFlagForInstance.mockResolvedValue('control');

		await expect(gate.assertEnabled()).rejects.toBeInstanceOf(NotFoundError);
	});

	it('passes when the flag gives the variant test', async () => {
		postHog.getFeatureFlagForInstance.mockResolvedValue('test');

		await expect(gate.assertEnabled()).resolves.toBeUndefined();
	});
});
