/**
 * Compact Output Utilities for Node Type Generation
 *
 * Hoists repeated type literals into reusable type definitions
 * and cleans up JSDoc comments to reduce emitted token size.
 */

interface HoistCandidate {
	suggestedName: string;
	count: number;
}

interface HoistContext {
	candidates: Map<string, HoistCandidate>;
}

let currentContext: HoistContext | null = null;

/**
 * Register a candidate type literal that might be repeated in the generated file.
 */
export function registerHoistCandidate(typeLiteral: string, suggestedName: string): void {
	if (!currentContext) return;
	const trimmed = typeLiteral.trim();
	if (trimmed.length < 30) return;

	const existing = currentContext.candidates.get(trimmed);
	if (existing) {
		existing.count++;
	} else {
		currentContext.candidates.set(trimmed, { suggestedName, count: 1 });
	}
}

/**
 * Sanitize documentation text: escape JSDoc breakers and raw angle brackets.
 */
export function sanitizeDocText(text: string): string {
	if (!text) return '';

	return text.replace(/\*\//g, '*\\/').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

/**
 * Extract and sanitize description or displayName from a property or group.
 */
export function describeProperty(prop?: {
	description?: string;
	displayName?: string;
}): string | undefined {
	if (!prop) return undefined;

	const desc = prop.description?.trim();
	const name = prop.displayName?.trim();

	let textToUse: string | undefined;

	if (desc && name) {
		// If description is identical or almost identical to displayName, avoid redundancy
		if (desc.toLowerCase() === name.toLowerCase()) {
			textToUse = desc;
		} else {
			textToUse = desc;
		}
	} else {
		textToUse = desc || name;
	}

	if (!textToUse) return undefined;

	const sanitized = sanitizeDocText(textToUse);
	return sanitized.length > 0 ? sanitized : undefined;
}

function toPascalCase(str: string): string {
	return str
		.replace(/[^a-zA-Z0-9_]/g, ' ')
		.split(' ')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

function countOccurrences(source: string, sub: string): number {
	if (!sub || !source) return 0;
	let count = 0;
	let pos = 0;
	while ((pos = source.indexOf(sub, pos)) !== -1) {
		count++;
		pos += sub.length;
	}
	return count;
}

/**
 * Run a file generation function with hoisting enabled.
 * Hoists type literals that appear multiple times into top-level type aliases.
 */
export function withHoistedTypeLiterals(generate: () => string): string {
	const prevContext = currentContext;
	const context: HoistContext = {
		candidates: new Map(),
	};
	currentContext = context;

	try {
		const rawOutput = generate();
		if (context.candidates.size === 0) {
			return rawOutput;
		}

		// Determine which candidates appear >= 2 times in the output
		const validCandidates: Array<{ literal: string; typeName: string; occurrences: number }> = [];
		const usedNames = new Set<string>();

		// Scan existing type names in rawOutput to prevent collisions
		const typeNameMatches = rawOutput.matchAll(/(?:type|interface)\s+([A-Za-z0-9_$]+)/g);
		for (const match of typeNameMatches) {
			usedNames.add(match[1]);
		}

		// Sort candidates by length descending so longer types are replaced first
		const sortedCandidates = Array.from(context.candidates.entries()).sort(
			(a, b) => b[0].length - a[0].length,
		);

		for (const [literal, candidate] of sortedCandidates) {
			const occurrences = countOccurrences(rawOutput, literal);
			if (occurrences >= 2) {
				let baseName = toPascalCase(candidate.suggestedName) || 'NestedType';
				if (
					!baseName.endsWith('Type') &&
					!baseName.endsWith('Item') &&
					!baseName.endsWith('Fields') &&
					!baseName.endsWith('Options') &&
					!baseName.endsWith('Config')
				) {
					baseName += 'Type';
				}

				let typeName = baseName;
				let suffix = 1;
				while (usedNames.has(typeName)) {
					suffix++;
					typeName = `${baseName}${suffix}`;
				}
				usedNames.add(typeName);

				validCandidates.push({ literal, typeName, occurrences });
			}
		}

		if (validCandidates.length === 0) {
			return rawOutput;
		}

		// Perform replacements
		let result = rawOutput;
		const hoistedDeclarations: string[] = [];

		for (const { literal, typeName } of validCandidates) {
			// Replace all occurrences of literal with typeName
			result = result.replaceAll(literal, typeName);
			hoistedDeclarations.push(`export type ${typeName} = ${literal};`);
		}

		// Find insertion point for hoisted declarations:
		// Right before the first export type/interface or after imports/credentials
		const firstExportIndex = result.search(/^export (?:type|interface) /m);
		if (firstExportIndex !== -1) {
			const before = result.slice(0, firstExportIndex);
			const after = result.slice(firstExportIndex);
			return `${before}${hoistedDeclarations.join('\n\n')}\n\n${after}`;
		}

		return `${hoistedDeclarations.join('\n\n')}\n\n${result}`;
	} finally {
		currentContext = prevContext;
	}
}
