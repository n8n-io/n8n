import type { ChatHubConversationModel, ChatModelDto } from '@n8n/api-types';
import { computed, type ComputedRef, type MaybeRef, toValue } from 'vue';
import { useChatStore } from '../chat.store';

export function useAgent(
	model: MaybeRef<ChatHubConversationModel | null | undefined>,
): ComputedRef<ChatModelDto | undefined> {
	const chatStore = useChatStore();

	return computed(() => {
		const modelValue = toValue(model);

		return modelValue ? chatStore.getAgent(modelValue) : undefined;
	});
}
