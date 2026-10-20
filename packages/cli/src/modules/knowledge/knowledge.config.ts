import { Config, Env, positiveIntSchema } from '@n8n/config';

// WIP Note: The defaults equal the upload limits in `@n8n/api-types/src/agents/agent-files.constants.ts`,
// which the editor still enforces before an upload. `knowledge.config.test.ts` pins them until
// P1 serves the limits to the editor through module settings.

/**
 * Limits for the knowledge files that users upload to agents.
 */
@Config
export class KnowledgeConfig {
	/**
	 * Maximum size in bytes of one uploaded knowledge file. n8n rejects larger
	 * files at upload.
	 */
	@Env('N8N_KNOWLEDGE_UPLOAD_MAX_FILE_SIZE_BYTES', positiveIntSchema)
	uploadMaxFileSizeBytes: number = 10 * 1024 * 1024;

	/** Maximum number of knowledge files in one upload request. */
	@Env('N8N_KNOWLEDGE_UPLOAD_MAX_FILES', positiveIntSchema)
	uploadMaxFiles: number = 10;

	/**
	 * Maximum total size in bytes of the knowledge files one agent can hold.
	 * n8n rejects an upload that would exceed it.
	 */
	@Env('N8N_KNOWLEDGE_MAX_TOTAL_SIZE_BYTES', positiveIntSchema)
	maxTotalSizeBytes: number = 1.5 * 1024 * 1024 * 1024;
}
