import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { render } from '@testing-library/vue';
import { defineComponent, h, ref } from 'vue';

import { postLeftN8nWhileRunning } from '../instanceAi.api';
import { useAssistantAwayTelemetry } from './useAssistantAwayTelemetry';

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

vi.mock('../instanceAi.api', () => ({ postLeftN8nWhileRunning: vi.fn() }));
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

function mountHarness(threadId: string, isRunning: { value: boolean }) {
	routeParams.value = { threadId };
	return render(
		defineComponent({
			setup() {
				useAssistantAwayTelemetry({ threadId: () => threadId, isRunning: () => isRunning.value });
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
		vi.mocked(postLeftN8nWhileRunning).mockClear();
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

			expect(track).toHaveBeenCalledWith(INSTANCE_AI.USER_LEFT_AI_ASSISTANT_THREAD_WHILE_RUNNING, {
				thread_id: 't-leave',
			});
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
				time_away_ms: 5000,
			});
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

			expect(postLeftN8nWhileRunning).toHaveBeenCalledWith({ baseUrl: '/rest' }, 't-tab');
			// The backend emits this event, so the SDK must not send it a second time.
			expect(track).not.toHaveBeenCalled();
		});

		it('does not track hiding the tab when the Assistant is idle', () => {
			mountHarness('t-tab-idle', { value: false });
			setTabHidden(true);

			expect(postLeftN8nWhileRunning).not.toHaveBeenCalled();
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
				INSTANCE_AI.USER_RETURNED_TO_N8N_WHILE_AI_ASSISTANT_RUNNING,
				{ thread_id: 't-tab-back', time_away_ms: 3000 },
			);
		});

		it('does not track a return when the tab was hidden while idle', () => {
			mountHarness('t-tab-none', { value: false });
			setTabHidden(true);
			setTabHidden(false);

			expect(postLeftN8nWhileRunning).not.toHaveBeenCalled();
			expect(track).not.toHaveBeenCalled();
		});

		it('stops listening after unmount', () => {
			const view = mountHarness('t-tab-gone', { value: true });
			routeParams.value = { threadId: 'other' };
			view.unmount();
			track.mockClear();
			setTabHidden(true);

			expect(postLeftN8nWhileRunning).not.toHaveBeenCalled();
		});
	});
});
