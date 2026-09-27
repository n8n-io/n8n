import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { INodeTypes } from 'n8n-workflow';

import { repairSingleOutputFanOut } from '../repair-single-output-fan-out';

const OUTPUTS_BY_TYPE: Record<string, string[]> = {
	'n8n-nodes-base.set': ['main'],
	'n8n-nodes-base.if': ['main', 'main'],
};

const nodeTypesProvider = {
	getByNameAndVersion: (type: string) =>
		OUTPUTS_BY_TYPE[type] ? { description: { outputs: OUTPUTS_BY_TYPE[type] } } : undefined,
} as unknown as INodeTypes;

function node(name: string, type: string, extra: Record<string, unknown> = {}) {
	return { id: name, name, type, typeVersion: 1, position: [0, 0], parameters: {}, ...extra };
}

function target(name: string, index = 0) {
	return { node: name, type: 'main', index };
}

function workflowWith(
	sourceType: string,
	main: Array<Array<ReturnType<typeof target>> | null>,
	sourceExtra: Record<string, unknown> = {},
): WorkflowJSON {
	return {
		name: 'Test',
		nodes: [
			node('Source', sourceType, sourceExtra),
			node('Write Copy', 'n8n-nodes-base.set'),
			node('Upload Image', 'n8n-nodes-base.set'),
		],
		connections: { Source: { main } },
	} as unknown as WorkflowJSON;
}

describe('repairSingleOutputFanOut', () => {
	it('moves array targets on a single-output node onto output 0', () => {
		const json = workflowWith('n8n-nodes-base.set', [
			[target('Write Copy')],
			[target('Upload Image')],
		]);

		const warnings = repairSingleOutputFanOut(json, nodeTypesProvider);

		expect(json.connections.Source.main).toEqual([[target('Write Copy'), target('Upload Image')]]);
		expect(warnings).toEqual([
			expect.objectContaining({
				code: 'AUTO_REPAIRED_FAN_OUT',
				nodeName: 'Source',
				severity: 'informational',
			}),
		]);
	});

	it('keeps each target once when an index repeats one already on output 0', () => {
		const json = workflowWith('n8n-nodes-base.set', [
			[target('Write Copy')],
			[target('Write Copy'), target('Upload Image', 1)],
		]);

		repairSingleOutputFanOut(json, nodeTypesProvider);

		expect(json.connections.Source.main).toEqual([
			[target('Write Copy'), target('Upload Image', 1)],
		]);
	});

	it('leaves a branching node with several outputs unchanged', () => {
		const main = [[target('Write Copy')], [target('Upload Image')]];
		const json = workflowWith('n8n-nodes-base.if', main);

		expect(repairSingleOutputFanOut(json, nodeTypesProvider)).toEqual([]);
		expect(json.connections.Source.main).toEqual(main);
	});

	it('leaves a node that routes its error output unchanged', () => {
		const main = [[target('Write Copy')], [target('Upload Image')]];
		const json = workflowWith('n8n-nodes-base.set', main, { onError: 'continueErrorOutput' });

		expect(repairSingleOutputFanOut(json, nodeTypesProvider)).toEqual([]);
		expect(json.connections.Source.main).toEqual(main);
	});

	it('leaves a node whose output count cannot be resolved unchanged', () => {
		const main = [[target('Write Copy')], [target('Upload Image')]];
		const json = workflowWith('n8n-nodes-base.unknown', main);

		expect(repairSingleOutputFanOut(json, nodeTypesProvider)).toEqual([]);
		expect(json.connections.Source.main).toEqual(main);
	});

	it('does nothing without a node types provider', () => {
		const main = [[target('Write Copy')], [target('Upload Image')]];
		const json = workflowWith('n8n-nodes-base.set', main);

		expect(repairSingleOutputFanOut(json, undefined)).toEqual([]);
		expect(json.connections.Source.main).toEqual(main);
	});
});
