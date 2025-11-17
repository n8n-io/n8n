import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { IModelMetadata } from 'n8n-workflow';

/**
 * In-memory cache for loaded metadata
 * Node.js also caches require(), but this provides explicit control
 */
const metadataCache = new Map<string, IModelMetadata | undefined>();

/**
 * Load alias mappings for a provider
 */
function loadAliases(metadataDir: string, provider: string): Record<string, string> {
	const aliasPath = join(metadataDir, provider, '_aliases.json');
	try {
		if (existsSync(aliasPath)) {
			const content = readFileSync(aliasPath, 'utf-8');
			return JSON.parse(content);
		}
	} catch (error) {
		// Silently fail - aliases are optional
	}
	return {};
}

/**
 * Resolves model ID through alias mapping
 */
function resolveModelId(metadataDir: string, provider: string, modelId: string): string {
	const cacheKey = `aliases_${provider}`;
	let aliases = metadataCache.get(cacheKey) as Record<string, string> | undefined;

	if (!aliases) {
		aliases = loadAliases(metadataDir, provider);
		metadataCache.set(cacheKey, aliases as any);
	}

	return aliases[modelId] || modelId;
}

/**
 * Loads model metadata from JSON files in the model-metadata directory
 *
 * Performance characteristics:
 * - First call per model: ~1ms (disk read)
 * - Subsequent calls: <0.01ms (memory cached)
 * - Total memory footprint: ~100KB for all 176 models
 *
 * @param provider - Provider name (e.g., 'google', 'anthropic', 'mistral', 'openai')
 * @param modelId - Model identifier (e.g., 'gemini-2.5-flash', 'claude-3-5-sonnet-20241022')
 * @returns Model metadata or undefined if not found
 *
 * @example
 * ```typescript
 * const metadata = loadModelMetadata('google', 'gemini-2.5-flash');
 * // Returns: { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', ... }
 * ```
 */
export function loadModelMetadata(provider: string, modelId: string): IModelMetadata | undefined {
	const cacheKey = `${provider}_${modelId}`;

	// Check memory cache first
	if (metadataCache.has(cacheKey)) {
		return metadataCache.get(cacheKey);
	}

	try {
		// Get the path to the model-metadata directory
		// This file is in utils/, metadata is in ../model-metadata/
		const metadataDir = join(dirname(__dirname), 'model-metadata');

		// Resolve aliases (e.g., 'chatgpt-4o-latest' -> 'gpt-4o')
		const resolvedModelId = resolveModelId(metadataDir, provider, modelId);

		// Construct path to metadata file
		const metadataPath = join(metadataDir, provider, `${resolvedModelId}.json`);

		// Check if file exists
		if (!existsSync(metadataPath)) {
			// Cache the undefined result to avoid repeated file system checks
			metadataCache.set(cacheKey, undefined);
			return undefined;
		}

		// Load and parse JSON
		const content = readFileSync(metadataPath, 'utf-8');
		const metadata = JSON.parse(content) as IModelMetadata;

		// Validate basic structure
		if (!metadata.id || !metadata.name || !metadata.provider) {
			console.warn(`Invalid metadata structure in ${metadataPath}`);
			metadataCache.set(cacheKey, undefined);
			return undefined;
		}

		// Cache and return
		metadataCache.set(cacheKey, metadata);
		return metadata;
	} catch (error) {
		// Log error in development only
		if (process.env.NODE_ENV === 'development') {
			console.debug(`Failed to load metadata for ${provider}/${modelId}:`, error);
		}

		// Cache undefined to avoid repeated failures
		metadataCache.set(cacheKey, undefined);
		return undefined;
	}
}

/**
 * Clears the metadata cache (useful for testing)
 */
export function clearMetadataCache(): void {
	metadataCache.clear();
}
