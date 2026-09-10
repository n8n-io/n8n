import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory, createRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { APP_DETAILS } from '@/features/apps/apps.constants';

import InstanceAiThreadList from '../InstanceAiThreadList.vue';
import {
	INSTANCE_AI_APP_BUILDER_TARGET_METADATA_KEY,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_VIEW,
} from '../../constants';
import { useInstanceAiStore } from '../../instanceAi.store';

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/assistant', name: INSTANCE_AI_VIEW, component: { template: '<div />' } },
		{
			path: '/assistant/:threadId',
			name: INSTANCE_AI_THREAD_VIEW,
			component: { template: '<div />' },
		},
		{
			path: '/projects/:projectId/apps/:appId',
			name: APP_DETAILS,
			component: { template: '<div />' },
		},
	],
});

// The global test setup stubs RouterLink to a bare anchor; resolve `to` so the hrefs are visible.
const renderList = createComponentRenderer(InstanceAiThreadList, {
	global: {
		plugins: [router],
		stubs: {
			RouterLink: {
				props: ['to'],
				template:
					'<a :href="$router.resolve(to).href"><slot :href="$router.resolve(to).href" :navigate="() => {}" /></a>',
			},
		},
	},
});

const now = new Date().toISOString();
const thread = (id: string, appId?: string) => ({
	id,
	title: `Thread ${id}`,
	createdAt: now,
	updatedAt: now,
	metadata: appId
		? {
				[INSTANCE_AI_APP_BUILDER_TARGET_METADATA_KEY]: {
					appId,
					projectId: 'proj-1',
					name: 'Greeter',
				},
			}
		: undefined,
});

describe('InstanceAiThreadList', () => {
	beforeEach(async () => {
		createTestingPinia();
		mockedStore(useInstanceAiStore).threads = [
			thread('t-plain'),
			thread('t-app', 'app-1'),
			thread('t-other', 'app-2'),
		];
		await router.push('/projects/proj-1/apps/app-1?thread=t-app');
		await router.isReady();
	});

	it('lists every thread and links into the assistant without a scope', () => {
		const { getAllByTestId, getByText } = renderList();

		expect(getAllByTestId('instance-ai-thread-item')).toHaveLength(3);
		expect(getByText('Thread t-app').closest('a')).toHaveAttribute('href', '/assistant/t-app');
	});

	it('shows only the scoped app’s threads, named after it, linking back to the app page', () => {
		const { getAllByTestId, getByText, queryByText, getByTestId } = renderList({
			props: { appScope: { appId: 'app-1', projectId: 'proj-1', name: 'Greeter' } },
		});

		expect(getByText('Greeter')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-thread-item')).toHaveLength(1);
		expect(queryByText('Thread t-plain')).not.toBeInTheDocument();
		expect(getByText('Thread t-app').closest('a')).toHaveAttribute(
			'href',
			'/projects/proj-1/apps/app-1?thread=t-app',
		);
		expect(getByTestId('instance-ai-new-thread-button').closest('a')).toHaveAttribute(
			'href',
			'/projects/proj-1/apps/app-1?thread=new',
		);
	});
});
