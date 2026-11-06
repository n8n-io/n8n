import type { HttpRequestClient } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { EngineControlPlaneTransport } from './engine-control-plane-transport';
import {
	isDataTableCallErrorResponse,
	isDataTableCallResponse,
} from './engine-data-tables.contract';
import type { DataTableCallOutcome, DataTableCallRequest } from './engine-data-tables.contract';
import { DATA_TABLES_CALL_PATH } from './engine-v2.constants';

/**
 * Sends one data table operation to the control plane server. Over HTTP even
 * in-process, so the data plane never touches the control plane database.
 */
@Service()
export class EngineDataTablesClient {
	private readonly http: HttpRequestClient;

	constructor(transport: EngineControlPlaneTransport) {
		this.http = transport.forScope('data-tables:use');
	}

	/**
	 * Returns the result, or the refusal the control plane answered with. A
	 * refusal is a complete answer: the caller raises the v1 error it names.
	 * Throws on any other non-2xx status and on a body of neither shape. Error
	 * messages omit the response body, because it could contain row data that
	 * would then end up in node output and logs.
	 */
	async call(request: DataTableCallRequest, signal: AbortSignal): Promise<DataTableCallOutcome> {
		const response = await this.http.request<unknown>({
			url: DATA_TABLES_CALL_PATH,
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

		if (isDataTableCallErrorResponse(response.body)) return response.body;

		// 3xx too: redirects are not followed, so one is a misconfiguration.
		if (response.statusCode >= 300) {
			throw new OperationalError(
				`Control plane refused data table call "${request.call.kind}" with ${response.statusCode}`,
			);
		}

		if (!isDataTableCallResponse(response.body)) {
			throw new OperationalError(
				`Control plane returned a malformed response for data table call "${request.call.kind}"`,
			);
		}

		return response.body;
	}
}
