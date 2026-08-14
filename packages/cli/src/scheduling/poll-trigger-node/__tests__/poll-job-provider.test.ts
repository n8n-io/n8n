/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { NoOpPollJobManager, PollJobManager } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { PollJobProvider } from '../poll-job-provider';
import type { PollTriggerJobRegistrar } from '../poll-trigger-job-registrar';

describe('PollJobProvider', () => {
	const pollTriggerJobRegistrar = mock<PollTriggerJobRegistrar>();

	afterEach(() => {
		Container.reset();
	});

	const makeProvider = ({
		schedulerEnabled = true,
		publicationEnabled = true,
		enabledForPollTriggers = true,
		logger = mockLogger(),
	} = {}) =>
		new PollJobProvider(
			logger,
			mock<GlobalConfig>({ scheduler: { enabled: schedulerEnabled, enabledForPollTriggers } }),
			mock<WorkflowsConfig>({ useWorkflowPublicationService: publicationEnabled }),
			pollTriggerJobRegistrar,
		);

	describe('init', () => {
		it.each([
			{
				schedulerEnabled: true,
				publicationEnabled: true,
				enabledForPollTriggers: true,
				active: true,
			},
			{
				schedulerEnabled: false,
				publicationEnabled: true,
				enabledForPollTriggers: true,
				active: false,
			},
			{
				schedulerEnabled: true,
				publicationEnabled: false,
				enabledForPollTriggers: true,
				active: false,
			},
			{
				schedulerEnabled: true,
				publicationEnabled: true,
				enabledForPollTriggers: false,
				active: false,
			},
		] as const)(
			'binds $active for scheduler=$schedulerEnabled publication=$publicationEnabled pollTriggers=$enabledForPollTriggers',
			({ schedulerEnabled, publicationEnabled, enabledForPollTriggers, active }) => {
				makeProvider({ schedulerEnabled, publicationEnabled, enabledForPollTriggers }).init();

				const bound = Container.get(PollJobManager);
				if (active) {
					expect(bound).toBe(pollTriggerJobRegistrar);
				} else {
					expect(bound).toBeInstanceOf(NoOpPollJobManager);
				}
			},
		);
	});

	describe('configuration warning', () => {
		it.each([
			{
				schedulerEnabled: true,
				publicationEnabled: false,
				warnSubstring: 'workflow publication service is disabled',
			},
			{ schedulerEnabled: true, publicationEnabled: true, warnSubstring: null },
			{ schedulerEnabled: false, publicationEnabled: false, warnSubstring: null },
		])(
			'scheduler=$schedulerEnabled publication=$publicationEnabled',
			({ schedulerEnabled, publicationEnabled, warnSubstring }) => {
				const scopedLogger = mockLogger();
				const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

				makeProvider({ schedulerEnabled, publicationEnabled, logger }).init();

				if (warnSubstring) {
					expect(scopedLogger.warn).toHaveBeenCalledWith(expect.stringContaining(warnSubstring));
				} else {
					expect(scopedLogger.warn).not.toHaveBeenCalled();
				}
			},
		);
	});
});
