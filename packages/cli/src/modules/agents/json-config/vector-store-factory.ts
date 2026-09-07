import type { BuiltVectorStoreBackend, CredentialProvider, ResolvedCredential } from '@n8n/agents';
import { VectorStore } from '@n8n/agents';
import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';

import { resolveEmbeddingProviderOptionsFromCredential } from './embedding-credential';

/** Reads a required string field off a resolved credential, throwing a clear error if it's missing. */
function requireCredentialField(
	credential: ResolvedCredential,
	field: string,
	credentialLabel: string,
): string {
	const value = credential[field];
	if (typeof value !== 'string' || value.length === 0) {
		throw new UserError(`${credentialLabel} credential is missing "${field}"`);
	}
	return value;
}

/** Reads an optional string field off a resolved credential, treating empty strings as absent. */
function optionalCredentialField(
	credential: ResolvedCredential,
	field: string,
): string | undefined {
	const value = credential[field];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Reads a string field, falling back to the credential type's declared default.
 * Decrypted credential data only contains fields the user changed — fields left
 * at their default in the credential UI are not persisted.
 */
function credentialFieldWithDefault(
	credential: ResolvedCredential,
	field: string,
	defaultValue: string,
): string {
	return optionalCredentialField(credential, field) ?? defaultValue;
}

async function buildPostgresBackend(
	config: Extract<AgentJsonVectorStoreConfig, { provider: 'postgres' }>,
	credential: ResolvedCredential,
): Promise<BuiltVectorStoreBackend> {
	if (credential.sshTunnel === true) {
		throw new UserError('SSH tunnel Postgres credentials are not supported for vector stores');
	}

	// Defaults mirror Postgres.credentials.ts — fields left at their default in
	// the credential UI are not part of the stored data.
	const host = credentialFieldWithDefault(credential, 'host', 'localhost');
	const database = credentialFieldWithDefault(credential, 'database', 'postgres');
	const user = credentialFieldWithDefault(credential, 'user', 'postgres');
	const password = optionalCredentialField(credential, 'password') ?? '';
	const port =
		typeof credential.port === 'number'
			? credential.port
			: Number(optionalCredentialField(credential, 'port') ?? 5432);
	const ssl = credential.ssl;
	const allowUnauthorizedCerts = credential.allowUnauthorizedCerts === true;

	const encodedUser = encodeURIComponent(user);
	const encodedPassword = encodeURIComponent(password);
	const encodedDatabase = encodeURIComponent(database);
	let connectionString = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDatabase}`;
	if (allowUnauthorizedCerts) {
		connectionString += '?sslmode=no-verify';
	} else if (ssl === 'require') {
		connectionString += '?sslmode=require';
	}

	const { PgVectorStore } = await import('@n8n/agents/vector-stores/postgres');
	return new PgVectorStore(config.name, {
		connectionString,
		tableName: config.tableName,
		connectionTimeoutMillis: 10_000,
	});
}

async function buildBackend(
	config: AgentJsonVectorStoreConfig,
	credential: ResolvedCredential,
): Promise<BuiltVectorStoreBackend> {
	switch (config.provider) {
		case 'pinecone': {
			const apiKey = requireCredentialField(credential, 'apiKey', 'Pinecone');
			const { PineconeVectorStore } = await import('@n8n/agents/vector-stores/pinecone');
			return new PineconeVectorStore(config.name, {
				apiKey,
				indexName: config.indexName,
				...(config.namespace ? { namespace: config.namespace } : {}),
			});
		}
		case 'qdrant': {
			const url = requireCredentialField(credential, 'qdrantUrl', 'Qdrant');
			const apiKey = optionalCredentialField(credential, 'apiKey');
			const { QdrantVectorStore } = await import('@n8n/agents/vector-stores/qdrant');
			return new QdrantVectorStore(config.name, {
				url,
				...(apiKey ? { apiKey } : {}),
				collectionName: config.collectionName,
			});
		}
		case 'supabase': {
			const url = requireCredentialField(credential, 'host', 'Supabase');
			const apiKey = requireCredentialField(credential, 'serviceRole', 'Supabase');
			const { SupabaseVectorStore } = await import('@n8n/agents/vector-stores/supabase');
			return new SupabaseVectorStore(config.name, {
				url,
				apiKey,
				tableName: config.tableName,
				...(config.queryName ? { queryName: config.queryName } : {}),
			});
		}
		case 'postgres':
			return await buildPostgresBackend(config, credential);
	}
}

/**
 * Resolves a vector store connection's n8n credential and builds the matching
 * SDK backend. Pass `resolvedCredential` when the caller already decrypted
 * the credential to avoid resolving it twice.
 */
export async function buildVectorStoreBackend(
	config: AgentJsonVectorStoreConfig,
	credentialProvider: CredentialProvider,
	resolvedCredential?: ResolvedCredential,
): Promise<BuiltVectorStoreBackend> {
	if (!config.credential) {
		throw new UserError(`Vector store "${config.name}" has no credential configured`);
	}
	const credential = resolvedCredential ?? (await credentialProvider.resolve(config.credential));
	return await buildBackend(config, credential);
}

/**
 * Builds a ready-to-use `VectorStore` (backend + embedding model) from a
 * persisted vector store connection. Does not attach it as a tool — callers
 * decide whether to call `.asTool()` (runtime) or `.search()` directly (test probe).
 */
export async function buildVectorStore(
	config: AgentJsonVectorStoreConfig,
	credentialProvider: CredentialProvider,
): Promise<VectorStore> {
	if (!config.embedding.credential) {
		throw new UserError(`Vector store "${config.name}" has no embedding credential configured`);
	}

	const backend = await buildVectorStoreBackend(config, credentialProvider);
	const embeddingOptions = await resolveEmbeddingProviderOptionsFromCredential(
		config.embedding.credential,
		config.embedding.model,
		credentialProvider,
	);

	return new VectorStore(config.name)
		.store(backend)
		.embeddingModel(config.embedding.model, embeddingOptions);
}
