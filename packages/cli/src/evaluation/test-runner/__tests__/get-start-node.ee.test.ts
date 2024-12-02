import { readFileSync } from 'fs';
import path from 'path';

import { getPastExecutionStartNode } from '../utils.ee';

const executionDataJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.json'), { encoding: 'utf-8' }),
);

const executionDataMultipleTriggersJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.multiple-triggers.json'), {
		encoding: 'utf-8',
	}),
);

const executionDataMultipleTriggersJson2 = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.multiple-triggers-2.json'), {
		encoding: 'utf-8',
	}),
);

describe('getPastExecutionStartNode', () => {
	test('should return the start node of the past execution', () => {
		const startNode = getPastExecutionStartNode(executionDataJson);

		expect(startNode).toEqual('When clicking ‘Test workflow’');
	});

	test('should return the start node of the past execution with multiple triggers', () => {
		const startNode = getPastExecutionStartNode(executionDataMultipleTriggersJson);

		expect(startNode).toEqual('When clicking ‘Test workflow’');
	});

	test('should return the start node of the past execution with multiple triggers - chat trigger', () => {
		const startNode = getPastExecutionStartNode(executionDataMultipleTriggersJson2);

		expect(startNode).toEqual('When chat message received');
	});
});
