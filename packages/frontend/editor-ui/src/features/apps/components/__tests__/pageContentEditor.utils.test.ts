import type { OutputBlockData } from '@editorjs/editorjs';
import type { AppContent } from '@n8n/api-types';

import {
	fromEditorBlocks,
	toEditorBlocks,
	validateEditorBlocks,
} from '@/features/apps/components/pageContentEditor.utils';

describe('pageContentEditor.utils', () => {
	describe('toEditorBlocks / fromEditorBlocks', () => {
		it('maps divider to delimiter and back', () => {
			const content: AppContent = [{ id: 'b1', type: 'divider', data: {} }];

			const editorBlocks = toEditorBlocks(content);
			expect(editorBlocks).toEqual([{ id: 'b1', type: 'delimiter', data: {} }]);

			expect(fromEditorBlocks(editorBlocks as OutputBlockData[])).toEqual(content);
		});

		it('passes custom tool types through unchanged', () => {
			const content: AppContent = [
				{
					id: 'b1',
					type: 'table',
					data: { source: { dataTableId: 'dt1' }, limit: 50 },
				},
			];

			expect(toEditorBlocks(content)).toEqual([
				{ id: 'b1', type: 'table', data: { source: { dataTableId: 'dt1' }, limit: 50 } },
			]);
		});

		it('keeps image alt text, since the image tool edits it', () => {
			const content: AppContent = [
				{
					id: 'b1',
					type: 'image',
					data: { url: 'https://example.com/x.png', alt: 'x', caption: 'c' },
				},
			];

			expect(toEditorBlocks(content)).toEqual(content);
			expect(fromEditorBlocks(toEditorBlocks(content))).toEqual(content);
		});

		it('flattens the list tool item objects back to strings', () => {
			const blocks: OutputBlockData[] = [
				{
					id: 'b1',
					type: 'list',
					data: {
						style: 'ordered',
						meta: {},
						items: [
							{ content: 'one', meta: {}, items: [] },
							{ content: '<b>two</b>', meta: {}, items: [] },
						],
					},
				},
			];

			expect(fromEditorBlocks(blocks)).toEqual([
				{ id: 'b1', type: 'list', data: { style: 'ordered', items: ['one', '<b>two</b>'] } },
			]);
		});
	});

	describe('validateEditorBlocks', () => {
		it('returns validated content for schema-valid blocks', () => {
			const blocks: OutputBlockData[] = [
				{ id: 'b1', type: 'header', data: { text: 'Title', level: 1 } },
			];

			const result = validateEditorBlocks(blocks);

			expect(result.issues).toEqual({});
			expect(result.content).toEqual([
				{ id: 'b1', type: 'header', data: { text: 'Title', level: 1 } },
			]);
		});

		it('attributes a schema issue to the offending block id', () => {
			const blocks: OutputBlockData[] = [
				{ id: 'b1', type: 'header', data: { text: 'Title', level: 1 } },
				// level 0 is out of the schema's 1-6 range.
				{ id: 'b2', type: 'header', data: { text: 'Bad', level: 0 } },
			];

			const result = validateEditorBlocks(blocks);

			expect(result.content).toBeUndefined();
			expect(Object.keys(result.issues)).toEqual(['b2']);
		});

		it('maps the delimiter tool name back to divider before validating', () => {
			const blocks: OutputBlockData[] = [{ id: 'b1', type: 'delimiter', data: {} }];

			const result = validateEditorBlocks(blocks);

			expect(result.content).toEqual([{ id: 'b1', type: 'divider', data: {} }]);
		});

		it('accepts a list saved by the list tool', () => {
			const blocks: OutputBlockData[] = [
				{
					id: 'b1',
					type: 'list',
					data: { style: 'unordered', meta: {}, items: [{ content: 'a', meta: {}, items: [] }] },
				},
			];

			const result = validateEditorBlocks(blocks);

			expect(result.issues).toEqual({});
			expect(result.content).toEqual([
				{ id: 'b1', type: 'list', data: { style: 'unordered', items: ['a'] } },
			]);
		});

		it('rejects a slot block in content mode', () => {
			const blocks: OutputBlockData[] = [{ id: 'b1', type: 'slot', data: {} }];

			const result = validateEditorBlocks(blocks);

			expect(result.content).toBeUndefined();
			expect(Object.keys(result.issues)).toEqual(['b1']);
		});

		it('returns a layout with exactly one slot in layout mode', () => {
			const blocks: OutputBlockData[] = [
				{ id: 'b1', type: 'header', data: { text: 'Menu', level: 2 } },
				{ id: 'b2', type: 'slot', data: {} },
			];

			const result = validateEditorBlocks(blocks, 'layout');

			expect(result.issues).toEqual({});
			expect(result.content).toBeUndefined();
			expect(result.layout).toEqual([
				{ id: 'b1', type: 'header', data: { text: 'Menu', level: 2 } },
				{ id: 'b2', type: 'slot', data: {} },
			]);
		});

		it('rejects a layout without a slot', () => {
			const blocks: OutputBlockData[] = [
				{ id: 'b1', type: 'header', data: { text: 'Menu', level: 2 } },
			];

			const result = validateEditorBlocks(blocks, 'layout');

			expect(result.layout).toBeUndefined();
		});
	});
});
