import type { UiExtensionView } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { deleteUiExtensionView, fetchUiExtensionViews } from './ui-extensions.api';
import { BUILTIN_PAGES, BUILTIN_VIEWS, type BuiltinViewDefinition } from './ui-extensions.builtin';
import {
	BUILTIN_RECENT_RUNS_VIEW_ID,
	SIDE_PANEL_DEFAULT_WIDTH,
	SIDE_PANEL_MAX_WIDTH,
	SIDE_PANEL_MIN_WIDTH,
	SIDE_PANEL_STORAGE_KEYS,
} from './ui-extensions.constants';
import type { SidePanelView } from './ui-extensions.types';

const clampWidth = (width: number) =>
	Math.min(SIDE_PANEL_MAX_WIDTH, Math.max(SIDE_PANEL_MIN_WIDTH, width));

const byOldestChange = (a: UiExtensionView, b: UiExtensionView) =>
	a.updatedAt.localeCompare(b.updatedAt);

/**
 * Pinia stores self-register on the first `use…Store()` call, so there is
 * nothing to declare in the descriptor.
 */
export const useSidePanelStore = defineStore('uiExtensionsSidePanel', () => {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const usersStore = useUsersStore();

	/** The views and pages of the user, as the server sent them. */
	const userRecords = ref<UiExtensionView[]>([]);
	const hasFetched = ref(false);
	const isOpen = useLocalStorage(SIDE_PANEL_STORAGE_KEYS.isOpen, false);
	const storedWidth = useLocalStorage(SIDE_PANEL_STORAGE_KEYS.width, SIDE_PANEL_DEFAULT_WIDTH);
	const storedActiveViewId = useLocalStorage(
		SIDE_PANEL_STORAGE_KEYS.activeViewId,
		BUILTIN_RECENT_RUNS_VIEW_ID,
	);

	const toBuiltin =
		(kind: UiExtensionView['kind']) =>
		(definition: BuiltinViewDefinition): SidePanelView => ({
			id: definition.id,
			kind,
			title: i18n.baseText(definition.titleKey),
			icon: definition.icon,
			source: definition.source,
			updatedAt: '',
			builtin: true,
		});

	const ofKind = (kind: UiExtensionView['kind']) =>
		userRecords.value
			.filter((record) => record.kind === kind)
			.sort(byOldestChange)
			.map((record) => ({ ...record, builtin: false }));

	/** The side panel tabs: the built-in views first, then the views of the user from the oldest change. */
	const views = computed<SidePanelView[]>(() => [
		...BUILTIN_VIEWS.map(toBuiltin('view')),
		...ofKind('view'),
	]);

	/** The sidebar pages: the built-in page first, then the pages of the user from the oldest change. */
	const pages = computed<SidePanelView[]>(() => [
		...BUILTIN_PAGES.map(toBuiltin('page')),
		...ofKind('page'),
	]);

	const activeViewId = computed({
		get: () =>
			views.value.some((view) => view.id === storedActiveViewId.value)
				? storedActiveViewId.value
				: BUILTIN_RECENT_RUNS_VIEW_ID,
		set: (id: string) => {
			storedActiveViewId.value = id;
		},
	});

	const activeView = computed(
		() => views.value.find((view) => view.id === activeViewId.value) ?? views.value[0],
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
	let latestApplied = 0;
	/** The user whose records the store holds. */
	let recordsUserId: string | null = null;

	/**
	 * Loads the views and pages of the user. After the first load, a view that
	 * is new or changed becomes the active tab and the panel opens, so a view
	 * that an MCP client just made shows at once. A new page only shows in the
	 * sidebar.
	 */
	async function fetchViews() {
		// Another user signed in without a page reload. Their records are not a change.
		const userId = usersStore.currentUserId;
		if (userId !== recordsUserId) {
			recordsUserId = userId;
			userRecords.value = [];
			hasFetched.value = false;
			latestApplied = latestRequest;
		}

		const request = ++latestRequest;

		let fetched: UiExtensionView[];
		try {
			fetched = await fetchUiExtensionViews(rootStore.restApiContext);
		} catch (error) {
			// A user without MCP access cannot have views or pages.
			if (error instanceof ResponseError && error.httpStatusCode === 403) fetched = [];
			else return;
		}

		// A later response is already in. A failed request changes nothing, so it
		// cannot hide a good response that is still on its way.
		if (request <= latestApplied || recordsUserId !== userId) return;
		latestApplied = request;

		const previous = new Map(userRecords.value.map((record) => [record.id, record.updatedAt]));
		const changedViews = fetched.filter(
			(record) => record.kind === 'view' && previous.get(record.id) !== record.updatedAt,
		);
		userRecords.value = fetched;

		if (hasFetched.value && changedViews.length > 0) {
			const newest = changedViews.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
			activeViewId.value = newest.id;
			isOpen.value = true;
		}
		hasFetched.value = true;
	}

	/**
	 * Removes a view or a page of the user, then loads the records again. A 404
	 * means that another editor removed it first, so it also loads them again.
	 * Other errors keep the record and reach the caller.
	 */
	async function remove(id: string) {
		try {
			await deleteUiExtensionView(rootStore.restApiContext, id);
		} catch (error) {
			if (!(error instanceof ResponseError && error.httpStatusCode === 404)) throw error;
		}
		await fetchViews();
	}

	return {
		views,
		pages,
		activeView,
		activeViewId,
		isOpen,
		width,
		hasFetched,
		toggle,
		fetchViews,
		remove,
	};
});
