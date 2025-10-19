import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import type { IWorkflowDb, INodeParameters } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { chatWithWorkflowAssistant } from '@/api/ai';
import { useRootStore } from '@n8n/stores/useRootStore';

interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
	status?: 'applied' | 'error';
	metadata?: {
		nodeCount?: number;
		changes?: WorkflowChanges;
	};
}

interface VersionEntry {
	id: string;
	timestamp: number;
	description: string;
	workflowSnapshot: IWorkflowDb;
	messageId: string;
}

interface OllamaConfig {
	baseUrl: string;
	model: string;
}

export interface WorkflowChanges {
	nodesToAdd?: Array<{
		type: string;
		name: string;
		parameters: INodeParameters;
		position: [number, number];
	}>;
	nodesToDelete?: string[];
	nodesToModify?: Array<{
		name: string;
		parameters: Partial<INodeParameters>;
	}>;
	connectionsToAdd?: Array<{
		source: string;
		sourceOutput: number;
		target: string;
		targetInput: number;
	}>;
	connectionsToDelete?: Array<{
		source: string;
		sourceOutput: number;
		target: string;
		targetInput: number;
	}>;
}

const LOCAL_STORAGE_AI_ASSISTANT_WIDTH = 'n8n-ai-assistant-panel-width';
const LOCAL_STORAGE_AI_ASSISTANT_OLLAMA_CONFIG = 'n8n-ai-assistant-ollama-config';

export const useAIAssistantStore = defineStore('aiAssistant', () => {
	// Always visible as per requirements
	const isOpen = ref(true);
	const panelWidth = useLocalStorage(LOCAL_STORAGE_AI_ASSISTANT_WIDTH, 400);
	const messages = ref<Message[]>([]);
	const currentWorkflowId = ref<string | null>(null);
	const isProcessing = ref(false);
	const versionHistory = ref<VersionEntry[]>([]);
	const ollamaConfig = useLocalStorage<OllamaConfig>(
		LOCAL_STORAGE_AI_ASSISTANT_OLLAMA_CONFIG,
		{
			baseUrl: 'http://localhost:11434',
			model: 'codellama',
		},
	);

	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const rootStore = useRootStore();

	const messagesByWorkflow = computed(() => (workflowId: string) =>
		messages.value.filter((msg) => currentWorkflowId.value === workflowId),
	);

	const latestVersion = computed(() =>
		versionHistory.value.length > 0
			? versionHistory.value[versionHistory.value.length - 1]
			: null,
	);

	const canRevert = computed(() => versionHistory.value.length > 0);

	function addMessage(
		role: 'user' | 'assistant',
		content: string,
		metadata?: Message['metadata'],
	): string {
		const messageId = uuid();
		messages.value.push({
			id: messageId,
			role,
			content,
			timestamp: Date.now(),
			metadata,
		});
		saveConversationToLocalStorage();
		return messageId;
	}

	function updateMessageStatus(messageId: string, status: 'applied' | 'error') {
		const message = messages.value.find((msg) => msg.id === messageId);
		if (message) {
			message.status = status;
			saveConversationToLocalStorage();
		}
	}

	function updateMessageContent(messageId: string, content: string) {
		const message = messages.value.find((msg) => msg.id === messageId);
		if (message) {
			message.content = content;
			saveConversationToLocalStorage();
		}
	}

	async function sendMessage(content: string): Promise<void> {
		if (!content.trim() || isProcessing.value) {
			return;
		}

		// Transform structured commands to natural language
		let transformedMessage = content;
		if (content.startsWith('/')) {
			transformedMessage = transformStructuredCommand(content);
		}

		// Add user message
		addMessage('user', transformedMessage);

		const workflow = workflowsStore.workflow;
		if (!workflow) {
			addMessage('assistant', 'No workflow loaded', { nodeCount: 0 });
			return;
		}

		isProcessing.value = true;

		// Create assistant message placeholder
		const assistantMessageId = addMessage('assistant', '');

		try {
			// Get conversation history (last 10 messages)
			const conversationHistory = messages.value.slice(-10).map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			let fullContent = '';
			let workflowChanges: WorkflowChanges | null = null;

			await chatWithWorkflowAssistant(
				rootStore.restApiContext,
				{
					workflowId: workflow.id,
					workflowData: workflow,
					message: transformedMessage,
					conversationHistory,
				},
				(data) => {
					// Stream update callback
					if (data.content) {
						fullContent += data.content;
						updateMessageContent(assistantMessageId, fullContent);
					}
					if (data.changes) {
						workflowChanges = data.changes;
					}
				},
				() => {
					// Done callback
					if (workflowChanges) {
						applyWorkflowChanges(workflowChanges, assistantMessageId);
					}
					isProcessing.value = false;
				},
				(error) => {
					// Error callback
					updateMessageContent(
						assistantMessageId,
						`Error: ${error.message || 'Failed to communicate with AI'}`,
					);
					updateMessageStatus(assistantMessageId, 'error');
					isProcessing.value = false;
				},
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'An unknown error occurred';
			updateMessageContent(assistantMessageId, `Error: ${errorMessage}`);
			updateMessageStatus(assistantMessageId, 'error');
			isProcessing.value = false;
		}
	}

	function transformStructuredCommand(command: string): string {
		const parts = command.split(' ');
		const cmd = parts[0].toLowerCase();
		const args = parts.slice(1).join(' ');

		switch (cmd) {
			case '/add':
				return `Add a ${args} node to the workflow`;
			case '/delete':
				return `Delete the ${args} node`;
			case '/connect':
				return `Connect ${args}`;
			case '/set':
				return `Set ${args}`;
			default:
				return command;
		}
	}

	function applyWorkflowChanges(changes: WorkflowChanges, messageId: string): void {
		try {
			// Create version history entry BEFORE applying changes
			const workflow = workflowsStore.workflow;
			addVersionEntry('AI modification', messageId);

			// Apply changes in correct order
			// 1. Delete connections first
			if (changes.connectionsToDelete && changes.connectionsToDelete.length > 0) {
				changes.connectionsToDelete.forEach((conn) => {
					workflowsStore.removeConnection({
						connection: [
							{ node: conn.source, type: 'main', index: conn.sourceOutput },
							{ node: conn.target, type: 'main', index: conn.targetInput },
						],
					});
				});
			}

			// 2. Delete nodes
			if (changes.nodesToDelete && changes.nodesToDelete.length > 0) {
				changes.nodesToDelete.forEach((nodeName) => {
					const node = workflow.nodes.find((n) => n.name === nodeName);
					if (node) {
						workflowsStore.removeNode({ name: nodeName });
					}
				});
			}

			// 3. Add new nodes
			if (changes.nodesToAdd && changes.nodesToAdd.length > 0) {
				changes.nodesToAdd.forEach((nodeData) => {
					workflowsStore.addNode({
						name: nodeData.name,
						type: nodeData.type,
						position: nodeData.position,
						parameters: nodeData.parameters,
					});
				});
			}

			// 4. Modify existing nodes
			if (changes.nodesToModify && changes.nodesToModify.length > 0) {
				changes.nodesToModify.forEach((nodeModification) => {
					workflowsStore.setNodeParameters({
						name: nodeModification.name,
						value: nodeModification.parameters,
					});
				});
			}

			// 5. Add new connections
			if (changes.connectionsToAdd && changes.connectionsToAdd.length > 0) {
				changes.connectionsToAdd.forEach((conn) => {
					workflowsStore.addConnection({
						connection: [
							{ node: conn.source, type: 'main', index: conn.sourceOutput },
							{ node: conn.target, type: 'main', index: conn.targetInput },
						],
					});
				});
			}

			// Mark workflow as dirty
			uiStore.stateIsDirty = true;

			// Update message status
			updateMessageStatus(messageId, 'applied');
		} catch (error) {
			console.error('Failed to apply workflow changes:', error);
			updateMessageStatus(messageId, 'error');
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to apply changes';
			addMessage('assistant', `Error applying changes: ${errorMessage}`);
		}
	}

	function addVersionEntry(description: string, messageId: string): void {
		const workflow = workflowsStore.workflow;
		if (!workflow) return;

		const versionId = uuid();
		versionHistory.value.push({
			id: versionId,
			timestamp: Date.now(),
			description,
			workflowSnapshot: JSON.parse(JSON.stringify(workflow)),
			messageId,
		});
	}

	function revertToVersion(versionId: string): void {
		const version = versionHistory.value.find((v) => v.id === versionId);
		if (!version) return;

		// Replace entire workflow with snapshot
		workflowsStore.setWorkflow(version.workflowSnapshot);
		uiStore.stateIsDirty = true;

		// Add system message
		addMessage(
			'assistant',
			`Reverted to version from ${new Date(version.timestamp).toLocaleString()}`,
		);
	}

	function clearConversation(): void {
		messages.value = [];
		saveConversationToLocalStorage();
	}

	function updatePanelWidth(width: number): void {
		panelWidth.value = width;
	}

	function loadConversationForWorkflow(workflowId: string): void {
		currentWorkflowId.value = workflowId;
		const storageKey = `n8n-ai-assistant-session-${workflowId}`;
		const stored = localStorage.getItem(storageKey);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				messages.value = parsed.slice(-50); // Max 50 messages
			} catch (error) {
				console.error('Failed to load conversation history:', error);
				messages.value = [];
			}
		} else {
			messages.value = [];
		}
	}

	function saveConversationToLocalStorage(): void {
		if (!currentWorkflowId.value) return;
		const storageKey = `n8n-ai-assistant-session-${currentWorkflowId.value}`;
		localStorage.setItem(JSON.stringify(messages.value.slice(-50)));
	}

	function updateOllamaConfig(config: Partial<OllamaConfig>): void {
		ollamaConfig.value = { ...ollamaConfig.value, ...config };
	}

	return {
		// State
		isOpen: computed(() => isOpen.value),
		panelWidth: computed(() => panelWidth.value),
		messages: computed(() => messages.value),
		currentWorkflowId: computed(() => currentWorkflowId.value),
		isProcessing: computed(() => isProcessing.value),
		versionHistory: computed(() => versionHistory.value),
		ollamaConfig: computed(() => ollamaConfig.value),

		// Getters
		messagesByWorkflow,
		latestVersion,
		canRevert,

		// Actions
		addMessage,
		sendMessage,
		applyWorkflowChanges,
		addVersionEntry,
		revertToVersion,
		clearConversation,
		updatePanelWidth,
		loadConversationForWorkflow,
		updateOllamaConfig,
		updateMessageStatus,
		updateMessageContent,
	};
});
