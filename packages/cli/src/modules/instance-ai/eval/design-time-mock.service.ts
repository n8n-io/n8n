import type { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { EvalMockedCredentialsHelper } from './eval-mocked-credentials-helper';
import { createLlmMockHandler } from './mock-handler';
import { truncateForLlm } from './request-sanitizer';
import { EvalThreadCredentialAllowlistService } from './thread-credential-allowlist.service';

/**
 * The context of a mock that answers before any scenario exists. The user's request names the
 * resources and fields, so the lookup answers agree with the case.
 */
export function designTimeMockContext(userRequests: string): string {
	return userRequests
		? `This is a workflow build. The user asked: ${truncateForLlm(userRequests)}\n` +
				'Every resource the user names exists and has every field the request names, spelled exactly as written.'
		: '';
}

/** Sends the HTTP of a run to `handler`, with the credential handling of a scenario run. */
export function configureEvalMockRun(
	handler: EvalLlmMockHandler,
	logger: Logger,
): (additionalData: IWorkflowExecuteAdditionalData) => void {
	return (additionalData) => {
		additionalData.credentialsHelper = new EvalMockedCredentialsHelper(
			additionalData.credentialsHelper,
			undefined,
			logger,
		);
		additionalData.evalLlmMockHandler = handler;
	};
}

/**
 * Design-time HTTP of an eval build thread: resource lookups and verification runs. Eval
 * credentials hold placeholder tokens and eval cases name hosts that do not exist, so these
 * calls fail for real. In an eval thread they go to the LLM mock of scenario runs instead. A
 * thread is an eval thread when the harness pinned its credentials. Other threads get no mock.
 */
@Service()
export class EvalDesignTimeMockService {
	private readonly byThread = new Map<string, Promise<EvalLlmMockHandler>>();

	constructor(private readonly credentialAllowlists: EvalThreadCredentialAllowlistService) {}

	/**
	 * One mock for each thread: its cache gives a repeated request the same answer, so the
	 * lookups and verification runs of a build agree, and a request costs one LLM call.
	 */
	async handlerFor(
		threadId: string,
		userRequests: () => Promise<string>,
	): Promise<EvalLlmMockHandler | undefined> {
		if (this.credentialAllowlists.get(threadId) === undefined) return undefined;
		const known = this.byThread.get(threadId);
		if (known) return await known;
		const created = userRequests()
			.catch(() => '')
			.then((requests) => createLlmMockHandler({ globalContext: designTimeMockContext(requests) }));
		this.byThread.set(threadId, created);
		return await created;
	}

	clearThread(threadId: string): void {
		this.byThread.delete(threadId);
	}
}
