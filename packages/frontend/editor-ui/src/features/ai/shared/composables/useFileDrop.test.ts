import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useFileDrop } from './useFileDrop';

describe('useFileDrop', () => {
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
});
