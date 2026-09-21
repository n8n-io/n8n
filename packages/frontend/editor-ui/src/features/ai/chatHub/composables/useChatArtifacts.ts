import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { ChatMessage } from '../chat.types';
import { collectChatArtifacts } from '@n8n/chat-hub';
import { useResizablePanel } from '@n8n/design-system';

export function useChatArtifacts(
	container: Ref<HTMLElement>,
	chatMessages: ComputedRef<ChatMessage[]>,
) {
	const isViewerCollapsed = ref(false);
	const selectedIndex = ref(0);
	const allArtifacts = computed(() =>
		collectChatArtifacts(chatMessages.value.flatMap((message) => message.content)),
	);
	const selectedArtifact = computed(() => {
		const artifacts = allArtifacts.value;
		if (artifacts.length === 0) return null;
		const index = Math.min(selectedIndex.value, artifacts.length - 1);
		return artifacts[index];
	});
	const isViewerVisible = computed(() => allArtifacts.value.length > 0 && !isViewerCollapsed.value);
	const panelResizer = useResizablePanel({
		container,
		width: {
			localStorageKey: 'N8N_CHAT_ARTIFACT_VIEWER_WIDTH',
			defaultSize: function getDefaultWidth(size) {
				return size * 0.6;
			},
			minSize: 300,
			maxSize: function getMaxWidth(size) {
				return size - 300;
			},
			allowFullSize: true,
			snap: true,
		},
	});

	// Reset collapsed state when artifacts change
	watch(allArtifacts, (newArtifacts, oldArtifacts) => {
		if (newArtifacts.length > 0 && newArtifacts.length !== oldArtifacts?.length) {
			isViewerCollapsed.value = false;
			// Reset to the latest artifact when new artifacts are added
			selectedIndex.value = newArtifacts.length - 1;
		}
	});

	function handleViewerResizeEnd() {
		if (panelResizer.isFullSize.value) {
			isViewerCollapsed.value = true;
		}
	}

	function handleCloseViewer() {
		isViewerCollapsed.value = true;
	}

	function handleSelect(index: number) {
		selectedIndex.value = index;
	}

	function handleOpenViewer(title?: string) {
		if (title) {
			selectedIndex.value = allArtifacts.value.findIndex((d) => d.title === title);
		}
		isViewerCollapsed.value = false;
	}

	function handleDownload() {
		const artifact = selectedArtifact.value;
		if (!artifact) {
			return;
		}

		const blob = new Blob([artifact.content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${artifact.title}.${artifact.type}`;
		a.click();
		URL.revokeObjectURL(url);
	}

	return {
		selectedIndex,
		allArtifacts,
		isViewerVisible,
		isViewerCollapsed,
		viewerSize: panelResizer.width,
		isViewerResizing: panelResizer.isResizing,
		handleOpenViewer,
		panelResizer,
		handleViewerResizeEnd,
		handleCloseViewer,
		handleDownload,
		handleSelect,
	};
}
