import { createComponentRenderer } from '@/__tests__/render';
import { cleanupAppModals, createAppModals } from '@/__tests__/utils';
import ExpressionEditModal from '@/components/ExpressionEditModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';

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

const renderModal = createComponentRenderer(ExpressionEditModal);

describe('ExpressionEditModal', () => {
	beforeEach(() => {
		createAppModals();
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	it('renders correctly', async () => {
		const pinia = createTestingPinia();

		const { getByTestId } = renderModal({
			pinia,
			props: {
				parameter: { name: 'foo', type: 'string' },
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
		const pinia = createTestingPinia();

		const { getByTestId } = renderModal({
			pinia,
			props: {
				parameter: { name: 'foo', type: 'string' },
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
