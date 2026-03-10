import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { useNodeMention } from './useNodeMention';
import { useFocusedNodesStore } from '../focusedNodes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi } from '@/Interface';

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: vi.fn().mockReturnValue(false),
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: () => ({ activeNode: null }),
}));

function createMockInput(value = '', selectionStart: number | null = null): HTMLInputElement {
	const input = document.createElement('input');
	input.value = value;
	Object.defineProperty(input, 'selectionStart', {
		get: () => selectionStart ?? value.length,
		configurable: true,
	});
	input.setSelectionRange = vi.fn();
	input.dispatchEvent = vi.fn();
	return input;
}

function createMockInputEvent(): InputEvent {
	return new InputEvent('input', { bubbles: true });
}

const mockNodes: INodeUi[] = [
	{
		id: 'node-1',
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	},
	{
		id: 'node-2',
		name: 'Set',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [200, 0],
		parameters: {},
	},
];

describe('useNodeMention', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let focusedNodesStore: ReturnType<typeof useFocusedNodesStore>;

	beforeEach(() => {
		vi.clearAllMocks();

		setActivePinia(
			createTestingPinia({
				createSpy: vi.fn,
				stubActions: false,
			}),
		);

		workflowsStore = useWorkflowsStore();
		focusedNodesStore = useFocusedNodesStore();

		// @ts-expect-error -- mock readonly property
		workflowsStore.allNodes = mockNodes;
	});

	describe('handleInput - @ trigger conditions', () => {
		it('should open dropdown when @ is typed at start of input', () => {
			const { handleInput, showDropdown } = useNodeMention();
			const input = createMockInput('@', 1);

			handleInput(createMockInputEvent(), input);

			expect(showDropdown.value).toBe(true);
		});

		it('should open dropdown when @ is preceded by a space', () => {
			const { handleInput, showDropdown } = useNodeMention();
			const input = createMockInput('hello @', 7);

			handleInput(createMockInputEvent(), input);

			expect(showDropdown.value).toBe(true);
		});

		it('should not open dropdown when @ is part of an email address', () => {
			const { handleInput, showDropdown } = useNodeMention();
			const input = createMockInput('user@', 5);

			handleInput(createMockInputEvent(), input);

			expect(showDropdown.value).toBe(false);
		});

		it('should not open dropdown when @ is preceded by a letter', () => {
			const { handleInput, showDropdown } = useNodeMention();
			const input = createMockInput('test@', 5);

			handleInput(createMockInputEvent(), input);

			expect(showDropdown.value).toBe(false);
		});

		it('should not open dropdown when @ is preceded by a number', () => {
			const { handleInput, showDropdown } = useNodeMention();
			const input = createMockInput('abc123@', 7);

			handleInput(createMockInputEvent(), input);

			expect(showDropdown.value).toBe(false);
		});

		it('should open dropdown when @ is preceded by a tab character', () => {
			const { handleInput, showDropdown } = useNodeMention();
			const input = createMockInput('\t@', 2);

			handleInput(createMockInputEvent(), input);

			expect(showDropdown.value).toBe(true);
		});
	});

	describe('handleKeyDown - Escape', () => {
		it('should close dropdown without removing query text on Escape', () => {
			const { handleInput, handleKeyDown, showDropdown } = useNodeMention();

			const openInput = createMockInput('@', 1);
			handleInput(createMockInputEvent(), openInput);
			expect(showDropdown.value).toBe(true);

			const escapeEvent = new KeyboardEvent('keydown', {
				key: 'Escape',
				cancelable: true,
			});
			const preventDefaultSpy = vi.spyOn(escapeEvent, 'preventDefault');

			const handled = handleKeyDown(escapeEvent);

			expect(handled).toBe(true);
			expect(showDropdown.value).toBe(false);
			expect(preventDefaultSpy).toHaveBeenCalled();
			// Input value should remain unchanged (no removeQueryFromInput)
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(openInput.dispatchEvent).not.toHaveBeenCalled();
		});
	});

	describe('selectNode', () => {
		it('should confirm the selected node and close dropdown', () => {
			const { handleInput, selectNode, showDropdown } = useNodeMention();

			const input = createMockInput('@', 1);
			handleInput(createMockInputEvent(), input);
			expect(showDropdown.value).toBe(true);

			selectNode(mockNodes[0]);

			expect(showDropdown.value).toBe(false);
			expect(focusedNodesStore.confirmedNodeIds).toContain('node-1');
		});
	});

	describe('filteredNodes', () => {
		it('should exclude already confirmed nodes', () => {
			focusedNodesStore.confirmNodes(['node-1'], 'mention');

			const { filteredNodes } = useNodeMention();
			const nodeIds = filteredNodes.value.map((n) => n.id);

			expect(nodeIds).not.toContain('node-1');
			expect(nodeIds).toContain('node-2');
		});

		it('should filter by search query', () => {
			const { handleInput, filteredNodes } = useNodeMention();

			const openInput = createMockInput('@', 1);
			handleInput(createMockInputEvent(), openInput);

			const searchInput = createMockInput('@HTTP', 5);
			handleInput(createMockInputEvent(), searchInput);

			expect(filteredNodes.value.length).toBe(1);
			expect(filteredNodes.value[0].name).toBe('HTTP Request');
		});
	});
});
