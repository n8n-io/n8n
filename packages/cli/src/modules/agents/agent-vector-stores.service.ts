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

type CompatibilityCheck = { failure: string | null; warning: string | null };

/**
 * Dimension mismatch is a deterministic hard failure (search can never work).
 * A namespace missing from `describeIndexStats()` is not: Pinecone only lists
 * namespaces that have received an upsert, so a valid-but-empty namespace
 * would otherwise never pass "Connect" — surfaced as a warning instead.
 */
async function checkPineconeIndex(
	config: Extract<AgentJsonVectorStoreConfig, { provider: 'pinecone' }>,
	apiKey: unknown,
	actualDimensions: number,
): Promise<CompatibilityCheck> {
	const none: CompatibilityCheck = { failure: null, warning: null };
	if (typeof apiKey !== 'string' || !apiKey) return none;
	try {
		const { Pinecone } = await import('@pinecone-database/pinecone');
		const pc = new Pinecone({ apiKey });
		const index = await pc.describeIndex(config.indexName);
		const expected = index.dimension;
		if (typeof expected === 'number' && expected !== actualDimensions) {
			return {
				failure: `Index "${config.indexName}" expects ${expected} dimensions but model "${config.embedding.model}" produces ${actualDimensions}.`,
				warning: null,
			};
		}
		if (config.namespace) {
			const stats = await pc.index(config.indexName).describeIndexStats();
			if (!(config.namespace in (stats.namespaces ?? {}))) {
				return {
					failure: null,
					warning: `Namespace "${config.namespace}" has no data yet in index "${config.indexName}". It will appear once data is indexed — double-check the name if you expected existing data.`,
				};
			}
		}
	} catch {
		// Introspection is best-effort; the real probe query below reports the actual failure.
	}
	return none;
}

function readVectorSize(value: unknown): number | undefined {
	if (!value || typeof value !== 'object') return undefined;
	if ('size' in value && typeof value.size === 'number') return value.size;
	return undefined;
}

/** Reads the vector size off either a single default-vector or named-vector Qdrant collection config. */
function extractQdrantVectorSize(vectorsConfig: unknown): number | undefined {
	if (!vectorsConfig || typeof vectorsConfig !== 'object') return undefined;
	const direct = readVectorSize(vectorsConfig);
	if (direct !== undefined) return direct;
	const [firstNamedVector] = Object.values(vectorsConfig);
	return readVectorSize(firstNamedVector);
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

		// Hoisted so cleanup can reach a backend that finishes building *after*
		// the timeout below has already won the race — `settled` distinguishes
		// that late-arriving case from a backend built in time (closed by the
		// outer `finally` once the race is decided either way).
		let backend: BuiltVectorStoreBackend | undefined;
		let settled = false;
		const closeBackend = () => {
			// Fire-and-forget: a hung `pool.end()` on a timed-out connection must
			// not block the response.
			if (backend) void Promise.resolve(backend.close?.()).catch(() => {});
		};

		try {
			return await withTimeout(async () => {
				const rawCredential = await credentialProvider.resolve(vectorStore.credential);
				backend = await buildVectorStoreBackend(vectorStore, credentialProvider, rawCredential);
				if (settled) {
					// The race already produced a response before this backend
					// finished building — it's orphaned, so close it immediately
					// instead of leaking it for the rest of this abandoned run.
					closeBackend();
					throw new Error('Connection test timed out');
				}

				const embeddingOptions = await resolveEmbeddingProviderOptionsFromCredential(
					vectorStore.embedding.credential,
					vectorStore.embedding.model,
					credentialProvider,
				);
				const embeddingModel = createEmbeddingModel(vectorStore.embedding.model, embeddingOptions);
				const { embed } = await import('ai');
				const { embedding } = await embed({ model: embeddingModel, value: TEST_QUERY });

				const { failure, warning } = await this.checkProviderCompatibility(
					vectorStore,
					rawCredential,
					embedding.length,
				);
				if (failure) {
					return { success: false, message: failure };
				}

				await backend.query(embedding, { topK: 1 });
				return { success: true, ...(warning ? { warning } : {}) };
			}, TEST_TIMEOUT_MS);
		} catch (error) {
			return { success: false, message: errorMessage(error) };
		} finally {
			settled = true;
			closeBackend();
		}
	}

	private async checkProviderCompatibility(
		vectorStore: AgentJsonVectorStoreConfig,
		rawCredential: Record<string, unknown>,
		actualDimensions: number,
	): Promise<CompatibilityCheck> {
		switch (vectorStore.provider) {
			case 'pinecone':
				return await checkPineconeIndex(vectorStore, rawCredential.apiKey, actualDimensions);
			case 'qdrant':
				return {
					failure: await checkQdrantDimension(
						vectorStore,
						rawCredential.qdrantUrl,
						rawCredential.apiKey,
						actualDimensions,
					),
					warning: null,
				};
			case 'supabase':
			case 'postgres':
				// No cheap introspection available (REST-only client / no metadata table) — the probe query below surfaces mismatches.
				return { failure: null, warning: null };
		}
	}
}
