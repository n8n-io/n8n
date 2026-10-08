import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import { provideThread, useInstanceAiStore } from '../../instanceAi.store';
import { fetchThread } from '../../instanceAi.memory.api';
import ShareThreadButton from '../ShareThreadButton.vue';
import SharedThreadChip from '../SharedThreadChip.vue';
import { shareThread } from '../threadSharing.api';
import {
	OWNER,
	PROJECT_ID,
	READ_SCOPES,
	TEAMMATE,
	THREAD_ID,
	setUpSharing,
} from './sharingFixtures';

const { confirm, showMessage, showError } = vi.hoisted(() => ({
	confirm: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/design-system')>()),
	useMessage: () => ({ confirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('../threadSharing.api', () => ({ shareThread: vi.fn() }));

vi.mock('../../instanceAi.memory.api', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../instanceAi.memory.api')>()),
	fetchThread: vi.fn(),
}));

const threadInfo = {
	id: THREAD_ID,
	title: 'Weekly digest',
	resourceId: OWNER.id,
	projectId: PROJECT_ID,
	createdAt: '2026-10-01T09:30:00.000Z',
	updatedAt: '2026-10-01T09:31:00.000Z',
};
const sharedThreadInfo = {
	...threadInfo,
	sharedWith: { projectId: PROJECT_ID, projectName: 'Marketing' },
	owner: OWNER,
};

/**
 * The chat header: the chip next to the title and the Share button in the actions. Like the
 * thread view, it gives the focus to the chip after a share.
 */
const Header = defineComponent({
	setup() {
		const runtime = provideThread(THREAD_ID);
		runtime.setProjectId(PROJECT_ID);
		const chip = ref<InstanceType<typeof SharedThreadChip> | null>(null);
		return () =>
			h('div', [
				h(SharedThreadChip, { ref: chip }),
				h(ShareThreadButton, { onShared: () => chip.value?.focus() }),
			]);
	},
});

const resizeCallbacks: ResizeObserverCallback[] = [];

class ResizeObserverStub {
	constructor(onResize: ResizeObserverCallback) {
		resizeCallbacks.push(onResize);
	}

	observe = vi.fn();

	unobserve = vi.fn();

	disconnect = vi.fn();
}

/** jsdom has no layout, so a cut-off text is simulated through the two widths. */
function setLabelWidths(label: HTMLElement, scrollWidth: number, clientWidth: number) {
	Object.defineProperty(label, 'scrollWidth', { value: scrollWidth, configurable: true });
	Object.defineProperty(label, 'clientWidth', { value: clientWidth, configurable: true });
	for (const notify of [...resizeCallbacks]) notify([], {} as ResizeObserver);
}

const renderHeader = createComponentRenderer(Header);

/**
 * A share that fails. While the request runs, the button is disabled, and a browser then moves
 * the focus to the page body. jsdom does not, so the request does it.
 */
function failShare(error: Error, { focusDuringShare }: { focusDuringShare?: HTMLElement } = {}) {
	vi.mocked(shareThread).mockImplementation(async () => {
		if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
		focusDuringShare?.focus();
		throw error;
	});
}

describe('ShareThreadButton and SharedThreadChip', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		confirm.mockResolvedValue(MODAL_CONFIRM);
		vi.mocked(shareThread).mockResolvedValue(sharedThreadInfo);
		vi.mocked(fetchThread).mockResolvedValue({ thread: threadInfo });
	});

	afterEach(() => {
		useInstanceAiStore().disposeRuntime(THREAD_ID);
		vi.clearAllMocks();
	});

	it('offers the owner of a team-project chat to share it, with the project in its label', () => {
		setUpSharing();
		const { getByRole, queryByTestId } = renderHeader();

		expect(getByRole('button', { name: 'Share this chat with Marketing' })).toHaveTextContent(
			'Share',
		);
		expect(queryByTestId('instance-ai-shared-thread-chip')).not.toBeInTheDocument();
	});

	it('shares after the confirm, then shows the chip instead of the button', async () => {
		setUpSharing();
		const { getByTestId, findByTestId, queryByTestId } = renderHeader();

		await fireEvent.click(getByTestId('instance-ai-share-thread'));

		expect(confirm).toHaveBeenCalledWith(
			expect.stringContaining('the results of tools that used your own connections'),
			expect.objectContaining({
				title: 'Share this chat with Marketing?',
				confirmButtonText: 'Share chat',
			}),
		);
		expect(shareThread).toHaveBeenCalledWith(expect.anything(), THREAD_ID);
		expect(await findByTestId('instance-ai-shared-thread-chip')).toHaveTextContent(
			'Shared with Marketing',
		);
		expect(queryByTestId('instance-ai-share-thread')).not.toBeInTheDocument();
		expect(showMessage).toHaveBeenCalledWith({ type: 'success', title: 'Shared with Marketing' });
		expect(useInstanceAiStore().threads[0]).toMatchObject({
			sharedWith: sharedThreadInfo.sharedWith,
			owner: OWNER,
		});
	});

	it('gives the focus to the chip after the share, as the button goes away', async () => {
		setUpSharing();
		const { getByTestId, findByTestId } = renderHeader();
		getByTestId('instance-ai-share-thread').focus();

		await fireEvent.click(getByTestId('instance-ai-share-thread'));

		const chip = await findByTestId('instance-ai-shared-thread-chip');
		await waitFor(() => expect(chip).toHaveFocus());
		// Focus from code only: the chip is not a tab stop.
		expect(chip).toHaveAttribute('tabindex', '-1');
	});

	it('gives the focus back to the button when the share fails', async () => {
		setUpSharing();
		failShare(new Error('No connection'));
		const { getByTestId } = renderHeader();
		const button = getByTestId('instance-ai-share-thread');
		button.focus();

		await fireEvent.click(button);
		await waitFor(() => expect(showError).toHaveBeenCalled());
		await flushPromises();

		expect(button).toBeEnabled();
		expect(button).toHaveFocus();
	});

	it('leaves the focus on a control that the user chose while the share ran', async () => {
		setUpSharing();
		const search = document.createElement('input');
		document.body.appendChild(search);
		failShare(new Error('No connection'), { focusDuringShare: search });
		const { getByTestId } = renderHeader();
		getByTestId('instance-ai-share-thread').focus();

		await fireEvent.click(getByTestId('instance-ai-share-thread'));
		await waitFor(() => expect(showError).toHaveBeenCalled());
		await flushPromises();

		expect(search).toHaveFocus();
		search.remove();
	});

	it('does not share when the owner cancels', async () => {
		setUpSharing();
		confirm.mockResolvedValue(MODAL_CANCEL);
		const { getByTestId } = renderHeader();

		await fireEvent.click(getByTestId('instance-ai-share-thread'));
		await flushPromises();

		expect(shareThread).not.toHaveBeenCalled();
		expect(getByTestId('instance-ai-share-thread')).toBeInTheDocument();
	});

	it('shows the reason of a refused share and reads the chat again', async () => {
		setUpSharing();
		const refused = new Error('This chat changed while it was shared. Try again.');
		failShare(refused);
		vi.mocked(fetchThread).mockResolvedValue({ thread: sharedThreadInfo });
		const { getByTestId, findByTestId } = renderHeader();
		getByTestId('instance-ai-share-thread').focus();

		await fireEvent.click(getByTestId('instance-ai-share-thread'));

		await waitFor(() => expect(showError).toHaveBeenCalledWith(refused, "Couldn't share the chat"));
		// Another tab shared the chat meanwhile: the header shows the state of the server.
		expect(fetchThread).toHaveBeenCalledWith(expect.anything(), THREAD_ID);
		const chip = await findByTestId('instance-ai-shared-thread-chip');
		// The button went away, so the chip takes the focus.
		await waitFor(() => expect(chip).toHaveFocus());
	});

	it.each([
		['a personal project', { projectType: 'personal' as const }],
		['an instance without the team-project licence', { teamProjectsEnabled: false }],
		['an owner who cannot read the project', { scopes: ['instanceAi:message' as const] }],
		['a project that the owner is not a member of', { notMember: true }],
	])('offers no share in %s', (_, setup) => {
		setUpSharing(setup);
		const { queryByTestId } = renderHeader();

		expect(queryByTestId('instance-ai-share-thread')).not.toBeInTheDocument();
	});

	it('shows the chip and no button to the owner of a shared chat', () => {
		setUpSharing({ shared: true });
		const { getByTestId, queryByTestId } = renderHeader();

		expect(getByTestId('instance-ai-shared-thread-chip')).toHaveTextContent(
			'Shared with Marketing',
		);
		expect(queryByTestId('instance-ai-share-thread')).not.toBeInTheDocument();
	});

	it('shows a teammate the chip and no button', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id, scopes: READ_SCOPES });
		const { getByTestId, queryByTestId } = renderHeader();

		expect(getByTestId('instance-ai-shared-thread-chip')).toHaveTextContent(
			'Shared with Marketing',
		);
		expect(queryByTestId('instance-ai-share-thread')).not.toBeInTheDocument();
	});

	describe('with a long project name', () => {
		const projectName = 'Customer Success Operations EMEA';

		beforeEach(() => {
			resizeCallbacks.length = 0;
			vi.stubGlobal('ResizeObserver', ResizeObserverStub);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('gives the full text in a tooltip when the header cuts the chip', async () => {
			setUpSharing({ shared: true, projectName });
			const { getByTestId, getByText } = renderHeader();
			setLabelWidths(getByText(`Shared with ${projectName}`), 320, 120);
			await flushPromises();

			// Keyboard focus opens a Reka tooltip at once.
			await fireEvent.focus(getByTestId('instance-ai-shared-thread-chip'));

			await waitFor(() =>
				expect(screen.getByTestId('tooltip-content')).toHaveTextContent(
					`Shared with ${projectName}`,
				),
			);
		});

		it('adds no tooltip again once the whole text fits', async () => {
			setUpSharing({ shared: true, projectName });
			const { getByTestId, getByText } = renderHeader();
			const label = getByText(`Shared with ${projectName}`);
			setLabelWidths(label, 320, 120);
			setLabelWidths(label, 320, 320);
			await flushPromises();

			await fireEvent.focus(getByTestId('instance-ai-shared-thread-chip'));
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
		});
	});

	it('names the project "this project" when the server sent no name', () => {
		setUpSharing({ shared: true, projectName: '' });
		const { getByTestId } = renderHeader();

		expect(getByTestId('instance-ai-shared-thread-chip')).toHaveTextContent(
			'Shared with this project',
		);
	});
});
