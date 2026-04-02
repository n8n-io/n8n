import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { fetchMemory, updateMemory } from './instanceAi.memory.api';

export const useInstanceAiMemoryStore = defineStore('instanceAiMemory', () => {
	const rootStore = useRootStore();
	const toast = useToast();

	const content = ref('');
	const template = ref('');
	const originalContent = ref('');
	const isLoading = ref(false);

	const isDirty = computed(() => content.value !== originalContent.value);

	async function fetch(threadId: string): Promise<void> {
		isLoading.value = true;
		try {
			const result = await fetchMemory(rootStore.restApiContext, threadId);
			content.value = result.content;
			template.value = result.template;
			originalContent.value = result.content;
		} catch {
			toast.showError(new Error('Failed to load memory'), 'Memory error');
		} finally {
			isLoading.value = false;
		}
	}

	async function save(threadId: string): Promise<void> {
		isLoading.value = true;
		try {
			await updateMemory(rootStore.restApiContext, threadId, content.value);
			originalContent.value = content.value;
		} catch {
			toast.showError(new Error('Failed to save memory'), 'Memory error');
		} finally {
			isLoading.value = false;
		}
	}

	function resetToTemplate(): void {
		content.value = template.value;
	}

	function reset(): void {
		content.value = '';
		template.value = '';
		originalContent.value = '';
		isLoading.value = false;
	}

	return {
		content,
		template,
		isLoading,
		isDirty,
		fetch,
		save,
		resetToTemplate,
		reset,
	};
});
