import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowCustomTelemetryTags from '@/app/components/WorkflowSettings/WorkflowCustomTelemetryTags.vue';

const validTags = [{ key: 'env', value: 'production' }];
const duplicateTags = [
	{ key: '  env  ', value: 'production' },
	{ key: 'env', value: 'staging' },
];

const renderComponent = createComponentRenderer(WorkflowCustomTelemetryTags, {
	props: {
		isReadOnly: false,
	},
	global: {
		stubs: {
			N8nButton: {
				props: ['disabled', 'label'],
				emits: ['click'],
				template:
					'<button type="button" v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
			},
			N8nIconButton: {
				props: ['disabled'],
				emits: ['click'],
				template:
					'<button type="button" v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')" />',
			},
			N8nInput: {
				props: ['id', 'modelValue', 'placeholder', 'disabled'],
				emits: ['update:modelValue'],
				template:
					'<input v-bind="$attrs" :id="id" :value="modelValue" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
			},
			N8nInputLabel: {
				props: ['label', 'inputName'],
				template: '<label :for="inputName"><span v-if="label">{{ label }}</span><slot /></label>',
			},
		},
	},
});

async function openModal(getByTestId: (id: string) => HTMLElement) {
	await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-configure'));
	await waitFor(() => {
		expect(getByTestId('workflow-settings-custom-telemetry-tags-modal')).toBeVisible();
	});
}

describe('WorkflowCustomTelemetryTags', () => {
	describe('summary', () => {
		it.each([
			{
				modelValue: [{ key: 'team', value: 'platform' }],
				expectedCount: '1 tag configured',
			},
			{
				modelValue: [
					{ key: 'team', value: 'platform' },
					{ key: 'env', value: 'production' },
				],
				expectedCount: '2 tags configured',
			},
		])('renders $expectedCount', ({ modelValue, expectedCount }) => {
			const { getByTestId } = renderComponent({
				props: {
					modelValue,
				},
			});

			expect(getByTestId('workflow-settings-custom-telemetry-tags-count')).toHaveTextContent(
				expectedCount,
			);
		});

		it('does not render the configured tag count when there are no tags', () => {
			const { queryByTestId } = renderComponent();

			expect(
				queryByTestId('workflow-settings-custom-telemetry-tags-count'),
			).not.toBeInTheDocument();
		});

		it('does not include a hidden zero count in the configure button accessible name', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-settings-custom-telemetry-tags-configure')).toHaveAccessibleName(
				'Configure custom telemetry tags',
			);
		});

		it('includes the configured tag count in the configure button accessible name', () => {
			const { getByTestId } = renderComponent({
				props: {
					modelValue: [
						{ key: 'team', value: 'platform' },
						{ key: 'env', value: 'production' },
					],
				},
			});

			expect(getByTestId('workflow-settings-custom-telemetry-tags-configure')).toHaveAccessibleName(
				'Configure custom telemetry tags, 2 tags configured',
			);
		});
	});

	describe('modal', () => {
		it('opens with title, description, docs link, and save action', async () => {
			const { getByLabelText, getByRole, getByTestId, getByText } = renderComponent();

			await openModal(getByTestId);

			expect(getByLabelText('Back')).toBeVisible();
			expect(getByRole('heading', { name: 'Custom telemetry tags' })).toBeVisible();
			expect(getByRole('dialog')).toHaveAccessibleDescription(
				/Add custom tags to this workflow's OpenTelemetry spans\.\s+Learn more in the\s+documentation/,
			);
			expect(getByRole('link', { name: 'documentation' })).toHaveAttribute(
				'href',
				'https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/',
			);
			expect(getByText('Save')).toBeVisible();
		});

		it('renders existing tags in labeled inputs', async () => {
			const { getAllByTestId, getByTestId } = renderComponent({
				props: {
					modelValue: [{ key: 'team', value: 'platform' }],
				},
			});

			await openModal(getByTestId);

			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0]).toHaveValue('team');
			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0]).toHaveValue(
				'platform',
			);
			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0]).toHaveAccessibleName(
				'Key',
			);
			expect(
				getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0],
			).toHaveAccessibleName('Value');
		});

		it('opens with no rows when there are no existing tags', async () => {
			const { getByTestId, queryAllByTestId } = renderComponent();

			await openModal(getByTestId);

			expect(queryAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(0);
			expect(getByTestId('workflow-settings-custom-telemetry-tags-add')).toBeVisible();
		});
	});

	describe('editing tags', () => {
		it('adds a new empty tag row', async () => {
			const { getAllByTestId, getAllByText, getByTestId } = renderComponent();

			await openModal(getByTestId);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));

			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(1);
			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0]).toHaveValue('');
			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0]).toHaveValue('');

			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));

			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(2);
			expect(getAllByText('Key')).toHaveLength(1);
			expect(getAllByText('Value')).toHaveLength(1);
		});

		it('edits an existing tag and emits the changed tag on save', async () => {
			const { emitted, getAllByTestId, getByTestId } = renderComponent({
				props: {
					modelValue: [{ key: 'team', value: 'platform' }],
				},
			});

			await openModal(getByTestId);
			await userEvent.clear(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0]);
			await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], 'env');
			await userEvent.clear(getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0]);
			await userEvent.type(
				getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0],
				'production',
			);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

			expect(emitted('update:modelValue')).toEqual([[validTags]]);
		});

		it('deletes a tag row and emits the remaining tags on save', async () => {
			const { emitted, getAllByTestId, getByTestId } = renderComponent({
				props: {
					modelValue: [
						{ key: 'team', value: 'platform' },
						{ key: 'env', value: 'production' },
					],
				},
			});

			await openModal(getByTestId);
			await userEvent.click(getAllByTestId('workflow-settings-custom-telemetry-tags-delete')[0]);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

			expect(emitted('update:modelValue')).toEqual([[[{ key: 'env', value: 'production' }]]]);
		});

		it('emits an empty list when all tag rows are deleted and saved', async () => {
			const { emitted, getAllByTestId, getByTestId } = renderComponent({
				props: {
					modelValue: [{ key: 'team', value: 'platform' }],
				},
			});

			await openModal(getByTestId);
			await userEvent.click(getAllByTestId('workflow-settings-custom-telemetry-tags-delete')[0]);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

			expect(emitted('update:modelValue')).toEqual([[[]]]);
		});
	});

	describe('saving', () => {
		it('emits saved tags with trimmed keys', async () => {
			const { emitted, getAllByTestId, getByTestId } = renderComponent();

			await openModal(getByTestId);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
			await userEvent.type(
				getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0],
				' env ',
			);
			await userEvent.type(
				getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0],
				'production',
			);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

			expect(emitted('update:modelValue')).toEqual([[validTags]]);
		});

		it('awaits the async save handler before emitting and closing', async () => {
			let resolveSave: () => void = () => {};
			const saveTags = vi.fn(
				() =>
					new Promise<void>((resolve) => {
						resolveSave = resolve;
					}),
			);
			const { emitted, getAllByTestId, getByTestId, queryByTestId } = renderComponent({
				props: { saveTags },
			});

			await openModal(getByTestId);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
			await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], 'env');
			await userEvent.type(
				getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0],
				'production',
			);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

			expect(saveTags).toHaveBeenCalledWith(validTags);
			expect(emitted('update:modelValue')).toBeUndefined();
			expect(getByTestId('workflow-settings-custom-telemetry-tags-save')).toBeDisabled();

			resolveSave();

			await waitFor(() => {
				expect(emitted('update:modelValue')).toEqual([[validTags]]);
				expect(
					queryByTestId('workflow-settings-custom-telemetry-tags-modal'),
				).not.toBeInTheDocument();
			});
		});

		it('keeps the modal open and does not emit when the async save handler rejects', async () => {
			const saveTags = vi.fn().mockRejectedValue(new Error('Save failed'));
			const { emitted, getAllByTestId, getByTestId } = renderComponent({
				props: { saveTags },
			});

			await openModal(getByTestId);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
			await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], 'env');
			await userEvent.type(
				getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0],
				'production',
			);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

			await waitFor(() => {
				expect(saveTags).toHaveBeenCalledWith(validTags);
				expect(getByTestId('workflow-settings-custom-telemetry-tags-modal')).toBeVisible();
				expect(getByTestId('workflow-settings-custom-telemetry-tags-save')).not.toBeDisabled();
			});
			expect(emitted('update:modelValue')).toBeUndefined();
		});
	});

	describe('validation', () => {
		it('disables save when a tag has a value but no key', async () => {
			const { emitted, getAllByTestId, getByTestId } = renderComponent();

			await openModal(getByTestId);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
			await userEvent.type(
				getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0],
				'production',
			);

			expect(getByTestId('workflow-settings-custom-telemetry-tags-modal-error')).toHaveTextContent(
				'Key must not be empty',
			);
			expect(getByTestId('workflow-settings-custom-telemetry-tags-save')).toBeDisabled();

			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));
			expect(emitted('update:modelValue')).toBeUndefined();
		});

		it('disables save when tag keys are duplicated after trim', async () => {
			const { getAllByTestId, getByTestId } = renderComponent();

			await openModal(getByTestId);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
			await userEvent.type(
				getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0],
				' env ',
			);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
			await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[1], 'env');

			expect(getByTestId('workflow-settings-custom-telemetry-tags-modal-error')).toHaveTextContent(
				'Duplicate keys are not allowed',
			);
			expect(getByTestId('workflow-settings-custom-telemetry-tags-save')).toBeDisabled();
		});

		it('emits validity changes for invalid saved tags and resets validity on unmount', () => {
			const onValidityChange = vi.fn();
			const { unmount } = renderComponent({
				props: {
					modelValue: duplicateTags,
					'onValidity-change': onValidityChange,
				},
			});

			expect(onValidityChange).toHaveBeenCalledWith(true);

			unmount();

			expect(onValidityChange).toHaveBeenLastCalledWith(false);
		});
	});

	describe('discarding drafts', () => {
		it('discards draft changes when cancelled', async () => {
			const { emitted, getAllByTestId, getByTestId, queryAllByTestId } = renderComponent();

			await openModal(getByTestId);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
			await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], 'env');
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-cancel'));
			await openModal(getByTestId);

			expect(queryAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(0);
			expect(emitted('update:modelValue')).toBeUndefined();
		});

		it('discards draft changes when the dialog is closed', async () => {
			const { emitted, getAllByTestId, getByTestId, queryAllByTestId } = renderComponent();

			await openModal(getByTestId);
			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
			await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], 'env');
			await userEvent.click(getByTestId('dialog-close-button'));
			await openModal(getByTestId);

			expect(queryAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(0);
			expect(emitted('update:modelValue')).toBeUndefined();
		});
	});

	describe('read-only', () => {
		it('disables editing controls when read-only', async () => {
			const { getAllByTestId, getByTestId } = renderComponent({
				props: {
					isReadOnly: true,
					modelValue: [{ key: 'team', value: 'platform' }],
				},
			});

			await openModal(getByTestId);

			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0]).toBeDisabled();
			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0]).toBeDisabled();
			expect(getAllByTestId('workflow-settings-custom-telemetry-tags-delete')[0]).toBeDisabled();
			expect(getByTestId('workflow-settings-custom-telemetry-tags-add')).toBeDisabled();
			expect(getByTestId('workflow-settings-custom-telemetry-tags-save')).toBeDisabled();
		});
	});
});
