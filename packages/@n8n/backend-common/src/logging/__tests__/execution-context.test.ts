import type { GlobalConfig, InstanceSettingsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { getExecutionContext, runWithExecutionContext } from '../execution-context';
import { Logger } from '../logger';

describe('execution context', () => {
	it('is undefined outside a run', () => {
		expect(getExecutionContext()).toBeUndefined();
	});

	it('exposes the labels inside a run', () => {
		runWithExecutionContext({ executionId: '1', workflowId: 'wf' }, () => {
			expect(getExecutionContext()).toEqual({ executionId: '1', workflowId: 'wf' });
		});

		expect(getExecutionContext()).toBeUndefined();
	});

	it('survives an await', async () => {
		await runWithExecutionContext({ executionId: '1' }, async () => {
			await Promise.resolve();
			expect(getExecutionContext()?.executionId).toBe('1');
		});
	});

	it('lets an inner run shadow an outer one', () => {
		runWithExecutionContext({ executionId: 'outer' }, () => {
			runWithExecutionContext({ executionId: 'inner' }, () => {
				expect(getExecutionContext()?.executionId).toBe('inner');
			});

			expect(getExecutionContext()?.executionId).toBe('outer');
		});
	});
});

describe('Logger with an execution context', () => {
	const buildLogger = () =>
		new Logger(
			mock<GlobalConfig>({ logging: { level: 'debug', outputs: [], scopes: [] } }),
			mock<InstanceSettingsConfig>(),
			{ isRoot: false },
		);

	it('stamps the execution labels into the winston metadata', () => {
		const logger = buildLogger();
		const log = vi.spyOn(logger.getInternalLogger(), 'log');

		runWithExecutionContext({ executionId: '42', workflowId: 'wf-1' }, () => {
			logger.info('running node');
		});

		expect(log).toHaveBeenCalledWith(
			'info',
			'running node',
			expect.objectContaining({ executionId: '42', workflowId: 'wf-1' }),
		);
	});

	it('lets explicit metadata win over the ambient context', () => {
		const logger = buildLogger();
		const log = vi.spyOn(logger.getInternalLogger(), 'log');

		runWithExecutionContext({ executionId: '42' }, () => {
			logger.info('resuming', { executionId: '99' });
		});

		expect(log).toHaveBeenCalledWith(
			'info',
			'resuming',
			expect.objectContaining({ executionId: '99' }),
		);
	});

	it('adds nothing when no execution is running', () => {
		const logger = buildLogger();
		const log = vi.spyOn(logger.getInternalLogger(), 'log');

		logger.info('idle');

		expect(log).toHaveBeenCalledWith(
			'info',
			'idle',
			expect.not.objectContaining({ executionId: expect.anything() }),
		);
	});
});
