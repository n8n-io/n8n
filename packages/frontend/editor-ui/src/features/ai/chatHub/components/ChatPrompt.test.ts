import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAgent } from '../__test__/data';
import ChatPrompt from './ChatPrompt.vue';

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({
		currentUserId: 'user-123',
		currentUser: { id: 'user-123', firstName: 'Test', fullName: 'Test User' },
	}),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: {},
		moduleSettings: {},
		isChatFeatureEnabled: true,
		isModuleActive: vi.fn().mockReturnValue(false),
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProjectId: 'project-123',
		personalProject: { id: 'project-123', type: 'personal' },
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		allCredentials: [],
		allCredentialTypes: [],
		fetchCredentialTypes: vi.fn(),
		fetchAllCredentials: vi.fn(),
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		loadNodeTypesIfNotLoaded: vi.fn().mockResolvedValue(undefined),
		nodeTypes: [],
	}),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		pushDisconnect: vi.fn(),
		addEventListener: vi.fn(() => vi.fn()),
		isConnected: { value: true },
	}),
}));

vi.mock('../chat.api');

const renderComponent = createComponentRenderer(ChatPrompt);

const defaultProps = {
	messagingState: 'idle' as const,
	isNewSession: true,
	isToolsSelectable: false,
	selectedModel: createMockAgent(),
	checkedToolIds: [],
	showCreditsClaimedCallout: false,
	showDynamicCredentialsMissingCallout: false,
	aiCreditsQuota: '0',
};

describe('ChatPrompt', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	describe('full mode', () => {
		it('renders textarea with placeholder from selected model', () => {
			const { getByPlaceholderText } = renderComponent({
				pinia,
				props: defaultProps,
			});
			expect(getByPlaceholderText(/Test Agent/)).toBeInTheDocument();
		});

		it('renders custom placeholder when provided', () => {
			const { getByPlaceholderText } = renderComponent({
				pinia,
				props: { ...defaultProps, placeholder: 'Custom placeholder' },
			});
			expect(getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
		});

		it('renders "select a model" placeholder when no model is selected', () => {
			const { getByPlaceholderText } = renderComponent({
				pinia,
				props: { ...defaultProps, selectedModel: null },
			});
			expect(getByPlaceholderText(/Select a model/i)).toBeInTheDocument();
		});

		it('renders tools selector', () => {
			const { getByText } = renderComponent({
				pinia,
				props: defaultProps,
			});
			expect(getByText(/Tools/)).toBeInTheDocument();
		});

		it('emits submit with message text on Enter', async () => {
			const user = userEvent.setup();
			const { getByRole, emitted } = renderComponent({
				pinia,
				props: defaultProps,
			});

			const textarea = getByRole('textbox');
			await user.type(textarea, 'Hello AI');
			await user.keyboard('{Enter}');

			expect(emitted().submit).toBeDefined();
			expect(emitted().submit[0]).toEqual(['Hello AI', []]);
		});

		it('does not emit submit on Shift+Enter', async () => {
			const user = userEvent.setup();
			const { getByRole, emitted } = renderComponent({
				pinia,
				props: defaultProps,
			});

			const textarea = getByRole('textbox');
			await user.type(textarea, 'Hello AI');
			await user.keyboard('{Shift>}{Enter}{/Shift}');

			expect(emitted().submit).toBeUndefined();
		});

		it('does not emit submit when message is empty', async () => {
			const user = userEvent.setup();
			const { getByRole, emitted } = renderComponent({
				pinia,
				props: defaultProps,
			});

			const textarea = getByRole('textbox');
			await user.click(textarea);
			await user.keyboard('{Enter}');

			expect(emitted().submit).toBeUndefined();
		});

		it('disables textarea when not idle', () => {
			const { getByRole } = renderComponent({
				pinia,
				props: { ...defaultProps, messagingState: 'receiving' as const },
			});

			expect(getByRole('textbox')).toBeDisabled();
		});

		it('shows stop button when receiving', () => {
			const { getByTitle } = renderComponent({
				pinia,
				props: { ...defaultProps, messagingState: 'receiving' as const },
			});

			expect(getByTitle(/stop generating/i)).toBeInTheDocument();
		});

		it('emits stop when stop button is clicked', async () => {
			const user = userEvent.setup();
			const { getByTitle, emitted } = renderComponent({
				pinia,
				props: { ...defaultProps, messagingState: 'receiving' as const },
			});

			await user.click(getByTitle(/stop generating/i));
			expect(emitted().stop).toBeDefined();
		});

		it('shows missing agent callout when messagingState is missingAgent', () => {
			const { getByText } = renderComponent({
				pinia,
				props: { ...defaultProps, messagingState: 'missingAgent' as const },
			});

			expect(getByText(/select a model/i)).toBeInTheDocument();
		});

		it('shows missing credentials callout when messagingState is missingCredentials', () => {
			const { getByText } = renderComponent({
				pinia,
				props: {
					...defaultProps,
					messagingState: 'missingCredentials' as const,
				},
			});

			expect(getByText(/credentials/i)).toBeInTheDocument();
		});

		it('shows dynamic credentials callout', () => {
			const { getByText } = renderComponent({
				pinia,
				props: { ...defaultProps, showDynamicCredentialsMissingCallout: true },
			});

			expect(getByText(/Connect/)).toBeInTheDocument();
		});
	});

	describe('compact mode', () => {
		const compactProps = { ...defaultProps, compact: true };

		it('renders textarea', () => {
			const { getByRole } = renderComponent({
				pinia,
				props: compactProps,
			});

			expect(getByRole('textbox')).toBeInTheDocument();
		});

		it('does not render tools selector', () => {
			const { queryByText } = renderComponent({
				pinia,
				props: compactProps,
			});

			expect(queryByText(/Tools/)).not.toBeInTheDocument();
		});

		it('emits submit with message text on Enter', async () => {
			const user = userEvent.setup();
			const { getByRole, emitted } = renderComponent({
				pinia,
				props: compactProps,
			});

			const textarea = getByRole('textbox');
			await user.type(textarea, 'Compact message');
			await user.keyboard('{Enter}');

			expect(emitted().submit[0]).toEqual(['Compact message', []]);
		});

		it('shows missing agent callout in compact mode', () => {
			const { getByText } = renderComponent({
				pinia,
				props: { ...compactProps, messagingState: 'missingAgent' as const },
			});

			expect(getByText(/select a model/i)).toBeInTheDocument();
		});
	});
});
