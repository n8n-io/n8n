import { tokenize } from '../catalog/retrieval';
import { PHASE_ONE_PATTERNS } from './phase-one';
import type { PatternInputDefinition, WorkflowPattern } from './types';
import { PATTERN_REGISTRY_VERSION } from '../versions';

export interface PatternMatch {
	pattern: WorkflowPattern;
	score: number;
}

export class PatternRegistry {
	readonly version = PATTERN_REGISTRY_VERSION;

	private readonly byId = new Map<string, WorkflowPattern>();

	constructor(patterns: readonly WorkflowPattern[] = PHASE_ONE_PATTERNS) {
		for (const pattern of patterns) this.byId.set(pattern.id, pattern);
	}

	get(id: string): WorkflowPattern | undefined {
		return this.byId.get(id);
	}

	require(id: string): WorkflowPattern {
		const pattern = this.byId.get(id);
		if (!pattern) throw new Error(`Unknown pattern "${id}" (registry ${this.version}).`);
		return pattern;
	}

	list(): WorkflowPattern[] {
		return [...this.byId.values()];
	}

	/** Lexical match of a request against pattern vocabularies. */
	match(text: string, limit = 5): PatternMatch[] {
		const tokens = new Set(tokenize(text));
		const lower = text.toLowerCase();
		const matches: PatternMatch[] = [];
		for (const pattern of this.byId.values()) {
			let score = 0;
			for (const keyword of pattern.keywords) {
				const parts = tokenize(keyword);
				if (parts.length > 1 ? lower.includes(keyword.toLowerCase()) : tokens.has(parts[0] ?? '')) {
					score += parts.length;
				}
			}
			if (score > 0) matches.push({ pattern, score });
		}
		matches.sort((a, b) => b.score - a.score || a.pattern.id.localeCompare(b.pattern.id));
		return matches.slice(0, limit);
	}
}

/** Reports which required inputs a pattern is still missing. */
export function missingPatternInputs(
	pattern: WorkflowPattern,
	inputs: Record<string, unknown>,
): PatternInputDefinition[] {
	return pattern.inputs.filter(
		(definition) =>
			definition.required &&
			(inputs[definition.name] === undefined || inputs[definition.name] === ''),
	);
}
