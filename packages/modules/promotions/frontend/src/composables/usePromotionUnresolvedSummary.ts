import type { PromotionDirection, PromotionMissingDependency } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

/** A row names this many dependencies. It counts the others. */
const NAMED_DEPENDENCIES = 2;

export type UnresolvedRow = { key: string; name: string; detail?: string };

// One dependency can have an entry for each reason, so its name must show only one time.
const dependencyKey = ({ kind, id, name }: PromotionMissingDependency) => `${kind}:${id ?? name}`;

/**
 * What a confirmation says about the dependencies that a Promote or an Apply leaves unresolved.
 * The sentence counts the workflows that cannot be published. The rows name those workflows, each
 * with the dependencies that it misses. So the user reads the effect first and the cause second.
 * `dependencies` must hold only the entries of the workflows that the operation includes.
 */
export function usePromotionUnresolvedSummary(
	dependencies: MaybeRefOrGetter<PromotionMissingDependency[]>,
	direction: PromotionDirection,
) {
	const i18n = useI18n();

	const names = computed(
		() => new Map(toValue(dependencies).map((entry) => [dependencyKey(entry), entry.name])),
	);

	// A workflow counts one time, also when it uses more than one of the dependencies.
	const workflows = computed(() => {
		const byId = new Map<string, { name: string; missing: Set<string> }>();
		for (const dependency of toValue(dependencies)) {
			for (const { workflows: users } of dependency.consumers) {
				for (const { id, name } of users) {
					const entry = byId.get(id) ?? { name, missing: new Set() };
					entry.missing.add(dependencyKey(dependency));
					byId.set(id, entry);
				}
			}
		}
		return [...byId].map(([id, { name, missing }]) => ({
			id,
			name,
			missing: [...missing].flatMap((key) => names.value.get(key) ?? []),
		}));
	});

	function describeMissing(missing: string[]) {
		const shown = missing.slice(0, NAMED_DEPENDENCIES).join(', ');
		const more = missing.length - NAMED_DEPENDENCIES;
		return more > 0
			? i18n.baseText('promotions.unresolved.missingMore', {
					interpolate: { names: shown, count: String(more) },
				})
			: i18n.baseText('promotions.unresolved.missing', { interpolate: { names: shown } });
	}

	const lead = computed(() => {
		// With no workflow to name, the sentence counts the dependencies.
		const [key, count] =
			workflows.value.length > 0
				? ([`promotions.unresolved.lead.${direction}`, workflows.value.length] as const)
				: ([`promotions.unresolved.lead.none.${direction}`, names.value.size] as const);
		return i18n.baseText(key, { adjustToNumber: count, interpolate: { count: String(count) } });
	});

	// With no workflow to list, the dependencies are the rows.
	const rows = computed<UnresolvedRow[]>(() =>
		workflows.value.length > 0
			? workflows.value.map(({ id, name, missing }) => ({
					key: id,
					name,
					detail: describeMissing(missing),
				}))
			: [...names.value].map(([key, name]) => ({ key, name })),
	);

	return { lead, rows };
}
