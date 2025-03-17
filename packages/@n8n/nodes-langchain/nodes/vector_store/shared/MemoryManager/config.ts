import type { MemoryVectorStoreConfig } from './types';

// Defaults
const DEFAULT_MAX_MEMORY_MB = -1;
const DEFAULT_INACTIVE_TTL_HOURS = -1;

/**
 * Helper function to get the configuration from environment variables
 */
export function getConfig(): MemoryVectorStoreConfig {
	// Get memory limit from env var or use default
	let maxMemoryMB = DEFAULT_MAX_MEMORY_MB;
	if (process.env.N8N_VECTOR_STORE_MAX_MEMORY) {
		const parsed = parseInt(process.env.N8N_VECTOR_STORE_MAX_MEMORY, 10);
		if (!isNaN(parsed)) {
			maxMemoryMB = parsed;
		}
	}

	// Get TTL from env var or use default
	let ttlHours = DEFAULT_INACTIVE_TTL_HOURS;
	if (process.env.N8N_VECTOR_STORE_TTL_HOURS) {
		const parsed = parseInt(process.env.N8N_VECTOR_STORE_TTL_HOURS, 10);
		if (!isNaN(parsed)) {
			ttlHours = parsed;
		}
	}

	return {
		maxMemoryMB,
		ttlHours,
	};
}

/**
 * Convert memory size from MB to bytes
 */
export function mbToBytes(mb: number): number {
	// -1 - "unlimited"
	if (mb <= 0) return -1;
	return mb * 1024 * 1024;
}

/**
 * Convert TTL from hours to milliseconds
 */
export function hoursToMs(hours: number): number {
	// -1 - "disabled"
	if (hours <= 0) return -1;
	return hours * 60 * 60 * 1000;
}
