import { computed, type ComputedRef, type Ref } from 'vue';

import { useInstanceAiStore } from '../instanceAi.store';
import { threadTargetsSubject, type InstanceAiEmbedSubject } from './instanceAiEmbed.types';

/** The threads an embedded panel's history list shows, filtered by subject. */
export function useInstanceAiEmbedThreads(
	subject: Ref<InstanceAiEmbedSubject> | ComputedRef<InstanceAiEmbedSubject>,
) {
	const store = useInstanceAiStore();

	const threads = computed(() =>
		store.threads.filter((thread) => threadTargetsSubject(thread.metadata, subject.value)),
	);

	return { threads };
}
