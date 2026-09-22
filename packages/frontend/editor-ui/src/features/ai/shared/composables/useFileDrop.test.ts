import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useFileDrop } from './useFileDrop';

describe('useFileDrop', () => {
	function createDragEnterEvent(itemType: string) {
		return {
			dataTransfer: {
				types: ['Files'],
				items: [{ kind: 'file', type: itemType }],
			},
		} as unknown as DragEvent;
	}

	it.each([
		['an exact MIME type', ['application/pdf'], 'application/pdf', false],
		['a MIME wildcard', ['image/*'], 'image/png', false],
		['an unrestricted wildcard', ['*'], 'application/zip', false],
		['an unsupported MIME type', ['image/*'], 'application/pdf', true],
	])('marks %s correctly during drag enter', (_, acceptedTypes, itemType, expected) => {
		const { handleDragEnter, isDragging, isDraggingUnsupported } = useFileDrop(
			ref(true),
			vi.fn(),
			acceptedTypes,
		);

		handleDragEnter(createDragEnterEvent(itemType));

		expect(isDragging.value).toBe(true);
		expect(isDraggingUnsupported.value).toBe(expected);
	});

	it('uses clipboard items when the clipboard file list is empty', () => {
		const file = new File(['image'], 'image.png', { type: 'image/png' });
		const onFilesDropped = vi.fn();
		const preventDefault = vi.fn();
		const { handlePaste } = useFileDrop(ref(true), onFilesDropped);
		const event = {
			clipboardData: {
				files: [],
				items: [
					{ kind: 'string', getAsFile: () => null },
					{ kind: 'file', getAsFile: () => file },
				],
			},
			preventDefault,
		} as unknown as ClipboardEvent;

		handlePaste(event);

		expect(preventDefault).toHaveBeenCalledOnce();
		expect(onFilesDropped).toHaveBeenCalledWith([file]);
	});

	it('keeps the native drag-over behavior for text', () => {
		const preventDefault = vi.fn();
		const stopPropagation = vi.fn();
		const { handleDragOver } = useFileDrop(ref(true), vi.fn());
		const event = {
			dataTransfer: { types: ['text/plain'] },
			preventDefault,
			stopPropagation,
		} as unknown as DragEvent;

		handleDragOver(event);

		expect(preventDefault).not.toHaveBeenCalled();
		expect(stopPropagation).not.toHaveBeenCalled();
	});

	it('keeps the native drop behavior for text', () => {
		const onFilesDropped = vi.fn();
		const preventDefault = vi.fn();
		const stopPropagation = vi.fn();
		const { handleDrop } = useFileDrop(ref(true), onFilesDropped);
		const event = {
			dataTransfer: { types: ['text/plain'] },
			preventDefault,
			stopPropagation,
		} as unknown as DragEvent;

		handleDrop(event);

		expect(preventDefault).not.toHaveBeenCalled();
		expect(stopPropagation).not.toHaveBeenCalled();
		expect(onFilesDropped).not.toHaveBeenCalled();
	});
});
