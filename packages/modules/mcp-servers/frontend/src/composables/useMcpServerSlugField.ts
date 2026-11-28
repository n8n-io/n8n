import {
	mcpServerSlugFromName,
	mcpServerSlugInput,
	type McpServerSlugAvailability,
} from '@n8n/api-types';
import { useDebounce } from '@n8n/composables/useDebounce';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { checkMcpServerSlug } from '../mcp-servers.api';

export interface UseMcpServerSlugFieldOptions {
	projectId: MaybeRefOrGetter<string | undefined>;
	/** Run availability checks only while true (e.g. permission held, or URL change enabled). */
	enabled: MaybeRefOrGetter<boolean>;
	/** Existing server slug. Equal values skip the check because this server already owns them. */
	currentSlug?: MaybeRefOrGetter<string | undefined>;
	/** Show the empty-slug error when `finalSlug` is empty. */
	showEmptyError: MaybeRefOrGetter<boolean>;
}

/**
 * Shared slug input, sanitization, and debounced availability check for the create and rename
 * dialogs. Both dialogs enforce the same slug rules and errors.
 */
export function useMcpServerSlugField(options: UseMcpServerSlugFieldOptions) {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const { debounce } = useDebounce();
	const latestCheck = useLatestFetch();

	const slug = ref('');
	const slugEdited = ref(false);
	const availability = ref<McpServerSlugAvailability | null>(null);
	const slugCheckFailed = ref(false);

	const finalSlug = computed(() => mcpServerSlugFromName(slug.value));

	const slugError = computed(() => {
		if (toValue(options.showEmptyError) && finalSlug.value === '') {
			return i18n.baseText('mcpServers.create.url.empty');
		}
		if (availability.value?.reason === 'taken') return i18n.baseText('mcpServers.create.url.taken');
		if (availability.value?.reason === 'reserved') {
			return i18n.baseText('mcpServers.create.url.reserved');
		}
		return null;
	});

	async function onSlugInput(value: string) {
		// The input also echoes a value that the name wrote. Only a different value is an edit.
		if (value === slug.value) return;
		slugEdited.value = true;
		const cleaned = mcpServerSlugInput(value);
		// An unchanged slug does not render again, so the input keeps the dropped characters.
		if (cleaned === slug.value) {
			slug.value = value;
			await nextTick();
		}
		slug.value = cleaned;
	}

	async function checkSlug() {
		const isLatest = latestCheck.next();
		const value = finalSlug.value;
		const id = toValue(options.projectId);
		const current = toValue(options.currentSlug);
		if (!value || !id || !toValue(options.enabled) || value === current) return;
		try {
			const result = await checkMcpServerSlug(rootStore.restApiContext, id, value);
			if (isLatest()) availability.value = result;
		} catch {
			// The save or create call checks the slug again, so the submit button stays available.
			if (isLatest()) slugCheckFailed.value = true;
		}
	}

	const checkSlugDebounced = debounce(checkSlug, {
		debounceTime: DEBOUNCE_TIME.INPUT.VALIDATION,
		trailing: true,
	});

	watch(
		[
			finalSlug,
			() => toValue(options.projectId),
			() => toValue(options.enabled),
			() => toValue(options.currentSlug),
		],
		async () => {
			latestCheck.invalidate();
			availability.value = null;
			slugCheckFailed.value = false;
			await checkSlugDebounced();
		},
	);

	function setConflict(reason: 'taken' | 'reserved' = 'taken') {
		latestCheck.invalidate();
		availability.value = { available: false, reason };
		slugCheckFailed.value = false;
	}

	function reset(initialSlug = '') {
		latestCheck.invalidate();
		slug.value = initialSlug;
		slugEdited.value = false;
		availability.value = null;
		slugCheckFailed.value = false;
	}

	return {
		slug,
		slugEdited,
		finalSlug,
		availability,
		slugCheckFailed,
		slugError,
		onSlugInput,
		setConflict,
		reset,
	};
}
