import { GlobalConfig, InstanceSettingsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { runWithExecutionContext } from '../execution-context';
import { Logger } from '../logger';

/**
 * The point of stamping in `Logger` rather than in a downstream consumer: the
 * labels reach every transport, including the file transport that writes
 * `n8n.log`, which the operator console reads back as history.
 */
describe('execution context labelling', () => {
	let logger: Logger;
	let logged: Array<Record<string, unknown>>;

	beforeEach(() => {
		const globalConfig = Container.get(GlobalConfig);
		globalConfig.logging.level = 'debug';
		globalConfig.logging.outputs = ['console'];

		logger = new Logger(globalConfig, mock<InstanceSettingsConfig>(), { isRoot: false });

		logged = [];
		vi.spyOn(logger.getInternalLogger(), 'log').mockImplementation(((
			_level: string,
			_message: string,
			meta: Record<string, unknown>,
		) => {
			logged.push(meta);
			return logger.getInternalLogger();
		}) as never);
	});

	it('labels lines emitted inside an execution', () => {
		runWithExecutionContext({ executionId: '395', workflowId: 'wf-1' }, () => {
			logger.debug('inside');
		});

		expect(logged[0]).toMatchObject({ executionId: '395', workflowId: 'wf-1' });
	});

	it('backfills workflowId when a call site passes only executionId', () => {
		// The common case in n8n: plenty of sites log `{ executionId }` alone, and
		// the console's deep link needs both to build a URL.
		runWithExecutionContext({ executionId: '395', workflowId: 'wf-1' }, () => {
			logger.debug('partial', { executionId: '395' });
		});

		expect(logged[0]).toMatchObject({ executionId: '395', workflowId: 'wf-1' });
	});

	it('lets an explicit label win over the ambient one', () => {
		// A sub-execution logging about its parent must not be relabelled.
		runWithExecutionContext({ executionId: '395', workflowId: 'wf-1' }, () => {
			logger.debug('explicit', { executionId: '999' });
		});

		expect(logged[0]).toMatchObject({ executionId: '999', workflowId: 'wf-1' });
	});

	it('follows the async chain, including work that outlives the caller', async () => {
		let resolveLater: () => void = () => {};
		const later = new Promise<void>((resolve) => (resolveLater = resolve));

		runWithExecutionContext({ executionId: '395', workflowId: 'wf-1' }, () => {
			// Started inside the context but settling after `run` returns — this is
			// how the workflow runner starts an execution it does not await.
			void (async () => {
				await Promise.resolve();
				setTimeout(() => {
					logger.debug('after the caller returned');
					resolveLater();
				}, 0);
			})();
		});

		await later;

		expect(logged.at(-1)).toMatchObject({ executionId: '395', workflowId: 'wf-1' });
	});

	it('leaves lines outside any execution unlabelled', () => {
		logger.debug('ambient');

		expect(logged[0].executionId).toBeUndefined();
		expect(logged[0].workflowId).toBeUndefined();
	});

	it('picks up labels filled in after the context was entered', () => {
		// The runner enters the context knowing only the workflow, then fills the
		// id in once `activeExecutions.add()` mints it.
		const context: { executionId?: string; workflowId?: string } = { workflowId: 'wf-1' };

		runWithExecutionContext(context, () => {
			logger.debug('before');
			context.executionId = '395';
			logger.debug('after');
		});

		expect(logged[0]).toMatchObject({ workflowId: 'wf-1' });
		expect(logged[0].executionId).toBeUndefined();
		expect(logged[1]).toMatchObject({ executionId: '395', workflowId: 'wf-1' });
	});
});
