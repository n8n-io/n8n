import { computed, defineComponent, type PropType } from 'vue';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { ICustomTelemetryTag, INodeParameters, INodeProperties } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import WorkflowCustomTelemetryTags from '@/app/components/WorkflowSettings/WorkflowCustomTelemetryTags.vue';

const validTags = [{ key: 'env', value: 'production' }];
const expressionTags = [{ key: 'workflowName', value: '={{ $workflow.name }}' }];
const duplicateTags = [
	{ key: '  env  ', value: 'production' },
	{ key: 'env', value: 'staging' },
];

const ParameterInputListStub = defineComponent({
	name: 'ParameterInputList',
	props: {
		hideDelete: Boolean,
		isReadOnly: Boolean,
		nodeValues: {
			type: Object as PropType<INodeParameters>,
			required: true,
		},
		parameters: {
			type: Array as PropType<INodeProperties[]>,
			required: true,
		},
	},
	emits: {
		valueChanged: (_value: IUpdateInformation) => true,
	},
	setup(props, { emit }) {
		const nodeValuesJson = computed(() => JSON.stringify(props.nodeValues));
		const isReadOnlyValue = computed(() => String(props.isReadOnly));

		const emitTags = (tags: ICustomTelemetryTag[]) => {
			emit('valueChanged', {
				name: 'customTelemetryTags',
				value: tags.length ? { tag: tags } : {},
			});
		};

		return {
			nodeValuesJson,
			isReadOnlyValue,
			setValidTags: () => emitTags(validTags),
			setExpressionTags: () => emitTags(expressionTags),
			setEmptyKeyTag: () => emitTags([{ key: '', value: 'production' }]),
			setDuplicateTags: () => emitTags(duplicateTags),
			deleteFirstTag: () =>
				emit('valueChanged', { name: 'customTelemetryTags.tag[0]', value: undefined }),
		};
	},
	template: `
		<div
			data-test-id="parameter-input-list"
			:data-node-values="nodeValuesJson"
			:data-is-read-only="isReadOnlyValue"
		>
			<button type="button" data-test-id="set-valid-tags" @click="setValidTags" />
			<button type="button" data-test-id="set-expression-tags" @click="setExpressionTags" />
			<button type="button" data-test-id="set-empty-key-tag" @click="setEmptyKeyTag" />
			<button type="button" data-test-id="set-duplicate-tags" @click="setDuplicateTags" />
			<button type="button" data-test-id="delete-first-tag" @click="deleteFirstTag" />
		</div>
	`,
});

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
					'<button type="button" :data-test-id="$attrs[\'data-test-id\']" :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
			},
			N8nDialog: {
				props: ['open'],
				emits: ['update:open'],
				template: '<div v-if="open"><slot /></div>',
			},
			N8nDialogDescription: { template: '<p><slot /></p>' },
			N8nDialogFooter: { template: '<footer><slot /></footer>' },
			N8nDialogHeader: { template: '<header><slot /></header>' },
			N8nDialogTitle: { template: '<h2><slot /></h2>' },
			N8nIcon: { template: '<span />' },
			N8nIconButton: {
				emits: ['click'],
				template:
					'<button type="button" :aria-label="$attrs[\'aria-label\']" @click="$emit(\'click\')" />',
			},
			N8nText: { template: '<p :data-test-id="$attrs[\'data-test-id\']"><slot /></p>' },
			N8nTooltip: { template: '<span><slot /></span>' },
			ParameterInputList: ParameterInputListStub,
		},
	},
});

function getParameterInputListNodeValues(getByTestId: (id: string) => HTMLElement) {
	return JSON.parse(getByTestId('parameter-input-list').dataset.nodeValues ?? '{}');
}

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

	it('should render existing custom telemetry tags in the modal', async () => {
		const { getByTestId } = renderComponent({
			props: {
				modelValue: [{ key: 'team', value: 'platform' }],
			},
		});

		await openModal(getByTestId);

		expect(getParameterInputListNodeValues(getByTestId)).toEqual({
			customTelemetryTags: { tag: [{ key: 'team', value: 'platform' }] },
		});
	});

	it('should emit saved custom telemetry tag edits', async () => {
		const { emitted, getByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('set-valid-tags'));
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

	it('should disable modal save when a custom telemetry tag has an empty key', async () => {
		const { emitted, getByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('set-empty-key-tag'));

		expect(getByTestId('workflow-settings-custom-telemetry-tags-modal-error')).toHaveTextContent(
			'Key must not be empty',
		);
		expect(getByTestId('workflow-settings-custom-telemetry-tags-save')).toBeDisabled();

		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));
		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('should disable modal save when custom telemetry tag keys are duplicated after trim', async () => {
		const { getByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('set-duplicate-tags'));

		expect(getByTestId('workflow-settings-custom-telemetry-tags-modal-error')).toHaveTextContent(
			'Duplicate keys are not allowed',
		);
		expect(getByTestId('workflow-settings-custom-telemetry-tags-save')).toBeDisabled();
	});

	it('should preserve custom telemetry tag values that look like expressions as literals', async () => {
		const { emitted, getByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('set-expression-tags'));
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

		expect(emitted('update:modelValue')).toEqual([[expressionTags]]);
	});

	it('should discard draft changes when cancelled', async () => {
		const { emitted, getByTestId } = renderComponent();

		await openModal(getByTestId);
		await userEvent.click(getByTestId('set-valid-tags'));
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-cancel'));
		await openModal(getByTestId);

		expect(getParameterInputListNodeValues(getByTestId)).toEqual({
			customTelemetryTags: {},
		});
		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('should delete custom telemetry tag rows', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				modelValue: [
					{ key: 'team', value: 'platform' },
					{ key: 'env', value: 'production' },
				],
			},
		});

		await openModal(getByTestId);
		await userEvent.click(getByTestId('delete-first-tag'));
		await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save'));

		expect(emitted('update:modelValue')).toEqual([[[{ key: 'env', value: 'production' }]]]);
	});

	it('should pass read-only state to ParameterInputList and disable save', async () => {
		const { getByTestId } = renderComponent({
			props: {
				isReadOnly: true,
				modelValue: [{ key: 'team', value: 'platform' }],
			},
		});

		await openModal(getByTestId);

		expect(getByTestId('parameter-input-list')).toHaveAttribute('data-is-read-only', 'true');
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
