import { z } from 'zod';

/**
 * What a Form node answers to `Accept: application/json` (`toFormPageJson` and the
 * completion branch in `packages/nodes-base/nodes/Form/utils`). Workflow-controlled
 * data crosses into the renderer here, so it is validated before anything is rendered.
 */

const displayValue = z.union([z.string(), z.number(), z.boolean()]).catch('');

export const formJsonFieldSchema = z.object({
	id: z.string().min(1).max(50),
	label: z.string().max(1000).default(''),
	inputRequired: z.enum(['form-required', '']).default(''),
	type: z.enum(['text', 'number', 'date', 'email']).optional(),
	defaultValue: displayValue.optional(),
	placeholder: z.string().max(1000).optional(),
	isInput: z.boolean().optional(),
	isTextarea: z.boolean().optional(),
	isSelect: z.boolean().optional(),
	selectOptions: z.array(z.string().max(1000)).max(500).optional(),
	isMultiSelect: z.boolean().optional(),
	radioSelect: z.literal('radio').optional(),
	multiSelectOptions: z
		.array(z.object({ id: z.string().max(100), label: z.string().max(1000) }))
		.max(500)
		.optional(),
	isFileInput: z.boolean().optional(),
	isHtml: z.boolean().optional(),
	html: z.string().max(50_000).optional(),
	isHidden: z.boolean().optional(),
	hiddenName: z.string().max(200).optional(),
	hiddenValue: displayValue.optional(),
});

export const formPageJsonSchema = z.object({
	kind: z.literal('page'),
	formTitle: z.string().max(1000).default(''),
	formDescription: z.string().max(10_000).optional(),
	buttonLabel: z.string().max(100).optional(),
	formFields: z.array(formJsonFieldSchema).max(200),
});

export const formCompletionJsonSchema = z.object({
	kind: z.literal('completion'),
	title: z.string().max(1000).default(''),
	message: z.string().max(10_000).default(''),
	formTitle: z.string().max(1000).optional(),
	redirectUrl: z.string().url().max(2048).optional(),
	responseText: z.string().max(50_000).optional(),
});

export const formStepJsonSchema = z.discriminatedUnion('kind', [
	formPageJsonSchema,
	formCompletionJsonSchema,
]);

export type FormJsonField = z.infer<typeof formJsonFieldSchema>;
export type FormPageJson = z.infer<typeof formPageJsonSchema>;
export type FormCompletionJson = z.infer<typeof formCompletionJsonSchema>;
export type FormStepJson = z.infer<typeof formStepJsonSchema>;
