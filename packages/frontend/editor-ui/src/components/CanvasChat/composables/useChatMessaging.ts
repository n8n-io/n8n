import type { ComputedRef, Ref } from 'vue';
import { computed, ref } from 'vue';
import { v4 as uuid } from 'uuid';
import type { ChatMessage } from '@n8n/chat/types';
import type {
	ITaskData,
	INodeExecutionData,
	IBinaryKeyData,
	IDataObject,
	IBinaryData,
	BinaryFileType,
	IRunExecutionData,
} from 'n8n-workflow';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { usePinnedData } from '@/composables/usePinnedData';
import { MODAL_CONFIRM } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import type { IExecutionPushResponse, INodeUi } from '@/Interface';
import { extractBotResponse, getInputKey } from '@/components/CanvasChat/utils';

export type RunWorkflowChatPayload = {
	triggerNode: string;
	nodeData: ITaskData;
	source: string;
	message: string;
};
export interface ChatMessagingDependencies {
	chatTrigger: Ref<INodeUi | null>;
	messages: Ref<ChatMessage[]>;
	sessionId: Ref<string>;
	executionResultData: ComputedRef<IRunExecutionData['resultData'] | undefined>;
	onRunChatWorkflow: (
		payload: RunWorkflowChatPayload,
	) => Promise<IExecutionPushResponse | undefined>;
}

export function useChatMessaging({
	chatTrigger,
	messages,
	sessionId,
	executionResultData,
	onRunChatWorkflow,
}: ChatMessagingDependencies) {
	const locale = useI18n();
	const { showError } = useToast();
	const previousMessageIndex = ref(0);
	const isLoading = ref(false);

	/** Converts a file to binary data */
	async function convertFileToBinaryData(file: File): Promise<IBinaryData> {
		const reader = new FileReader();
		return await new Promise((resolve, reject) => {
			reader.onload = () => {
				const binaryData: IBinaryData = {
					data: (reader.result as string).split('base64,')?.[1] ?? '',
					mimeType: file.type,
					fileName: file.name,
					fileSize: `${file.size} bytes`,
					fileExtension: file.name.split('.').pop() ?? '',
					fileType: file.type.split('/')[0] as BinaryFileType,
				};
				resolve(binaryData);
			};
			reader.onerror = () => {
				reject(new Error('Failed to convert file to binary data'));
			};
			reader.readAsDataURL(file);
		});
	}

	/** Gets keyed files for the workflow input */
	async function getKeyedFiles(files: File[]): Promise<IBinaryKeyData> {
		const binaryData: IBinaryKeyData = {};

		await Promise.all(
			files.map(async (file, index) => {
				const data = await convertFileToBinaryData(file);
				const key = `data${index}`;

				binaryData[key] = data;
			}),
		);

		return binaryData;
	}

	/** Extracts file metadata */
	function extractFileMeta(file: File): IDataObject {
		return {
			fileName: file.name,
			fileSize: `${file.size} bytes`,
			fileExtension: file.name.split('.').pop() ?? '',
			fileType: file.type.split('/')[0],
			mimeType: file.type,
		};
	}

	/** Starts workflow execution with the message */
	async function startWorkflowWithMessage(message: string, files?: File[]): Promise<void> {
		const triggerNode = chatTrigger.value;

		if (!triggerNode) {
			showError(new Error('Chat Trigger Node could not be found!'), 'Trigger Node not found');
			return;
		}

		const inputKey = getInputKey(triggerNode);

		const inputPayload: INodeExecutionData = {
			json: {
				sessionId: sessionId.value,
				action: 'sendMessage',
				[inputKey]: message,
			},
		};

		if (files && files.length > 0) {
			const filesMeta = files.map((file) => extractFileMeta(file));
			const binaryData = await getKeyedFiles(files);

			inputPayload.json.files = filesMeta;
			inputPayload.binary = binaryData;
		}
		const nodeData: ITaskData = {
			startTime: Date.now(),
			executionTime: 0,
			executionIndex: 0,
			executionStatus: 'success',
			data: {
				main: [[inputPayload]],
			},
			source: [null],
		};
		isLoading.value = true;
		const response = await onRunChatWorkflow({
			triggerNode: triggerNode.name,
			nodeData,
			source: 'RunData.ManualChatMessage',
			message,
		});
		isLoading.value = false;
		if (!response?.executionId) {
			return;
		}

		const chatMessage = executionResultData.value
			? extractBotResponse(
					executionResultData.value,
					response.executionId,
					locale.baseText('chat.window.chat.response.empty'),
				)
			: undefined;

		if (chatMessage !== undefined) {
			messages.value.push(chatMessage);
		}
	}

	/** Sends a message to the chat */
	async function sendMessage(message: string, files?: File[]) {
		previousMessageIndex.value = 0;
		if (message.trim() === '' && (!files || files.length === 0)) {
			showError(
				new Error(locale.baseText('chat.window.chat.provideMessage')),
				locale.baseText('chat.window.chat.emptyChatMessage'),
			);
			return;
		}

		const pinnedChatData = usePinnedData(chatTrigger.value);
		if (pinnedChatData.hasData.value) {
			const confirmResult = await useMessage().confirm(
				locale.baseText('chat.window.chat.unpinAndExecute.description'),
				locale.baseText('chat.window.chat.unpinAndExecute.title'),
				{
					confirmButtonText: locale.baseText('chat.window.chat.unpinAndExecute.confirm'),
					cancelButtonText: locale.baseText('chat.window.chat.unpinAndExecute.cancel'),
				},
			);

			if (!(confirmResult === MODAL_CONFIRM)) return;

			pinnedChatData.unsetData('unpin-and-send-chat-message-modal');
		}

		const newMessage: ChatMessage & { sessionId: string } = {
			text: message,
			sender: 'user',
			sessionId: sessionId.value,
			id: uuid(),
			files,
		};
		messages.value.push(newMessage);

		await startWorkflowWithMessage(newMessage.text, files);
	}

	return {
		previousMessageIndex,
		isLoading: computed(() => isLoading.value),
		sendMessage,
	};
}
