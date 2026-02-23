import { computed, watch } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useUIStore } from '@/app/stores/ui.store';
import { useRoute } from 'vue-router';
import { ASK_AI_SLIDE_OUT_DURATION_MS, EDITABLE_CANVAS_VIEWS } from '@/app/constants';
import type { VIEWS } from '@/app/constants';
import { ASSISTANT_ENABLED_VIEWS, BUILDER_ENABLED_VIEWS } from './constants';
import { useChatPanelStateStore, type ChatPanelMode } from './chatPanelState.store';
import { useAssistantStore } from './assistant.store';
import { useBuilderStore } from './builder.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { ICredentialType } from 'n8n-workflow';
import type { ChatRequest } from './assistant.types';

export const MAX_CHAT_WIDTH = 425;
export const MIN_CHAT_WIDTH = 380;
export const DEFAULT_CHAT_WIDTH = 400;

/**
 * Type guard to check if a route name is a valid VIEWS value within the enabled views
 * Performs runtime validation to safely narrow the type without unsafe assertions
 */
function isEnabledView(
	route: string | symbol | undefined,
	views: readonly VIEWS[],
): route is VIEWS {
	return typeof route === 'string' && (views as readonly string[]).includes(route);
}

export const useChatPanelStore = defineStore(STORES.CHAT_PANEL, () => {
	const uiStore = useUIStore();
	const route = useRoute();
	const chatPanelStateStore = useChatPanelStateStore();
	const settingsStore = useSettingsStore();

	// Computed
	const isAssistantModeActive = computed(() => chatPanelStateStore.activeMode === 'assistant');
	const isBuilderModeActive = computed(() => chatPanelStateStore.activeMode === 'builder');

	const canShowAiButtonOnCanvas = computed(
		() =>
			settingsStore.isAiAssistantOrBuilderEnabled &&
			EDITABLE_CANVAS_VIEWS.includes(route.name as VIEWS),
	);

	// Actions
	async function open(options?: { mode?: ChatPanelMode }) {
		const mode = options?.mode;
		if (mode) {
			chatPanelStateStore.activeMode = mode;
		}

		// Check if the mode is enabled in the current view
		const enabledViews =
			chatPanelStateStore.activeMode === 'assistant'
				? ASSISTANT_ENABLED_VIEWS
				: BUILDER_ENABLED_VIEWS;
		const currentRoute = route?.name;

		if (!isEnabledView(currentRoute, enabledViews)) {
			// Mode is not enabled in current view, close the panel instead
			close();
			return;
		}

		chatPanelStateStore.isOpen = true;

		if (chatPanelStateStore.activeMode === 'builder') {
			const builderStore = useBuilderStore();
			builderStore.chatMessages = [];
			// Load credits and sessions in the background without blocking panel opening
			void builderStore.fetchBuilderCredits();
			void builderStore.loadSessions();
		} else if (chatPanelStateStore.activeMode === 'assistant') {
			const assistantStore = useAssistantStore();
			assistantStore.chatMessages = assistantStore.chatMessages.map((msg) => ({
				...msg,
				read: true,
			}));
		}
		// Update UI grid dimensions when opening
		uiStore.appGridDimensions = {
			...uiStore.appGridDimensions,
			width: window.innerWidth - chatPanelStateStore.width,
		};
	}

	function close() {
		chatPanelStateStore.isOpen = false;
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
		if (chatPanelStateStore.isOpen) {
			close();
		} else {
			await open(options);
		}
	}

	function switchMode(mode: ChatPanelMode) {
		// Check if the mode is enabled in the current view
		const enabledViews = mode === 'assistant' ? ASSISTANT_ENABLED_VIEWS : BUILDER_ENABLED_VIEWS;
		const currentRoute = route?.name;

		if (!isEnabledView(currentRoute, enabledViews)) {
			// Mode is not enabled in current view, close the panel
			close();
			return;
		}

		// Switch the mode without re-initialization
		chatPanelStateStore.activeMode = mode;
	}

	function updateWidth(newWidth: number) {
		const clampedWidth = Math.min(Math.max(newWidth, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
		chatPanelStateStore.width = clampedWidth;
		if (chatPanelStateStore.isOpen) {
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
		() => route?.name,
		(newRoute) => {
			if (!chatPanelStateStore.isOpen || !newRoute) {
				return;
			}
			const builderStore = useBuilderStore();

			const enabledViews =
				chatPanelStateStore.activeMode === 'assistant'
					? ASSISTANT_ENABLED_VIEWS
					: BUILDER_ENABLED_VIEWS;

			if (!isEnabledView(newRoute, enabledViews)) {
				close();
			} else if (isEnabledView(newRoute, BUILDER_ENABLED_VIEWS)) {
				// If entering an editable canvas view with builder mode active, refresh state
				builderStore.resetBuilderChat();
			}
		},
	);

	return {
		// State - expose from chatPanelStateStore
		isOpen: computed(() => chatPanelStateStore.isOpen),
		width: computed(() => chatPanelStateStore.width),
		activeMode: computed(() => chatPanelStateStore.activeMode),
		// Computed
		isAssistantModeActive,
		isBuilderModeActive,
		canShowAiButtonOnCanvas,
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
