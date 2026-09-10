import { Container } from '@n8n/di';

import { blockStaticData } from '../block-context';
import { renderPartial } from '../templates';
import type { BlockRenderer } from '../types';

import type { AppFormField } from '../../runtime/page-context.factory';
import { PageContextFactory } from '../../runtime/page-context.factory';

const TEXT_INPUT_TYPES = new Set(['email', 'number', 'date']);

/** Precomputed booleans, matching the style of `header.renderer.ts` — the handlebars
 * partial branches on shape, not on field-type strings. */
function toFieldViewModel(field: AppFormField) {
	const name = field.fieldName ?? field.fieldLabel;
	const type = field.fieldType ?? 'text';
	const base = {
		name,
		label: field.fieldLabel,
		placeholder: field.placeholder ?? '',
		defaultValue: field.defaultValue ?? '',
		required: field.requiredField ?? false,
	};

	if (type === 'hiddenField') return { ...base, isHidden: true };
	if (type === 'file') return { ...base, isFileDisabled: true };
	if (type === 'textarea') return { ...base, isTextarea: true };
	if (type === 'checkbox') return { ...base, isCheckbox: true };
	if (type === 'dropdown') {
		return {
			...base,
			isSelect: true,
			multiple: field.multiselect ?? false,
			options: (field.fieldOptions?.values ?? []).map((o) => o.option),
		};
	}
	return { ...base, isTextInput: true, inputType: TEXT_INPUT_TYPES.has(type) ? type : 'text' };
}

export const formBlockRenderer: BlockRenderer<'form'> = {
	type: 'form',
	async render(block, ctx) {
		if (ctx.query._form === block.id && ctx.query._status === 'ok') {
			return await renderPartial('block-form', {
				showSuccess: true,
				successMessage: block.data.successMessage ?? 'Thank you — your response was recorded.',
			});
		}

		const pageContext = Container.get(PageContextFactory).build({
			...blockStaticData(ctx, block.id),
			logs: [],
		});

		const form = await pageContext.workflows.getForm(block.data.workflowId);

		return await renderPartial('block-form', {
			title: form.title,
			description: form.description,
			fields: form.fields.map(toFieldViewModel),
			actionUrl: pageContext.actionUrl('submit'),
			submitLabel: block.data.submitLabel ?? 'Submit',
		});
	},
};
