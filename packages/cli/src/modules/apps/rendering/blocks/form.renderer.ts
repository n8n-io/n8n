import { Container } from '@n8n/di';
import type { FormBlock } from '@n8n/api-types';
import { OperationalError, UserError } from 'n8n-workflow';

import { blockStaticData } from '../block-context';
import { sanitizeHtml } from '../sanitize-html';
import { renderPartial } from '../templates';
import type { BlockRenderContext, BlockRenderer } from '../types';

import type { FormJsonField } from '../../runtime/form-json';
import { FormStepClient, formStepQuery, type FormStep } from '../../runtime/form-steps';
import type { AppFormField, AppPageContext } from '../../runtime/page-context.factory';
import { PageContextFactory } from '../../runtime/page-context.factory';

const TEXT_INPUT_TYPES = new Set(['email', 'number', 'date']);
const DEFAULT_SUCCESS_MESSAGE = 'Thank you — your response was recorded.';

/**
 * What the partial branches on: precomputed shape booleans, matching the style of
 * `header.renderer.ts`. The Form Trigger's fields (first page) and a Form node's
 * JSON (later pages) both map into it.
 */
type FieldViewModel = {
	name: string;
	label: string;
	placeholder: string;
	defaultValue: string;
	required: boolean;
	isHidden?: boolean;
	isFileDisabled?: boolean;
	isTextarea?: boolean;
	isCheckbox?: boolean;
	isSelect?: boolean;
	multiple?: boolean;
	options?: string[];
	isChoice?: boolean;
	radio?: boolean;
	isHtml?: boolean;
	html?: string;
	isTextInput?: boolean;
	inputType?: string;
};

function triggerFieldViewModel(field: AppFormField): FieldViewModel {
	const type = field.fieldType ?? 'text';
	const base = {
		name: field.fieldName ?? field.fieldLabel,
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

/** Inputs keep the Form node's own `field-<i>` names, so its POST handler reads them unchanged. */
function stepFieldViewModel(field: FormJsonField): FieldViewModel {
	const base = {
		name: field.id,
		label: field.label,
		placeholder: field.placeholder ?? '',
		defaultValue: String(field.defaultValue ?? ''),
		required: field.inputRequired === 'form-required',
	};

	if (field.isHidden)
		return { ...base, isHidden: true, defaultValue: String(field.hiddenValue ?? '') };
	if (field.isFileInput) return { ...base, isFileDisabled: true };
	if (field.isHtml) return { ...base, isHtml: true, html: sanitizeHtml(field.html ?? '') };
	if (field.isTextarea) return { ...base, isTextarea: true };
	if (field.isSelect)
		return { ...base, isSelect: true, multiple: false, options: field.selectOptions ?? [] };
	if (field.isMultiSelect) {
		// `name[]` makes the body parser deliver an array even for one checked box; the
		// Form node expects a JSON array for these fields and the controller encodes it.
		return {
			...base,
			name: `${field.id}[]`,
			isChoice: true,
			radio: field.radioSelect === 'radio',
			options: (field.multiSelectOptions ?? []).map((o) => o.label),
		};
	}
	return { ...base, isTextInput: true, inputType: field.type ?? 'text' };
}

const successView = (block: FormBlock) => ({
	showSuccess: true,
	successMessage: block.data.successMessage ?? DEFAULT_SUCCESS_MESSAGE,
});

async function renderStep(
	block: FormBlock,
	ctx: BlockRenderContext,
	pageContext: AppPageContext,
	executionId: string,
	token: string,
): Promise<string> {
	let step: FormStep;
	try {
		step = await Container.get(FormStepClient).fetchPage(executionId, token);
	} catch (error) {
		if (!(error instanceof UserError || error instanceof OperationalError)) throw error;
		return await renderPartial('block-form', {
			stepError: error.message,
			restartUrl: ctx.page.path,
		});
	}

	switch (step.kind) {
		case 'running':
			return await renderPartial('block-form', {
				processing: true,
				refreshUrl: `${ctx.page.path}${formStepQuery(block.id, executionId, token)}`,
			});
		case 'finished':
			return await renderPartial('block-form', successView(block));
		case 'completion':
			return await renderPartial('block-form', {
				completion: {
					title: step.title,
					message: sanitizeHtml(step.message),
					responseText: step.responseText ? sanitizeHtml(step.responseText) : undefined,
					redirectUrl: step.redirectUrl,
				},
			});
		case 'page':
			return await renderPartial('block-form', {
				title: step.formTitle,
				description: sanitizeHtml(step.formDescription ?? ''),
				fields: step.formFields.map(stepFieldViewModel),
				actionUrl: pageContext.actionUrl('submit'),
				submitLabel: step.buttonLabel ?? block.data.submitLabel ?? 'Submit',
				step: { executionId, token },
			});
	}
}

export const formBlockRenderer: BlockRenderer<'form'> = {
	type: 'form',
	async render(block, ctx) {
		const { _form, _status, _exec, _sig } = ctx.query;
		const thisForm = _form === block.id;

		if (thisForm && _status === 'ok') return await renderPartial('block-form', successView(block));

		const pageContext = Container.get(PageContextFactory).build({
			...blockStaticData(ctx, block.id),
			logs: [],
		});

		if (thisForm && _exec && _sig) return await renderStep(block, ctx, pageContext, _exec, _sig);

		const form = await pageContext.workflows.getForm(block.data.workflowId);

		return await renderPartial('block-form', {
			title: form.title,
			description: sanitizeHtml(form.description ?? ''),
			fields: form.fields.map(triggerFieldViewModel),
			actionUrl: pageContext.actionUrl('submit'),
			submitLabel: block.data.submitLabel ?? 'Submit',
		});
	},
};
