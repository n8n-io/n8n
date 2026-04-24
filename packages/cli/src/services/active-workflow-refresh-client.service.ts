import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import axios, { AxiosError } from 'axios';

@Service()
export class ActiveWorkflowRefreshClient {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = logger.scoped('workflow-activation');
	}

	/**
	 * POSTs to the running n8n server to refresh in-memory activation state for a
	 * workflow whose DB state was just changed out-of-band (e.g. by `import:workflow`).
	 *
	 * The endpoint is bound to loopback only; the server rejects non-loopback callers.
	 * No additional auth is needed because anyone on the host already has the same
	 * trust level as the n8n process itself.
	 *
	 * Never throws: if no server is reachable, logs and returns false so the caller
	 * (e.g. the CLI import command) can proceed without failing the overall operation.
	 */
	async notifyRefresh(workflowId: string): Promise<boolean> {
		const url = this.buildUrl();

		try {
			await axios.post(
				url,
				{ workflowId },
				{
					headers: { 'content-type': 'application/json' },
					timeout: 5_000,
					validateStatus: (status) => status >= 200 && status < 300,
				},
			);
			return true;
		} catch (error) {
			const axiosError = error as AxiosError;
			if (
				axiosError.code === 'ECONNREFUSED' ||
				axiosError.code === 'ETIMEDOUT' ||
				axiosError.code === 'EHOSTUNREACH' ||
				axiosError.code === 'ENOTFOUND'
			) {
				this.logger.info(
					`No running n8n server detected at ${url}, skipping in-memory trigger refresh for workflow "${workflowId}". Restart the server to ensure triggers reflect the new state.`,
				);
				return false;
			}

			this.logger.warn(
				`Failed to refresh in-memory activation for workflow "${workflowId}": ${axiosError.message}`,
				{ url, status: axiosError.response?.status },
			);
			return false;
		}
	}

	private buildUrl(): string {
		const { protocol, port, path } = this.globalConfig;
		const restPath = this.globalConfig.endpoints.rest;
		const normalizedPath = path.endsWith('/') ? path : `${path}/`;
		return `${protocol}://127.0.0.1:${port}${normalizedPath}${restPath}/internal/active-workflow-manager/refresh`;
	}
}
