import { arr, bool, int, num, obj, oneOf, record, str, union, variant } from '@n8n/node-sdk';

import { form } from '../form.node';

const fieldLabel = str().hint('Shown to the user; the output field unless fieldName is set');
const fieldName = str().optional().hint('The output field instead of the label');
const requiredField = bool().optional().hint('A required field is never null in the output');
const placeholder = str().optional();
const defaultValue = str().optional();
const field = { fieldLabel, fieldName, requiredField };
const choices = {
	...field,
	fieldOptions: obj({ values: arr(obj({ option: str() })) }),
	defaultValue,
};
const text = { ...field, placeholder, defaultValue };
const file = obj({ filename: str(), mimetype: str(), size: int() });

/** The Form Trigger node, version 2.6. */
export const formTrigger = form.trigger('trigger', {
	trigger: 'On form submission',
	summary: 'Serves a form page and starts the workflow when a user submits it.',
	input: {
		authentication: oneOf('none', 'basicAuth', 'n8nUserAuth')
			.default('none')
			.hint('Setup asks for the credential'),
		formTitle: str().with({ minLength: 1 }),
		formDescription: str().optional().hint('Shown under the title; HTML is allowed'),
		formFields: obj({
			values: arr(
				variant('fieldType', {
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
						limitSelection: oneOf('exact', 'range', 'unlimited').optional(),
						numberOfSelections: int().optional(),
						minSelections: int().optional(),
						maxSelections: int().optional(),
					},
					file: {
						...field,
						multipleFiles: bool().optional(),
						acceptFileTypes: str().optional().hint('e.g. .pdf, .jpg'),
					},
					hiddenField: { fieldName: str(), fieldValue: str().optional() },
					html: { elementName: str().optional().hint('The output field'), html: str() },
				}),
			),
		}),
		responseMode: oneOf('onReceived', 'lastNode')
			.default('onReceived')
			.hint('lastNode: the form waits for the workflow to finish'),
		options: obj({
			appendAttribution: bool().optional(),
			buttonLabel: str().optional(),
			path: str().optional().hint('The form URL path'),
			respondWithOptions: obj({
				values: variant('respondWith', {
					text: { formSubmittedText: str().optional() },
					redirect: { redirectUrl: str() },
				}),
			}).optional(),
			ignoreBots: bool().optional(),
			useWorkflowTimezone: bool().optional().hint('submittedAt in the workflow timezone'),
			customCss: str().optional(),
			ipWhitelist: str().optional().hint('Comma-separated IPs or CIDR ranges'),
		}).optional(),
	},
	output: obj({
		submittedAt: str().hint('ISO time, UTC unless options.useWorkflowTimezone'),
		formMode: oneOf('test', 'production'),
		formQueryParameters: record(union(str(), arr(str())))
			.optional()
			.hint('The query of the form URL, when it has one'),
		user: obj({ id: str(), email: str(), firstName: str(), lastName: str() })
			.optional()
			.hint('For authentication n8nUserAuth: who submitted the form'),
	}).with({
		'x-n8n-entry-fields': {
			list: ['formFields', 'values'],
			key: ['fieldName', 'fieldLabel', 'elementName'],
			type: 'fieldType',
			types: {
				['number']: num().json,
				checkbox: arr(str()).json,
				file: union(arr(file), file).hint(
					'A list unless multipleFiles is false; the files are binaries of the item',
				).json,
			},
			fallback: str().json,
			required: 'requiredField',
		},
	}),
	native: { type: 'n8n-nodes-base.formTrigger', version: 2.6, on: 'form' },
});
