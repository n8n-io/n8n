import { OperationalError } from 'n8n-workflow';

export interface PeerRef {
	url: string;
	apiKey: string;
}

/**
 * Minimal client for another n8n instance's public API, used by promotion
 * models that collaborate across instances. POC only — the peer API key rides
 * in promotion metadata in plaintext; a real design would store it as a
 * credential or use scoped instance-to-instance auth.
 */
export class PeerApi {
	private readonly baseUrl: string;

	constructor(private readonly peer: PeerRef) {
		let url = peer.url.replace(/\/+$/, '');
		if (!url.endsWith('/api/v1')) url = `${url}/api/v1`;
		this.baseUrl = url;
	}

	async createPromotion(body: Record<string, unknown>) {
		return await this.requestJson('POST', '/promotions', body);
	}

	async getPromotion(id: string) {
		return await this.requestJson('GET', `/promotions/${id}`);
	}

	async runPromotionAction(id: string, action: string) {
		return await this.requestJson('POST', `/promotions/${id}/actions/${action}`, {});
	}

	async exportUnitPackage(unitOfWork: { type: string; id: string }): Promise<Buffer> {
		const body =
			unitOfWork.type === 'project'
				? { projectIds: [unitOfWork.id] }
				: { workflowIds: [unitOfWork.id] };
		const response = await this.request('POST', '/n8n-packages/export', body);
		return Buffer.from(await response.arrayBuffer());
	}

	private async requestJson(method: string, path: string, body?: Record<string, unknown>) {
		const response = await this.request(method, path, body);
		return (await response.json()) as Record<string, unknown>;
	}

	private async request(method: string, path: string, body?: Record<string, unknown>) {
		let response: Response;
		try {
			response = await fetch(`${this.baseUrl}${path}`, {
				method,
				headers: {
					'X-N8N-API-KEY': this.peer.apiKey,
					'Content-Type': 'application/json',
					Accept: 'application/json, application/gzip',
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
		} catch (error) {
			throw new OperationalError(
				`Could not reach peer instance at ${this.peer.url}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		if (!response.ok) {
			const text = await response.text();
			throw new OperationalError(
				`Peer instance request ${method} ${path} failed (${response.status}): ${text.slice(0, 300)}`,
			);
		}
		return response;
	}
}
