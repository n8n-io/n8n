/**
 * AI Node Registry — Bidirectional mapping between DSL class names and n8n node types.
 *
 * Loads the auto-generated registry from nodes-langchain build output.
 * Used by both the compiler (class constructors → SDK) and the decompiler (SDK → class constructors).
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AiNodeEntry {
	nodeType: string;
	version: number;
	category: string;
	ioMethod?: string;
}

const REGISTRY_PATH = path.resolve(
	__dirname,
	'../../../nodes-langchain/dist/node-definitions/ai-node-registry.json',
);

let _registry: Record<string, AiNodeEntry> | undefined;
let _reverseMap: Record<string, string> | undefined;

function loadRegistry(): Record<string, AiNodeEntry> {
	if (!_registry) {
		try {
			const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
			_registry = JSON.parse(content) as Record<string, AiNodeEntry>;
		} catch {
			_registry = {};
		}
	}
	return _registry;
}

/** className → entry (e.g., "OpenAiModel" → { nodeType, version, category }) */
export function getAiNodeRegistry(): Record<string, AiNodeEntry> {
	return loadRegistry();
}

/** Reverse lookup: nodeType → className */
function buildReverseMap(): Record<string, string> {
	if (!_reverseMap) {
		const registry = loadRegistry();
		_reverseMap = {};
		for (const [className, entry] of Object.entries(registry)) {
			_reverseMap[entry.nodeType] = className;
		}
	}
	return _reverseMap;
}

/** Look up a className by its exact name → AiNodeEntry */
export function classNameToEntry(name: string): AiNodeEntry | undefined {
	return loadRegistry()[name];
}

/** Look up a className from a node type string */
export function nodeTypeToClassName(nodeType: string): string | undefined {
	return buildReverseMap()[nodeType];
}

/** All known IO method names (chat, extract, classify, etc.) */
export function getKnownIoMethods(): Set<string> {
	const registry = loadRegistry();
	const methods = new Set<string>();
	for (const entry of Object.values(registry)) {
		if (entry.ioMethod) methods.add(entry.ioMethod);
	}
	return methods;
}

/** Reset cached registry (for testing) */
export function resetRegistryCache(): void {
	_registry = undefined;
	_reverseMap = undefined;
}
