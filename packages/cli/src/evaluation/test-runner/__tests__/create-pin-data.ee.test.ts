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
		const mockedNodes = ['When clicking ‘Test workflow’'].map((name) => ({ name }));

		const pinData = createPinData(wfUnderTestJson, mockedNodes, executionDataJson);

		expect(pinData).toEqual(
			expect.objectContaining({
				'When clicking ‘Test workflow’': expect.anything(),
			}),
		);
	});

	test('should not create pin data for non-existing mocked nodes', () => {
		const mockedNodes = ['Non-existing node'].map((name) => ({ name }));

		const pinData = createPinData(wfUnderTestJson, mockedNodes, executionDataJson);

		expect(pinData).toEqual({});
	});

	test('should create pin data for all mocked nodes', () => {
		const mockedNodes = ['When clicking ‘Test workflow’', 'Edit Fields', 'Code'].map((name) => ({
			name,
		}));

		const pinData = createPinData(wfUnderTestJson, mockedNodes, executionDataJson);

		expect(pinData).toEqual(
			expect.objectContaining({
				'When clicking ‘Test workflow’': expect.anything(),
				'Edit Fields': expect.anything(),
				Code: expect.anything(),
			}),
		);
	});

	test('should return empty object if no mocked nodes are provided', () => {
		const pinData = createPinData(wfUnderTestJson, [], executionDataJson);

		expect(pinData).toEqual({});
	});
});
