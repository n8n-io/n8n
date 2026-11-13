import {
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
} from '@n8n/api-types';
import { Config, Env, positiveIntSchema } from '@n8n/config';

const BYTES_PER_MB = 1024 * 1024;

/**
 * Upload limits of the knowledge module. The defaults equal the constants in
 * `@n8n/api-types`, which the editor falls back to when the module is off.
 * The limits are integer megabytes, like the agents file limits, so an
 * operator never types a byte count.
 */
@Config
export class KnowledgeConfig {
	/**
	 * Largest file, in megabytes, that a user can upload to an agent's knowledge base.
	 * The sandbox that searches the files can have a lower limit of its own.
	 */
	@Env('N8N_KNOWLEDGE_MAX_FILE_SIZE_MB', positiveIntSchema)
	maxFileSizeMb: number = MAX_AGENT_FILE_SIZE_MB;

	/**
	 * Most files that a user can upload to a knowledge base in one request.
	 */
	@Env('N8N_KNOWLEDGE_MAX_FILES_PER_UPLOAD', positiveIntSchema)
	maxFilesPerUpload: number = MAX_AGENT_FILES_PER_UPLOAD;

	/**
	 * Most data, in megabytes, that one agent's knowledge base can hold across all its files.
	 * n8n rejects an upload that would exceed it.
	 */
	@Env('N8N_KNOWLEDGE_MAX_TOTAL_SIZE_MB', positiveIntSchema)
	maxTotalSizeMb: number = MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB * 1024;

	get maxFileSizeBytes(): number {
		return this.maxFileSizeMb * BYTES_PER_MB;
	}

	get maxTotalSizeBytes(): number {
		return this.maxTotalSizeMb * BYTES_PER_MB;
	}
}
