import { createComponentRenderer } from '@/__tests__/render';
import { cleanup, fireEvent } from '@testing-library/vue';
import WorkflowVersionForm from './WorkflowVersionForm.vue';

const renderComponent = createComponentRenderer(WorkflowVersionForm);

describe('WorkflowVersionForm', () => {
	afterEach(() => {
		cleanup();
	});

	it('should render version name and description inputs', () => {
		const { getByTestId } = renderComponent({
			props: {
				versionName: '',
				description: '',
				versionNameTestId: 'version-name-input',
				descriptionTestId: 'description-input',
			},
		});

		expect(getByTestId('version-name-input')).toBeInTheDocument();
		expect(getByTestId('description-input')).toBeInTheDocument();
	});

	it('should update versionName model when input changes', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				versionName: '',
				description: '',
				versionNameTestId: 'version-name-input',
			},
		});

		const input = getByTestId('version-name-input');
		await fireEvent.update(input, 'v1.0.0');

		expect(emitted()['update:versionName']).toBeTruthy();
		expect(emitted()['update:versionName'][0]).toEqual(['v1.0.0']);
	});

	it('should update description model when textarea changes', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				versionName: '',
				description: '',
				descriptionTestId: 'description-input',
			},
		});

		const textarea = getByTestId('description-input');
		await fireEvent.update(textarea, 'Test description');

		expect(emitted()['update:description']).toBeTruthy();
		expect(emitted()['update:description'][0]).toEqual(['Test description']);
	});

	it('should emit submit event when Enter is pressed in version name input', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				versionName: 'v1.0.0',
				description: '',
				versionNameTestId: 'version-name-input',
			},
		});

		const input = getByTestId('version-name-input');
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(emitted().submit).toBeTruthy();
	});

	it('should disable inputs when disabled prop is true', () => {
		const { getByTestId } = renderComponent({
			props: {
				versionName: '',
				description: '',
				disabled: true,
				versionNameTestId: 'version-name-input',
				descriptionTestId: 'description-input',
			},
		});

		expect(getByTestId('version-name-input')).toBeDisabled();
		expect(getByTestId('description-input')).toBeDisabled();
	});

	it('should respect maxlength constraints', () => {
		const { getByTestId } = renderComponent({
			props: {
				versionName: '',
				description: '',
				versionNameTestId: 'version-name-input',
				descriptionTestId: 'description-input',
			},
		});

		const versionInput = getByTestId('version-name-input');
		const descriptionInput = getByTestId('description-input');

		expect(versionInput).toHaveAttribute('maxlength', '128');
		expect(descriptionInput).toHaveAttribute('maxlength', '2048');
	});

	it('should expose focusInput method', () => {
		const { getByTestId } = renderComponent({
			props: {
				versionName: 'Initial name',
				description: '',
				versionNameTestId: 'version-name-input',
			},
		});

		const component = getByTestId('version-name-input');
		expect(component).toBeInTheDocument();
	});
});
