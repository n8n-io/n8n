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

/** The message and hint a control plane error response carries, if any. */
function errorTextOf(body: unknown): { message?: string; hint?: string } {
	if (!isRecord(body)) return {};
	return {
		message: typeof body.message === 'string' ? body.message : undefined,
		hint: typeof body.hint === 'string' ? body.hint : undefined,
	};
}

/** Asks the control plane server for the graph of a sub-workflow a step calls. */
@Service()
export class EngineSubWorkflowClient {
	private readonly http: HttpRequestClient;

	constructor(transport: EngineControlPlaneTransport) {
		this.http = transport.forScope('sub-workflows:resolve');
	}

	/**
	 * Resolves the sub-workflow the request names: its graph, workflow document
	 * and trigger outputs. `signal` aborts the request when the step is cancelled.
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
			const text = errorTextOf(response.body);
			const message =
				text.message ??
				`Control plane refused to resolve sub-workflow "${request.workflowId}" with ${response.statusCode}`;
			// Only a 4xx names a problem the caller can fix, and a 401 names a
			// disagreement between the planes rather than with the caller.
			const callerCanFix =
				response.statusCode >= 400 && response.statusCode < 500 && response.statusCode !== 401;
			// The hint is v1's description of the refusal, which the node shows the user.
			throw callerCanFix
				? new UserError(message, { description: text.hint })
				: new OperationalError(message);
		}

		if (!isResolveSubWorkflowResponse(response.body)) {
			throw new OperationalError(
				`Control plane returned a malformed response for sub-workflow "${request.workflowId}"`,
			);
		}

		return response.body;
	}
}
