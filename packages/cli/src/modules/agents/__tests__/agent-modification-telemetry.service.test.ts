import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { buildVectorStoreFingerprints } from '../agent-knowledge-telemetry';
import {
	AgentModificationTelemetryService,
	type AgentModificationEvent,
} from '../agent-modification-telemetry.service';
import type { Agent } from '../entities/agent.entity';

const base = {
	name: 'knowledge',
	credential: 'store-credential',
	useWhen: 'Search documents',
	embedding: { model: 'openai/text-embedding-3-small', credential: 'embedding-credential' },
};
const stores: AgentJsonVectorStoreConfig[] = [
	{ ...base, provider: 'pinecone', indexName: 'documents' },
	{ ...base, provider: 'qdrant', collectionName: 'documents' },
	{ ...base, provider: 'supabase', tableName: 'documents' },
	{ ...base, provider: 'postgres', tableName: 'documents' },
];

function event(overrides: Partial<AgentModificationEvent> = {}): AgentModificationEvent {
	return {
		agent: mock<Agent>({ id: 'agent-1', integrations: [], activeVersionId: null }),
		config: { name: 'Agent', model: 'openai/gpt-4.1', instructions: 'Help', vectorStores: stores },
		projectId: 'project-1',
		user: mock<User>({ id: 'user-1' }),
		by: 'user',
		changedParts: ['vectorStores'],
		...overrides,
	};
}

describe('knowledge reuse telemetry', () => {
	it.each(stores)('hashes the identity for $provider', (store) => {
		expect(buildVectorStoreFingerprints([store])).toEqual([
			createHash('sha256')
				.update(JSON.stringify([store.provider, 'documents']))
				.digest('hex'),
		]);
	});

	it('ignores connection labels and credentials and deduplicates in stable order', () => {
		const renamed = stores.map((store) => ({ ...store, name: 'renamed', credential: 'different' }));
		const expected = buildVectorStoreFingerprints(stores);
		expect(expected).toHaveLength(4);
		expect(buildVectorStoreFingerprints([...renamed.reverse(), ...stores])).toEqual(expected);
		expect(JSON.stringify(expected)).not.toContain('documents');
		expect(
			buildVectorStoreFingerprints([{ ...base, provider: 'pinecone', indexName: 'other' }]),
		).not.toEqual(buildVectorStoreFingerprints([stores[0]]));
	});

	it.each([
		['user', TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT],
		['builder', TELEMETRY_EVENT.AGENTS.BUILDER_MODIFIED_AGENT],
		['mcp', TELEMETRY_EVENT.AGENTS.MCP_MODIFIED_AGENT],
	] as const)('reports committed stores for %s with the acting user', (by, entry) => {
		const telemetry = mock<Telemetry>();
		const service = new AgentModificationTelemetryService(telemetry);
		service.record(event({ by }));
		service.record(event({ by, agent: mock<Agent>({ id: 'agent-2', integrations: [] }) }));
		expect(telemetry.track).toHaveBeenCalledTimes(2);
		for (const [emitted, payload] of telemetry.track.mock.calls) {
			expect(emitted).toBe(entry);
			expect(payload).toMatchObject({
				user_id: 'user-1',
				vector_store_fingerprints: buildVectorStoreFingerprints(stores),
			});
			expect(entry.properties.safeParse(payload).success).toBe(true);
			expect(JSON.stringify(payload)).not.toContain('documents');
			expect(JSON.stringify(payload)).not.toContain('credential');
		}
	});

	it('reports an empty set after all stores are removed', () => {
		const telemetry = mock<Telemetry>();
		new AgentModificationTelemetryService(telemetry).record(event({ config: null }));
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
			expect.objectContaining({ vector_store_fingerprints: [] }),
		);
	});

	it('omits fingerprints for unrelated changes and creation', () => {
		const telemetry = mock<Telemetry>();
		const service = new AgentModificationTelemetryService(telemetry);
		service.record(event({ changedParts: ['instructions'] }));
		service.recordCreation(event());
		expect(telemetry.track).toHaveBeenCalledTimes(2);
		for (const [, payload] of telemetry.track.mock.calls) {
			expect(payload).not.toHaveProperty('vector_store_fingerprints');
		}
	});

	it('does not emit for an unchanged configuration', () => {
		const telemetry = mock<Telemetry>();
		new AgentModificationTelemetryService(telemetry).record(event({ changedParts: [] }));
		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
