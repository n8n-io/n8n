import { t } from '@n8n/node-sdk';

import { form } from '../form.node';

const fieldLabel = t
	.str()
	.title('Label')
	.hint('Shown to the user; the output field unless fieldName is set');
const fieldName = t
	.str()
	.optional()
	.title('Field Name')
	.hint('The output field instead of the label');
const requiredField = t
	.bool()
	.optional()
	.title('Required Field')
	.hint('A required field is never null in the output');
const placeholder = t.str().optional().title('Placeholder');
const defaultValue = t.str().optional().title('Default Value');
const field = { fieldLabel, fieldName, requiredField };
const choices = {
	...field,
	fieldOptions: t
		.obj({ values: t.arr(t.obj({ option: t.str().title('Option') })).title('Values') })
		.title('Field Options'),
	defaultValue,
};
const text = { ...field, placeholder, defaultValue };
const file = t.obj({ filename: t.str(), mimetype: t.str(), size: t.int() });

const formFields = t
	.obj({
		values: t
			.arr(
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
						limitSelection: t
							.oneOf('exact', 'range', 'unlimited')
							.optional()
							.title('Limit Selection'),
						numberOfSelections: t.int().optional().title('Number of Selections'),
						minSelections: t.int().optional().title('Minimum Selections'),
						maxSelections: t.int().optional().title('Maximum Selections'),
					},
					file: {
						...field,
						multipleFiles: t.bool().optional().title('Multiple Files'),
						acceptFileTypes: t
							.str()
							.optional()
							.title('Accepted File Types')
							.hint('e.g. .pdf, .jpg'),
					},
					hiddenField: {
						fieldName: t.str().title('Field Name'),
						fieldValue: t.str().optional().title('Field Value'),
					},
					html: {
						elementName: t.str().optional().title('Element Name').hint('The output field'),
						html: t.str().title('HTML'),
					},
				}),
			)
			.title('Values'),
	})
	.title('Form Elements');

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
			.title('Authentication')
			.hint('Setup asks for the credential'),
		formTitle: t.str().with({ minLength: 1 }).title('Form Title'),
		formDescription: t
			.str()
			.optional()
			.title('Form Description')
			.hint('Shown under the title; HTML is allowed'),
		formFields,
		responseMode: t
			.oneOf('onReceived', 'lastNode')
			.default('onReceived')
			.title('Respond When')
			.hint('lastNode: the form waits for the workflow to finish'),
		options: t
			.obj({
				appendAttribution: t.bool().optional().title('Append n8n Attribution'),
				buttonLabel: t.str().optional().title('Button Label'),
				path: t.str().optional().title('Form Path').hint('The form URL path'),
				respondWithOptions: t
					.obj({
						values: t
							.variant('respondWith', {
								text: { formSubmittedText: t.str().optional().title('Text to Show') },
								redirect: { redirectUrl: t.str().title('URL to Redirect To') },
							})
							.title('Respond With'),
					})
					.title('Form Response')
					.optional(),
				ignoreBots: t.bool().optional().title('Ignore Bots'),
				useWorkflowTimezone: t
					.bool()
					.optional()
					.title('Use Workflow Timezone')
					.hint('submittedAt in the workflow timezone'),
				customCss: t.str().optional().title('Custom Form Styling'),
				ipWhitelist: t
					.str()
					.optional()
					.title('IP(s) Allowlist')
					.hint('Comma-separated IPs or CIDR ranges'),
			})
			.title('Options')
			.optional(),
	},
	output: t
		.openBinaries(
			t.obj({
				...submitted,
				formQueryParameters: t
					.record(t.union(t.str(), t.arr(t.str())))
					.optional()
					.hint('The query of the form URL, when it has one'),
			}),
			'A file under its field name, \\W as _; with multipleFiles also _0, _1, …',
		)
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
			limitWaitTime: t
				.bool()
				.optional()
				.title('Limit Wait Time')
				.hint('true: stop waiting after limitType'),
			limitType: t.oneOf('afterTimeInterval', 'atSpecifiedTime').optional().title('Limit Type'),
			resumeAmount: t.num().optional().title('Amount').hint('For limitType afterTimeInterval'),
			resumeUnit: t.oneOf('minutes', 'hours', 'days').optional().title('Unit'),
			maxDateAndTime: t
				.str()
				.optional()
				.title('Max Date and Time')
				.hint('For limitType atSpecifiedTime: an ISO time'),
			options: t
				.obj({
					formTitle: t.str().optional().title('Form Title'),
					formDescription: t.str().optional().title('Form Description').hint('HTML is allowed'),
					buttonLabel: t.str().optional().title('Button Label'),
					customCss: t.str().optional().title('Custom Form Styling'),
				})
				.title('Options')
				.optional(),
		},
		output: t.obj(submitted).with({ 'x-n8n-entry-fields': entryFields }),
	},
});
