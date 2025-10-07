import { computed, watch } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useUIStore } from '@/stores/ui.store';
import { useRoute } from 'vue-router';
import { ASK_AI_SLIDE_OUT_DURATION_MS } from '@/constants';
import type { VIEWS } from '@/constants';
import { ASSISTANT_ENABLED_VIEWS, BUILDER_ENABLED_VIEWS } from '@/constants.assistant';
import { chatPanelState, type ChatPanelMode } from '@/utils/chatPanelUtils';
import { useAssistantStore } from '@/stores/assistant.store';
import { useBuilderStore } from '@/stores/builder.store';
import type { ICredentialType } from 'n8n-workflow';
import type { ChatRequest } from '@/types/assistant.types';

export const MAX_CHAT_WIDTH = 425;
export const MIN_CHAT_WIDTH = 380;
export const DEFAULT_CHAT_WIDTH = 400;

export const useChatPanelStore = defineStore(STORES.CHAT_WINDOW, () => {
	const uiStore = useUIStore();
	const route = useRoute();

	// Use shared state to avoid circular dependencies
	const { isOpen, width, activeMode } = chatPanelState;

	// Computed
	const isAssistantModeActive = computed(() => activeMode.value === 'assistant');
	const isBuilderModeActive = computed(() => activeMode.value === 'builder');

	// Actions
	async function open(options?: { mode?: ChatPanelMode }) {
		const mode = options?.mode;
		if (mode) {
			activeMode.value = mode;
		}

		// Check if the mode is enabled in the current view
		const enabledViews =
			activeMode.value === 'assistant' ? ASSISTANT_ENABLED_VIEWS : BUILDER_ENABLED_VIEWS;
		const currentRoute = route.name;

		if (!currentRoute || !enabledViews.includes(currentRoute as VIEWS)) {
			// Mode is not enabled in current view, close the panel instead
			close();
			return;
		}

		// Handle mode-specific initialization
		if (activeMode.value === 'builder') {
			const builderStore = useBuilderStore();
			builderStore.chatMessages = [];
			await builderStore.fetchBuilderCredits();
			await builderStore.loadSessions();
		} else if (activeMode.value === 'assistant') {
			const assistantStore = useAssistantStore();
			assistantStore.chatMessages = assistantStore.chatMessages.map((msg) => ({
				...msg,
				read: true,
			}));
		}

		isOpen.value = true;
		// Update UI grid dimensions when opening
		uiStore.appGridDimensions = {
			...uiStore.appGridDimensions,
			width: window.innerWidth - width.value,
		};
	}

	function close() {
		isOpen.value = false;
		// Wait for slide animation to finish before updating grid width and resetting
		setTimeout(() => {
			uiStore.appGridDimensions = {
				...uiStore.appGridDimensions,
				width: window.innerWidth,
			};

			const assistantStore = useAssistantStore();
			const builderStore = useBuilderStore();

			// Reset assistant only if session has ended
			if (assistantStore.isSessionEnded) {
				assistantStore.resetAssistantChat();
			}

			// Always reset builder
			builderStore.resetBuilderChat();
		}, ASK_AI_SLIDE_OUT_DURATION_MS + 50);
	}

	async function toggle(options?: { mode?: ChatPanelMode }) {
		if (isOpen.value) {
			close();
		} else {
			await open(options);
		}
	}

	function switchMode(mode: ChatPanelMode) {
		// Check if the mode is enabled in the current view
		const enabledViews = mode === 'assistant' ? ASSISTANT_ENABLED_VIEWS : BUILDER_ENABLED_VIEWS;
		const currentRoute = route.name;

		if (!currentRoute || !enabledViews.includes(currentRoute as VIEWS)) {
			// Mode is not enabled in current view, close the panel
			close();
			return;
		}

		// Switch the mode without re-initialization
		activeMode.value = mode;
	}

	function updateWidth(newWidth: number) {
		const clampedWidth = Math.min(Math.max(newWidth, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
		width.value = clampedWidth;
		if (isOpen.value) {
			uiStore.appGridDimensions = {
				...uiStore.appGridDimensions,
				width: window.innerWidth - clampedWidth,
			};
		}
	}

	/**
	 * Opens assistant with credential help context
	 */
	async function openWithCredHelp(credentialType: ICredentialType) {
		const assistantStore = useAssistantStore();
		await assistantStore.initCredHelp(credentialType);
		await open({ mode: 'assistant' });
	}

	/**
	 * Opens assistant with error helper context
	 */
	async function openWithErrorHelper(context: ChatRequest.ErrorContext) {
		const assistantStore = useAssistantStore();
		await assistantStore.initErrorHelper(context);
		await open({ mode: 'assistant' });
	}

	// Watch route changes and close if panel can't be shown in current view
	watch(
		() => route.name,
		(newRoute) => {
			if (!isOpen.value || !newRoute) {
				return;
			}
			const builderStore = useBuilderStore();

			const enabledViews =
				activeMode.value === 'assistant' ? ASSISTANT_ENABLED_VIEWS : BUILDER_ENABLED_VIEWS;

			if (!enabledViews.includes(newRoute as VIEWS)) {
				close();
			} else if (BUILDER_ENABLED_VIEWS.includes(newRoute as VIEWS)) {
				// If entering an editable canvas view with builder mode active, refresh state
				builderStore.resetBuilderChat();
			}
		},
	);

	return {
		// State
		isOpen,
		width,
		activeMode,
		// Computed
		isAssistantModeActive,
		isBuilderModeActive,
		// Actions
		open,
		close,
		toggle,
		switchMode,
		updateWidth,
		openWithCredHelp,
		openWithErrorHelper,
		// Constants
		DEFAULT_CHAT_WIDTH,
		MIN_CHAT_WIDTH,
		MAX_CHAT_WIDTH,
	};
});
