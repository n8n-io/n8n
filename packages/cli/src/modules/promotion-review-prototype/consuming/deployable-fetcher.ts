import { Service } from '@n8n/di';
import axios from 'axios';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import type { OutboxEntry } from '../producing/promotion-producing.types';
import type { ResolvedSourceConnection } from './source-connection.types';

const PRODUCING_BASE = '/rest/promotion-review-prototype/producing';
const API_KEY_HEADER = 'X-N8N-API-KEY';

/**
 * Abstracts how the consuming instance fetches a producing instance's promotion
 * requests and deployable bytes. v1 has a single `DirectDeployableFetcher`
 * (HTTP to the producing instance). An intermediary transport (shared store /
 * git) would be a second implementation — nothing else on the consuming side
 * changes (see ADR-0002).
 */
export interface DeployableFetcher {
	listOutbox(connection: ResolvedSourceConnection): Promise<OutboxEntry[]>;
	fetchDeployable(connection: ResolvedSourceConnection, hash: string): Promise<Buffer>;
}

@Service()
export class DirectDeployableFetcher implements DeployableFetcher {
	async listOutbox(connection: ResolvedSourceConnection): Promise<OutboxEntry[]> {
		const response = await axios.get<string>(`${connection.baseUrl}${PRODUCING_BASE}/outbox`, {
			headers: { [API_KEY_HEADER]: connection.apiKey },
			responseType: 'text',
			transformResponse: (data: string) => data,
		});
		const parsed = jsonParse<{ data?: OutboxEntry[] } | OutboxEntry[]>(response.data, {
			errorMessage: `Source ${connection.name} returned an invalid outbox`,
		});
		// n8n REST responses are wrapped as `{ data: ... }`.
		const outbox = Array.isArray(parsed) ? parsed : parsed.data;
		if (!Array.isArray(outbox)) {
			throw new UnexpectedError(`Source ${connection.name} outbox is not an array`);
		}
		return outbox;
	}

	async fetchDeployable(connection: ResolvedSourceConnection, hash: string): Promise<Buffer> {
		const response = await axios.get<ArrayBuffer>(
			`${connection.baseUrl}${PRODUCING_BASE}/deployables/${hash}`,
			{
				headers: { [API_KEY_HEADER]: connection.apiKey },
				responseType: 'arraybuffer',
			},
		);
		return Buffer.from(response.data);
	}
}
