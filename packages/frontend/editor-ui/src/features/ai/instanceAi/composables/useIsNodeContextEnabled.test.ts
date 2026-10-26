import { AI_ASSISTANT_AT_MENTIONS_FLAG, CANVAS_NODE_CONTEXT_FLAG } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsNodeContextEnabled } from './useIsNodeContextEnabled';

const flagValues = vi.hoisted(() => new Map<string, boolean>());
const editorContext = vi.hoisted(() => ({ instanceAi: { value: true } }));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: (flag: string) => flagValues.get(flag) === true }),
}));

vi.mock('@/app/composables/useEditorContext', () => ({
	useEditorContext: () => editorContext,
}));

describe('useIsNodeContextEnabled', () => {
	beforeEach(() => {
		flagValues.clear();
		editorContext.instanceAi.value = true;
	});

	it('keeps canvas controls disabled when only Assistant mentions are enabled', () => {
		flagValues.set(AI_ASSISTANT_AT_MENTIONS_FLAG, true);
		flagValues.set(CANVAS_NODE_CONTEXT_FLAG, false);

		expect(useIsNodeContextEnabled().value).toBe(false);
	});

	it('enables canvas controls with the canvas node-context flag', () => {
		flagValues.set(CANVAS_NODE_CONTEXT_FLAG, true);

		expect(useIsNodeContextEnabled().value).toBe(true);
	});

	it('keeps canvas controls disabled outside the Instance AI editor context', () => {
		flagValues.set(CANVAS_NODE_CONTEXT_FLAG, true);
		editorContext.instanceAi.value = false;

		expect(useIsNodeContextEnabled().value).toBe(false);
	});
});
