import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export class N8nApiClient {
	constructor(public readonly apiBaseUrl: string) {}

	async waitForInstanceToBecomeOnline(): Promise<void> {
		const HEALTH_ENDPOINT = 'healthz';
		const START_TIME = Date.now();
		const INTERVAL_MS = 1000;
		const TIMEOUT_MS = 60_000;

		while (Date.now() - START_TIME < TIMEOUT_MS) {
			try {
				const response = await axios.request({
					url: `${this.apiBaseUrl}/${HEALTH_ENDPOINT}`,
					method: 'GET',
				});

				if (response.status === 200 && response.data.status === 'ok') {
					return;
				}
			} catch {}

			console.log(`n8n instance not online yet, retrying in ${INTERVAL_MS / 1000} seconds...`);
			await this.delay(INTERVAL_MS);
		}

		throw new Error(`n8n instance did not come online within ${TIMEOUT_MS / 1000} seconds`);
	}

	async setupOwnerIfNeeded(loginDetails: { email: string; password: string }) {
		const response = await this.restApiRequest<{ message: string }>('/owner/setup', {
			method: 'POST',
			data: {
				email: loginDetails.email,
				password: loginDetails.password,
				firstName: 'Test',
				lastName: 'User',
			},
			// Don't throw on non-2xx responses
			validateStatus: () => true,
		});

		const responsePayload = response.data;

		if (response.status === 200) {
			console.log('Owner setup successful');
		} else if (response.status === 400) {
			if (responsePayload.message === 'Instance owner already setup')
				console.log('Owner already set up');
		} else {
			throw new Error(
				`Owner setup failed with status ${response.status}: ${responsePayload.message}`,
			);
		}
	}

	async restApiRequest<T>(endpoint: string, init: Omit<AxiosRequestConfig, 'url'>) {
		try {
			return await axios.request<T>({
				...init,
				url: this.getRestEndpointUrl(endpoint),
			});
		} catch (e) {
			const error = e as AxiosError;
			console.error(`[ERROR] Request failed ${init.method} ${endpoint}`, error?.response?.data);
			throw error;
		}
	}

	protected getRestEndpointUrl(endpoint: string) {
		return `${this.apiBaseUrl}/rest${endpoint}`;
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
