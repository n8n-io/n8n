import { readFileSync } from 'fs';
import path from 'path';

import { createPinData } from '../utils.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

const wfUnderTestRenamedNodesJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test-renamed-nodes.json'), {
		encoding: 'utf-8',
	}),
);

const executionDataJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.json'), { encoding: 'utf-8' }),
);

describe('createPinData', () => {
	test('should create pin data from past execution data', () => {
		const mockedNodes = [
			{
				id: '72256d90-3a67-4e29-b032-47df4e5768af',
				name: 'When clicking ‘Test workflow’',
			},
		];

		const pinData = createPinData(wfUnderTestJson, mockedNodes, executionDataJson);

		expect(pinData).toEqual(
			expect.objectContaining({
				'When clicking ‘Test workflow’': expect.anything(),
			}),
		);
	});

	test('should not create pin data for non-existing mocked nodes', () => {
		const mockedNodes = ['non-existing-ID'].map((id) => ({ id }));

		const pinData = createPinData(wfUnderTestJson, mockedNodes, executionDataJson);

		expect(pinData).toEqual({});
	});

	test('should create pin data for all mocked nodes', () => {
		const mockedNodes = [
			{
				id: '72256d90-3a67-4e29-b032-47df4e5768af', // 'When clicking ‘Test workflow’'
			},
			{
				id: '319f29bc-1dd4-4122-b223-c584752151a4', // 'Edit Fields'
			},
			{
				id: 'd2474215-63af-40a4-a51e-0ea30d762621', // 'Code'
			},
		];

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

	test('should create pin data for all mocked nodes with renamed nodes', () => {
		const mockedNodes = [
			{
				id: '72256d90-3a67-4e29-b032-47df4e5768af', // 'Manual Run'
			},
			{
				id: '319f29bc-1dd4-4122-b223-c584752151a4', // 'Set Attribute'
			},
			{
				id: 'd2474215-63af-40a4-a51e-0ea30d762621', // 'Code'
			},
		];

		const pinData = createPinData(
			wfUnderTestRenamedNodesJson,
			mockedNodes,
			executionDataJson,
			wfUnderTestJson, // Pass original workflow JSON as pastWorkflowData
		);

		expect(pinData).toEqual(
			expect.objectContaining({
				'Manual Run': expect.anything(),
				'Set Attribute': expect.anything(),
				Code: expect.anything(),
			}),
		);
	});
});
