import { shallowRef } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import type { Scope } from '@n8n/permissions';
import type { IWorkflowSettings } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import RunAsCallout from './RunAsCallout.vue';

vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: vi.fn(),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(),
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(),
}));

const mockDocumentStore: { settings: IWorkflowSettings; scopes: Scope[]; workflowId: string } = {
	settings: {},
	scopes: [],
	workflowId: 'workflow-1',
};

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return {
		...actual,
		useWorkflowDocumentStore: vi.fn(() => mockDocumentStore),
		injectWorkflowDocumentStore: () => shallowRef(mockDocumentStore),
	};
});

import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

const mockedUseEnvFeatureFlag = vi.mocked(useEnvFeatureFlag);
const mockedUseSettingsStore = vi.mocked(useSettingsStore);
const mockedUseUsersStore = vi.mocked(useUsersStore);
const mockedUseWorkflowsStore = vi.mocked(useWorkflowsStore);

const CURRENT_USER_ID = 'current-user-id';
const OTHER_USER_ID = 'other-user-id';

const updateWorkflowSetting = vi.fn();
const fetchUsers = vi.fn();

const renderComponent = createComponentRenderer(RunAsCallout, {
	global: {
		stubs: {
			// Stub ElSwitch: a plain toggle button, so a click deterministically emits
			// `update:modelValue` in jsdom without element-plus's pointer machinery.
			ElSwitch: {
				props: ['modelValue'],
				emits: ['update:modelValue'],
				template:
					'<button type="button" :data-test-id="$attrs[\'data-test-id\']" role="switch" :aria-checked="!!modelValue" :aria-label="$attrs[\'aria-label\']" @click="$emit(\'update:modelValue\', !modelValue)" />',
			},
		},
	},
});

describe('RunAsCallout', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockDocumentStore.settings = {};
		mockDocumentStore.scopes = [];
		mockDocumentStore.workflowId = 'workflow-1';

		mockedUseEnvFeatureFlag.mockReturnValue({
			check: { value: vi.fn(() => true) },
		} as unknown as ReturnType<typeof useEnvFeatureFlag>);

		mockedUseSettingsStore.mockReturnValue({
			isModuleActive: vi.fn(() => true),
		} as unknown as ReturnType<typeof useSettingsStore>);

		mockedUseUsersStore.mockReturnValue({
			currentUser: { id: CURRENT_USER_ID },
			usersById: {},
			fetchUsers,
		} as unknown as ReturnType<typeof useUsersStore>);

		mockedUseWorkflowsStore.mockReturnValue({
			updateWorkflowSetting,
		} as unknown as ReturnType<typeof useWorkflowsStore>);
	});

	it('renders nothing when the env feature flag is off', () => {
		mockedUseEnvFeatureFlag.mockReturnValue({
			check: { value: vi.fn(() => false) },
		} as unknown as ReturnType<typeof useEnvFeatureFlag>);

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('run-as-callout')).not.toBeInTheDocument();
	});

	it('renders nothing when the dynamic-credentials module is not active', () => {
		mockedUseSettingsStore.mockReturnValue({
			isModuleActive: vi.fn(() => false),
		} as unknown as ReturnType<typeof useSettingsStore>);

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('run-as-callout')).not.toBeInTheDocument();
	});

	describe('state: off', () => {
		it('shows the switch for a publisher', () => {
			mockDocumentStore.scopes = ['workflow:publish'];

			const { getByTestId, getByText } = renderComponent();

			expect(getByTestId('run-as-callout')).toBeInTheDocument();
			expect(
				getByText(
					'Scheduled executions run without a user. Turn this on to run them with your identity and use your end-user credentials.',
				),
			).toBeInTheDocument();
			expect(getByTestId('run-as-switch')).toBeInTheDocument();
		});

		it('hides the switch for a non-publisher', () => {
			mockDocumentStore.scopes = [];

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('run-as-switch')).not.toBeInTheDocument();
			expect(queryByTestId('run-as-switch-to-me')).not.toBeInTheDocument();
		});

		it('turns the switch on for a publisher, setting the current user as run-as user', async () => {
			mockDocumentStore.scopes = ['workflow:publish'];

			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('run-as-switch'));

			await waitFor(() => {
				expect(updateWorkflowSetting).toHaveBeenCalledWith(
					'workflow-1',
					'runAsUserId',
					CURRENT_USER_ID,
				);
			});
		});
	});

	describe('state: you', () => {
		beforeEach(() => {
			mockDocumentStore.settings = { runAsUserId: CURRENT_USER_ID };
			mockDocumentStore.scopes = ['workflow:publish'];
		});

		it('shows the switch turned on', () => {
			const { getByTestId, getByText } = renderComponent();

			expect(getByText('Scheduled executions run as you once published.')).toBeInTheDocument();
			expect(getByTestId('run-as-switch')).toHaveAttribute('aria-checked', 'true');
			expect(getByTestId('run-as-switch')).toHaveAttribute('aria-label', 'Run as me');
		});

		it('hides the switch for a non-publisher', () => {
			mockDocumentStore.scopes = [];

			const { getByText, queryByTestId } = renderComponent();

			expect(getByText('Scheduled executions run as you once published.')).toBeInTheDocument();
			expect(queryByTestId('run-as-switch')).not.toBeInTheDocument();
		});

		it('turns the switch off, clearing the run-as user', async () => {
			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('run-as-switch'));

			await waitFor(() => {
				expect(updateWorkflowSetting).toHaveBeenCalledWith('workflow-1', 'runAsUserId', undefined);
			});
		});
	});

	describe('state: other', () => {
		beforeEach(() => {
			mockDocumentStore.settings = { runAsUserId: OTHER_USER_ID };
			mockedUseUsersStore.mockReturnValue({
				currentUser: { id: CURRENT_USER_ID },
				usersById: { [OTHER_USER_ID]: { id: OTHER_USER_ID, fullName: 'Ada Lovelace' } },
				fetchUsers,
			} as unknown as ReturnType<typeof useUsersStore>);
		});

		it('shows the holder name and a "Switch to me" button for a publisher', async () => {
			mockDocumentStore.scopes = ['workflow:publish'];

			const { getByTestId, getByText } = renderComponent();

			expect(
				getByText(
					'Scheduled executions run as Ada Lovelace. To publish this workflow, switch it to run as you.',
				),
			).toBeInTheDocument();
			expect(getByTestId('run-as-switch-to-me')).toBeInTheDocument();

			await fireEvent.click(getByTestId('run-as-switch-to-me'));

			await waitFor(() => {
				expect(updateWorkflowSetting).toHaveBeenCalledWith(
					'workflow-1',
					'runAsUserId',
					CURRENT_USER_ID,
				);
			});
		});

		it('shows read-only text with no button for a non-publisher', () => {
			mockDocumentStore.scopes = [];

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('run-as-switch-to-me')).not.toBeInTheDocument();
			expect(queryByTestId('run-as-switch')).not.toBeInTheDocument();
		});

		it('falls back to "another user" and fetches the holder when not cached', async () => {
			mockedUseUsersStore.mockReturnValue({
				currentUser: { id: CURRENT_USER_ID },
				usersById: {},
				fetchUsers,
			} as unknown as ReturnType<typeof useUsersStore>);

			const { getByText } = renderComponent();

			expect(
				getByText(
					'Scheduled executions run as another user. To publish this workflow, switch it to run as you.',
				),
			).toBeInTheDocument();

			await waitFor(() => {
				expect(fetchUsers).toHaveBeenCalledWith({ filter: { ids: [OTHER_USER_ID] } });
			});
		});
	});

	describe('read-only', () => {
		beforeEach(() => {
			// A publisher, so the only thing hiding the controls is `readOnly`.
			mockDocumentStore.scopes = ['workflow:publish'];
		});

		it.each<[string, IWorkflowSettings]>([
			['off', {}],
			['you', { runAsUserId: CURRENT_USER_ID }],
			['other', { runAsUserId: OTHER_USER_ID }],
		])('hides the switch and the button in state "%s"', (_state, settings) => {
			mockDocumentStore.settings = settings;

			const { queryByTestId } = renderComponent({ props: { readOnly: true } });

			expect(queryByTestId('run-as-switch')).not.toBeInTheDocument();
			expect(queryByTestId('run-as-switch-to-me')).not.toBeInTheDocument();
		});
	});
});
