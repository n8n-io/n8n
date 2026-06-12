import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialMetadata from './CredentialMetadata.vue';

const renderComponent = createComponentRenderer(CredentialMetadata);

describe('CredentialMetadata', () => {
	describe('rendering', () => {
		it('should render title and description', () => {
			renderComponent({ props: { modelValue: null } });

			expect(screen.getByText('Metadata')).toBeInTheDocument();
			expect(
				screen.getByText(
					'Attach custom key-value data to this credential (e.g. owner, environment, dashboard URL).',
				),
			).toBeInTheDocument();
		});

		it('should render no entries when modelValue is null', () => {
			renderComponent({ props: { modelValue: null } });

			expect(screen.queryAllByTestId('credential-metadata-key')).toHaveLength(0);
			expect(screen.queryAllByTestId('credential-metadata-value')).toHaveLength(0);
		});

		it('should render an editable row for each existing entry', () => {
			renderComponent({
				props: {
					modelValue: { owner: 'team-x', environment: 'staging' },
				},
			});

			const keyInputs = screen.getAllByTestId('credential-metadata-key');
			const valueInputs = screen.getAllByTestId('credential-metadata-value');

			expect(keyInputs).toHaveLength(2);
			expect(valueInputs).toHaveLength(2);
			expect(keyInputs.map((input) => (input as HTMLInputElement).value)).toEqual([
				'owner',
				'environment',
			]);
			expect(valueInputs.map((input) => (input as HTMLInputElement).value)).toEqual([
				'team-x',
				'staging',
			]);
		});

		it('should stringify non-string values when displaying them', () => {
			renderComponent({
				props: {
					modelValue: { count: 42, enabled: true, missing: null },
				},
			});

			const valueInputs = screen.getAllByTestId('credential-metadata-value');
			expect(valueInputs.map((input) => (input as HTMLInputElement).value)).toEqual([
				'42',
				'true',
				'',
			]);
		});

		it('should disable the key inputs of existing entries', () => {
			renderComponent({
				props: { modelValue: { owner: 'team-x' } },
			});

			expect(screen.getByTestId('credential-metadata-key')).toBeDisabled();
		});
	});

	describe('readonly mode', () => {
		it('should hide remove buttons and the add row', () => {
			renderComponent({
				props: {
					modelValue: { owner: 'team-x' },
					readonly: true,
				},
			});

			expect(screen.queryByTestId('credential-metadata-remove')).not.toBeInTheDocument();
			expect(screen.queryByTestId('credential-metadata-new-key')).not.toBeInTheDocument();
			expect(screen.queryByTestId('credential-metadata-new-value')).not.toBeInTheDocument();
			expect(screen.queryByTestId('credential-metadata-add')).not.toBeInTheDocument();
		});

		it('should disable the value input of existing entries', () => {
			renderComponent({
				props: {
					modelValue: { owner: 'team-x' },
					readonly: true,
				},
			});

			expect(screen.getByTestId('credential-metadata-value')).toBeDisabled();
		});
	});

	describe('adding entries', () => {
		it('should emit the new map and merge the new entry on top of existing ones', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: { owner: 'team-x' } },
			});

			const newKey = screen.getByTestId('credential-metadata-new-key');
			const newValue = screen.getByTestId('credential-metadata-new-value');

			await userEvent.type(newKey, 'environment');
			await userEvent.type(newValue, 'staging');
			await userEvent.click(screen.getByTestId('credential-metadata-add'));

			const events = emitted('update:modelValue');
			expect(events).toBeDefined();
			expect(events?.at(-1)).toEqual([{ owner: 'team-x', environment: 'staging' }]);
		});

		it('should emit a fresh map when adding the first entry to an empty model', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: null },
			});

			await userEvent.type(screen.getByTestId('credential-metadata-new-key'), 'owner');
			await userEvent.type(screen.getByTestId('credential-metadata-new-value'), 'team-x');
			await userEvent.click(screen.getByTestId('credential-metadata-add'));

			const events = emitted('update:modelValue');
			expect(events?.at(-1)).toEqual([{ owner: 'team-x' }]);
		});

		it('should add the entry when pressing Enter in either input', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: null },
			});

			await userEvent.type(screen.getByTestId('credential-metadata-new-key'), 'owner');
			await userEvent.type(screen.getByTestId('credential-metadata-new-value'), 'team-x{Enter}');

			expect(emitted('update:modelValue')?.at(-1)).toEqual([{ owner: 'team-x' }]);
		});

		it('should ignore empty keys', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: { owner: 'team-x' } },
			});

			await userEvent.type(screen.getByTestId('credential-metadata-new-value'), 'staging');
			await userEvent.click(screen.getByTestId('credential-metadata-add'));

			expect(emitted('update:modelValue')).toBeUndefined();
		});

		it('should ignore whitespace-only keys', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: null },
			});

			await userEvent.type(screen.getByTestId('credential-metadata-new-key'), '   ');
			await userEvent.type(screen.getByTestId('credential-metadata-new-value'), 'value');
			await userEvent.click(screen.getByTestId('credential-metadata-add'));

			expect(emitted('update:modelValue')).toBeUndefined();
		});

		it('should overwrite an existing entry when a duplicate key is added', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: { owner: 'team-x' } },
			});

			await userEvent.type(screen.getByTestId('credential-metadata-new-key'), 'owner');
			await userEvent.type(screen.getByTestId('credential-metadata-new-value'), 'team-y');
			await userEvent.click(screen.getByTestId('credential-metadata-add'));

			expect(emitted('update:modelValue')?.at(-1)).toEqual([{ owner: 'team-y' }]);
		});
	});

	describe('removing entries', () => {
		it('should emit the remaining entries when removing one of many', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: { owner: 'team-x', environment: 'staging' } },
			});

			const removeButtons = screen.getAllByTestId('credential-metadata-remove');
			await userEvent.click(removeButtons[0]);

			expect(emitted('update:modelValue')?.at(-1)).toEqual([{ environment: 'staging' }]);
		});

		it('should emit null when removing the last remaining entry', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: { owner: 'team-x' } },
			});

			await userEvent.click(screen.getByTestId('credential-metadata-remove'));

			expect(emitted('update:modelValue')?.at(-1)).toEqual([null]);
		});
	});

	describe('updating values', () => {
		it('should emit the updated entry when an existing value is changed', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: { owner: 'team-x' } },
			});

			const valueInput = screen.getByTestId('credential-metadata-value');
			await userEvent.clear(valueInput);
			await userEvent.type(valueInput, 'team-y');

			const events = emitted('update:modelValue');
			expect(events).toBeDefined();
			expect(events?.at(-1)).toEqual([{ owner: 'team-y' }]);
		});

		it('should only update the targeted entry when multiple exist', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: { owner: 'team-x', environment: 'staging' } },
			});

			const valueInputs = screen.getAllByTestId('credential-metadata-value');
			await userEvent.clear(valueInputs[1]);
			await userEvent.type(valueInputs[1], 'production');

			expect(emitted('update:modelValue')?.at(-1)).toEqual([
				{ owner: 'team-x', environment: 'production' },
			]);
		});
	});

	describe('add button state', () => {
		it('should disable the add button while the key input is empty', () => {
			renderComponent({ props: { modelValue: null } });

			expect(screen.getByTestId('credential-metadata-add')).toBeDisabled();
		});

		it('should enable the add button once a non-empty key is entered', async () => {
			renderComponent({ props: { modelValue: null } });

			await userEvent.type(screen.getByTestId('credential-metadata-new-key'), 'owner');

			expect(screen.getByTestId('credential-metadata-add')).not.toBeDisabled();
		});
	});
});
