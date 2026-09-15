import { computed, defineComponent, shallowRef } from 'vue';
import type { IWorkflowSettings } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';

vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: vi.fn(),
}));

vi.mock('@/features/resolvers/composables/usePrivateCredentials', () => ({
	usePrivateCredentials: vi.fn(),
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

const mockDocumentStore: {
	settings: IWorkflowSettings;
	getNodeByName: (name: string) => INodeUi | null;
} = {
	settings: {},
	getNodeByName: () => null,
};

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return {
		...actual,
		injectWorkflowDocumentStore: () => shallowRef(mockDocumentStore),
	};
});

import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';
import { useUsersStore } from '@n8n/stores/users.store';
import { useNodeRunAsBadge } from './useNodeRunAsBadge';

const CURRENT_USER_ID = 'current-user-id';
const OTHER_USER_ID = 'other-user-id';

const scheduleTrigger = {
	name: 'Schedule Trigger',
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} as unknown as INodeUi;

const TestComponent = defineComponent({
	setup() {
		const { showRunAsBadge, tooltipText } = useNodeRunAsBadge(() => 'Schedule Trigger');
		return { showRunAsBadge, tooltipText };
	},
	template: `<div>
		<span data-test-id="show">{{ showRunAsBadge }}</span>
		<span data-test-id="tooltip">{{ tooltipText }}</span>
	</div>`,
});

const renderComponent = createComponentRenderer(TestComponent);

describe('useNodeRunAsBadge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDocumentStore.settings = { runAsUserId: CURRENT_USER_ID };
		mockDocumentStore.getNodeByName = () => scheduleTrigger;

		vi.mocked(useEnvFeatureFlag).mockReturnValue({
			check: { value: vi.fn(() => true) },
		} as unknown as ReturnType<typeof useEnvFeatureFlag>);
		vi.mocked(usePrivateCredentials).mockReturnValue({
			isEnabled: computed(() => true),
		} as ReturnType<typeof usePrivateCredentials>);
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: CURRENT_USER_ID },
			usersById: {
				[OTHER_USER_ID]: { id: OTHER_USER_ID, fullName: 'Ada Lovelace', email: 'ada@example.com' },
			},
			fetchUsers: vi.fn(),
		} as unknown as ReturnType<typeof useUsersStore>);
	});

	it('shows the badge with "as you" for the current user', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('show')).toHaveTextContent('true');
		expect(getByTestId('tooltip')).toHaveTextContent('Scheduled executions run as you');
	});

	it('names the holder when someone else holds the setting', () => {
		mockDocumentStore.settings = { runAsUserId: OTHER_USER_ID };
		const { getByTestId } = renderComponent();
		expect(getByTestId('show')).toHaveTextContent('true');
		expect(getByTestId('tooltip')).toHaveTextContent('Scheduled executions run as Ada Lovelace');
	});

	it('hides the badge when the setting is unset', () => {
		mockDocumentStore.settings = {};
		const { getByTestId } = renderComponent();
		expect(getByTestId('show')).toHaveTextContent('false');
	});

	it('hides the badge on nodes other than the Schedule Trigger', () => {
		mockDocumentStore.getNodeByName = () =>
			({ ...scheduleTrigger, type: 'n8n-nodes-base.webhook' }) as unknown as INodeUi;
		const { getByTestId } = renderComponent();
		expect(getByTestId('show')).toHaveTextContent('false');
	});

	it('hides the badge when the flag is off', () => {
		vi.mocked(useEnvFeatureFlag).mockReturnValue({
			check: { value: vi.fn(() => false) },
		} as unknown as ReturnType<typeof useEnvFeatureFlag>);
		const { getByTestId } = renderComponent();
		expect(getByTestId('show')).toHaveTextContent('false');
	});

	it('hides the badge when the module is inactive', () => {
		vi.mocked(usePrivateCredentials).mockReturnValue({
			isEnabled: computed(() => false),
		} as ReturnType<typeof usePrivateCredentials>);
		const { getByTestId } = renderComponent();
		expect(getByTestId('show')).toHaveTextContent('false');
	});
});
