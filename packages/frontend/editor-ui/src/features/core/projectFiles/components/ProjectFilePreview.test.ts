import type { ProjectFileResponse } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import ProjectFilePreview from '@/features/core/projectFiles/components/ProjectFilePreview.vue';
import { useProjectFilesStore } from '@/features/core/projectFiles/projectFiles.store';

const renderComponent = createComponentRenderer(ProjectFilePreview);

const file = (overrides: Partial<ProjectFileResponse> = {}): ProjectFileResponse => ({
	id: 'file-1',
	name: 'notes.txt',
	mimeType: 'text/plain',
	fileSizeBytes: 12,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	createdBy: null,
	updatedBy: null,
	...overrides,
});

let store: ReturnType<typeof mockedStore<typeof useProjectFilesStore>>;

const setup = (target: ProjectFileResponse, text = 'hello') => {
	const pinia = createTestingPinia();
	store = mockedStore(useProjectFilesStore);
	store.fetchFileText.mockResolvedValue(text);
	store.previewUrl.mockReturnValue('/rest/projects/p1/files/file-1/content?action=view');

	return renderComponent({ pinia, props: { projectId: 'p1', file: target } });
};

describe('ProjectFilePreview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders an image from the view URL without fetching its bytes', async () => {
		const { getByTestId } = setup(file({ name: 'logo.png', mimeType: 'image/png' }));

		const img = await waitFor(() => getByTestId('project-file-preview-image'));

		expect(img.getAttribute('src')).toContain('action=view');
		// The browser loads the image; pulling it through JS would buffer it for nothing.
		expect(store.fetchFileText).not.toHaveBeenCalled();
	});

	it('renders text content', async () => {
		const { getByTestId } = setup(file(), 'line one\nline two');

		await waitFor(() =>
			expect(getByTestId('project-file-preview-text')).toHaveTextContent('line one'),
		);
	});

	it('renders markup in a text file as escaped text, not as HTML', async () => {
		// The security-relevant assertion: previewing a file whose bytes are markup
		// must not execute or inject it.
		const payload = '<script>alert(1)</script><img src=x onerror=alert(2)>';
		const { getByTestId } = setup(file({ name: 'notes.txt' }), payload);

		const pre = await waitFor(() => getByTestId('project-file-preview-text'));

		expect(pre.textContent).toBe(payload);
		expect(pre.querySelector('script')).toBeNull();
		expect(pre.querySelector('img')).toBeNull();
	});

	it('renders JSON through the JSON viewer', async () => {
		const { getByTestId } = setup(
			file({ name: 'data.json', mimeType: 'application/json' }),
			'{"a":1}',
		);

		await waitFor(() => expect(getByTestId('project-file-preview-json')).toBeVisible());
	});

	it('shows an error when the bytes cannot be fetched', async () => {
		const pinia = createTestingPinia();
		store = mockedStore(useProjectFilesStore);
		store.fetchFileText.mockRejectedValue(new Error('nope'));

		const { getByTestId } = renderComponent({
			pinia,
			props: { projectId: 'p1', file: file() },
		});

		await waitFor(() => expect(getByTestId('project-file-preview-error')).toBeVisible());
	});

	it('shows an error when malformed JSON cannot be parsed', async () => {
		const { getByTestId } = setup(
			file({ name: 'data.json', mimeType: 'application/json' }),
			'{not json',
		);

		await waitFor(() => expect(getByTestId('project-file-preview-error')).toBeVisible());
	});

	it('truncates long text and says so', async () => {
		const { getByTestId } = setup(file(), 'x'.repeat(200_001));

		await waitFor(() => expect(getByTestId('project-file-preview-truncated')).toBeVisible());
		expect(getByTestId('project-file-preview-text').textContent).toHaveLength(200_000);
	});

	it('does not report truncation for short text', async () => {
		const { queryByTestId, getByTestId } = setup(file(), 'short');

		await waitFor(() => expect(getByTestId('project-file-preview-text')).toBeVisible());
		expect(queryByTestId('project-file-preview-truncated')).toBeNull();
	});
});
