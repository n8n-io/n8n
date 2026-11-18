import type { Page } from '@n8n/api-types';
import { useDebounce } from '@n8n/composables/useDebounce';
import { ResponseError } from '@n8n/rest-api-client';
import { ref, shallowRef, watch } from 'vue';

import {
	HTTP_STATUS_CONFLICT,
	HTTP_STATUS_NOT_FOUND,
	PAGE_AUTOSAVE_DEBOUNCE_MS,
} from '../page.constants';
import { usePageStore } from '../page.store';

export type PageLoadStatus = 'loading' | 'ready' | 'not-found' | 'error';

/** `unsaved` means that a save is scheduled. `idle` means that the user changed nothing yet. */
export type PageSaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

export type PageDocumentOptions = {
	pageId: string;
	/** Without a project id the page loads through its short address. */
	projectId?: string;
	onLoaded: (page: Page) => void;
	onSaved: (page: Page) => void;
	/** The page changed elsewhere. `latest` replaced the local draft. */
	onConflict: (latest: Page) => void;
	onNotFound: () => void;
};

type PageDraftChanges = { title?: string; content?: string };

function httpStatusOf(error: unknown): number | undefined {
	return error instanceof ResponseError ? error.httpStatusCode : undefined;
}

/**
 * Holds the draft of one page and saves it a short time after the last change.
 * A save that the server rejects as stale reloads the latest version and drops the draft.
 * When another editor of the same page saves, an editor without local changes shows that version.
 */
export function usePageDocument(options: PageDocumentOptions) {
	const { pageId, projectId } = options;
	const pageStore = usePageStore();
	const { debounce } = useDebounce();

	/** The server version that the draft started from. */
	const base = shallowRef<Page>();
	const title = ref('');
	const content = ref('');
	const loadStatus = ref<PageLoadStatus>('loading');
	const saveStatus = ref<PageSaveStatus>('idle');
	const isSaving = ref(false);

	function showVersion(page: Page): void {
		base.value = page;
		title.value = page.title;
		content.value = page.content;
	}

	/** The fields of the draft that differ from `base`. An empty title is not a change. */
	function draftChanges(): PageDraftChanges {
		const draftTitle = title.value.trim();
		const isTitleChanged = draftTitle !== '' && draftTitle !== base.value?.title;
		const isContentChanged = content.value !== base.value?.content;
		return {
			...(isTitleChanged ? { title: draftTitle } : {}),
			...(isContentChanged ? { content: content.value } : {}),
		};
	}

	function hasDraftChanges(): boolean {
		return Object.keys(draftChanges()).length > 0;
	}

	async function fetchLatest(): Promise<Page> {
		return projectId
			? await pageStore.fetchPage(projectId, pageId)
			: await pageStore.fetchPageById(pageId);
	}

	function reportLoadFailure(error: unknown): void {
		const isNotFound = httpStatusOf(error) === HTTP_STATUS_NOT_FOUND;
		loadStatus.value = isNotFound ? 'not-found' : 'error';
		if (isNotFound) {
			options.onNotFound();
		}
	}

	async function load(): Promise<void> {
		loadStatus.value = 'loading';
		try {
			const page = await fetchLatest();
			showVersion(page);
			saveStatus.value = 'idle';
			loadStatus.value = 'ready';
			options.onLoaded(page);
		} catch (error) {
			reportLoadFailure(error);
		}
	}

	async function replaceDraftWithLatest(): Promise<void> {
		try {
			const latest = await fetchLatest();
			showVersion(latest);
			saveStatus.value = 'idle';
			options.onConflict(latest);
		} catch (error) {
			reportLoadFailure(error);
		}
	}

	async function recoverFromSaveFailure(error: unknown): Promise<void> {
		const status = httpStatusOf(error);
		if (status === HTTP_STATUS_CONFLICT) {
			await replaceDraftWithLatest();
		} else if (status === HTTP_STATUS_NOT_FOUND) {
			reportLoadFailure(error);
		} else {
			saveStatus.value = 'error';
		}
	}

	async function saveChanges(current: Page, changes: PageDraftChanges): Promise<void> {
		isSaving.value = true;
		saveStatus.value = 'saving';
		try {
			const saved = await pageStore.updatePage(current.projectId, current.id, {
				...changes,
				baseVersion: current.version,
			});
			base.value = saved;
			saveStatus.value = 'saved';
			options.onSaved(saved);
		} catch (error) {
			await recoverFromSaveFailure(error);
		} finally {
			isSaving.value = false;
		}
	}

	/** Saves the draft now. Does nothing when a save runs or when nothing changed. */
	async function save(): Promise<void> {
		const current = base.value;
		const changes = draftChanges();
		const canSave = current !== undefined && !isSaving.value && Object.keys(changes).length > 0;
		if (canSave) {
			await saveChanges(current, changes);
			scheduleSaveOfChangesMadeWhileSaving();
		}
	}

	const saveSoon = debounce(save, { debounceTime: PAGE_AUTOSAVE_DEBOUNCE_MS, trailing: true });

	function scheduleSave(): void {
		if (hasDraftChanges()) {
			saveStatus.value = 'unsaved';
			void saveSoon();
		}
	}

	function scheduleSaveOfChangesMadeWhileSaving(): void {
		if (saveStatus.value === 'saved') {
			scheduleSave();
		}
	}

	function setTitle(value: string): void {
		title.value = value;
		scheduleSave();
	}

	function setContent(value: string): void {
		content.value = value;
		scheduleSave();
	}

	/** Runs a scheduled save without the wait. */
	function flush(): void {
		void saveSoon.flush();
	}

	/** Shows a version that another editor of this page saved, unless this editor has a draft. */
	function showNewerVersion(latest: Page | undefined): void {
		const isNewer =
			latest !== undefined && base.value !== undefined && latest.version > base.value.version;
		if (isNewer && !isSaving.value && !hasDraftChanges()) {
			showVersion(latest);
		}
	}

	watch(() => pageStore.pagesById[pageId], showNewerVersion);

	return { base, title, content, loadStatus, saveStatus, load, setTitle, setContent, flush };
}
