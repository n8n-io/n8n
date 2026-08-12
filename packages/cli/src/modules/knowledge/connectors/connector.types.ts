import type { Logger } from '@n8n/backend-common';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { KnowledgeSource } from '../database/entities';
import type { KnowledgeSourceType } from '../knowledge.constants';

export interface KnowledgeDocumentDraft {
	/** Stable identifier within the source, e.g. 'issue:123', 'workflow:<id>' */
	externalId: string;
	title: string;
	url?: string;
	/** Full text content to be chunked and embedded */
	text: string;
	/** Flat metadata stored on every chunk of this document */
	metadata: Record<string, string | number | boolean>;
	sourceUpdatedAt?: Date;
}

export interface ConnectorSyncContext {
	source: KnowledgeSource;
	/** null on first (full) sync */
	checkpoint: Record<string, unknown> | null;
	/** Decrypted credential data, null for connectors that need none */
	credential: ICredentialDataDecryptedObject | null;
	logger: Logger;
	abortSignal?: AbortSignal;
}

export interface ConnectorSyncResult {
	checkpoint: Record<string, unknown>;
	/** externalIds that no longer exist at the source (used to prune); omit if unknown */
	deletedExternalIds?: string[];
}

export interface KnowledgeConnector {
	readonly type: KnowledgeSourceType;
	/** true when this connector requires a credential to be configured on the source */
	readonly requiresCredential: boolean;
	/** Parse + validate source.config; throw UserError with a clear message on invalid config */
	parseConfig(config: unknown): Record<string, unknown>;
	/** Yield document drafts; return the new checkpoint. Must honor ctx.abortSignal. */
	sync(ctx: ConnectorSyncContext): AsyncGenerator<KnowledgeDocumentDraft, ConnectorSyncResult>;
	/** Cheap enumeration of all current externalIds at the source, for deletion pruning. Optional. */
	listExternalIds?(ctx: ConnectorSyncContext): Promise<string[]>;
}
