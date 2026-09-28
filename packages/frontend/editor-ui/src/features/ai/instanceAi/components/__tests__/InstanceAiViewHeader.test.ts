import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { defineComponent, h, ref, type PropType } from 'vue';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { APP_DETAILS } from '@/features/apps/apps.constants';
import { AppThreadScopeKey } from '@/features/apps/composables/useAppThreadScope';
import { INSTANCE_AI_APP_BUILDER_TARGET_METADATA_KEY } from '../../constants';
import InstanceAiViewHeader from '../InstanceAiViewHeader.vue';

const routerPush = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async function (importOriginal) {
	return {
		...(await importOriginal<typeof import('vue-router')>()),
		useRoute: function () {
			return { params: {} };
		},
		useRouter: function () {
			return { push: routerPush };
		},
	};
});

vi.mock('@/app/composables/usePageRedirectionHelper', function () {
	return {
		usePageRedirectionHelper: function () {
			return { goToUpgrade: vi.fn() };
		},
	};
});

const renderHeader = createComponentRenderer(InstanceAiViewHeader, {
	global: {
		stubs: {
			InstanceAiThreadList: { template: '<div><slot name="trigger" /></div>' },
			CreditsSettingsDropdown: true,
		},
	},
});

const threadOf = (id: string, appId?: string): InstanceAiThreadSummary => ({
	id,
	title: id,
	createdAt: '2026-04-01T00:00:00.000Z',
	updatedAt: '2026-04-01T00:00:00.000Z',
	...(appId
		? {
				metadata: { [INSTANCE_AI_APP_BUILDER_TARGET_METADATA_KEY]: { appId, projectId: 'proj-1' } },
			}
		: {}),
});

const ThreadListStub = defineComponent({
	props: {
		filter: { type: Function as PropType<(thread: InstanceAiThreadSummary) => boolean> },
		navigate: { type: Boolean, default: undefined },
	},
	emits: ['select'],
	setup(props, { emit }) {
		const threads = [threadOf('t-app', 'app-1'), threadOf('t-other', 'app-2'), threadOf('t-plain')];
		return () =>
			h(
				'div',
				{ 'data-test-id': 'thread-list-stub', 'data-navigate': String(props.navigate) },
				threads
					.filter((thread) => props.filter?.(thread) ?? true)
					.map((thread) =>
						h('button', { key: thread.id, onClick: () => emit('select', thread.id) }, thread.id),
					),
			);
	},
});

describe('InstanceAiViewHeader', function () {
	beforeEach(function () {
		setActivePinia(createTestingPinia());
	});

	it.each([undefined, true])(
		'shows the Chat history label when showThreadHistoryLabel is %s',
		function (showThreadHistoryLabel) {
			const { getByRole } = renderHeader({ props: { showThreadHistoryLabel } });
			const button = getByRole('button', { name: 'Chat history' });
			const label = within(button).getByText('Chat history');

			expect(label).toBeVisible();
			expect(label).not.toHaveAttribute('aria-hidden', 'true');
			expect(button).not.toHaveAttribute('data-icon-only', 'true');
		},
	);

	it('hides the label but keeps the button name when the label is disabled', function () {
		const { getByRole } = renderHeader({ props: { showThreadHistoryLabel: false } });
		const button = getByRole('button', { name: 'Chat history' });

		expect(within(button).queryByText('Chat history')).not.toBeInTheDocument();
		expect(button).toHaveAttribute('data-icon-only', 'true');
	});

	it('on the app page lists only the app threads and opens them on the app page', async function () {
		const { getByTestId, getByRole, queryByRole } = renderHeader({
			global: {
				stubs: { InstanceAiThreadList: ThreadListStub },
				provide: {
					[AppThreadScopeKey as symbol]: ref({ appId: 'app-1', projectId: 'proj-1', name: 'App' }),
				},
			},
		});

		expect(getByTestId('app-builder-back')).toBeInTheDocument();
		expect(getByTestId('thread-list-stub')).toHaveAttribute('data-navigate', 'false');
		expect(queryByRole('button', { name: 't-other' })).not.toBeInTheDocument();
		expect(queryByRole('button', { name: 't-plain' })).not.toBeInTheDocument();

		await userEvent.click(getByRole('button', { name: 't-app' }));

		expect(routerPush).toHaveBeenCalledWith({
			name: APP_DETAILS,
			params: { projectId: 'proj-1', appId: 'app-1' },
			query: { thread: 't-app' },
		});
	});
});
