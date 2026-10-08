import { describe, expect, it } from 'vitest';

import {
	AgentCodingConfigSchema,
	AgentCodingStatusSchema,
	DEFAULT_CODING_CHECK_TIMEOUT_MINUTES,
	N8N_CODING_DEFAULTS,
	defaultCodingCheckTimeoutMinutes,
} from '../agent-coding.schema';

const repositoryUrl = 'https://example.invalid/demo.git';

const status = {
	phase: 'ready',
	branch: 'main',
	changes: [],
	app: 'stopped',
	check: 'not_started',
	setupExitCode: null,
	checkExitCode: null,
};

describe('AgentCodingConfigSchema checkTimeoutMinutes', () => {
	it('leaves the time limit unset when the config does not include it', () => {
		const config = AgentCodingConfigSchema.parse({ repositoryUrl });

		expect(config.checkTimeoutMinutes).toBeUndefined();
	});

	it.each([1, 30, 240])('accepts %i minutes', (minutes) => {
		expect(
			AgentCodingConfigSchema.parse({ repositoryUrl, checkTimeoutMinutes: minutes })
				.checkTimeoutMinutes,
		).toBe(minutes);
	});

	it.each([0, -5, 241, 1.5, Number.NaN])('rejects %s minutes with a clear message', (minutes) => {
		const result = AgentCodingConfigSchema.safeParse({
			repositoryUrl,
			checkTimeoutMinutes: minutes,
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((issue) => issue.message)).toEqual([
			'Enter a check time limit from 1 to 240 minutes',
		]);
	});

	it('gives the n8n monorepo a longer limit than the general default', () => {
		expect(
			AgentCodingConfigSchema.parse({ repositoryUrl, ...N8N_CODING_DEFAULTS }).checkTimeoutMinutes,
		).toBeGreaterThan(DEFAULT_CODING_CHECK_TIMEOUT_MINUTES);
	});
});

describe('defaultCodingCheckTimeoutMinutes', () => {
	it('keeps the monorepo limit for n8n repositories without a saved limit', () => {
		expect(defaultCodingCheckTimeoutMinutes('https://github.com/n8n-io/n8n.git')).toBe(
			N8N_CODING_DEFAULTS.checkTimeoutMinutes,
		);
	});

	it('uses the general default for other repositories', () => {
		expect(defaultCodingCheckTimeoutMinutes(repositoryUrl)).toBe(
			DEFAULT_CODING_CHECK_TIMEOUT_MINUTES,
		);
	});
});

describe('AgentCodingStatusSchema', () => {
	it.each(['stopped', 'restarted'])('accepts the %s setup phase', (phase) => {
		expect(AgentCodingStatusSchema.parse({ ...status, phase }).phase).toBe(phase);
	});

	it('accepts a check that stopped before it finished', () => {
		expect(AgentCodingStatusSchema.parse({ ...status, check: 'stopped' }).check).toBe('stopped');
	});

	it('rejects an unknown phase', () => {
		expect(AgentCodingStatusSchema.safeParse({ ...status, phase: 'paused' }).success).toBe(false);
	});
});
