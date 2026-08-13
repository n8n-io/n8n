import { createComponentRenderer } from '@/__tests__/render';
import ExpressionEditModal from './ExpressionEditModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { setActivePinia, type Pinia } from 'pinia';
import { defaultSettings } from '@/__tests__/defaults';
import { useSettingsStore } from '@n8n/stores/settings.store';
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

vi.mock('@/app/composables/useWorkflowHelpers', async (importOriginal) => {
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

	describe('output render mode', () => {
		it('renders all three render mode options', async () => {
			const { getByRole } = renderModal({
				pinia,
				props: {
					parameter: createTestNodeProperties({ name: 'foo', type: 'string' }),
					path: '',
					modelValue: 'test',
					dialogVisible: true,
				},
			});

			await waitFor(() => {
				expect(getByRole('radio', { name: 'Text' })).toBeInTheDocument();
				expect(getByRole('radio', { name: 'Html' })).toBeInTheDocument();
				expect(getByRole('radio', { name: 'Markdown' })).toBeInTheDocument();
			});
		});

		it('has Text as default render mode', async () => {
			const { getByRole } = renderModal({
				pinia,
				props: {
					parameter: createTestNodeProperties({ name: 'foo', type: 'string' }),
					path: '',
					modelValue: 'test',
					dialogVisible: true,
				},
			});

			await waitFor(() => {
				expect(getByRole('radio', { name: 'Text' })).toBeChecked();
			});
		});

		it('allows switching to Html render mode', async () => {
			const { getByRole } = renderModal({
				pinia,
				props: {
					parameter: createTestNodeProperties({ name: 'foo', type: 'string' }),
					path: '',
					modelValue: 'test',
					dialogVisible: true,
				},
			});

			await waitFor(() => {
				expect(getByRole('radio', { name: 'Html' })).toBeInTheDocument();
			});

			await fireEvent.click(getByRole('radio', { name: 'Html' }));

			await waitFor(() => {
				expect(getByRole('radio', { name: 'Html' })).toBeChecked();
			});
		});

		it('allows switching to Markdown render mode', async () => {
			const { getByRole } = renderModal({
				pinia,
				props: {
					parameter: createTestNodeProperties({ name: 'foo', type: 'string' }),
					path: '',
					modelValue: 'test',
					dialogVisible: true,
				},
			});

			await waitFor(() => {
				expect(getByRole('radio', { name: 'Markdown' })).toBeInTheDocument();
			});

			await fireEvent.click(getByRole('radio', { name: 'Markdown' }));

			await waitFor(() => {
				expect(getByRole('radio', { name: 'Markdown' })).toBeChecked();
			});
		});

		it('has correct values for each render mode option', async () => {
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
				expect(getByTestId('radio-button-text')).toBeInTheDocument();
				expect(getByTestId('radio-button-html')).toBeInTheDocument();
				expect(getByTestId('radio-button-markdown')).toBeInTheDocument();
			});
		});

		it('only applies the CodeMirror editor class in text mode', async () => {
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
				expect(getByTestId('expression-modal-output')).toHaveClass('editor');
			});

			await fireEvent.click(getByTestId('radio-button-html'));
			await waitFor(() => {
				expect(getByTestId('expression-modal-output')).not.toHaveClass('editor');
			});

			await fireEvent.click(getByTestId('radio-button-markdown'));
			await waitFor(() => {
				expect(getByTestId('expression-modal-output')).not.toHaveClass('editor');
			});

			await fireEvent.click(getByTestId('radio-button-text'));
			await waitFor(() => {
				expect(getByTestId('expression-modal-output')).toHaveClass('editor');
			});
		});
	});
});
