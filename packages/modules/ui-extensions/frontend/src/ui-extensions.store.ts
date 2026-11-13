import type { UiExtensionView } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import pageSummarySource from './examples/pageSummary.view.js?raw';
import { fetchUiExtensionViews } from './ui-extensions.api';
import {
	BUILTIN_PAGE_SUMMARY_VIEW_ID,
	SIDE_PANEL_DEFAULT_WIDTH,
	SIDE_PANEL_MAX_WIDTH,
	SIDE_PANEL_MIN_WIDTH,
	SIDE_PANEL_STORAGE_KEYS,
} from './ui-extensions.constants';
import type { SidePanelView } from './ui-extensions.types';

const clampWidth = (width: number) =>
	Math.min(SIDE_PANEL_MAX_WIDTH, Math.max(SIDE_PANEL_MIN_WIDTH, width));

/**
 * Pinia stores self-register on the first `use…Store()` call, so there is
 * nothing to declare in the descriptor.
 */
export const useSidePanelStore = defineStore('uiExtensionsSidePanel', () => {
	const i18n = useI18n();
	const rootStore = useRootStore();

	const userViews = ref<UiExtensionView[]>([]);
	const hasFetched = ref(false);
	const isOpen = useLocalStorage(SIDE_PANEL_STORAGE_KEYS.isOpen, false);
	const storedWidth = useLocalStorage(SIDE_PANEL_STORAGE_KEYS.width, SIDE_PANEL_DEFAULT_WIDTH);
	const storedActiveViewId = useLocalStorage(
		SIDE_PANEL_STORAGE_KEYS.activeViewId,
		BUILTIN_PAGE_SUMMARY_VIEW_ID,
	);

	const builtinView = computed<SidePanelView>(() => ({
		id: BUILTIN_PAGE_SUMMARY_VIEW_ID,
		title: i18n.baseText('uiExtensions.pageSummary.title'),
		icon: 'file-text',
		source: pageSummarySource,
		updatedAt: '',
		builtin: true,
	}));

	/** The built-in view first, then the views of the user from the oldest change. */
	const views = computed<SidePanelView[]>(() => [
		builtinView.value,
		...[...userViews.value]
			.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
			.map((view) => ({ ...view, builtin: false })),
	]);

	const activeViewId = computed({
		get: () =>
			views.value.some((view) => view.id === storedActiveViewId.value)
				? storedActiveViewId.value
				: BUILTIN_PAGE_SUMMARY_VIEW_ID,
		set: (id: string) => {
			storedActiveViewId.value = id;
		},
	});

	const activeView = computed(
		() => views.value.find((view) => view.id === activeViewId.value) ?? builtinView.value,
	);

	const width = computed({
		get: () => clampWidth(Number(storedWidth.value) || SIDE_PANEL_DEFAULT_WIDTH),
		set: (value: number) => {
			storedWidth.value = clampWidth(value);
		},
	});

	function toggle() {
		isOpen.value = !isOpen.value;
	}

	let latestRequest = 0;

	/**
	 * Loads the views of the user. After the first load, a view that is new or
	 * changed becomes the active tab and the panel opens, so a view that an MCP
	 * client just made shows at once.
	 */
	async function fetchViews() {
		const request = ++latestRequest;

		let fetched: UiExtensionView[];
		try {
			fetched = await fetchUiExtensionViews(rootStore.restApiContext);
		} catch (error) {
			// A user without MCP access cannot have views.
			if (error instanceof ResponseError && error.httpStatusCode === 403) fetched = [];
			else return;
		}

		// A later request already started. Its result is newer.
		if (request !== latestRequest) return;

		const previous = new Map(userViews.value.map((view) => [view.id, view.updatedAt]));
		const changed = fetched.filter((view) => previous.get(view.id) !== view.updatedAt);
		userViews.value = fetched;

		if (hasFetched.value && changed.length > 0) {
			const newest = changed.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
			activeViewId.value = newest.id;
			isOpen.value = true;
		}
		hasFetched.value = true;
	}

	return {
		views,
		activeView,
		activeViewId,
		isOpen,
		width,
		hasFetched,
		toggle,
		fetchViews,
	};
});
