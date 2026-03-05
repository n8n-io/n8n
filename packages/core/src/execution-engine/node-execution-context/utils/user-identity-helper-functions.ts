import { Container } from '@n8n/di';
import type { IWorkflowExecuteAdditionalData, IRunExecutionData } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { ExecutionContextService } from '../../execution-context.service';

export function getUserIdentityHelperFunction(
	additionalData: IWorkflowExecuteAdditionalData,
	runExecutionData: IRunExecutionData | null,
): () => Promise<string> {
	return async () => {
		const runtimeData = runExecutionData?.executionData?.runtimeData;
		if (!runtimeData?.credentials) {
			throw new UnexpectedError(
				'No credential context available. This node requires an authenticated user session.',
			);
		}

		const resolver = additionalData.userIdentityResolver;
		if (!resolver) {
			throw new UnexpectedError(
				'User identity resolver is not available. The dynamic-credentials module may not be active.',
			);
		}

		const executionContextService = Container.get(ExecutionContextService);
		const plaintext = executionContextService.decryptExecutionContext(runtimeData);
		if (!plaintext.credentials) {
			throw new UnexpectedError(
				'No credential context available after decryption. This node requires an authenticated user session.',
			);
		}

		return await resolver.resolveUserId(plaintext.credentials);
	};
}
