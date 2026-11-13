import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { render } from '@testing-library/vue';
import { defineComponent, h, ref, useTemplateRef } from 'vue';

import { trackOnPageHide } from '@/app/plugins/telemetry/trackOnPageHide';
import { useAssistantAwayTelemetry } from './useAssistantAwayTelemetry';

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

vi.mock('@/app/plugins/telemetry/trackOnPageHide', () => ({ trackOnPageHide: vi.fn() }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));

const routeParams = ref<{ threadId?: string }>({});
vi.mock('vue-router', () => ({
	useRouter: () => ({
		currentRoute: {
			get value() {
				return { params: routeParams.value };
			},
		},
	}),
}));

const { INSTANCE_AI } = TELEMETRY_EVENT;

function mountHarness(
	threadId: string,
	isRunning: { value: boolean },
	isAwaitingUser: { value: boolean } = { value: false },
) {
	routeParams.value = { threadId };
	return render(
		defineComponent({
			setup() {
				useAssistantAwayTelemetry({
					threadId: () => threadId,
					isRunning: () => isRunning.value,
					isAwaitingUser: () => isAwaitingUser.value,
				});
				return () => h('div');
			},
		}),
	);
}

function setTabHidden(hidden: boolean) {
	Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
	document.dispatchEvent(new Event('visibilitychange'));
}

describe('useAssistantAwayTelemetry', () => {
	beforeEach(() => {
		track.mockClear();
		vi.mocked(trackOnPageHide).mockClear();
		vi.useFakeTimers();
		setTabHidden(false);
		track.mockClear();
	});

	afterEach(() => vi.useRealTimers());

	describe('leaving the thread', () => {
		it('tracks leaving while the Assistant is running', () => {
			const view = mountHarness('t-leave', { value: true });
			routeParams.value = { threadId: 'other' };
			view.unmount();

			expect(track).toHaveBeenCalledWith(
				INSTANCE_AI.USER_LEFT_AI_ASSISTANT_THREAD_WITH_ACTIVE_RUN,
				{
					thread_id: 't-leave',
					is_awaiting_user: false,
				},
			);
		});

		it('tracks leaving when the running state comes from a child template ref', () => {
			const Child = defineComponent({
				setup(_, { expose }) {
					expose({ isStreaming: ref(true) });
					return () => h('span');
				},
			});
			const Parent = defineComponent({
				setup() {
					const child = useTemplateRef<{ isStreaming: boolean }>('child');
					useAssistantAwayTelemetry({
						threadId: () => 't-ref',
						isRunning: () => child.value?.isStreaming ?? false,
						isAwaitingUser: () => false,
					});
					return () => h(Child, { ref: 'child' });
				},
			});
			routeParams.value = { threadId: 't-ref' };
			const view = render(Parent);
			routeParams.value = { threadId: 'other' };
			view.unmount();

			expect(track).toHaveBeenCalledWith(
				INSTANCE_AI.USER_LEFT_AI_ASSISTANT_THREAD_WITH_ACTIVE_RUN,
				{
					thread_id: 't-ref',
					is_awaiting_user: false,
				},
			);
		});

		it('does not track leaving when the Assistant is idle', () => {
			const view = mountHarness('t-idle', { value: false });
			routeParams.value = { threadId: 'other' };
			view.unmount();

			expect(track).not.toHaveBeenCalled();
		});

		it('does not track an unmount while the route still points at the thread', () => {
			const view = mountHarness('t-dup', { value: true });
			view.unmount();

			expect(track).not.toHaveBeenCalled();
		});

		it('tracks the return with the time away', () => {
			const first = mountHarness('t-return', { value: true });
			routeParams.value = { threadId: 'other' };
			first.unmount();
			track.mockClear();

			vi.advanceTimersByTime(5000);
			mountHarness('t-return', { value: false });

			expect(track).toHaveBeenCalledWith(INSTANCE_AI.USER_RETURNED_TO_AI_ASSISTANT_THREAD, {
				thread_id: 't-return',
				is_awaiting_user: false,
				time_away_ms: 5000,
			});
		});

		it('reports that the run waited for the user when the user left, on leave and on return', () => {
			const awaiting = { value: true };
			const first = mountHarness('t-await', { value: true }, awaiting);
			routeParams.value = { threadId: 'other' };
			first.unmount();

			expect(track).toHaveBeenCalledWith(
				INSTANCE_AI.USER_LEFT_AI_ASSISTANT_THREAD_WITH_ACTIVE_RUN,
				{
					thread_id: 't-await',
					is_awaiting_user: true,
				},
			);

			// The user answers while away, so the new view reports idle. The return keeps the leave-time value.
			mountHarness('t-await', { value: false }, { value: false });

			expect(track).toHaveBeenCalledWith(
				INSTANCE_AI.USER_RETURNED_TO_AI_ASSISTANT_THREAD,
				expect.objectContaining({ thread_id: 't-await', is_awaiting_user: true }),
			);
		});

		it('tracks the return only once', () => {
			const first = mountHarness('t-once', { value: true });
			routeParams.value = { threadId: 'other' };
			first.unmount();
			mountHarness('t-once', { value: false }).unmount();
			track.mockClear();
			mountHarness('t-once', { value: false });

			expect(track).not.toHaveBeenCalled();
		});
	});

	describe('leaving the browser tab', () => {
		it('tracks hiding the tab while the Assistant is running', () => {
			mountHarness('t-tab', { value: true });
			setTabHidden(true);

			expect(trackOnPageHide).toHaveBeenCalledWith(
				{ baseUrl: '/rest' },
				INSTANCE_AI.USER_LEFT_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN,
				{ thread_id: 't-tab', is_awaiting_user: false },
			);
			// The backend emits this event, so the SDK must not send it a second time.
			expect(track).not.toHaveBeenCalled();
		});

		it('reports that the run waited for the user when the tab became hidden, on leave and on return', () => {
			const awaiting = { value: true };
			mountHarness('t-tab-await', { value: true }, awaiting);
			setTabHidden(true);

			expect(trackOnPageHide).toHaveBeenCalledWith(
				{ baseUrl: '/rest' },
				INSTANCE_AI.USER_LEFT_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN,
				{ thread_id: 't-tab-await', is_awaiting_user: true },
			);

			// The user answers on another device while away. The return keeps the leave-time value.
			awaiting.value = false;
			setTabHidden(false);

			expect(track).toHaveBeenLastCalledWith(
				INSTANCE_AI.USER_RETURNED_TO_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN,
				expect.objectContaining({ thread_id: 't-tab-await', is_awaiting_user: true }),
			);
		});

		it('does not track hiding the tab when the Assistant is idle', () => {
			mountHarness('t-tab-idle', { value: false });
			setTabHidden(true);

			expect(trackOnPageHide).not.toHaveBeenCalled();
			expect(track).not.toHaveBeenCalled();
		});

		it('tracks showing the tab again with the time away, even if the run finished', () => {
			const running = ref(true);
			mountHarness('t-tab-back', running);
			setTabHidden(true);
			vi.advanceTimersByTime(3000);
			running.value = false;
			setTabHidden(false);

			expect(track).toHaveBeenLastCalledWith(
				INSTANCE_AI.USER_RETURNED_TO_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN,
				{ thread_id: 't-tab-back', is_awaiting_user: false, time_away_ms: 3000 },
			);
		});

		it('does not track a return when the tab was hidden while idle', () => {
			mountHarness('t-tab-none', { value: false });
			setTabHidden(true);
			setTabHidden(false);

			expect(trackOnPageHide).not.toHaveBeenCalled();
			expect(track).not.toHaveBeenCalled();
		});

		it('stops listening after unmount', () => {
			const view = mountHarness('t-tab-gone', { value: true });
			routeParams.value = { threadId: 'other' };
			view.unmount();
			track.mockClear();
			setTabHidden(true);

			expect(trackOnPageHide).not.toHaveBeenCalled();
		});
	});
});
