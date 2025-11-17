import { safeJoinPath, isContainedWithin } from '@n8n/backend-common';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import type { IModelMetadata } from 'n8n-workflow';

/**
 * In-memory cache for loaded metadata
 */
const metadataCache = new Map<string, IModelMetadata | undefined>();

/**
 * Separate cache for alias mappings per provider
 */
const aliasCache = new Map<string, Record<string, string>>();

/**
 * Validates that a path component doesn't contain directory traversal characters
 */
function isValidPathComponent(component: string): boolean {
	// Prevent path traversal and other malicious patterns
	return !/[/\\]|^\.\./i.test(component) && component.length > 0;
}

/**
 * Load alias mappings for a provider
 */
async function loadAliases(metadataDir: string, provider: string): Promise<Record<string, string>> {
	try {
		const aliasPath = safeJoinPath(metadataDir, provider, '_aliases.json');

		// Verify path is contained within metadata directory
		if (!isContainedWithin(metadataDir, aliasPath)) {
			return {};
		}

		// Check if file exists
		await access(aliasPath);

		const content = await readFile(aliasPath, 'utf-8');
		return JSON.parse(content) as Record<string, string>;
	} catch (error) {
		// Silently fail - aliases are optional
		return {};
	}
}

/**
 * Resolves model ID through alias mapping
 */
async function resolveModelId(
	metadataDir: string,
	provider: string,
	modelId: string,
): Promise<string> {
	const cacheKey = provider;

	// Check cache first
	let aliases = aliasCache.get(cacheKey);

	if (!aliases) {
		aliases = await loadAliases(metadataDir, provider);
		aliasCache.set(cacheKey, aliases);
	}

	return aliases[modelId] || modelId;
}

/**
 * Gets the metadata directory path
 */
function getMetadataDir(): string {
	// This file is in utils/, metadata is in ../model-metadata/
	return join(__dirname, '..', 'model-metadata');
}

/**
 * Loads model metadata from JSON files in the model-metadata directory
 *
 * Performance characteristics:
 * - First call per model: ~1-2ms (async disk read)
 * - Subsequent calls: <0.01ms (memory cached)
 * - Non-blocking: Uses async I/O to prevent event loop blocking
 * - Total memory footprint: ~100KB for all 176 models
 *
 * @param provider - Provider name (e.g., 'google', 'anthropic', 'mistral', 'openai')
 * @param modelId - Model identifier (e.g., 'gemini-2.5-flash', 'claude-3-5-sonnet-20241022')
 * @returns Promise resolving to model metadata or undefined if not found
 *
 * @example
 * ```typescript
 * const metadata = await loadModelMetadata('google', 'gemini-2.5-flash');
 * // Returns: { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', ... }
 * ```
 */
export async function loadModelMetadata(
	provider: string,
	modelId: string,
): Promise<IModelMetadata | undefined> {
	// Validate inputs to prevent path traversal
	if (!isValidPathComponent(provider) || !isValidPathComponent(modelId)) {
		return undefined;
	}

	const cacheKey = `${provider}_${modelId}`;

	// Check memory cache first
	if (metadataCache.has(cacheKey)) {
		return metadataCache.get(cacheKey);
	}

	try {
		const metadataDir = getMetadataDir();

		// Resolve aliases (e.g., 'chatgpt-4o-latest' -> 'gpt-4o')
		const resolvedModelId = await resolveModelId(metadataDir, provider, modelId);

		// Construct path to metadata file using secure path joining
		const metadataPath = safeJoinPath(metadataDir, provider, `${resolvedModelId}.json`);

		// Verify path is contained within metadata directory (defense in depth)
		if (!isContainedWithin(metadataDir, metadataPath)) {
			metadataCache.set(cacheKey, undefined);
			return undefined;
		}

		// Check if file exists
		try {
			await access(metadataPath);
		} catch {
			// File doesn't exist - cache the undefined result
			metadataCache.set(cacheKey, undefined);
			return undefined;
		}

		// Load and parse JSON
		const content = await readFile(metadataPath, 'utf-8');
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
 * Clears both metadata and alias caches (useful for testing)
 */
export function clearMetadataCache(): void {
	metadataCache.clear();
	aliasCache.clear();
}
