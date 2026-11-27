import type { HttpRequestClient } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from '@n8n/errors';

import { EngineControlPlaneTransport } from './engine-control-plane-transport';
import { isResolveWorkflowResponse } from './engine-workflow-resolve.contract';
import type {
	ResolveWorkflowCall,
	ResolveWorkflowResponseFor,
} from './engine-workflow-resolve.contract';
import { WORKFLOWS_RESOLVE_PATH } from './engine-v2.constants';

/** The message and hint a control plane error response carries, if any. */
export function errorTextOf(body: unknown): { message?: string; hint?: string } {
	if (!isRecord(body)) return {};
	return {
		message: typeof body.message === 'string' ? body.message : undefined,
		hint: typeof body.hint === 'string' ? body.hint : undefined,
	};
}

/**
 * A 4xx names a problem with the request, which the caller can fix. A 401
 * names a disagreement between the planes, such as a secret that is being
 * rotated, and 408 and 429 ask the caller to try again.
 */
const TRANSIENT_CLIENT_ERRORS = new Set([401, 408, 429]);

function callerCanFix(statusCode: number): boolean {
	return statusCode >= 400 && statusCode < 500 && !TRANSIENT_CLIENT_ERRORS.has(statusCode);
}

function describe(request: ResolveWorkflowCall): string {
	return request.kind === 'sub-workflow'
		? `sub-workflow "${request.workflowId}"`
		: `the error workflow of execution "${request.source.executionId}"`;
}

/** Asks the control plane server for a workflow that the data plane starts. */
@Service()
export class EngineWorkflowResolveClient {
	private readonly http: HttpRequestClient;

	constructor(transport: EngineControlPlaneTransport) {
		this.http = transport.forScope('workflows:resolve');
	}

	/**
	 * Resolves the workflow that the request names: its graph, workflow
	 * document and trigger outputs. A refusal that the caller can fix throws a
	 * `UserError` with v1's description as its hint. Every other failure throws
	 * an `OperationalError`. `signal` aborts the request.
	 */
	async resolve<C extends ResolveWorkflowCall>(
		request: C,
		signal: AbortSignal,
	): Promise<ResolveWorkflowResponseFor<C['kind']>> {
		const response = await this.http.request<unknown>({
			url: WORKFLOWS_RESOLVE_PATH,
			method: 'POST',
			body: request,
			json: true,
			returnFullResponse: true,
			// Inspect the status here rather than catching a generic request error.
			ignoreHttpStatusErrors: true,
			// A redirect would forward the token to whatever host it names.
			disableFollowRedirect: true,
			// The caller owns the deadline. A client timeout would fire first.
			abortSignal: signal,
		});

		// 3xx too: redirects are not followed, so one is a misconfiguration.
		if (response.statusCode >= 300) {
			const text = errorTextOf(response.body);
			const message =
				text.message ??
				`Control plane refused to resolve ${describe(request)} with ${response.statusCode}`;
			// The hint is v1's description of the refusal, which the node shows the user.
			throw callerCanFix(response.statusCode)
				? new UserError(message, { description: text.hint })
				: new OperationalError(message, { extra: { statusCode: response.statusCode } });
		}

		const kind: C['kind'] = request.kind;
		if (!isResolveWorkflowResponse(kind, response.body)) {
			throw new OperationalError(
				`Control plane returned a malformed response for ${describe(request)}`,
			);
		}

		return response.body;
	}
}
