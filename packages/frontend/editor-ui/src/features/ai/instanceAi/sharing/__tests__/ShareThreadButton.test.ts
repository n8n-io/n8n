import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
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

/** The chat header: the chip next to the title and the Share button in the actions. */
const Header = defineComponent({
	setup() {
		const runtime = provideThread(THREAD_ID);
		runtime.setProjectId(PROJECT_ID);
		return () => h('div', [h(SharedThreadChip), h(ShareThreadButton)]);
	},
});

const renderHeader = createComponentRenderer(Header);

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
		vi.mocked(shareThread).mockRejectedValue(refused);
		vi.mocked(fetchThread).mockResolvedValue({ thread: sharedThreadInfo });
		const { getByTestId, findByTestId } = renderHeader();

		await fireEvent.click(getByTestId('instance-ai-share-thread'));

		await waitFor(() => expect(showError).toHaveBeenCalledWith(refused, "Couldn't share the chat"));
		// Another tab shared the chat meanwhile: the header shows the state of the server.
		expect(fetchThread).toHaveBeenCalledWith(expect.anything(), THREAD_ID);
		expect(await findByTestId('instance-ai-shared-thread-chip')).toBeInTheDocument();
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

	it('names the project "this project" when the server sent no name', () => {
		setUpSharing({ shared: true, projectName: '' });
		const { getByTestId } = renderHeader();

		expect(getByTestId('instance-ai-shared-thread-chip')).toHaveTextContent(
			'Shared with this project',
		);
	});
});
