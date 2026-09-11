import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { DeprecationService } from '../deprecation.service';

describe('DeprecationService', () => {
	const logger = mock<Logger>();
	const instanceSettings = mockInstance(InstanceSettings, {
		instanceType: 'main',
		isDocker: true,
	});
	const deprecationService = new DeprecationService(logger, instanceSettings);

	beforeEach(() => {
		// Ignore environment variables coming in from the environment when running
		// this test suite.
		process.env = {};

		vi.resetAllMocks();
	});

	const toTest = (envVar: string, value: string | undefined, mustWarn: boolean) => {
		const originalEnv = process.env[envVar];
		try {
			// ARRANGE
			if (value) {
				process.env[envVar] = value;
			} else {
				delete process.env[envVar];
			}

			// ACT
			deprecationService.warn();

			// ASSERT
			if (mustWarn) {
				expect(logger.warn).toHaveBeenCalledTimes(1);
				expect(logger.warn.mock.lastCall?.[0]).toMatch(envVar);
			} else {
				expect(logger.warn.mock.lastCall?.[0] ?? '').not.toMatch(envVar);
			}
		} finally {
			// CLEANUP
			if (originalEnv) {
				process.env[envVar] = originalEnv;
			} else {
				delete process.env[envVar];
			}
		}
	};

	test.each([
		['N8N_BINARY_DATA_TTL', '1', true],
		['N8N_PERSISTED_BINARY_DATA_TTL', '1', true],
		['EXECUTIONS_DATA_PRUNE_TIMEOUT', '1', true],
		['N8N_CONFIG_FILES', '1', true],
		['N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN', '1', true],
		['N8N_RUNNERS_ENABLED', '1', true],
		['OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS', 'true', true],
		['OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS', undefined, false],
		['WEBHOOK_URL', 'https://example.com/', true],
		['N8N_DEFAULT_BINARY_DATA_MODE', 'default', true],
		['N8N_DEFAULT_BINARY_DATA_MODE', 'filesystem', false],
		['N8N_EXPRESSION_ENGINE', 'legacy', true],
		['N8N_EXPRESSION_ENGINE', 'vm', false],
		['N8N_WORKFLOW_TAGS_DISABLED', 'true', true],
		['N8N_WORKFLOW_TAGS_DISABLED', '1', true],
		['N8N_WORKFLOW_TAGS_DISABLED', 'false', false],
		['N8N_WORKFLOW_TAGS_DISABLED', undefined, false],
		['N8N_OUTBOUND_PROXY_MODE', 'main-only', true],
		['N8N_OUTBOUND_PROXY_MODE', 'all', false],
		['N8N_OUTBOUND_PROXY_MODE', undefined, false],
		['N8N_RUNNERS_MAX_OLD_SPACE_SIZE', '2048', true],
		['N8N_RUNNERS_MAX_OLD_SPACE_SIZE', undefined, false],
		['N8N_SSRF_PROTECTION_ENABLED', 'true', true],
		['N8N_SSRF_PROTECTION_ENABLED', '1', true],
		['N8N_SSRF_PROTECTION_ENABLED', 'false', false],
		['N8N_SSRF_PROTECTION_ENABLED', undefined, false],
	])('should detect when %s is `%s`', (envVar, value, mustWarn) => {
		toTest(envVar, value, mustWarn);
	});

	describe('N8N_SSRF_PROTECTION_ENABLED', () => {
		beforeEach(() => {
			process.env.N8N_SSRF_PROTECTION_ENABLED = 'true';
		});

		test.each([undefined, 'default', 'DEFAULT , 100.64.0.0/10'])(
			'should warn when N8N_SSRF_BLOCKED_IP_RANGES is `%s`',
			(ranges) => {
				if (ranges === undefined) delete process.env.N8N_SSRF_BLOCKED_IP_RANGES;
				else process.env.N8N_SSRF_BLOCKED_IP_RANGES = ranges;
				deprecationService.warn();
				expect(logger.warn.mock.lastCall?.[0] ?? '').toContain('N8N_SSRF_PROTECTION_ENABLED');
			},
		);

		test('should not warn when N8N_SSRF_BLOCKED_IP_RANGES lists literal ranges only', () => {
			process.env.N8N_SSRF_BLOCKED_IP_RANGES = '10.0.0.0/8,192.168.0.0/16';
			deprecationService.warn();
			expect(logger.warn.mock.lastCall?.[0] ?? '').not.toContain('N8N_SSRF_PROTECTION_ENABLED');
		});
	});

	describe('running outside a container', () => {
		const message = 'Running n8n outside a container is deprecated';

		test('should warn when not running in a container', () => {
			const service = new DeprecationService(
				logger,
				mock<InstanceSettings>({ instanceType: 'main', isDocker: false }),
			);
			service.warn();
			expect(logger.warn.mock.lastCall?.[0] ?? '').toContain(message);
		});

		test('should not warn when running in a container', () => {
			const service = new DeprecationService(
				logger,
				mock<InstanceSettings>({ instanceType: 'main', isDocker: true }),
			);
			service.warn();
			expect(logger.warn.mock.lastCall?.[0] ?? '').not.toContain(message);
		});
	});
});
