import { createEmbeddingModel, type BuiltVectorStoreBackend } from '@n8n/agents';
import type { AgentJsonVectorStoreConfig, VectorStoreTestResult } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { resolveEmbeddingProviderOptionsFromCredential } from './json-config/embedding-credential';
import { buildVectorStoreBackend } from './json-config/vector-store-factory';

const TEST_QUERY = 'n8n connection test';
const TEST_TIMEOUT_MS = 15_000;
const MAX_MESSAGE_LENGTH = 500;

function errorMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return message.length > MAX_MESSAGE_LENGTH ? `${message.slice(0, MAX_MESSAGE_LENGTH)}…` : message;
}

async function withTimeout<T>(work: () => Promise<T>, timeoutMs: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;
	const timeout = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => reject(new Error('Connection test timed out')), timeoutMs);
	});
	try {
		return await Promise.race([work(), timeout]);
	} finally {
		clearTimeout(timer!);
	}
}

/** Best-effort: only used to sharpen the error message, never fails the test on its own. */
async function checkPineconeIndex(
	config: Extract<AgentJsonVectorStoreConfig, { provider: 'pinecone' }>,
	apiKey: unknown,
	actualDimensions: number,
): Promise<string | null> {
	if (typeof apiKey !== 'string' || !apiKey) return null;
	try {
		const { Pinecone } = await import('@pinecone-database/pinecone');
		const pc = new Pinecone({ apiKey });
		const index = await pc.describeIndex(config.indexName);
		const expected = index.dimension;
		if (typeof expected === 'number' && expected !== actualDimensions) {
			return `Index "${config.indexName}" expects ${expected} dimensions but model "${config.embedding.model}" produces ${actualDimensions}.`;
		}
		if (config.namespace) {
			const stats = await pc.index(config.indexName).describeIndexStats();
			if (!(config.namespace in (stats.namespaces ?? {}))) {
				return `Namespace "${config.namespace}" was not found in index "${config.indexName}".`;
			}
		}
	} catch {
		// Introspection is best-effort; the real probe query below reports the actual failure.
	}
	return null;
}

/** Reads the vector size off either a single default-vector or named-vector Qdrant collection config. */
function extractQdrantVectorSize(vectorsConfig: unknown): number | undefined {
	if (!vectorsConfig || typeof vectorsConfig !== 'object') return undefined;
	if ('size' in vectorsConfig && typeof (vectorsConfig as { size?: unknown }).size === 'number') {
		return (vectorsConfig as { size: number }).size;
	}
	const [firstNamedVector] = Object.values(vectorsConfig as Record<string, unknown>);
	if (
		firstNamedVector &&
		typeof firstNamedVector === 'object' &&
		'size' in firstNamedVector &&
		typeof (firstNamedVector as { size?: unknown }).size === 'number'
	) {
		return (firstNamedVector as { size: number }).size;
	}
	return undefined;
}

/** Best-effort: only used to sharpen the error message, never fails the test on its own. */
async function checkQdrantDimension(
	config: Extract<AgentJsonVectorStoreConfig, { provider: 'qdrant' }>,
	url: unknown,
	apiKey: unknown,
	actualDimensions: number,
): Promise<string | null> {
	if (typeof url !== 'string' || !url) return null;
	try {
		const { QdrantClient } = await import('@qdrant/js-client-rest');
		const client = new QdrantClient({
			url,
			...(typeof apiKey === 'string' && apiKey ? { apiKey } : {}),
		});
		const collection = await client.getCollection(config.collectionName);
		const expected = extractQdrantVectorSize(collection.config?.params?.vectors);
		if (typeof expected === 'number' && expected !== actualDimensions) {
			return `Collection "${config.collectionName}" expects ${expected} dimensions but model "${config.embedding.model}" produces ${actualDimensions}.`;
		}
	} catch {
		// Introspection is best-effort; the real probe query below reports the actual failure.
	}
	return null;
}

@Service()
export class AgentVectorStoresService {
	constructor(private readonly credentialsService: CredentialsService) {}

	/**
	 * Validates a vector store connection end to end: resolves the credential,
	 * embeds a test query with the chosen embedding model/credential, and runs
	 * a real `topK: 1` search against the backend. This is the only way to
	 * catch a same-dimension-but-wrong-model mismatch, since vector stores
	 * don't record which model produced their vectors.
	 */
	async testConnection(
		projectId: string,
		user: User,
		vectorStore: AgentJsonVectorStoreConfig,
	): Promise<VectorStoreTestResult> {
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);

		// Hoisted so the outer `finally` can close the backend even if the
		// timeout below wins the race and abandons the in-flight work.
		let backend: BuiltVectorStoreBackend | undefined;
		try {
			return await withTimeout(async () => {
				const rawCredential = await credentialProvider.resolve(vectorStore.credential);
				backend = await buildVectorStoreBackend(vectorStore, credentialProvider, rawCredential);
				const embeddingOptions = await resolveEmbeddingProviderOptionsFromCredential(
					vectorStore.embedding.credential,
					vectorStore.embedding.model,
					credentialProvider,
				);
				const embeddingModel = createEmbeddingModel(vectorStore.embedding.model, embeddingOptions);
				const { embed } = await import('ai');
				const { embedding } = await embed({ model: embeddingModel, value: TEST_QUERY });

				const dimensionMismatch = await this.checkDimensionMismatch(
					vectorStore,
					rawCredential,
					embedding.length,
				);
				if (dimensionMismatch) {
					return { success: false, message: dimensionMismatch };
				}

				await backend.query(embedding, { topK: 1 });
				return { success: true };
			}, TEST_TIMEOUT_MS);
		} catch (error) {
			return { success: false, message: errorMessage(error) };
		} finally {
			// Fire-and-forget: a hung `pool.end()` on a timed-out connection must
			// not block the response.
			if (backend) void Promise.resolve(backend.close?.()).catch(() => {});
		}
	}

	private async checkDimensionMismatch(
		vectorStore: AgentJsonVectorStoreConfig,
		rawCredential: Record<string, unknown>,
		actualDimensions: number,
	): Promise<string | null> {
		switch (vectorStore.provider) {
			case 'pinecone':
				return await checkPineconeIndex(vectorStore, rawCredential.apiKey, actualDimensions);
			case 'qdrant':
				return await checkQdrantDimension(
					vectorStore,
					rawCredential.qdrantUrl,
					rawCredential.apiKey,
					actualDimensions,
				);
			case 'supabase':
			case 'postgres':
				// No cheap introspection available (REST-only client / no metadata table) — the probe query below surfaces mismatches.
				return null;
		}
	}
}
