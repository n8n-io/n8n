import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';
import { CLOUD_BROWSER_LOGIN_TO_SAVE_TIMEOUT } from '@/app/constants/durations';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

import type { CloudBrowserLiveView } from '../../composables/useCloudBrowserLiveViews';
import {
	CloudBrowserLiveViewRefreshKey,
	CloudBrowserLiveViewsKey,
} from '../../composables/useCloudBrowserLiveViews';
import {
	fetchCloudBrowserLoginToSave,
	postCloudBrowserReturnControl,
	postCloudBrowserTakeOver,
} from '../../instanceAi.api';
import InstanceAiBrowserPreview from '../InstanceAiBrowserPreview.vue';

const { showError, showMessage } = vi.hoisted(() => ({
	showError: vi.fn(),
	showMessage: vi.fn(),
}));
vi.mock('../../instanceAi.api', () => ({
	fetchCloudBrowserLoginToSave: vi.fn(),
	postCloudBrowserTakeOver: vi.fn(),
	postCloudBrowserReturnControl: vi.fn(),
}));
vi.mock('../../instanceAi.store', () => ({ useThread: () => ({ id: 'thread-1' }) }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
const { instanceAiSettings, dismissedCallouts, dismissCallout } = vi.hoisted(() => ({
	instanceAiSettings: { cloudBrowserSavedLoginsEnabled: true, canManage: false },
	dismissedCallouts: new Set<string>(),
	dismissCallout: vi.fn(),
}));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		moduleSettings: {
			'instance-ai': {
				cloudBrowserSavedLoginsEnabled: instanceAiSettings.cloudBrowserSavedLoginsEnabled,
			},
		},
	}),
}));
vi.mock('@/features/ai/instanceAi/instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => ({ canManage: instanceAiSettings.canManage }),
}));
vi.mock('@/app/composables/useCalloutHelpers', () => ({
	useCalloutHelpers: () => ({
		isCalloutDismissed: (callout: string) => dismissedCallouts.has(callout),
		dismissCallout,
	}),
}));

const renderComponent = createComponentRenderer(InstanceAiBrowserPreview);

const live: CloudBrowserLiveView = {
	status: 'live',
	liveViewUrl: 'https://live.example.com/1',
	windowId: 'window-1',
};

// A popup in front of the first window, which stays loaded behind it.
const popup: CloudBrowserLiveView = {
	status: 'live',
	liveViewUrl: 'https://live.example.com/popup',
	windowId: 'window-2',
	background: { windowId: 'window-1', liveViewUrl: 'https://live.example.com/1' },
};
const userAction = { reason: 'Log in to the shop, please' };
const loginRequest = { reason: 'Sign in to the shop, please', isLoginRequest: true };
const liveWithLogin: CloudBrowserLiveView = {
	...live,
	loginProfile: { domain: 'shop.example.com' },
};

// Keeps the link target readable, since the default stub drops it.
const RouterLinkStub = defineComponent({
	props: { to: { type: [String, Object], required: true } },
	setup(props: { to: RouteLocationRaw }, { slots }) {
		return () => h('a', { 'data-to': JSON.stringify(props.to) }, slots.default?.());
	},
});

function render(
	view: CloudBrowserLiveView | undefined,
	props: { userAction?: { reason: string; isLoginRequest?: boolean } } = {},
) {
	const liveViews = reactive(new Map<string, CloudBrowserLiveView>());
	if (view) liveViews.set('task-1', view);
	const refreshLiveView = vi.fn();
	const rendered = renderComponent({
		props: { taskId: 'task-1', ...props },
		global: {
			stubs: { RouterLink: RouterLinkStub },
			provide: {
				[CloudBrowserLiveViewsKey as symbol]: liveViews,
				[CloudBrowserLiveViewRefreshKey as symbol]: refreshLiveView,
			},
		},
	});
	return { ...rendered, liveViews, refreshLiveView };
}

describe('InstanceAiBrowserPreview', () => {
	beforeEach(() => {
		vi.mocked(postCloudBrowserTakeOver).mockReset().mockResolvedValue(undefined);
		vi.mocked(postCloudBrowserReturnControl)
			.mockReset()
			.mockResolvedValue({ ok: true, loginWillBeSaved: false });
		vi.mocked(fetchCloudBrowserLoginToSave)
			.mockReset()
			.mockResolvedValue({ domain: 'shop.example.com' });
		showError.mockReset();
		showMessage.mockReset();
		instanceAiSettings.cloudBrowserSavedLoginsEnabled = true;
		instanceAiSettings.canManage = false;
		dismissedCallouts.clear();
		dismissCallout.mockReset();
	});

	describe('placeholder', () => {
		it.each([
			['before the live view loads', undefined],
			['while the browser starts', { status: 'starting' as const }],
		])('says the browser is opening %s, with a spinner', (_, view) => {
			const { getByTestId, queryByTestId } = render(view);

			expect(getByTestId('instance-ai-browser-preview-placeholder')).toHaveTextContent(
				'Opening the browser…',
			);
			expect(getByTestId('instance-ai-browser-preview-spinner')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-browser-preview-frame')).not.toBeInTheDocument();
		});

		it.each([
			['disconnected', { status: 'disconnected' as const, reason: 'idleTimeout' }],
			['not found', { status: 'not-found' as const }],
		])('says the browser closed when it is %s, without a spinner', (_, view) => {
			const { getByTestId, queryByTestId } = render(view as CloudBrowserLiveView);

			expect(getByTestId('instance-ai-browser-preview-placeholder')).toHaveTextContent(
				'The browser closed',
			);
			expect(queryByTestId('instance-ai-browser-preview-spinner')).not.toBeInTheDocument();
		});

		it('shows again when a new session reuses the window id', async () => {
			const { getByTestId, queryByTestId, liveViews } = render(live);
			await fireEvent.load(getByTestId('instance-ai-browser-preview-frame'));
			expect(queryByTestId('instance-ai-browser-preview-placeholder')).not.toBeInTheDocument();

			liveViews.set('task-1', { ...live, liveViewUrl: 'https://live.example.com/2' });
			await flushPromises();

			expect(getByTestId('instance-ai-browser-preview-placeholder')).toHaveTextContent(
				'Opening the browser…',
			);
			await fireEvent.load(getByTestId('instance-ai-browser-preview-frame'));
			expect(queryByTestId('instance-ai-browser-preview-placeholder')).not.toBeInTheDocument();
		});

		it('stays over the frame until the frame has loaded', async () => {
			const { getByTestId, queryByTestId } = render(live);
			const frame = getByTestId('instance-ai-browser-preview-frame');
			expect(getByTestId('instance-ai-browser-preview-placeholder')).toHaveTextContent(
				'Opening the browser…',
			);

			await fireEvent.load(frame);

			expect(queryByTestId('instance-ai-browser-preview-placeholder')).not.toBeInTheDocument();
		});
	});

	describe('live view', () => {
		it("keeps Browserbase's navigation bar and starts view-only", () => {
			const { getByTestId, queryByTestId } = render({
				...live,
				liveViewUrl: 'https://live.example.com/1?navbar=false',
				windowId: 'window-1',
			});

			const frame = getByTestId('instance-ai-browser-preview-frame');
			expect(frame).toHaveAttribute('src', 'https://live.example.com/1');
			expect(frame).toHaveAttribute('data-cloud-browser-task-id', 'task-1');
			expect(frame).toHaveAttribute('data-cloud-browser-window-id', 'window-1');
			expect(frame).toHaveAttribute('tabindex', '-1');
			expect(frame).toHaveClass('viewOnly');
			expect(queryByTestId('instance-ai-browser-preview-banner')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-browser-preview-overlay')).not.toHaveClass('overlayVisible');
		});

		it('shows the banner and the overlay when the agent asks for the user', () => {
			const { getByTestId, queryByTestId } = render(live, { userAction });

			const banner = getByTestId('instance-ai-browser-preview-banner');
			expect(banner).toHaveTextContent('The browser needs your input');
			expect(banner).toHaveTextContent('Log in to the shop, please');
			expect(getByTestId('instance-ai-browser-preview-overlay')).toHaveClass('overlayVisible');
			expect(queryByTestId('instance-ai-browser-preview-done')).not.toBeInTheDocument();
		});
	});

	describe('windows', () => {
		it('keeps the window behind loaded but hidden and view-only', () => {
			const { getByTestId } = render(popup);

			const current = getByTestId('instance-ai-browser-preview-frame');
			expect(current).toHaveAttribute('src', 'https://live.example.com/popup');
			expect(current).toHaveAttribute('data-cloud-browser-window-id', 'window-2');
			expect(current).not.toHaveAttribute('aria-hidden');

			const background = getByTestId('instance-ai-browser-preview-background-frame');
			expect(background).toHaveAttribute('src', 'https://live.example.com/1');
			expect(background).toHaveAttribute('data-cloud-browser-task-id', 'task-1');
			expect(background).toHaveAttribute('data-cloud-browser-window-id', 'window-1');
			expect(background).toHaveAttribute('aria-hidden', 'true');
			expect(background).toHaveAttribute('tabindex', '-1');
			expect(background).not.toHaveAttribute('title');
			expect(background).toHaveClass('backgroundFrame');
			expect(background).toHaveClass('viewOnly');
		});

		it('keeps the window behind view-only while the user has control', () => {
			const { getByTestId } = render({ ...popup, userHasTakenOver: true });

			expect(getByTestId('instance-ai-browser-preview-frame')).not.toHaveClass('viewOnly');
			expect(getByTestId('instance-ai-browser-preview-background-frame')).toHaveClass('viewOnly');
		});

		it('shows the same frame again when the window behind is current again', async () => {
			const { getByTestId, queryByTestId, liveViews } = render(popup);
			const background = getByTestId('instance-ai-browser-preview-background-frame');
			await fireEvent.load(background);

			liveViews.set('task-1', live);
			await flushPromises();

			// The frame is kept, so the window does not reload.
			expect(getByTestId('instance-ai-browser-preview-frame')).toBe(background);
			expect(background).not.toHaveClass('backgroundFrame');
			expect(queryByTestId('instance-ai-browser-preview-background-frame')).not.toBeInTheDocument();
			expect(queryByTestId('instance-ai-browser-preview-placeholder')).not.toBeInTheDocument();
		});
	});

	describe('take over', () => {
		it('tells the server when the user takes over after the agent asked', async () => {
			const { getByTestId, queryByTestId } = render(live, { userAction });

			await fireEvent.click(getByTestId('instance-ai-browser-preview-take-over'));
			await flushPromises();

			expect(postCloudBrowserTakeOver).toHaveBeenCalledWith({}, 'thread-1', 'task-1');
			expect(getByTestId('instance-ai-browser-preview-banner')).toHaveTextContent(
				'You have control of the browser',
			);
			const frame = getByTestId('instance-ai-browser-preview-frame');
			expect(frame).not.toHaveClass('viewOnly');
			expect(frame).toHaveAttribute('tabindex', '0');
			expect(queryByTestId('instance-ai-browser-preview-overlay')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-browser-preview-done')).toBeInTheDocument();
		});

		it('tells the server when the user takes over without a request', async () => {
			const { getByTestId } = render(live);

			await fireEvent.click(getByTestId('instance-ai-browser-preview-take-over'));
			await flushPromises();

			expect(postCloudBrowserTakeOver).toHaveBeenCalledWith({}, 'thread-1', 'task-1');
			expect(getByTestId('instance-ai-browser-preview-banner')).toHaveTextContent(
				'You have control of the browser',
			);
			expect(getByTestId('instance-ai-browser-preview-frame')).not.toHaveClass('viewOnly');
		});

		it.each([
			['without a request', {}],
			['after the agent asked', { userAction }],
		])('fetches the live view again after the user takes over %s', async (_, props) => {
			const { getByTestId, refreshLiveView } = render(live, props);

			await fireEvent.click(getByTestId('instance-ai-browser-preview-take-over'));
			await flushPromises();

			expect(refreshLiveView).toHaveBeenCalledExactlyOnceWith('task-1');
		});

		it('shows an error and keeps the view-only state when the take over fails', async () => {
			const error = new Error('Request failed');
			vi.mocked(postCloudBrowserTakeOver).mockRejectedValue(error);
			const { getByTestId, queryByTestId, refreshLiveView } = render(live);

			await fireEvent.click(getByTestId('instance-ai-browser-preview-take-over'));
			await flushPromises();

			expect(refreshLiveView).not.toHaveBeenCalled();
			expect(showError).toHaveBeenCalledWith(error, 'Could not take over the browser');
			expect(queryByTestId('instance-ai-browser-preview-banner')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-browser-preview-frame')).toHaveClass('viewOnly');
		});
	});

	describe('return control', () => {
		it('returns control without a note dialog after the agent asked', async () => {
			const { getByTestId, queryByTestId, refreshLiveView } = render(live, { userAction });
			await fireEvent.click(getByTestId('instance-ai-browser-preview-take-over'));

			await fireEvent.click(getByTestId('instance-ai-browser-preview-done'));
			await flushPromises();

			// Once after the take over, once after control returns.
			expect(refreshLiveView).toHaveBeenCalledTimes(2);
			expect(queryByTestId('instance-ai-browser-preview-note-dialog')).not.toBeInTheDocument();
			expect(postCloudBrowserReturnControl).toHaveBeenCalledWith({}, 'thread-1', 'task-1', {
				note: undefined,
				shouldSaveLogin: false,
			});
			expect(getByTestId('instance-ai-browser-preview-frame')).toHaveClass('viewOnly');
		});

		async function takeOverWithoutRequest() {
			const rendered = render(live);
			await fireEvent.click(rendered.getByTestId('instance-ai-browser-preview-take-over'));
			await flushPromises();
			await fireEvent.click(rendered.getByTestId('instance-ai-browser-preview-done'));
			return rendered;
		}

		it('asks for a note after a take over the agent did not ask for', async () => {
			const { getByTestId, getByRole } = await takeOverWithoutRequest();

			expect(getByTestId('instance-ai-browser-preview-note-dialog')).toBeInTheDocument();
			expect(getByRole('dialog')).toHaveTextContent('Let n8n Assistant know what you changed');
			expect(getByTestId('instance-ai-browser-preview-note-submit')).toBeDisabled();
			expect(postCloudBrowserReturnControl).not.toHaveBeenCalled();
		});

		it('moves focus into the note dialog when it opens', async () => {
			const { getByRole } = await takeOverWithoutRequest();
			await flushPromises();

			expect(getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
		});

		it('closes the note dialog on Escape and keeps control with the user', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = await takeOverWithoutRequest();

			await user.keyboard('{Escape}');
			await flushPromises();

			expect(queryByTestId('instance-ai-browser-preview-note-dialog')).not.toBeInTheDocument();
			expect(postCloudBrowserReturnControl).not.toHaveBeenCalled();
			expect(getByTestId('instance-ai-browser-preview-done')).toBeInTheDocument();
		});

		it('keeps Tab inside the note dialog', async () => {
			const user = userEvent.setup();
			const { getByTestId } = await takeOverWithoutRequest();
			await flushPromises();
			const input = getByTestId('instance-ai-browser-preview-note-input');
			const textarea = input.querySelector('textarea') ?? input;
			getByTestId('instance-ai-browser-preview-note-skip').focus();

			// Send is disabled while the note is empty, so Skip is the last stop.
			await user.tab();

			expect(textarea).toHaveFocus();
		});

		it('returns control without a note when the user skips the note', async () => {
			const { getByTestId, queryByTestId } = await takeOverWithoutRequest();

			await fireEvent.click(getByTestId('instance-ai-browser-preview-note-skip'));
			await flushPromises();

			expect(postCloudBrowserReturnControl).toHaveBeenCalledWith({}, 'thread-1', 'task-1', {
				note: undefined,
				shouldSaveLogin: false,
			});
			expect(queryByTestId('instance-ai-browser-preview-note-dialog')).not.toBeInTheDocument();
			expect(queryByTestId('instance-ai-browser-preview-banner')).not.toBeInTheDocument();
		});

		it('returns control with the trimmed note when the user submits it', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = await takeOverWithoutRequest();

			const input = getByTestId('instance-ai-browser-preview-note-input');
			const textarea = input.querySelector('textarea') ?? input;
			await user.type(textarea, '  I accepted the cookies  ');
			await user.click(getByTestId('instance-ai-browser-preview-note-submit'));
			await flushPromises();

			expect(postCloudBrowserReturnControl).toHaveBeenCalledWith({}, 'thread-1', 'task-1', {
				note: 'I accepted the cookies',
				shouldSaveLogin: false,
			});
			expect(queryByTestId('instance-ai-browser-preview-note-dialog')).not.toBeInTheDocument();
		});

		it('shows an error and keeps control when returning control fails', async () => {
			const error = new Error('Request failed');
			vi.mocked(postCloudBrowserReturnControl).mockRejectedValue(error);
			const { getByTestId, refreshLiveView } = render(live, { userAction });
			await fireEvent.click(getByTestId('instance-ai-browser-preview-take-over'));
			await flushPromises();

			await fireEvent.click(getByTestId('instance-ai-browser-preview-done'));
			await flushPromises();

			// Only after the take over.
			expect(refreshLiveView).toHaveBeenCalledTimes(1);
			expect(showError).toHaveBeenCalledWith(error, 'Could not give control back to the assistant');
			expect(getByTestId('instance-ai-browser-preview-banner')).toHaveTextContent(
				'You have control of the browser',
			);
		});
	});

	describe('control state', () => {
		it('restores control after a reload when the user is in control', () => {
			const { getByTestId } = render({ ...live, userHasTakenOver: true });

			expect(getByTestId('instance-ai-browser-preview-banner')).toHaveTextContent(
				'You have control of the browser',
			);
			expect(getByTestId('instance-ai-browser-preview-frame')).not.toHaveClass('viewOnly');
		});

		it('restores control after a reload when the user took over after the agent asked', () => {
			const { getByTestId } = render({ ...live, userHasTakenOver: true }, { userAction });

			expect(getByTestId('instance-ai-browser-preview-banner')).toHaveTextContent(
				'You have control of the browser',
			);
			expect(getByTestId('instance-ai-browser-preview-frame')).not.toHaveClass('viewOnly');
		});

		it('keeps the view read-only while the agent asks and the user has not taken over', () => {
			const { getByTestId } = render(live, { userAction });

			expect(getByTestId('instance-ai-browser-preview-banner')).toHaveTextContent(
				'The browser needs your input',
			);
			expect(getByTestId('instance-ai-browser-preview-frame')).toHaveClass('viewOnly');
		});

		it('ends control when the live view says the user gave control back elsewhere', async () => {
			const { getByTestId, queryByTestId, liveViews } = render({ ...live, userHasTakenOver: true });
			expect(getByTestId('instance-ai-browser-preview-banner')).toHaveTextContent(
				'You have control of the browser',
			);

			liveViews.set('task-1', live);
			await flushPromises();

			expect(queryByTestId('instance-ai-browser-preview-banner')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-browser-preview-frame')).toHaveClass('viewOnly');
		});

		it('keeps control and the note being written while the live view loads', async () => {
			const user = userEvent.setup();
			const { getByTestId, liveViews } = render({ ...live, userHasTakenOver: true });
			await fireEvent.click(getByTestId('instance-ai-browser-preview-done'));
			const input = getByTestId('instance-ai-browser-preview-note-input');
			const textarea = input.querySelector('textarea') ?? input;
			await user.type(textarea, 'I signed in');

			liveViews.set('task-1', { status: 'loading' });
			await flushPromises();

			expect(getByTestId('instance-ai-browser-preview-note-dialog')).toBeInTheDocument();
			expect(textarea).toHaveValue('I signed in');
		});

		it('ends control when the live view says the user gave control back elsewhere', async () => {
			const { getByTestId, queryByTestId, liveViews } = render({ ...live, userHasTakenOver: true });
			expect(getByTestId('instance-ai-browser-preview-banner')).toHaveTextContent(
				'You have control of the browser',
			);

			liveViews.set('task-1', live);
			await flushPromises();

			expect(queryByTestId('instance-ai-browser-preview-banner')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-browser-preview-frame')).toHaveClass('viewOnly');
		});

		it('keeps control and the note being written while the live view loads', async () => {
			const user = userEvent.setup();
			const { getByTestId, liveViews } = render({ ...live, userHasTakenOver: true });
			await fireEvent.click(getByTestId('instance-ai-browser-preview-done'));
			const input = getByTestId('instance-ai-browser-preview-note-input');
			const textarea = input.querySelector('textarea') ?? input;
			await user.type(textarea, 'I signed in');

			liveViews.set('task-1', { status: 'loading' });
			await flushPromises();

			expect(getByTestId('instance-ai-browser-preview-note-dialog')).toBeInTheDocument();
			expect(textarea).toHaveValue('I signed in');
		});

		it('ends control when the browser disconnects', async () => {
			const { getByTestId, queryByTestId, liveViews } = render({ ...live, userHasTakenOver: true });

			liveViews.set('task-1', { status: 'disconnected', reason: 'idleTimeout' });
			await flushPromises();

			expect(queryByTestId('instance-ai-browser-preview-banner')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-browser-preview-placeholder')).toHaveTextContent(
				'The browser closed',
			);
		});

		it('ends control when the request of the agent ends', async () => {
			const { getByTestId, queryByTestId, rerender } = render(live, { userAction });
			await fireEvent.click(getByTestId('instance-ai-browser-preview-take-over'));

			await rerender({ taskId: 'task-1', userAction: undefined });

			expect(queryByTestId('instance-ai-browser-preview-banner')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-browser-preview-frame')).toHaveClass('viewOnly');
			expect(getByTestId('instance-ai-browser-preview-overlay')).toBeInTheDocument();
		});
	});
	describe('saved login', () => {
		const savedAt = '2026-10-01T08:00:00.000Z';

		it('says which saved login the session uses and links to the saved logins', () => {
			const { getByTestId } = render({
				...live,
				loginProfile: { domain: 'shop.example.com', savedAt },
			});

			const notice = getByTestId('instance-ai-browser-preview-saved-login');
			expect(notice).toHaveTextContent(
				`This session uses your saved login from ${convertToDisplayDate(savedAt).date}.`,
			);
			const link = notice.querySelector('a');
			expect(link).toHaveTextContent('Manage saved logins');
			expect(JSON.parse(link?.getAttribute('data-to') ?? '')).toEqual({
				name: VIEWS.PERSONAL_SETTINGS,
				query: { savedLogins: 'open' },
			});
		});

		it('says "today" for a login saved today', () => {
			const { getByTestId } = render({
				...live,
				loginProfile: { domain: 'shop.example.com', savedAt: new Date().toISOString() },
			});

			expect(getByTestId('instance-ai-browser-preview-saved-login')).toHaveTextContent(
				'This session uses your saved login from today.',
			);
		});

		it.each([
			['the session has no login profile', live],
			['the login profile is not saved', liveWithLogin],
		])('does not mention a saved login when %s', (_, view) => {
			const { queryByTestId } = render(view);

			expect(queryByTestId('instance-ai-browser-preview-saved-login')).not.toBeInTheDocument();
		});
	});

	describe('save login', () => {
		async function takeOverAndFinish(
			view: CloudBrowserLiveView,
			action: { reason: string; isLoginRequest?: boolean },
		) {
			const rendered = render(view, { userAction: action });
			await fireEvent.click(rendered.getByTestId('instance-ai-browser-preview-take-over'));
			await flushPromises();
			await fireEvent.click(rendered.getByTestId('instance-ai-browser-preview-done'));
			await flushPromises();
			return rendered;
		}

		describe('when saved logins are off', () => {
			const callout = 'instance-ai-browser-preview-saved-logins-off';

			beforeEach(() => {
				instanceAiSettings.cloudBrowserSavedLoginsEnabled = false;
				vi.mocked(fetchCloudBrowserLoginToSave).mockResolvedValue({});
			});

			it('gives control back and tells an admin where to turn them on', async () => {
				instanceAiSettings.canManage = true;

				const { getByTestId } = await takeOverAndFinish(live, loginRequest);

				expect(postCloudBrowserReturnControl).toHaveBeenCalledTimes(1);
				expect(getByTestId(callout)).toHaveTextContent(
					"n8n Assistant can save your logins, so you don't have to sign in next time.",
				);
				expect(getByTestId(`${callout}-settings`)).toHaveTextContent('Turn on saved logins');
			});

			it('tells a member to ask an admin', async () => {
				const { getByTestId, queryByTestId } = await takeOverAndFinish(live, loginRequest);

				expect(getByTestId(callout)).toHaveTextContent(
					'Ask an instance owner or admin to turn it on.',
				);
				expect(queryByTestId(`${callout}-settings`)).not.toBeInTheDocument();
			});

			it('dismisses it for good', async () => {
				const { getByTestId } = await takeOverAndFinish(live, loginRequest);

				await fireEvent.click(getByTestId(`${callout}-dismiss`));

				expect(dismissCallout).toHaveBeenCalledWith('instance-ai-saved-logins-off');
			});

			it('does not show it once the user dismissed it', async () => {
				dismissedCallouts.add('instance-ai-saved-logins-off');

				const { queryByTestId } = await takeOverAndFinish(live, loginRequest);

				expect(queryByTestId(callout)).not.toBeInTheDocument();
			});

			it('does not show it when the agent did not ask the user to sign in', async () => {
				const { queryByTestId } = await takeOverAndFinish(live, { reason: 'Solve the puzzle' });

				expect(queryByTestId(callout)).not.toBeInTheDocument();
			});

			it('does not show it when saved logins are on', async () => {
				instanceAiSettings.cloudBrowserSavedLoginsEnabled = true;

				const { queryByTestId } = await takeOverAndFinish(live, loginRequest);

				expect(queryByTestId(callout)).not.toBeInTheDocument();
			});
		});

		it('asks to save the login after a sign-in the agent asked for', async () => {
			const { getByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			const dialog = getByTestId('instance-ai-browser-preview-save-login-dialog');
			expect(dialog).toHaveTextContent('Save your login?');
			expect(dialog).toHaveTextContent('n8n Assistant can reuse your login for shop.example.com.');
			expect(fetchCloudBrowserLoginToSave).toHaveBeenCalledExactlyOnceWith(
				{},
				'thread-1',
				'task-1',
			);
			expect(postCloudBrowserReturnControl).not.toHaveBeenCalled();
		});

		it('names the site that the server says the user can save', async () => {
			vi.mocked(fetchCloudBrowserLoginToSave).mockResolvedValue({ domain: 'example.com' });

			const { getByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			expect(getByTestId('instance-ai-browser-preview-save-login-dialog')).toHaveTextContent(
				'n8n Assistant can reuse your login for example.com.',
			);
		});

		it('says which saved login the save replaces', async () => {
			vi.mocked(fetchCloudBrowserLoginToSave).mockResolvedValue({
				domain: 'example.com',
				replacesSavedLoginFrom: '2025-11-12T10:00:00.000Z',
			});

			const { getByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			expect(getByTestId('instance-ai-browser-preview-save-login-replaces')).toHaveTextContent(
				'This replaces your saved login for example.com from Nov 12, 2025.',
			);
		});

		it('says nothing about a replace when the user has no saved login for the site', async () => {
			const { queryByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			expect(
				queryByTestId('instance-ai-browser-preview-save-login-replaces'),
			).not.toBeInTheDocument();
		});

		it('returns control without asking when the server says the user cannot save a login', async () => {
			vi.mocked(fetchCloudBrowserLoginToSave).mockResolvedValue({});

			const { queryByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			expect(
				queryByTestId('instance-ai-browser-preview-save-login-dialog'),
			).not.toBeInTheDocument();
			expect(postCloudBrowserReturnControl).toHaveBeenCalledExactlyOnceWith(
				{},
				'thread-1',
				'task-1',
				{ note: undefined, shouldSaveLogin: false },
			);
		});

		it('returns control without asking when the server check fails', async () => {
			vi.mocked(fetchCloudBrowserLoginToSave).mockRejectedValue(new Error('Request failed'));

			const { queryByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			expect(
				queryByTestId('instance-ai-browser-preview-save-login-dialog'),
			).not.toBeInTheDocument();
			expect(postCloudBrowserReturnControl).toHaveBeenCalledExactlyOnceWith(
				{},
				'thread-1',
				'task-1',
				{ note: undefined, shouldSaveLogin: false },
			);
		});

		it('returns control without asking when the server is too slow', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			try {
				vi.mocked(fetchCloudBrowserLoginToSave).mockReturnValue(new Promise(() => {}));
				const { getByTestId, queryByTestId } = render(liveWithLogin, { userAction: loginRequest });
				await fireEvent.click(getByTestId('instance-ai-browser-preview-take-over'));
				await flushPromises();
				await fireEvent.click(getByTestId('instance-ai-browser-preview-done'));
				await flushPromises();
				expect(
					queryByTestId('instance-ai-browser-preview-save-login-dialog'),
				).not.toBeInTheDocument();

				await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LOGIN_TO_SAVE_TIMEOUT);
				await flushPromises();

				expect(
					queryByTestId('instance-ai-browser-preview-save-login-dialog'),
				).not.toBeInTheDocument();
				expect(postCloudBrowserReturnControl).toHaveBeenCalledExactlyOnceWith(
					{},
					'thread-1',
					'task-1',
					{ note: undefined, shouldSaveLogin: false },
				);
			} finally {
				vi.useRealTimers();
			}
		});

		it('does not ask to save the login when control ended while it asked the server', async () => {
			let answer: (value: { domain?: string }) => void = () => {};
			vi.mocked(fetchCloudBrowserLoginToSave).mockReturnValue(
				new Promise((resolve) => {
					answer = resolve;
				}),
			);
			const { getByTestId, queryByTestId, rerender } = render(liveWithLogin, {
				userAction: loginRequest,
			});
			await fireEvent.click(getByTestId('instance-ai-browser-preview-take-over'));
			await flushPromises();
			await fireEvent.click(getByTestId('instance-ai-browser-preview-done'));
			await flushPromises();

			await rerender({ taskId: 'task-1', userAction: undefined });
			answer({ domain: 'shop.example.com' });
			await flushPromises();

			expect(
				queryByTestId('instance-ai-browser-preview-save-login-dialog'),
			).not.toBeInTheDocument();
			expect(postCloudBrowserReturnControl).not.toHaveBeenCalled();
		});

		it.each([
			['the request is not a sign-in', liveWithLogin, userAction],
			['the session has no login profile', live, loginRequest],
			[
				'the login is already saved',
				{
					...live,
					loginProfile: { domain: 'shop.example.com', savedAt: '2026-10-01T08:00:00.000Z' },
				},
				loginRequest,
			],
			[
				'the login will already be saved',
				{ ...live, loginProfile: { domain: 'shop.example.com', willBeSavedOnSessionEnd: true } },
				loginRequest,
			],
		])('does not ask to save the login when %s', async (_, view, action) => {
			const { queryByTestId } = await takeOverAndFinish(view, action);

			expect(
				queryByTestId('instance-ai-browser-preview-save-login-dialog'),
			).not.toBeInTheDocument();
			expect(fetchCloudBrowserLoginToSave).not.toHaveBeenCalled();
			expect(postCloudBrowserReturnControl).toHaveBeenCalledWith({}, 'thread-1', 'task-1', {
				note: undefined,
				shouldSaveLogin: false,
			});
		});

		it('saves the login and says so when the user chooses to save', async () => {
			vi.mocked(postCloudBrowserReturnControl).mockResolvedValue({
				ok: true,
				loginWillBeSaved: true,
			});
			const { getByTestId, queryByTestId, refreshLiveView } = await takeOverAndFinish(
				liveWithLogin,
				loginRequest,
			);

			await fireEvent.click(getByTestId('instance-ai-browser-preview-save-login-submit'));
			await flushPromises();

			expect(postCloudBrowserReturnControl).toHaveBeenCalledExactlyOnceWith(
				{},
				'thread-1',
				'task-1',
				{ note: undefined, shouldSaveLogin: true },
			);
			expect(showMessage).toHaveBeenCalledExactlyOnceWith({
				type: 'success',
				title: 'Your login will be saved',
				message: 'It is saved when the task finishes using the browser.',
			});
			expect(refreshLiveView).toHaveBeenCalledTimes(2);
			expect(
				queryByTestId('instance-ai-browser-preview-save-login-dialog'),
			).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-browser-preview-frame')).toHaveClass('viewOnly');
		});

		it('warns with the site when the server did not save the login', async () => {
			vi.mocked(postCloudBrowserReturnControl).mockResolvedValue({
				ok: true,
				loginWillBeSaved: false,
			});
			const { getByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			await fireEvent.click(getByTestId('instance-ai-browser-preview-save-login-submit'));
			await flushPromises();

			expect(showMessage).toHaveBeenCalledExactlyOnceWith({
				type: 'warning',
				title: 'Your login was not saved',
				message: 'n8n Assistant could not confirm that you signed in to shop.example.com.',
			});
		});

		it('returns control without saving when the user skips', async () => {
			const { getByTestId, queryByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			await fireEvent.click(getByTestId('instance-ai-browser-preview-save-login-skip'));
			await flushPromises();

			expect(postCloudBrowserReturnControl).toHaveBeenCalledExactlyOnceWith(
				{},
				'thread-1',
				'task-1',
				{ note: undefined, shouldSaveLogin: false },
			);
			expect(showMessage).not.toHaveBeenCalled();
			expect(
				queryByTestId('instance-ai-browser-preview-save-login-dialog'),
			).not.toBeInTheDocument();
		});

		it('closes the dialog on Escape and keeps control with the user', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			await user.keyboard('{Escape}');
			await flushPromises();

			expect(
				queryByTestId('instance-ai-browser-preview-save-login-dialog'),
			).not.toBeInTheDocument();
			expect(postCloudBrowserReturnControl).not.toHaveBeenCalled();
			expect(getByTestId('instance-ai-browser-preview-done')).toBeInTheDocument();
		});

		it('shows an error, no save toast and keeps control when returning control fails', async () => {
			const error = new Error('Request failed');
			vi.mocked(postCloudBrowserReturnControl).mockRejectedValue(error);
			const { getByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			await fireEvent.click(getByTestId('instance-ai-browser-preview-save-login-submit'));
			await flushPromises();

			expect(showError).toHaveBeenCalledWith(error, 'Could not give control back to the assistant');
			expect(showMessage).not.toHaveBeenCalled();
			expect(getByTestId('instance-ai-browser-preview-save-login-dialog')).toBeInTheDocument();
		});

		it('closes the dialog when the request of the agent ends', async () => {
			const { queryByTestId, rerender } = await takeOverAndFinish(liveWithLogin, loginRequest);

			await rerender({ taskId: 'task-1', userAction: undefined });

			expect(
				queryByTestId('instance-ai-browser-preview-save-login-dialog'),
			).not.toBeInTheDocument();
		});
	});
});
