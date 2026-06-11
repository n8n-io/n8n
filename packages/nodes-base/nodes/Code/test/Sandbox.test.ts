import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, IWorkflowDataProxyData } from 'n8n-workflow';

import { getSandboxContext } from '../Sandbox';

const buildExecuteFunctionsMock = () => {
	const executeFns = mock<IExecuteFunctions>();
	const helpers = mock<IExecuteFunctions['helpers']>();
	executeFns.helpers = helpers;
	executeFns.getWorkflowDataProxy.mockReturnValue(mock<IWorkflowDataProxyData>({ $input: mock() }));
	return executeFns;
};

describe('getSandboxContext', () => {
	it('does not expose getInboundArtifact at the root of the sandbox context', () => {
		const executeFns = buildExecuteFunctionsMock();

		const context = getSandboxContext.call(executeFns, 0);

		expect('getInboundArtifact' in context).toBe(false);
		expect(Object.keys(context)).not.toContain('getInboundArtifact');
	});

	it('does not expose getInboundArtifact inside context.helpers', () => {
		const executeFns = buildExecuteFunctionsMock();

		const context = getSandboxContext.call(executeFns, 0);

		expect('getInboundArtifact' in context.helpers).toBe(false);
	});

	// This documents the leak surface we are guarding against:
	// `helpers` is spread into the sandbox by `getSandboxContext`, so any
	// key placed on `this.helpers` becomes reachable inside the Code-node
	// sandbox. `getInboundArtifact` must therefore remain off `helpers`.
	it('demonstrates that helpers IS spread into the sandbox (regression-guard contrast)', () => {
		const executeFns = buildExecuteFunctionsMock();
		const helpersWithLeak = {
			httpRequestWithAuthentication: jest.fn(),
			requestWithAuthenticationPaginated: jest.fn(),
			getInboundArtifact: jest.fn(),
		} as unknown as IExecuteFunctions['helpers'];
		executeFns.helpers = helpersWithLeak;

		const context = getSandboxContext.call(executeFns, 0);

		expect('getInboundArtifact' in context.helpers).toBe(true);
	});
});
