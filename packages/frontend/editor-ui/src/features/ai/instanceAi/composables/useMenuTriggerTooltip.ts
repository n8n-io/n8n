import { TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

/**
 * Turns off the tooltip of a menu trigger while the menu is open, and for a
 * moment after it closes. Closing the menu returns focus to the trigger, which
 * would show the tooltip at once.
 */
export function useMenuTriggerTooltip(open: Ref<boolean>) {
	const isSuppressed = ref(false);
	let suppressTimeout: ReturnType<typeof setTimeout> | undefined;

	watch(open, (isOpen, wasOpen) => {
		if (isOpen || !wasOpen) return;
		clearTimeout(suppressTimeout);
		isSuppressed.value = true;
		suppressTimeout = setTimeout(() => {
			isSuppressed.value = false;
		}, TOOLTIP_DELAY_MS + 100);
	});

	onScopeDispose(() => clearTimeout(suppressTimeout));

	return { isTooltipDisabled: computed(() => open.value || isSuppressed.value) };
}
