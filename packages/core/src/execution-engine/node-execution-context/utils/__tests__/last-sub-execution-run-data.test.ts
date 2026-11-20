import { createRunExecutionData } from 'n8n-workflow';

import { LastSubExecutionRunData } from '../last-sub-execution-run-data';

describe('LastSubExecutionRunData', () => {
	it('should return the run data of the kept sub-execution one time', () => {
		const runExecutionData = createRunExecutionData();
		const lastSubExecutionRunData = new LastSubExecutionRunData();
		lastSubExecutionRunData.keep('1', runExecutionData);

		expect(lastSubExecutionRunData.take('1')).toBe(runExecutionData);
		expect(lastSubExecutionRunData.take('1')).toBeUndefined();
	});

	it('should keep the entry when a different sub-execution is read', () => {
		const runExecutionData = createRunExecutionData();
		const lastSubExecutionRunData = new LastSubExecutionRunData();
		lastSubExecutionRunData.keep('1', runExecutionData);

		expect(lastSubExecutionRunData.take('2')).toBeUndefined();
		expect(lastSubExecutionRunData.take('1')).toBe(runExecutionData);
	});

	it('should keep only the last sub-execution', () => {
		const lastSubExecutionRunData = new LastSubExecutionRunData();
		lastSubExecutionRunData.keep('1', createRunExecutionData());
		lastSubExecutionRunData.keep('2', undefined);

		expect(lastSubExecutionRunData.take('1')).toBeUndefined();
		expect(lastSubExecutionRunData.take('2')).toBeUndefined();
	});
});
