import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { ICustomTelemetryTag } from 'n8n-workflow';
import WorkflowCustomTelemetryTags from '@/app/components/WorkflowSettings/WorkflowCustomTelemetryTags.vue';

const validTags = [{ key: 'env', value: 'production' }];
const expressionTags = [{ key: 'workflowName', value: '={{ $workflow.name }}' }];
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
			N8nDialog: {
				props: ['open'],
				emits: ['update:open'],
				template:
					'<div v-if="open"><button type="button" data-test-id="dialog-close" @click="$emit(\'update:open\', false)" /> <slot /></div>',
			},
			N8nDialogDescription: { template: '<p><slot /></p>' },
			N8nDialogFooter: { template: '<footer><slot /></footer>' },
			N8nDialogHeader: { template: '<header><slot /></header>' },
			N8nDialogTitle: { template: '<h2><slot /></h2>' },
			N8nIcon: { template: '<span />' },
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
			N8nText: { template: '<p v-bind="$attrs"><slot /></p>' },
			N8nTooltip: { template: '<span><slot /></span>' },
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
	it('should render the modal title, back button, description, and save action', async () => {
		const { getByLabelText, getByRole, getByTestId, getByText } = renderComponent();

		await openModal(getByTestId);

		expect(getByLabelText('Back')).toBeVisible();
		expect(getByRole('heading', { name: 'Custom telemetry tags' })).toBeVisible();
		expect(getByText("Add custom tags to this workflow's OpenTelemetry spans.")).toBeVisible();
		expect(getByText('Save')).toBeVisible();
	});

	it('should render existing custom telemetry tags in labeled inputs', async () => {
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
		expect(getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0]).toHaveAccessibleName(
			'Value',
		);
	});

	it('should open with no tag rows when there are no existing tags', async () => {
		const { getByTestId, queryAllByTestId } = renderComponent();

		await openModal(getByTestId);

		expect(queryAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(0);
		expect(getByTestId('workflow-settings-custom-telemetry-tags-add')).toBeVisible();
	});

	it('should add custom telemetry tag rows', async () => {
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

	it('should remove all rows when deleting the last custom telemetry tag row', async () => {
		const { getAllByTestId, getByTestId, queryAllByTestId } = renderComponent({
			props: {
				modelValue: [{ key: 'team', value: 'platform' }],
			},
		});

		await openModal(getByTestId);
		await userEvent.click(getAllByTestId('workflow-settings-custom-telemetry-tags-delete')[0]);

		expect(queryAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(0);
	});

	it('should emit saved custom telemetry tag edits with trimmed keys', async () => {
		const { emitted, getAllByTestId, getByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
		await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], ' env ');
		await userEvent.type(
			getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0],
			'production',
		);
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

		expect(emitted('update:modelValue')).toEqual([[validTags]]);
	});

	it('should emit cloned tags when saving existing values', async () => {
		const tag = { key: 'team', value: 'platform' };
		const modelValue = [tag];
		const { emitted, getByTestId } = renderComponent({
			props: { modelValue },
		});

		await openModal(getByTestId);
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

		const updateEvents = emitted('update:modelValue') as [ICustomTelemetryTag[]][] | undefined;
		const emittedTags = updateEvents?.[0][0];
		expect(emittedTags).toEqual(modelValue);
		expect(emittedTags).not.toBe(modelValue);
		expect(emittedTags?.[0]).not.toBe(tag);
	});

	it('should await the async save handler before emitting and closing', async () => {
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

	it('should keep the modal open and re-enable controls when the async save handler rejects', async () => {
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

	it('should emit an empty list when saving with no tag rows', async () => {
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

	it('should disable modal save when a custom telemetry tag has a value but no key', async () => {
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

	it('should disable modal save when custom telemetry tag keys are duplicated after trim', async () => {
		const { getAllByTestId, getByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
		await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], ' env ');
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
		await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[1], 'env');

		expect(getByTestId('workflow-settings-custom-telemetry-tags-modal-error')).toHaveTextContent(
			'Duplicate keys are not allowed',
		);
		expect(getByTestId('workflow-settings-custom-telemetry-tags-save')).toBeDisabled();
	});

	it('should preserve custom telemetry tag values that look like expressions as literals', async () => {
		const { emitted, getAllByTestId, getByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
		await userEvent.type(
			getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0],
			'workflowName',
		);
		await fireEvent.update(
			getAllByTestId('workflow-settings-custom-telemetry-tags-value')[0],
			'={{ $workflow.name }}',
		);
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

		expect(emitted('update:modelValue')).toEqual([[expressionTags]]);
	});

	it('should discard draft changes when cancelled', async () => {
		const { emitted, getAllByTestId, getByTestId, queryAllByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
		await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], 'env');
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-cancel'));
		await openModal(getByTestId);

		expect(queryAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(0);
		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('should discard draft changes when the back button is clicked', async () => {
		const { emitted, getAllByLabelText, getAllByTestId, getByTestId, queryAllByTestId } =
			renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
		await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], 'env');
		await userEvent.click(getAllByLabelText('Back')[0]);
		await openModal(getByTestId);

		expect(queryAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(0);
		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('should discard draft changes when the dialog is closed', async () => {
		const { emitted, getAllByTestId, getByTestId, queryAllByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-add'));
		await userEvent.type(getAllByTestId('workflow-settings-custom-telemetry-tags-key')[0], 'env');
		await userEvent.click(getByTestId('dialog-close-button'));
		await openModal(getByTestId);

		expect(queryAllByTestId('workflow-settings-custom-telemetry-tags-row')).toHaveLength(0);
		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('should delete custom telemetry tag rows', async () => {
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

	it('should disable editing controls when read-only', async () => {
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

	it('should emit validity changes and reset validity on unmount', () => {
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
