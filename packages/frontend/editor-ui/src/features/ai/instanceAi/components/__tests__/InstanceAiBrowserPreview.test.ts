import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';

import type { CloudBrowserLiveView } from '../../composables/useCloudBrowserLiveViews';
import {
	CloudBrowserLiveViewRefreshKey,
	CloudBrowserLiveViewsKey,
} from '../../composables/useCloudBrowserLiveViews';
import { postCloudBrowserReturnControl, postCloudBrowserTakeOver } from '../../instanceAi.api';
import InstanceAiBrowserPreview from '../InstanceAiBrowserPreview.vue';

const { showError, showMessage } = vi.hoisted(() => ({
	showError: vi.fn(),
	showMessage: vi.fn(),
}));
vi.mock('../../instanceAi.api', () => ({
	postCloudBrowserTakeOver: vi.fn(),
	postCloudBrowserReturnControl: vi.fn(),
}));
vi.mock('../../instanceAi.store', () => ({ useThread: () => ({ id: 'thread-1' }) }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));

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
		showError.mockReset();
		showMessage.mockReset();
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

		it('asks to save the login after a sign-in the agent asked for', async () => {
			const { getByTestId } = await takeOverAndFinish(liveWithLogin, loginRequest);

			const dialog = getByTestId('instance-ai-browser-preview-save-login-dialog');
			expect(dialog).toHaveTextContent('Save your login?');
			expect(dialog).toHaveTextContent('n8n Assistant can reuse your login for shop.example.com.');
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
