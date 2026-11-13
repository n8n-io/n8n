import { keepRunningOnUnhandledRejection } from '../process-guard';

describe('keepRunningOnUnhandledRejection', () => {
	it('logs a rejection that no step handles', () => {
		const lines: string[] = [];
		const stop = keepRunningOnUnhandledRejection((m) => lines.push(m));
		try {
			process.emit('unhandledRejection', new Error('connect ECONNREFUSED'), Promise.resolve());
		} finally {
			stop();
		}
		expect(lines).toEqual(['Unhandled rejection: connect ECONNREFUSED']);
	});
});
