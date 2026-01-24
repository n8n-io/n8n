/**
 * Node Types Loader
 *
 * Loads generated node type definitions from ~/.n8n/generated-types/
 * for use in TypeScript type checking.
 *
 * This module extracts the KnownNodeType union which contains all valid
 * node type strings (e.g., 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.slack').
 *
 * The loaded types are cached at startup for performance.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Path to the generated types directory.
 * This is the same location used by the agent's get_nodes tool.
 */
const GENERATED_TYPES_DIR = join(homedir(), '.n8n', 'generated-types');
const GENERATED_TYPES_INDEX = join(GENERATED_TYPES_DIR, 'index.ts');

/**
 * Fallback KnownNodeType declaration when generated types are not available.
 * This allows the type checker to work without requiring generated types,
 * but won't validate node type names.
 */
const FALLBACK_KNOWN_NODE_TYPE = `
// Fallback: Generated types not available, using permissive type
export type KnownNodeType = string;
`;

/**
 * Extract the KnownNodeType union from the generated types content.
 *
 * The generated index.ts contains:
 * - Import statements
 * - Export statements
 * - KnownNodeType: string literal union of all node type identifiers
 * - AllNodeTypes: union of all node type interfaces (requires imports)
 *
 * We extract only KnownNodeType because it's self-contained (no imports needed).
 */
function extractKnownNodeType(content: string): string | null {
	// Find the start of KnownNodeType declaration
	const startPattern = /export type KnownNodeType\s*=/;
	const startMatch = content.match(startPattern);

	if (!startMatch || startMatch.index === undefined) {
		return null;
	}

	// Find the end of the KnownNodeType declaration (ends with semicolon after the union)
	const startIndex = startMatch.index;
	const afterStart = content.substring(startIndex);

	// The KnownNodeType ends when we hit the next "export type" or end of union
	// Look for the closing semicolon that's followed by a blank line or "export type AllNodeTypes"
	const endPattern = /;\s*(?:\n\n|export type AllNodeTypes)/;
	const endMatch = afterStart.match(endPattern);

	if (!endMatch || endMatch.index === undefined) {
		// Fallback: just find the next semicolon followed by newline
		const simpleEndPattern = /;\s*\n/;
		const simpleEndMatch = afterStart.match(simpleEndPattern);
		if (simpleEndMatch && simpleEndMatch.index !== undefined) {
			return afterStart.substring(0, simpleEndMatch.index + 1);
		}
		return null;
	}

	return afterStart.substring(0, endMatch.index + 1);
}

/**
 * Load node type declarations from the generated types directory.
 *
 * Returns TypeScript declarations that can be added to the virtual file system:
 * - KnownNodeType: string literal union of all valid node types
 *
 * @returns TypeScript content with node type declarations
 */
export function loadNodeTypeDeclarations(): string {
	// Check if generated types exist
	if (!existsSync(GENERATED_TYPES_INDEX)) {
		console.warn(
			`[node-types-loader] Generated types not found at ${GENERATED_TYPES_INDEX}, using fallback`,
		);
		return FALLBACK_KNOWN_NODE_TYPE;
	}

	try {
		const content = readFileSync(GENERATED_TYPES_INDEX, 'utf-8');
		const knownNodeType = extractKnownNodeType(content);

		if (!knownNodeType) {
			console.warn('[node-types-loader] Could not extract KnownNodeType, using fallback');
			return FALLBACK_KNOWN_NODE_TYPE;
		}

		// Count the number of node types for logging
		const nodeTypeCount = (knownNodeType.match(/\|/g) || []).length;
		console.log(`[node-types-loader] Loaded ${nodeTypeCount} node types from generated types`);

		return knownNodeType;
	} catch (error) {
		console.warn('[node-types-loader] Error loading generated types, using fallback:', error);
		return FALLBACK_KNOWN_NODE_TYPE;
	}
}

/**
 * Cached node type declarations.
 * Loaded once at startup for performance.
 */
let cachedNodeTypeDeclarations: string | null = null;

/**
 * Get node type declarations (cached).
 *
 * @returns TypeScript content with node type declarations
 */
export function getNodeTypeDeclarations(): string {
	if (cachedNodeTypeDeclarations === null) {
		cachedNodeTypeDeclarations = loadNodeTypeDeclarations();
	}
	return cachedNodeTypeDeclarations;
}

/**
 * Clear the cache (for testing purposes).
 */
export function clearNodeTypeDeclarationsCache(): void {
	cachedNodeTypeDeclarations = null;
}
