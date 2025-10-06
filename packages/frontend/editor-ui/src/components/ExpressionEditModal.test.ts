import { createComponentRenderer } from '@/__tests__/render';
import ExpressionEditModal from '@/components/ExpressionEditModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import { setActivePinia, type Pinia } from 'pinia';
import { defaultSettings } from '../__tests__/defaults';
import { useSettingsStore } from '../stores/settings.store';
import { createTestNodeProperties } from '@/__tests__/mocks';

vi.mock('vue-router', () => {
	const push = vi.fn();
	return {
		useRouter: () => ({
			push,
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

vi.mock('@/composables/useWorkflowHelpers', async (importOriginal) => {
	const actual: object = await importOriginal();
	return { ...actual, resolveParameter: vi.fn(() => 123) };
});

const renderModal = createComponentRenderer(ExpressionEditModal);

describe('ExpressionEditModal', () => {
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		useSettingsStore().setSettings(defaultSettings);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders correctly', async () => {
		const { getByTestId } = renderModal({
			pinia,
			props: {
				parameter: createTestNodeProperties({ name: 'foo', type: 'string' }),
				path: '',
				modelValue: 'test',
				dialogVisible: true,
			},
		});

		await waitFor(() => {
			expect(getByTestId('expression-modal-input')).toBeInTheDocument();
			expect(getByTestId('expression-modal-output')).toBeInTheDocument();

			const editor = within(getByTestId('expression-modal-input')).getByRole('textbox');
			expect(editor).toBeInTheDocument();
			expect(editor).toHaveAttribute('contenteditable', 'true');
			expect(editor).not.toHaveAttribute('aria-readonly');
		});
	});

	it('is read only', async () => {
		const { getByTestId } = renderModal({
			pinia,
			props: {
				parameter: createTestNodeProperties({ name: 'foo', type: 'string' }),
				path: '',
				modelValue: 'test',
				dialogVisible: true,
				isReadOnly: true,
			},
		});

		await waitFor(() => {
			expect(getByTestId('expression-modal-input')).toBeInTheDocument();
			expect(getByTestId('expression-modal-output')).toBeInTheDocument();

			const editor = within(getByTestId('expression-modal-input')).getByRole('textbox');
			expect(editor).toBeInTheDocument();
			expect(editor).toHaveAttribute('aria-readonly', 'true');
		});
	});
});
