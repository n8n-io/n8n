import { readFileSync } from 'fs';
import path from 'path';

import { createPinData } from '../utils.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

const executionDataJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.json'), { encoding: 'utf-8' }),
);

describe('createPinData', () => {
	test('should create pin data from past execution data', () => {
		const pinData = createPinData(wfUnderTestJson, executionDataJson);

		expect(pinData).toEqual(
			expect.objectContaining({
				'When clicking ‘Test workflow’': expect.anything(),
			}),
		);
	});
});
