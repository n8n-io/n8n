import { t } from '@n8n/node-sdk';

import { form } from '../form.node';

const fieldLabel = t.str().hint('Shown to the user; the output field unless fieldName is set');
const fieldName = t.str().optional().hint('The output field instead of the label');
const requiredField = t.bool().optional().hint('A required field is never null in the output');
const placeholder = t.str().optional();
const defaultValue = t.str().optional();
const field = { fieldLabel, fieldName, requiredField };
const choices = {
	...field,
	fieldOptions: t.obj({ values: t.arr(t.obj({ option: t.str() })) }),
	defaultValue,
};
const text = { ...field, placeholder, defaultValue };
const file = t.obj({ filename: t.str(), mimetype: t.str(), size: t.int() });

const formFields = t.obj({
	values: t.arr(
		t.variant('fieldType', {
			text,
			textarea: text,
			email: text,
			['number']: text,
			password: { ...field, placeholder },
			date: { ...field, defaultValue },
			dropdown: choices,
			radio: choices,
			checkbox: {
				...choices,
				limitSelection: t.oneOf('exact', 'range', 'unlimited').optional(),
				numberOfSelections: t.int().optional(),
				minSelections: t.int().optional(),
				maxSelections: t.int().optional(),
			},
			file: {
				...field,
				multipleFiles: t.bool().optional(),
				acceptFileTypes: t.str().optional().hint('e.g. .pdf, .jpg'),
			},
			hiddenField: { fieldName: t.str(), fieldValue: t.str().optional() },
			html: { elementName: t.str().optional().hint('The output field'), html: t.str() },
		}),
	),
});

/** One output field per form field: a page emits the fields of its own form, as the trigger does. */
const entryFields = {
	list: ['formFields', 'values'],
	key: ['fieldName', 'fieldLabel', 'elementName'],
	type: 'fieldType',
	types: {
		['number']: t.num().json,
		checkbox: t.arr(t.str()).json,
		file: t
			.union(t.arr(file), file)
			.hint('A list unless multipleFiles is false; the files are binaries of the item').json,
	},
	fallback: t.str().json,
	required: 'requiredField',
};

const submitted = {
	submittedAt: t.str().hint('ISO time, UTC unless options.useWorkflowTimezone'),
	formMode: t.oneOf('test', 'production'),
	user: t
		.obj({ id: t.str(), email: t.str(), firstName: t.str(), lastName: t.str() })
		.optional()
		.hint('For authentication n8nUserAuth: who submitted the form'),
};

/** The Form Trigger node, version 2.6. */
export const formTrigger = form.trigger('trigger', {
	trigger: 'On form submission',
	summary: 'Serves a form page and starts the workflow when a user submits it.',
	input: {
		authentication: t
			.oneOf('none', 'basicAuth', 'n8nUserAuth')
			.default('none')
			.hint('Setup asks for the credential'),
		formTitle: t.str().with({ minLength: 1 }),
		formDescription: t.str().optional().hint('Shown under the title; HTML is allowed'),
		formFields,
		responseMode: t
			.oneOf('onReceived', 'lastNode')
			.default('onReceived')
			.hint('lastNode: the form waits for the workflow to finish'),
		options: t
			.obj({
				appendAttribution: t.bool().optional(),
				buttonLabel: t.str().optional(),
				path: t.str().optional().hint('The form URL path'),
				respondWithOptions: t
					.obj({
						values: t.variant('respondWith', {
							text: { formSubmittedText: t.str().optional() },
							redirect: { redirectUrl: t.str() },
						}),
					})
					.optional(),
				ignoreBots: t.bool().optional(),
				useWorkflowTimezone: t.bool().optional().hint('submittedAt in the workflow timezone'),
				customCss: t.str().optional(),
				ipWhitelist: t.str().optional().hint('Comma-separated IPs or CIDR ranges'),
			})
			.optional(),
	},
	output: t
		.obj({
			...submitted,
			formQueryParameters: t
				.record(t.union(t.str(), t.arr(t.str())))
				.optional()
				.hint('The query of the form URL, when it has one'),
		})
		.with({ 'x-n8n-entry-fields': entryFields }),
	native: { type: 'n8n-nodes-base.formTrigger', version: 2.6, on: 'form' },
	reply: {
		operation: 'page',
		action: 'Show the next form page',
		summary:
			'Shows the next page of the form to the same user and emits the fields they submit there.',
		native: { type: 'n8n-nodes-base.form', version: 2.5 },
		input: {
			formFields,
			limitWaitTime: t.bool().optional().hint('true: stop waiting after limitType'),
			limitType: t.oneOf('afterTimeInterval', 'atSpecifiedTime').optional(),
			resumeAmount: t.num().optional().hint('For limitType afterTimeInterval'),
			resumeUnit: t.oneOf('minutes', 'hours', 'days').optional(),
			maxDateAndTime: t.str().optional().hint('For limitType atSpecifiedTime: an ISO time'),
			options: t
				.obj({
					formTitle: t.str().optional(),
					formDescription: t.str().optional().hint('HTML is allowed'),
					buttonLabel: t.str().optional(),
					customCss: t.str().optional(),
				})
				.optional(),
		},
		output: t.obj(submitted).with({ 'x-n8n-entry-fields': entryFields }),
	},
});
