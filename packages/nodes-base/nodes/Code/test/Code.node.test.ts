import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import type { IExecuteFunctions, INode, IWorkflowDataProxyData } from 'n8n-workflow';

import { Code } from '../Code.node';
import { PythonTaskRunnerSandbox } from '../PythonTaskRunnerSandbox';

describe('Code Node unit test', () => {
	const workflowDataProxy = mock<IWorkflowDataProxyData>({ $input: mock() });

	it('should route legacy `python` language to native Python runner', async () => {
		const node = new Code();
		const pythonThisArg: MockProxy<IExecuteFunctions> = mock<IExecuteFunctions>();
		pythonThisArg.helpers = { normalizeItems } as IExecuteFunctions['helpers'];
		pythonThisArg.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		pythonThisArg.getWorkflowDataProxy.mockReturnValue(workflowDataProxy);
		pythonThisArg.getMode.mockReturnValue('manual');
		pythonThisArg.getRunnerStatus.mockReturnValue({ available: true });
		pythonThisArg.getNodeParameter.calledWith('language', 0).mockReturnValue('python');
		pythonThisArg.getNodeParameter.calledWith('mode', 0).mockReturnValue('runOnceForAllItems');
		pythonThisArg.getNodeParameter.calledWith('pythonCode', 0).mockReturnValue('return []');
		pythonThisArg.getInputData.mockReturnValue([{ json: {} }]);

		const runSpy = jest
			.spyOn(PythonTaskRunnerSandbox.prototype, 'runUsingIncomingItems')
			.mockResolvedValue([]);

		await node.execute.call(pythonThisArg);

		expect(runSpy).toHaveBeenCalled();

		runSpy.mockRestore();
	});
});
