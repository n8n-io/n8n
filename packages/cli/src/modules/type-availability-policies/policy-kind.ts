import { UserError } from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import type { PolicyRule, PolicySelector } from './policy-rule.types';

/** Whether a rule selector matches one type, with that type's facts already resolved. */
export type SelectorMatcher = (selector: PolicySelector) => boolean;

/**
 * Everything a policy kind decides for itself, so the evaluator, the shadow lint, the service
 * and telemetry never branch on the kind. A new kind is one implementation and a registry entry.
 */
export interface PolicyKindDefinition {
	readonly id: string;
	/** Every type name this instance knows for the kind. */
	knownTypeNames(): string[];
	matcherFor(typeName: string): SelectorMatcher;
	/** Selectors that, placed earlier in a rule list, match every type `selector` matches. */
	coveringSelectors(selector: PolicySelector): PolicySelector[];
	/** Throws a `UserError` for a rule this kind does not accept or that can never match. */
	assertWritable(rules: readonly PolicyRule[]): void;
}

/**
 * Whether `packageName` names a loaded package. `Object.hasOwn`, not `in`, so a rule naming
 * `toString` cannot pass through `Object.prototype`.
 */
export function isPackageInstalled(
	loadNodesAndCredentials: LoadNodesAndCredentials,
	packageName: string,
): boolean {
	return Object.hasOwn(loadNodesAndCredentials.loaders, packageName);
}

/** A `package` rule for a package this instance never loaded looks like it works and matches nothing. */
export function assertPackagesInstalled(
	rules: readonly PolicyRule[],
	loadNodesAndCredentials: LoadNodesAndCredentials,
): void {
	const missing = new Set<string>();

	for (const { selector } of rules) {
		if (
			selector.kind === 'package' &&
			!isPackageInstalled(loadNodesAndCredentials, selector.value)
		) {
			missing.add(selector.value);
		}
	}

	if (missing.size > 0) {
		throw new UserError(
			`Package rule names a package that is not installed: ${[...missing].join(', ')}`,
		);
	}
}
