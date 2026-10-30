import type { HttpRequestClient } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';

import { EngineControlPlaneTransport } from './engine-control-plane-transport';
import { isResolveSubWorkflowResponse } from './engine-sub-workflow.contract';
import type {
	ResolveSubWorkflowRequest,
	ResolveSubWorkflowResponse,
} from './engine-sub-workflow.contract';
import { SUB_WORKFLOWS_RESOLVE_PATH } from './engine-v2.constants';

/** The message a control plane error response carries, if any. */
function messageOf(body: unknown): string | undefined {
	return isRecord(body) && typeof body.message === 'string' ? body.message : undefined;
}

/**
 * Asks the control plane server for the graph of a sub-workflow a step calls.
 * Over HTTP even in-process, so the data plane never reads the workflow
 * store or applies the caller policy itself.
 */
@Service()
export class EngineSubWorkflowClient {
	private readonly http: HttpRequestClient;

	constructor(transport: EngineControlPlaneTransport) {
		this.http = transport.forScope('sub-workflows:resolve');
	}

	/**
	 * A refusal (4xx) is the caller's to fix, so it reaches the node with the
	 * control plane's message. A 401 is the planes disagreeing on the secret or
	 * the scope, and anything else is the platform's: both are operational.
	 */
	async resolve(
		request: ResolveSubWorkflowRequest,
		signal: AbortSignal,
	): Promise<ResolveSubWorkflowResponse> {
		const response = await this.http.request<unknown>({
			url: SUB_WORKFLOWS_RESOLVE_PATH,
			method: 'POST',
			body: request,
			json: true,
			returnFullResponse: true,
			// Inspect the status here rather than catching a generic request error.
			ignoreHttpStatusErrors: true,
			// A redirect would forward the token to whatever host it names.
			disableFollowRedirect: true,
			// The step owns the deadline. A client timeout would fire first.
			abortSignal: signal,
		});

		// 3xx too: redirects are not followed, so one is a misconfiguration.
		if (response.statusCode >= 300) {
			const message =
				messageOf(response.body) ??
				`Control plane refused to resolve sub-workflow "${request.workflowId}" with ${response.statusCode}`;
			const callerCanFix = response.statusCode < 500 && response.statusCode !== 401;
			throw callerCanFix ? new UserError(message) : new OperationalError(message);
		}

		if (!isResolveSubWorkflowResponse(response.body)) {
			throw new OperationalError(
				`Control plane returned a malformed response for sub-workflow "${request.workflowId}"`,
			);
		}

		return response.body;
	}
}
