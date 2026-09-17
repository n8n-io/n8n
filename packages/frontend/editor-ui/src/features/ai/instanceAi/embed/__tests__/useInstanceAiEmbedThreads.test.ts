import { beforeEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore } from '@/__tests__/utils';
import { useInstanceAiStore } from '../../instanceAi.store';
import { useInstanceAiEmbedThreads } from '../useInstanceAiEmbedThreads';
import type { InstanceAiEmbedSubject } from '../instanceAiEmbed.types';

describe('useInstanceAiEmbedThreads', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		store = mockedStore(useInstanceAiStore);
	});

	it('filters store.threads by the subject', () => {
		const subject = ref<InstanceAiEmbedSubject>({ type: 'agent', id: 'agent-1', projectId: 'p1' });
		store.threads = [
			{
				id: 'thread-1',
				title: 'Targets agent-1',
				createdAt: '',
				updatedAt: '',
				metadata: { instanceAiAgentBuilderTarget: { agentId: 'agent-1', projectId: 'p1' } },
			},
			{
				id: 'thread-2',
				title: 'Targets agent-2',
				createdAt: '',
				updatedAt: '',
				metadata: { instanceAiAgentBuilderTarget: { agentId: 'agent-2', projectId: 'p1' } },
			},
		] as typeof store.threads;

		const { threads } = useInstanceAiEmbedThreads(subject);

		expect(threads.value.map((t) => t.id)).toEqual(['thread-1']);
	});
});
