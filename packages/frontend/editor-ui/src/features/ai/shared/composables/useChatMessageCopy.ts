import { useClipboard } from '@n8n/composables/useClipboard';
import { toValue, type MaybeRefOrGetter } from 'vue';

export function useChatMessageCopy(content: MaybeRefOrGetter<string>) {
	const clipboard = useClipboard();

	async function copyMessage() {
		await clipboard.copy(toValue(content));
	}

	return { copyMessage };
}
