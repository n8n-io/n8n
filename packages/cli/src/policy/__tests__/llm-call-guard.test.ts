import { checkLlmCall, setLlmCallGuard, type LlmGuardedCall } from '@n8n/ai-utilities/llm-usage';
import { mock } from 'vitest-mock-extended';

import { installLlmCallGuard } from '../llm-call-guard';
import type { PolicyEnforcementService } from '../policy-enforcement.service';
import { PolicyViolationError } from '../policy-violation.error';

const call: LlmGuardedCall = {
	context: {
		callerType: 'node',
		workflowId: 'wf-1',
		executionId: 'exec-1',
		projectId: 'proj-1',
		userId: 'user-1',
	},
	credential: { managedBy: 'aiGateway' },
	provider: 'openai',
	model: 'gpt-4o',
};

describe('installLlmCallGuard', () => {
	const enforcement = mock<PolicyEnforcementService>();

	beforeEach(() => {
		vi.resetAllMocks();
		installLlmCallGuard(enforcement);
	});

	afterAll(() => setLlmCallGuard(undefined));

	it('enforces the call as a system actor of its execution', async () => {
		enforcement.hasChecksFor.mockReturnValue(true);

		await checkLlmCall(call);

		expect(enforcement.enforceLlmCall).toHaveBeenCalledWith(
			{
				callerType: 'node',
				workflowId: 'wf-1',
				agentId: null,
				projectId: 'proj-1',
				accountableUserId: 'user-1',
				credential: { managedBy: 'aiGateway' },
				provider: 'openai',
				model: 'gpt-4o',
			},
			{ kind: 'system', reason: 'execution', executionId: 'exec-1' },
		);
	});

	it('passes a violation to the capture site', async () => {
		enforcement.hasChecksFor.mockReturnValue(true);
		const blocked = new PolicyViolationError([
			{ kind: 'llm-budget-exceeded', checkId: 'llm-budget', message: 'LLM budget reached' },
		]);
		enforcement.enforceLlmCall.mockRejectedValue(blocked);

		await expect(checkLlmCall(call)).rejects.toBe(blocked);
	});

	it('does not enforce when no check implements the point', async () => {
		enforcement.hasChecksFor.mockReturnValue(false);

		await checkLlmCall(call);

		expect(enforcement.enforceLlmCall).not.toHaveBeenCalled();
	});
});
