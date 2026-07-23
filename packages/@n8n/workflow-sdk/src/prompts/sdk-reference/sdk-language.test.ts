import { NODE_GROUPS_REFERENCE, SDK_LANGUAGE_REFERENCE } from './sdk-language';
import {
	SDK_METHODS,
	FORBIDDEN_NODE_TYPES,
	SAFE_JSON_METHOD_NAMES,
	SAFE_STRING_METHOD_NAMES,
	BUILDER_BLOCKED_GLOBALS,
	SDK_INLINE_CONSTRAINTS,
	DANGEROUS_GLOBALS,
	ALLOWED_METHODS,
} from '../../ast-interpreter';

const publicMethods = SDK_METHODS.filter((m) => m.public);
const internalMethods = SDK_METHODS.filter((m) => !m.public);

describe('SDK language source-of-truth alignment', () => {
	it('derives ALLOWED_METHODS from the SDK_METHODS table', () => {
		expect([...ALLOWED_METHODS].sort()).toEqual(SDK_METHODS.map((m) => m.name).sort());
	});

	it('derives the blocked globals reference from the enforced globals', () => {
		const renderedNames = BUILDER_BLOCKED_GLOBALS.map((g) => g.name).sort();
		expect(renderedNames).toEqual([...DANGEROUS_GLOBALS].sort());
	});
});

describe('SDK_LANGUAGE_REFERENCE rendering', () => {
	it('lists every public builder method', () => {
		for (const m of publicMethods) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(`.${m.name}()`);
		}
	});

	it('does not present internal methods as builder methods', () => {
		const methodsSection = SDK_LANGUAGE_REFERENCE.split('## Forbidden constructs')[0];
		for (const m of internalMethods) {
			expect(methodsSection).not.toContain(`.${m.name}()`);
		}
	});

	it('includes every forbidden-construct remediation string', () => {
		for (const message of Object.values(FORBIDDEN_NODE_TYPES)) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(message);
		}
	});

	it('names the safe non-builder methods', () => {
		for (const name of SAFE_JSON_METHOD_NAMES) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(`JSON.${name}`);
		}
		for (const name of SAFE_STRING_METHOD_NAMES) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(`.${name}()`);
		}
	});

	it('includes every blocked global and inline constraint', () => {
		for (const g of BUILDER_BLOCKED_GLOBALS) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(g.name);
			if (g.alternative) {
				expect(SDK_LANGUAGE_REFERENCE).toContain(g.alternative);
			}
		}
		for (const c of SDK_INLINE_CONSTRAINTS) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(c);
		}
	});

	it('steers runtime logic to a Code node or expression', () => {
		expect(SDK_LANGUAGE_REFERENCE).toContain('Code node');
		expect(SDK_LANGUAGE_REFERENCE).toContain("expr('{{ ... }}')");
	});
});

describe('NODE_GROUPS_REFERENCE', () => {
	it('explains what a group is (visual-only) and how to declare one', () => {
		expect(NODE_GROUPS_REFERENCE).toContain('## Node groups');
		expect(NODE_GROUPS_REFERENCE).toMatch(/visual/i);
	});

	it('explains how to declare a group', () => {
		// The worked example: .group(name, [members]) declared on the workflow.
		expect(NODE_GROUPS_REFERENCE).toMatch(/\.group\('[^']+', \[/);
	});

	it('does not claim a single-entry/single-exit rule the server does not enforce', () => {
		// That check lives in validateNodeSelectionForExtraction, not group validation.
		expect(NODE_GROUPS_REFERENCE).not.toMatch(/single (entry|exit)/i);
		expect(NODE_GROUPS_REFERENCE).not.toMatch(
			/(one|exactly one) (entry|exit|input|output) (node|point)/i,
		);
	});

	it('is embedded verbatim in the IAI-facing full reference', () => {
		// Guarantees Instance AI ships exactly the shared constant, no drift.
		expect(SDK_LANGUAGE_REFERENCE).toContain(NODE_GROUPS_REFERENCE);
	});

	describe('rules for valid groups', () => {
		it('states the no-trigger rule', () => {
			// reason: 'trigger-selected'
			expect(NODE_GROUPS_REFERENCE).toMatch(/trigger nodes? (cannot|can't|may not|must not)/i);
		});

		it('states the single-connected-subgraph rule', () => {
			// reason: 'invalid-subgraph' — one connected chunk, not two islands.
			expect(NODE_GROUPS_REFERENCE).toMatch(/single connected|one connected/i);
		});

		it('states the AI-Agent-and-sub-nodes-together rule in plain terms', () => {
			// reason: 'non-main-boundary' — an ai_languageModel/ai_tool/ai_memory wire
			// must not cross the group boundary, so an Agent and its sub-nodes are
			// either all in or all out.
			expect(NODE_GROUPS_REFERENCE).toMatch(/agent/i);
			expect(NODE_GROUPS_REFERENCE).toMatch(/all (inside|in).*all (outside|out)/is);
		});

		it('states the one-group-per-node rule', () => {
			// A node belongs to at most one group.
			expect(NODE_GROUPS_REFERENCE).toMatch(
				/only one group|at most one group|one group at a time/i,
			);
		});

		it('states the unique-name-and-id rule', () => {
			expect(NODE_GROUPS_REFERENCE).toMatch(
				/names? and ids?[^.]*unique|unique[^.]*names? and ids?/i,
			);
		});

		it('states the at-least-one-member rule', () => {
			expect(NODE_GROUPS_REFERENCE).toMatch(/at least one (node|member)/i);
		});
	});
});
