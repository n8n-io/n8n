import type { Logger } from '@n8n/backend-common';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { EvalMockedCredentialsHelper } from './eval-mocked-credentials-helper';
import { createLlmMockHandler } from './mock-handler';

type ConfigureAdditionalData = NonNullable<
	IWorkflowExecutionDataProcess['configureAdditionalData']
>;

/**
 * Mocks a run the agent starts itself inside an eval thread the way a scenario
 * execution is mocked: HTTP goes to the LLM mock, missing credentials are
 * synthesized. `hints` come from the case's prior runs of the workflow.
 */
export function createEvalThreadRunConfigurer(
	hints: string | undefined,
	logger: Logger,
): ConfigureAdditionalData {
	// ponytail: no Phase-1 hint pass, so cross-node consistency rests on `hints`; add it if agent reruns drift.
	const mockHandler = createLlmMockHandler({ scenarioHints: hints });
	return (additionalData) => {
		additionalData.credentialsHelper = new EvalMockedCredentialsHelper(
			additionalData.credentialsHelper,
			undefined,
			logger,
		);
		additionalData.evalLlmMockHandler = mockHandler;
	};
}
