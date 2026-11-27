import { Service } from '@n8n/di';

import { NodeTypes } from '@/node-types';

import { HiddenNodeTypes } from './hidden-node-types';
import type { PolicyRule } from './policy-rule.types';

type ListedType = { readonly name: string; readonly matchedRuleId: string | null };

/** Picks the types an admin page lists, from what one scope's policy alone decides for each type. */
export type ListTypes = <T extends ListedType>(types: T[], rules: readonly PolicyRule[]) => T[];

type ResolveBaseName = (name: string) => { baseName: string; isSyntheticTool: boolean };

/**
 * The node types that a policy page lists. Two kinds of type get no row unless a rule of their own
 * decides them, because the admin must see that rule to undo it:
 * - a generated tool variant has the access of its base;
 * - a hidden type is not something an admin picks.
 *
 * `matchedRuleId` must come from one scope's policy alone, and `rules` from the same read.
 */
export function listedNodeTypes<T extends ListedType>(
	types: readonly T[],
	options: {
		resolveBaseName: ResolveBaseName;
		hiddenTypes: ReadonlySet<string>;
		rules: readonly PolicyRule[];
	},
): T[] {
	const matchedRuleIdByName = new Map(types.map((type) => [type.name, type.matchedRuleId]));
	const nameRuleIds = new Set(
		options.rules.flatMap((rule) => (rule.selector.kind === 'name' ? [rule.id] : [])),
	);

	return types.filter((type) => {
		const { baseName, isSyntheticTool } = options.resolveBaseName(type.name);
		if (isSyntheticTool && type.matchedRuleId === matchedRuleIdByName.get(baseName)) return false;

		return (
			!options.hiddenTypes.has(type.name) ||
			(type.matchedRuleId !== null && nameRuleIds.has(type.matchedRuleId))
		);
	});
}

@Service()
export class ListedNodeTypes {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly hiddenNodeTypes: HiddenNodeTypes,
	) {}

	async filter(): Promise<ListTypes> {
		const hiddenTypes = await this.hiddenNodeTypes.get();

		return (types, rules) =>
			listedNodeTypes(types, {
				resolveBaseName: (name) => this.nodeTypes.resolveBaseName(name),
				hiddenTypes,
				rules,
			});
	}
}
