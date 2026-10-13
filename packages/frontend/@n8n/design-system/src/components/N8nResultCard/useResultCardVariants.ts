import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue';

import type {
	ResultCardData,
	ResultCardSwitcherControl,
	ResultCardSwitcherOption,
} from './ResultCard.types';

/**
 * A card's switcher picks a variant; the variant is a partial body merged over
 * the card. The bodies render the merged card and animate whatever changed.
 *
 * With `variants` but no `switcher`, the variant keys become plain tabs. With a
 * `switcher` but no `variants`, the control still renders (a host may react to
 * `variantChange`) and the card does not change.
 */
export function useResultCardVariants(source: MaybeRefOrGetter<ResultCardData>) {
	const card = computed(() => toValue(source));

	const options = computed<ResultCardSwitcherOption[]>(() => {
		const switcher = card.value.switcher;
		if (switcher?.options?.length) return switcher.options.slice(0, 7);
		const keys = Object.keys(card.value.variants ?? {});
		return keys.length >= 2 ? keys.slice(0, 7).map((key) => ({ key, label: key })) : [];
	});

	const control = computed<ResultCardSwitcherControl>(() => card.value.switcher?.control ?? 'tabs');
	const placement = computed<'top' | 'bottom'>(
		() => card.value.switcher?.placement ?? (control.value === 'segmented' ? 'top' : 'bottom'),
	);
	const hasSwitcher = computed(() => options.value.length >= 2);

	const initial = () => {
		const wanted = card.value.switcher?.default;
		const keys = options.value.map((option) => option.key);
		return wanted && keys.includes(wanted) ? wanted : (keys[0] ?? '');
	};
	const activeKey = ref(initial());
	watch(
		() => options.value.map((option) => option.key).join('|'),
		() => {
			if (!options.value.some((option) => option.key === activeKey.value)) {
				activeKey.value = initial();
			}
		},
	);

	/** The card with the active variant merged in (variant keys win, undefined values do not). */
	const merged = computed<ResultCardData>(() => {
		const variant = card.value.variants?.[activeKey.value];
		if (!variant) return card.value;
		const overrides = Object.fromEntries(
			Object.entries(variant).filter(([, value]) => value !== undefined),
		);
		return { ...card.value, ...overrides };
	});

	function select(key: string) {
		if (options.value.some((option) => option.key === key)) activeKey.value = key;
	}

	return { options, control, placement, hasSwitcher, activeKey, merged, select };
}
