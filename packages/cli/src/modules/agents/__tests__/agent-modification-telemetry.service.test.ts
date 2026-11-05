import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import {
	buildVectorStoreFingerprints,
	createKnowledgeTelemetryHmac,
} from '../agent-knowledge-telemetry';
import {
	AgentModificationTelemetryService,
	type AgentModificationEvent,
} from '../agent-modification-telemetry.service';
import type { Agent } from '../entities/agent.entity';

const instanceSecret = 'instance-secret';
const instanceSettings = mock<InstanceSettings>({ hmacSignatureSecret: instanceSecret });

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
		expect(buildVectorStoreFingerprints([store], instanceSecret)).toEqual([
			createKnowledgeTelemetryHmac(instanceSecret)
				.update(JSON.stringify([store.provider, 'documents']))
				.digest('hex'),
		]);
	});

	it('keeps Pinecone namespaces of one index apart', () => {
		const sales = {
			...base,
			provider: 'pinecone' as const,
			indexName: 'documents',
			namespace: 'sales',
		};
		const support = { ...sales, namespace: 'support' };

		expect(buildVectorStoreFingerprints([sales], instanceSecret)).not.toEqual(
			buildVectorStoreFingerprints([support], instanceSecret),
		);
		expect(buildVectorStoreFingerprints([sales], instanceSecret)).not.toEqual(
			buildVectorStoreFingerprints([stores[0]], instanceSecret),
		);
	});

	it('produces different codes for the same store in another instance', () => {
		expect(buildVectorStoreFingerprints(stores, 'other-instance-secret')).not.toEqual(
			buildVectorStoreFingerprints(stores, instanceSecret),
		);
	});

	it('ignores connection labels and credentials and deduplicates in stable order', () => {
		const renamed = stores.map((store) => ({ ...store, name: 'renamed', credential: 'different' }));
		const expected = buildVectorStoreFingerprints(stores, instanceSecret);
		expect(expected).toHaveLength(4);
		expect(buildVectorStoreFingerprints([...renamed.reverse(), ...stores], instanceSecret)).toEqual(
			expected,
		);
		expect(JSON.stringify(expected)).not.toContain('documents');
		expect(
			buildVectorStoreFingerprints(
				[{ ...base, provider: 'pinecone', indexName: 'other' }],
				instanceSecret,
			),
		).not.toEqual(buildVectorStoreFingerprints([stores[0]], instanceSecret));
	});

	it.each([
		['user', TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT],
		['builder', TELEMETRY_EVENT.AGENTS.BUILDER_MODIFIED_AGENT],
		['mcp', TELEMETRY_EVENT.AGENTS.MCP_MODIFIED_AGENT],
	] as const)('reports committed stores for %s with the acting user', (by, entry) => {
		const telemetry = mock<Telemetry>();
		const service = new AgentModificationTelemetryService(
			telemetry,
			instanceSettings,
			mock<EventService>(),
		);
		service.record(event({ by }));
		service.record(event({ by, agent: mock<Agent>({ id: 'agent-2', integrations: [] }) }));
		expect(telemetry.track).toHaveBeenCalledTimes(2);
		for (const [emitted, payload] of telemetry.track.mock.calls) {
			expect(emitted).toBe(entry);
			expect(payload).toMatchObject({
				user_id: 'user-1',
				vector_store_fingerprints: buildVectorStoreFingerprints(stores, instanceSecret),
			});
			expect(entry.properties.safeParse(payload).success).toBe(true);
			expect(JSON.stringify(payload)).not.toContain('documents');
			expect(JSON.stringify(payload)).not.toContain('credential');
		}
	});

	it('reports an empty set after all stores are removed', () => {
		const telemetry = mock<Telemetry>();
		new AgentModificationTelemetryService(telemetry, instanceSettings, mock<EventService>()).record(
			event({ config: null }),
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
			expect.objectContaining({ vector_store_fingerprints: [] }),
		);
	});

	it('omits fingerprints for unrelated changes and creation', () => {
		const telemetry = mock<Telemetry>();
		const service = new AgentModificationTelemetryService(
			telemetry,
			instanceSettings,
			mock<EventService>(),
		);
		service.record(event({ changedParts: ['instructions'] }));
		service.recordCreation(event());
		expect(telemetry.track).toHaveBeenCalledTimes(2);
		for (const [, payload] of telemetry.track.mock.calls) {
			expect(payload).not.toHaveProperty('vector_store_fingerprints');
		}
	});

	it('sends the event without fingerprints when the fingerprints fail', () => {
		const telemetry = mock<Telemetry>();
		const brokenInstanceSettings = mock<InstanceSettings>();
		Object.defineProperty(brokenInstanceSettings, 'hmacSignatureSecret', {
			get: () => {
				throw new Error('secret unavailable');
			},
		});

		new AgentModificationTelemetryService(
			telemetry,
			brokenInstanceSettings,
			mock<EventService>(),
		).record(event());

		expect(telemetry.track).toHaveBeenCalledTimes(1);
		const [[, payload]] = telemetry.track.mock.calls;
		expect(payload).toMatchObject({ user_id: 'user-1' });
		expect(payload).not.toHaveProperty('vector_store_fingerprints');
	});

	it('does not emit for an unchanged configuration', () => {
		const telemetry = mock<Telemetry>();
		new AgentModificationTelemetryService(telemetry, instanceSettings, mock<EventService>()).record(
			event({ changedParts: [] }),
		);
		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
