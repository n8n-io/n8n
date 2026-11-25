import type { TypeAccessChange } from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';

import { firstMatchIndex, type PackageResolver, type PolicedType } from './policy-evaluator';
import type { PolicyRule } from './policy-rule.types';

type PlacementResolvers = {
	readonly resolvePackage: PackageResolver;
	readonly policedType: (name: string) => PolicedType;
	readonly newRuleId: () => string;
};

const namesType = (rule: PolicyRule, typeName: string) =>
	rule.selector.kind === 'name' && rule.selector.value === typeName;

/**
 * Gives each changed type the requested access and keeps the verdict of every other type. The
 * position is found before any rule is removed, so a dead tool-variant rule stays dead. The
 * module README ("Setting the access of a type") explains the placement.
 */
export function applyAccessChanges(
	rules: readonly PolicyRule[],
	changes: readonly TypeAccessChange[],
	resolvers: PlacementResolvers,
): PolicyRule[] {
	let working = [...rules];
	const placedRuleIds = new Map<string, string>();

	for (const { type: typeName, access } of changes) {
		if (access === 'inherit') {
			working = withoutNameRules(working, typeName, resolvers.policedType);
			continue;
		}

		const decidingIndex = firstMatchIndex(
			working,
			resolvers.policedType(typeName),
			resolvers.resolvePackage,
		);
		const deciding = working[decidingIndex];
		const placed =
			deciding && namesType(deciding, typeName) && deciding.action === access
				? deciding
				: {
						id: resolvers.newRuleId(),
						action: access,
						selector: { kind: 'name' as const, value: typeName },
					};

		const insertAt = decidingIndex === -1 ? working.length : decidingIndex;
		working.splice(insertAt, 0, placed);
		working = working.filter((rule, index) => index === insertAt || !namesType(rule, typeName));
		placedRuleIds.set(typeName, placed.id);
	}

	assertChangesApplied(working, changes, placedRuleIds, resolvers);

	return working;
}

/** Also drops the dead tool-variant rules behind the first rule for the type (see README). */
function withoutNameRules(
	rules: readonly PolicyRule[],
	typeName: string,
	policedType: (name: string) => PolicedType,
): PolicyRule[] {
	const firstIndex = rules.findIndex((rule) => namesType(rule, typeName));

	return rules.filter((rule, index) => {
		if (namesType(rule, typeName)) return false;
		if (firstIndex === -1 || index < firstIndex || rule.selector.kind !== 'name') return true;

		return policedType(rule.selector.value).baseName !== typeName;
	});
}

/** The placement must make each placed rule decide its type. A miss is a bug in this file. */
function assertChangesApplied(
	rules: readonly PolicyRule[],
	changes: readonly TypeAccessChange[],
	placedRuleIds: ReadonlyMap<string, string>,
	resolvers: PlacementResolvers,
): void {
	for (const { type: typeName, access } of changes) {
		if (access === 'inherit') {
			if (rules.some((rule) => namesType(rule, typeName))) {
				throw new UnexpectedError(`A rule still names "${typeName}" after "inherit"`);
			}
			continue;
		}

		const deciding =
			rules[firstMatchIndex(rules, resolvers.policedType(typeName), resolvers.resolvePackage)];
		if (deciding?.id !== placedRuleIds.get(typeName)) {
			throw new UnexpectedError(`The rule placed for "${typeName}" does not decide it`);
		}
	}
}
