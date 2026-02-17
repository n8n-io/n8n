import { ref, computed, watch, type Ref } from 'vue';
import type { INodeUi } from '@/Interface';
import { useFocusedNodesStore } from '../focusedNodes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

export interface UseNodeMentionOptions {
	maxResults?: number;
}

export interface OpenDropdownOptions {
	viaButton?: boolean;
	alignRight?: boolean;
}

export interface UseNodeMentionReturn {
	showDropdown: Ref<boolean>;
	searchQuery: Ref<string>;
	highlightedIndex: Ref<number>;
	dropdownPosition: Ref<{ top: number; left?: number; right?: number }>;
	filteredNodes: Ref<INodeUi[]>;
	openedViaButton: Ref<boolean>;
	handleInput: (event: InputEvent, inputElement: HTMLInputElement | HTMLTextAreaElement) => void;
	handleKeyDown: (event: KeyboardEvent) => boolean;
	selectNode: (node: INodeUi) => void;
	closeDropdown: (removeQueryFromInput?: boolean) => void;
	openDropdown: (
		inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement,
		options?: OpenDropdownOptions,
	) => void;
}

export function useNodeMention(options: UseNodeMentionOptions = {}): UseNodeMentionReturn {
	const { maxResults = 50 } = options;

	const focusedNodesStore = useFocusedNodesStore();
	const workflowsStore = useWorkflowsStore();

	const showDropdown = ref(false);
	const searchQuery = ref('');
	const highlightedIndex = ref(0);
	const dropdownPosition = ref<{ top: number; left?: number; right?: number }>({ top: 0, left: 0 });
	const mentionStartIndex = ref(-1);
	const inputElementRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
	const openedViaButton = ref(false);

	const filteredNodes = computed(() => {
		const query = searchQuery.value.toLowerCase();
		const allNodes = workflowsStore.allNodes;
		const confirmedIds = new Set(focusedNodesStore.confirmedNodeIds);

		let result = allNodes.filter((node) => !confirmedIds.has(node.id));

		if (query) {
			result = result.filter((node) => node.name.toLowerCase().includes(query));
		}

		return result.slice(0, maxResults);
	});

	// Close dropdown when workflow nodes change (e.g. paste, import) to ensure fresh data
	watch(
		() => workflowsStore.allNodes.length,
		() => {
			if (showDropdown.value) {
				closeDropdown();
			}
		},
	);

	function calculateDropdownPosition(inputElement: HTMLElement, options: OpenDropdownOptions = {}) {
		const rect = inputElement.getBoundingClientRect();
		if (options.alignRight) {
			dropdownPosition.value = {
				top: rect.top - 8,
				right: window.innerWidth - rect.right,
			};
		} else {
			dropdownPosition.value = {
				top: rect.top - 8,
				left: rect.left,
			};
		}
	}

	function openDropdown(
		inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement,
		options: OpenDropdownOptions = {},
	) {
		openedViaButton.value = options.viaButton ?? false;
		if (options.viaButton) {
			inputElementRef.value = null;
			mentionStartIndex.value = -1;
		} else {
			const textInput = inputElement as HTMLInputElement | HTMLTextAreaElement;
			inputElementRef.value = textInput;
			mentionStartIndex.value = textInput.selectionStart ?? textInput.value.length;
		}
		showDropdown.value = true;
		searchQuery.value = '';
		highlightedIndex.value = 0;
		calculateDropdownPosition(inputElement, options);
	}

	function closeDropdown(removeQueryFromInput = false) {
		if (removeQueryFromInput && inputElementRef.value && mentionStartIndex.value >= 0) {
			const input = inputElementRef.value;
			const value = input.value;
			const cursorPosition = input.selectionStart ?? value.length;

			const beforeMention = value.substring(0, mentionStartIndex.value);
			const afterCursor = value.substring(cursorPosition);
			input.value = beforeMention + afterCursor;

			const newPosition = mentionStartIndex.value;
			input.setSelectionRange(newPosition, newPosition);

			input.dispatchEvent(new Event('input', { bubbles: true }));
		}

		showDropdown.value = false;
		searchQuery.value = '';
		highlightedIndex.value = 0;
		mentionStartIndex.value = -1;
	}

	function handleInput(_event: InputEvent, inputElement: HTMLInputElement | HTMLTextAreaElement) {
		const value = inputElement.value;
		const cursorPosition = inputElement.selectionStart ?? value.length;

		if (!showDropdown.value) {
			const charBeforeCursor = value.charAt(cursorPosition - 1);
			if (charBeforeCursor === '@') {
				const charBeforeAt = cursorPosition >= 2 ? value.charAt(cursorPosition - 2) : '';
				if (!charBeforeAt || /\s/.test(charBeforeAt)) {
					openDropdown(inputElement);
					mentionStartIndex.value = cursorPosition - 1;
				}
				return;
			}
		} else {
			if (mentionStartIndex.value >= 0 && cursorPosition > mentionStartIndex.value) {
				const queryText = value.substring(mentionStartIndex.value + 1, cursorPosition);
				searchQuery.value = queryText;
				highlightedIndex.value = 0;
			} else {
				closeDropdown();
			}

			if (!value.includes('@') || cursorPosition <= mentionStartIndex.value) {
				closeDropdown();
			}
		}
	}

	function handleKeyDown(event: KeyboardEvent): boolean {
		if (!showDropdown.value) return false;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				highlightedIndex.value = Math.min(
					highlightedIndex.value + 1,
					filteredNodes.value.length - 1,
				);
				return true;

			case 'ArrowUp':
				event.preventDefault();
				highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
				return true;

			case 'Enter':
				if (filteredNodes.value.length > 0) {
					event.preventDefault();
					event.stopPropagation();
					selectNode(filteredNodes.value[highlightedIndex.value]);
					return true;
				}
				return false;

			case 'Escape':
				event.preventDefault();
				closeDropdown();
				return true;

			case 'Tab':
				if (filteredNodes.value.length > 0) {
					event.preventDefault();
					selectNode(filteredNodes.value[highlightedIndex.value]);
					return true;
				}
				closeDropdown();
				return false;

			default:
				return false;
		}
	}

	function selectNode(node: INodeUi) {
		focusedNodesStore.confirmNodes([node.id], 'mention');

		if (inputElementRef.value && mentionStartIndex.value >= 0) {
			const input = inputElementRef.value;
			const value = input.value;
			const cursorPosition = input.selectionStart ?? value.length;

			const beforeMention = value.substring(0, mentionStartIndex.value);
			const afterCursor = value.substring(cursorPosition);
			const insertedName = node.name + ' ';
			input.value = beforeMention + insertedName + afterCursor;

			const newPosition = mentionStartIndex.value + insertedName.length;
			input.setSelectionRange(newPosition, newPosition);
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}

		closeDropdown();
	}

	return {
		showDropdown,
		searchQuery,
		highlightedIndex,
		dropdownPosition,
		filteredNodes,
		openedViaButton,
		handleInput,
		handleKeyDown,
		selectNode,
		closeDropdown,
		openDropdown,
	};
}
