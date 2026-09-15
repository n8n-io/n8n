import type { HttpRequestClient } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { EngineControlPlaneTransport } from './engine-control-plane-transport';
import { isResolveCredentialResponse } from './engine-credentials.contract';
import type { ResolveCredentialRequest } from './engine-credentials.contract';
import { CREDENTIALS_RESOLVE_PATH } from './engine-v2.constants';

/**
 * Asks the control plane server for the decrypted data of one credential.
 * Over HTTP even in-process, so the data plane never touches the credential
 * store or the encryption key.
 */
@Service()
export class EngineCredentialsClient {
	private readonly http: HttpRequestClient;

	constructor(transport: EngineControlPlaneTransport) {
		this.http = transport.forScope('credentials:read');
	}

	/**
	 * Throws on a non-2xx status or a body without `data`. Error messages omit
	 * the response body, because a server error body could contain credential
	 * data that would then end up in node output and logs.
	 */
	async resolve(
		request: ResolveCredentialRequest,
		signal: AbortSignal,
	): Promise<ICredentialDataDecryptedObject> {
		const response = await this.http.request<unknown>({
			url: CREDENTIALS_RESOLVE_PATH,
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
			throw new OperationalError(
				`Control plane refused to resolve credential "${request.credential.id}" with ${response.statusCode}`,
			);
		}

		if (!isResolveCredentialResponse(response.body)) {
			throw new OperationalError(
				`Control plane returned a malformed response for credential "${request.credential.id}"`,
			);
		}

		return response.body.data;
	}
}
