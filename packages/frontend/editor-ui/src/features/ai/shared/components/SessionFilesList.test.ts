import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { SessionFileDto } from '@n8n/api-types';
import SessionFilesList from './SessionFilesList.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const imageFile: SessionFileDto = {
	id: 'img-1',
	kind: 'attachment',
	fileName: 'photo.png',
	mimeType: 'image/png',
	sizeBytes: 12,
	createdAt: '2026-01-01T00:00:00.000Z',
	previewable: true,
};

const textFile: SessionFileDto = {
	id: 'txt-1',
	kind: 'attachment',
	fileName: 'notes.txt',
	mimeType: 'text/plain',
	sizeBytes: 5,
	createdAt: '2026-01-01T00:00:00.000Z',
	previewable: true,
};

const pdfFile: SessionFileDto = {
	id: 'pdf-1',
	kind: 'attachment',
	fileName: 'doc.pdf',
	mimeType: 'application/pdf',
	sizeBytes: 20,
	createdAt: '2026-01-01T00:00:00.000Z',
	previewable: false,
};

const outputFile: SessionFileDto = {
	id: 'out-1',
	kind: 'output',
	fileName: 'hello.md',
	mimeType: 'text/markdown',
	sizeBytes: 4,
	runId: 'run-1',
	createdAt: '2026-01-02T00:00:00.000Z',
	previewable: true,
};

function href(id: string) {
	return `/files/${id}`;
}

describe('SessionFilesList', () => {
	it('shows empty copy when there are no files', () => {
		const wrapper = mount(SessionFilesList, {
			props: { files: [], contentHref: href },
		});

		expect(wrapper.get('[data-testid="session-files-list"]').text()).toContain(
			'sessionFiles.empty',
		);
	});

	it('renders an image preview from the content href', () => {
		const wrapper = mount(SessionFilesList, {
			props: { files: [imageFile], contentHref: href },
		});

		expect(wrapper.get('img').attributes('src')).toBe('/files/img-1');
		expect(wrapper.get('img').attributes('alt')).toBe('photo.png');
	});

	it('opens previewable text in a new tab and downloads non-viewable files', () => {
		const wrapper = mount(SessionFilesList, {
			props: { files: [textFile, pdfFile], contentHref: href },
		});

		const links = wrapper.findAll('a');
		expect(links[0].attributes('href')).toBe('/files/txt-1');
		expect(links[0].attributes('target')).toBe('_blank');
		expect(links[1].attributes('href')).toBe('/files/pdf-1');
		expect(links[1].attributes('download')).toBe('doc.pdf');
		expect(links[1].text()).toContain('sessionFiles.download');
	});

	it('hides the outputs group when showOutputs is false', () => {
		const wrapper = mount(SessionFilesList, {
			props: { files: [textFile, outputFile], contentHref: href, showOutputs: false },
		});

		expect(wrapper.find('[data-testid="session-files-outputs"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('notes.txt');
		expect(wrapper.text()).not.toContain('hello.md');
	});

	it('shows output files under the outputs heading', () => {
		const wrapper = mount(SessionFilesList, {
			props: { files: [textFile, outputFile], contentHref: href },
		});

		expect(wrapper.get('[data-testid="session-files-outputs"]').text()).toContain('hello.md');
		expect(wrapper.get('[data-testid="session-files-outputs"]').text()).toContain(
			'sessionFiles.outputs',
		);
	});
});
