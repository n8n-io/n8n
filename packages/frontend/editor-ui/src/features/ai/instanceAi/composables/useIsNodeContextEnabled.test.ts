import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsNodeContextEnabled } from './useIsNodeContextEnabled';

const editorContext = vi.hoisted(() => ({ instanceAi: { value: true } }));

vi.mock('@/app/composables/useEditorContext', () => ({
	useEditorContext: () => editorContext,
}));

describe('useIsNodeContextEnabled', () => {
	beforeEach(() => {
		editorContext.instanceAi.value = true;
	});

	it('enables canvas controls in the Instance AI editor context', () => {
		expect(useIsNodeContextEnabled().value).toBe(true);
	});

	it('keeps canvas controls disabled outside the Instance AI editor context', () => {
		editorContext.instanceAi.value = false;

		expect(useIsNodeContextEnabled().value).toBe(false);
	});
});
