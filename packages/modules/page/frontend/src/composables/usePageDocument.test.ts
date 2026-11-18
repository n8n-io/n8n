import { ResponseError } from '@n8n/rest-api-client';

import { usePageDocument } from './usePageDocument';
import { createPage } from '../__tests__/fixtures';
import { PAGE_AUTOSAVE_DEBOUNCE_MS } from '../page.constants';
import { usePageStore } from '../page.store';

const api = vi.hoisted(() => ({
	getPage: vi.fn(),
	getPageById: vi.fn(),
	updatePage: vi.fn(),
}));

vi.mock('../page.api', () => api);

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost/rest', pushRef: 'test' } }),
}));

function createDocument(projectId: string | undefined = 'project-1') {
	const events = { onLoaded: vi.fn(), onSaved: vi.fn(), onConflict: vi.fn(), onNotFound: vi.fn() };
	return { events, document: usePageDocument({ pageId: 'page-1', projectId, ...events }) };
}

async function waitForAutosave() {
	await vi.advanceTimersByTimeAsync(PAGE_AUTOSAVE_DEBOUNCE_MS);
}

describe('usePageDocument', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		api.getPage.mockResolvedValue(createPage());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('loads the page', async () => {
		const { document, events } = createDocument();

		await document.load();

		expect(document.loadStatus.value).toBe('ready');
		expect(document.title.value).toBe('Runbook');
		expect(document.content.value).toBe('Hello');
		expect(events.onLoaded).toHaveBeenCalledWith(createPage());
	});

	it('loads by id alone when it has no project id', async () => {
		api.getPageById.mockResolvedValue(createPage());
		const { document } = createDocument('');

		await document.load();

		expect(api.getPageById).toHaveBeenCalledWith(expect.anything(), 'page-1');
		expect(api.getPage).not.toHaveBeenCalled();
		expect(document.loadStatus.value).toBe('ready');
	});

	it('reports a page that does not exist', async () => {
		api.getPage.mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
		const { document, events } = createDocument();

		await document.load();

		expect(document.loadStatus.value).toBe('not-found');
		expect(events.onNotFound).toHaveBeenCalled();
	});

	it('saves the changed fields once, after the user stops typing', async () => {
		const saved = createPage({ content: 'Hello world', version: 2 });
		api.updatePage.mockResolvedValue(saved);
		const { document, events } = createDocument();
		await document.load();

		document.setContent('Hello w');
		document.setContent('Hello world');
		expect(document.saveStatus.value).toBe('unsaved');
		expect(api.updatePage).not.toHaveBeenCalled();
		await waitForAutosave();

		expect(api.updatePage).toHaveBeenCalledTimes(1);
		expect(api.updatePage).toHaveBeenCalledWith(expect.anything(), 'project-1', 'page-1', {
			content: 'Hello world',
			baseVersion: 1,
		});
		expect(document.saveStatus.value).toBe('saved');
		expect(events.onSaved).toHaveBeenCalledWith(saved);
	});

	it('sends the new version as base of the next save', async () => {
		api.updatePage
			.mockResolvedValueOnce(createPage({ title: 'Renamed', version: 2 }))
			.mockResolvedValueOnce(createPage({ title: 'Renamed', content: 'More', version: 3 }));
		const { document } = createDocument();
		await document.load();

		document.setTitle('Renamed');
		await waitForAutosave();
		document.setContent('More');
		await waitForAutosave();

		expect(api.updatePage).toHaveBeenLastCalledWith(expect.anything(), 'project-1', 'page-1', {
			content: 'More',
			baseVersion: 2,
		});
	});

	it('does not save an empty title', async () => {
		const { document } = createDocument();
		await document.load();

		document.setTitle('   ');
		await waitForAutosave();

		expect(api.updatePage).not.toHaveBeenCalled();
	});

	it('saves at once on flush', async () => {
		api.updatePage.mockResolvedValue(createPage({ content: 'Bye', version: 2 }));
		const { document } = createDocument();
		await document.load();

		document.setContent('Bye');
		document.flush();
		await vi.advanceTimersByTimeAsync(0);

		expect(api.updatePage).toHaveBeenCalledTimes(1);
	});

	it('shows the latest version and drops the draft when the page changed elsewhere', async () => {
		const latest = createPage({ content: 'Changed elsewhere', version: 5 });
		api.updatePage.mockRejectedValue(new ResponseError('Conflict', { httpStatusCode: 409 }));
		const { document, events } = createDocument();
		await document.load();
		api.getPage.mockResolvedValue(latest);

		document.setContent('My draft');
		await waitForAutosave();

		expect(document.content.value).toBe('Changed elsewhere');
		expect(document.base.value?.version).toBe(5);
		expect(events.onConflict).toHaveBeenCalledWith(latest);
		expect(events.onSaved).not.toHaveBeenCalled();
		await waitForAutosave();
		expect(api.updatePage).toHaveBeenCalledTimes(1);
	});

	it('keeps the draft when the save fails for another reason', async () => {
		api.updatePage.mockRejectedValue(new ResponseError('Server error', { httpStatusCode: 500 }));
		const { document } = createDocument();
		await document.load();

		document.setContent('My draft');
		await waitForAutosave();

		expect(document.saveStatus.value).toBe('error');
		expect(document.content.value).toBe('My draft');
	});

	it('shows a version that another editor of the same page saved', async () => {
		api.updatePage.mockResolvedValue(createPage({ content: 'From the first', version: 2 }));
		const first = createDocument().document;
		const second = createDocument().document;
		await Promise.all([first.load(), second.load()]);

		first.setContent('From the first');
		await waitForAutosave();

		expect(second.content.value).toBe('From the first');
		expect(second.base.value?.version).toBe(2);
	});

	it('keeps its own draft when another editor of the same page saves', async () => {
		const { document } = createDocument();
		await document.load();
		document.setContent('My draft');

		usePageStore().pagesById = { 'page-1': createPage({ content: 'Other', version: 2 }) };
		await vi.advanceTimersByTimeAsync(0);

		expect(document.content.value).toBe('My draft');
	});
});
