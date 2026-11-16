import type { EvalNodeMockHandler } from 'n8n-core';
import type { IExecuteFunctions } from 'n8n-workflow';
import { WAIT_NODE_TYPE } from 'n8n-workflow';

import type { ExecutionSetup } from '../execution-context';
import { runMock } from '../mock-node';
import { refuseUnmockedNode } from '../runtime/refusals';
import { refuseUnsupportedSource } from '../sub-workflows/execution';

export function createNodeHandler(context: ExecutionSetup): EvalNodeMockHandler {
	return async (functions) => {
		recordParameters(context, functions);

		const mock = context.handle.mocks.get(functions.getNode().name);
		if (mock) return await runMock(context, functions, mock);
		refuseUnmockedNode(context, functions);
		refuseUnsupportedSource(context, functions.getNode());
		if (isTimeWait(functions)) return [functions.getInputData()];
		return undefined;
	};
}

function recordParameters(context: ExecutionSetup, functions: IExecuteFunctions) {
	const { name, parameters } = functions.getNode();
	const run = context.runs.open.filter(({ node }) => node === name).at(-1);
	if (!run) return;
	run.record.parameters = functions
		.getInputData()
		.map((_, itemIndex) =>
			Object.fromEntries(
				Object.keys(parameters).flatMap((parameter) =>
					resolveParameter(functions, parameter, itemIndex),
				),
			),
		);
}

function resolveParameter(functions: IExecuteFunctions, name: string, itemIndex: number) {
	try {
		return [[name, functions.getNodeParameter(name, itemIndex)]];
	} catch {
		// The node reports a parameter that does not resolve when it reads it.
		return [];
	}
}

function isTimeWait(functions: IExecuteFunctions) {
	if (functions.getNode().type !== WAIT_NODE_TYPE) return false;
	const resume = functions.getNodeParameter('resume', 0);
	return resume === 'timeInterval' || resume === 'specificTime';
}
