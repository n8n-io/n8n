import { createTestingPinia } from '@pinia/testing';
import type { IBinaryData } from 'n8n-workflow';
import BinaryDataDisplayEmbed from '@/features/ndv/runData/components/BinaryDataDisplayEmbed.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { renderComponent } from '@/__tests__/render';

function createBinaryData(overrides: Partial<IBinaryData> = {}): IBinaryData {
	return {
		data: 'ZGF0YQ==',
		mimeType: 'text/plain',
		...overrides,
	};
}

describe('BinaryDataDisplayEmbed.vue', () => {
	it('should ignore the declared fileType and derive the renderer from mimeType', async () => {
		const binaryData = createBinaryData({ mimeType: undefined, fileType: 'image' });

		const { container } = renderComponent(BinaryDataDisplayEmbed, {
			pinia: createTestingPinia(),
			props: { binaryData },
		});

		await vi.waitFor(() => {
			expect(container.querySelector('img')).not.toBeInTheDocument();
			expect(container.querySelector('.binary-data.other')).toBeInTheDocument();
		});
	});

	it('should not treat a mimeType as the type its name starts with', async () => {
		const binaryData = createBinaryData({ mimeType: 'application/pdfx', fileType: 'pdf' });

		const { container } = renderComponent(BinaryDataDisplayEmbed, {
			pinia: createTestingPinia(),
			props: { binaryData },
		});

		await vi.waitFor(() => {
			expect(container.querySelector('.binary-data.pdf')).not.toBeInTheDocument();
			expect(container.querySelector('.binary-data.other')).toBeInTheDocument();
		});
	});

	it('should detect image file type from mimeType', async () => {
		const binaryData = createBinaryData({ mimeType: 'image/png' });

		const { container } = renderComponent(BinaryDataDisplayEmbed, {
			pinia: createTestingPinia(),
			props: { binaryData },
		});

		await vi.waitFor(() => {
			expect(container.querySelector('img')).toBeInTheDocument();
		});
	});

	it('should detect JSON file type from a mimeType carrying a charset parameter', async () => {
		const binaryData = createBinaryData({
			data: btoa('{"a":1}'),
			mimeType: 'application/json; charset=utf-8',
		});

		const { container } = renderComponent(BinaryDataDisplayEmbed, {
			pinia: createTestingPinia(),
			props: { binaryData },
		});

		await vi.waitFor(() => {
			expect(container.querySelector('.vjs-tree')).toBeInTheDocument();
		});
	});

	it('should keep an html mimeType that carries a markdown parameter as html', async () => {
		const binaryData = createBinaryData({
			data: btoa('<div>hi</div>'),
			mimeType: 'text/html; x=markdown',
		});

		const { container } = renderComponent(BinaryDataDisplayEmbed, {
			pinia: createTestingPinia(),
			props: { binaryData },
		});

		await vi.waitFor(() => {
			expect(container.querySelector('iframe')).toBeInTheDocument();
		});
	});

	it('should detect text file type from a mimeType carrying parameters', async () => {
		const binaryData = createBinaryData({ mimeType: 'text/csv; charset=utf-8' });

		const { container } = renderComponent(BinaryDataDisplayEmbed, {
			pinia: createTestingPinia(),
			props: { binaryData },
		});

		await vi.waitFor(() => {
			expect(container.querySelector('.binary-data.text')).toBeInTheDocument();
		});
	});

	it('should build the embed source from the stored mimeType, not the declared fileType', async () => {
		const binaryData = createBinaryData({
			id: 'binary-id',
			mimeType: 'application/pdf',
			fileType: 'image',
		});
		const pinia = createTestingPinia();
		const workflowsStore = useWorkflowsStore(pinia);
		workflowsStore.getBinaryUrl = vi.fn().mockReturnValue('http://test.local/binary');

		const { container } = renderComponent(BinaryDataDisplayEmbed, {
			pinia,
			props: { binaryData },
		});

		await vi.waitFor(() => {
			const embed = container.querySelector('.binary-data.pdf');
			expect(embed).toBeInTheDocument();
			expect(embed?.getAttribute('src')).toBe('http://test.local/binary');
		});
	});
});
