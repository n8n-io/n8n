import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { createAdapterLogger } from '../adapter-logger';

describe('createAdapterLogger', () => {
	it('forwards the prefixed message and drops adapter metadata', () => {
		const logger = mock<Logger>();

		createAdapterLogger(logger, '[TestAdapter]').info('sent a message', {
			text: 'secret message body',
			signature: 'request-signature',
		});

		expect(logger.info).toHaveBeenCalledWith('[TestAdapter] sent a message');
	});

	it.each(['debug', 'info', 'warn', 'error'] as const)('forwards %s', (level) => {
		const logger = mock<Logger>();

		createAdapterLogger(logger, '[TestAdapter]')[level]('hello');

		expect(logger[level]).toHaveBeenCalledWith('[TestAdapter] hello');
	});

	it('returns itself as its own child so adapter scoping keeps the prefix', () => {
		const adapterLogger = createAdapterLogger(mock<Logger>(), '[TestAdapter]');

		expect(adapterLogger.child('scope')).toBe(adapterLogger);
	});
});
