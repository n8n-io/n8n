import type { Logger } from '@n8n/backend-common';
import type { ICredentialsHelper, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EvalMockedCredentialsHelper } from '../eval-mocked-credentials-helper';
import { createLlmMockHandler } from '../mock-handler';
import { createEvalThreadRunConfigurer } from '../thread-run-mock';

vi.mock('../mock-handler', () => ({
	createLlmMockHandler: vi.fn(() => vi.fn()),
}));

describe('createEvalThreadRunConfigurer', () => {
	beforeEach(() => {
		vi.mocked(createLlmMockHandler).mockClear();
	});

	it('routes the run through the HTTP mock steered by the given hints', async () => {
		const additionalData = {
			credentialsHelper: mock<ICredentialsHelper>(),
		} as unknown as IWorkflowExecuteAdditionalData;

		await createEvalThreadRunConfigurer(
			'the HTTP node returns 500',
			mock<Logger>(),
		)(additionalData);

		expect(createLlmMockHandler).toHaveBeenCalledWith({
			scenarioHints: 'the HTTP node returns 500',
		});
		expect(additionalData.evalLlmMockHandler).toBe(
			vi.mocked(createLlmMockHandler).mock.results[0].value,
		);
	});

	it('synthesizes missing credentials the way a scenario execution does', async () => {
		const additionalData = {
			credentialsHelper: mock<ICredentialsHelper>(),
		} as unknown as IWorkflowExecuteAdditionalData;

		await createEvalThreadRunConfigurer(undefined, mock<Logger>())(additionalData);

		expect(createLlmMockHandler).toHaveBeenCalledWith({ scenarioHints: undefined });
		expect(additionalData.credentialsHelper).toBeInstanceOf(EvalMockedCredentialsHelper);
	});
});
