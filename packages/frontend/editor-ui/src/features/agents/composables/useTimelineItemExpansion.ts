import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

interface TimelineItemExpansionOptions {
	searchQuery: MaybeRefOrGetter<string | undefined>;
	canExpand: MaybeRefOrGetter<boolean>;
	searchableText: MaybeRefOrGetter<string>;
}

export function useTimelineItemExpansion(options: TimelineItemExpansionOptions) {
	const isOpen = ref(false);

	watch(
		[() => toValue(options.searchQuery), () => toValue(options.canExpand)],
		function onSearchQueryChange([query, expandable]) {
			const normalized = query?.trim().toLowerCase();
			if (!expandable || !normalized) {
				isOpen.value = false;
				return;
			}
			/** Keep manual expansion when a non-empty search does not match. */
			if (toValue(options.searchableText).toLowerCase().includes(normalized)) {
				isOpen.value = true;
			}
		},
		{ immediate: true },
	);

	return { isOpen };
}
