import type { FormFieldsParameter, IDataObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import sanitize from 'sanitize-html';

export const prepareFormFields = (fields: FormFieldsParameter) => {
	return fields.map((field) => {
		if (field.fieldType === 'html') {
			const { html } = field;

			if (!html) return field;

			// TODO:
			// for (const resolvable of getResolvables(html)) {
			// 	html = html.replace(resolvable, context.evaluateExpression(resolvable) as string);
			// }

			field.html = sanitizeHtml(html);
		}

		if (field.fieldType === 'hiddenField') {
			field.fieldLabel = field.fieldName as string;
		}

		return field;
	});
};

export function prepareFormData({
	formTitle,
	formDescription,
	formSubmittedHeader,
	formSubmittedText,
	formFields,
	testRun,
	query,
	instanceId,
	useResponseData,
	appendAttribution = true,
	buttonLabel,
	customCss,
}: {
	formTitle: string;
	formDescription: string;
	formSubmittedText: string | undefined;
	redirectUrl: string | undefined;
	formFields: FormFieldsParameter;
	testRun: boolean;
	query: IDataObject;
	instanceId?: string;
	useResponseData?: boolean;
	appendAttribution?: boolean;
	buttonLabel?: string;
	formSubmittedHeader?: string;
	customCss?: string;
}) {
	const utm_campaign = instanceId ? `&utm_campaign=${instanceId}` : '';
	const n8nWebsiteLink = `https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger${utm_campaign}`;

	if (formSubmittedText === undefined) {
		formSubmittedText = 'Your response has been recorded';
	}

	const formData = {
		testRun,
		formTitle,
		formDescription,
		formDescriptionMetadata: '',
		formSubmittedHeader,
		formSubmittedText,
		n8nWebsiteLink,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		formFields: [] as any[],
		useResponseData,
		appendAttribution,
		buttonLabel,
		// TODO: sanitize
		dangerousCustomCss: customCss,
	};

	for (const [index, field] of formFields.entries()) {
		const { fieldType, requiredField, multiselect, placeholder } = field;

		const input: Record<string, unknown> = {
			id: `field-${index}`,
			errorId: `error-field-${index}`,
			label: field.fieldLabel,
			inputRequired: requiredField ? 'form-required' : '',
			defaultValue: query[field.fieldLabel] ?? '',
			placeholder,
		};

		if (multiselect || (fieldType && ['radio', 'checkbox'].includes(fieldType))) {
			input.isMultiSelect = true;
			input.multiSelectOptions =
				field.fieldOptions?.values.map((e, i) => ({
					id: `option${i}_${input.id}`,
					label: e.option,
				})) ?? [];

			if (fieldType === 'radio') {
				input.radioSelect = 'radio';
			} else if (field.limitSelection === 'exact') {
				input.exactSelectedOptions = field.numberOfSelections;
			} else if (field.limitSelection === 'range') {
				input.minSelectedOptions = field.minSelections;
				input.maxSelectedOptions = field.maxSelections;
			}
		} else if (fieldType === 'file') {
			input.isFileInput = true;
			input.acceptFileTypes = field.acceptFileTypes;
			input.multipleFiles = field.multipleFiles ? 'multiple' : '';
		} else if (fieldType === 'dropdown') {
			input.isSelect = true;
			const fieldOptions = field.fieldOptions?.values ?? [];
			input.selectOptions = fieldOptions.map((e) => e.option);
		} else if (fieldType === 'textarea') {
			input.isTextarea = true;
		} else if (fieldType === 'html') {
			input.isHtml = true;
			input.html = field.html as string;
		} else if (fieldType === 'hiddenField') {
			input.isHidden = true;
			input.hiddenName = field.fieldName as string;
			input.hiddenValue =
				input.defaultValue === '' ? (field.fieldValue as string) : input.defaultValue;
		} else {
			input.isInput = true;
			input.type = fieldType as 'text' | 'number' | 'date' | 'email';
		}

		formData.formFields.push(input);
	}

	return formData;
}

export function getResolvables(expression: string) {
	if (!expression) return [];

	const resolvables = [];
	const resolvableRegex = /({{[\s\S]*?}})/g;

	let match;

	while ((match = resolvableRegex.exec(expression)) !== null) {
		if (match[1]) {
			resolvables.push(match[1]);
		}
	}

	return resolvables;
}

export function sanitizeHtml(text: string) {
	return sanitize(text, {
		allowedTags: [
			'b',
			'div',
			'i',
			'iframe',
			'img',
			'video',
			'source',
			'em',
			'strong',
			'a',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'u',
			'sub',
			'sup',
			'code',
			'pre',
			'span',
			'br',
			'ul',
			'ol',
			'li',
			'p',
		],
		allowedAttributes: {
			a: ['href', 'target', 'rel'],
			img: ['src', 'alt', 'width', 'height'],
			video: ['controls', 'autoplay', 'loop', 'muted', 'poster', 'width', 'height'],
			iframe: [
				'src',
				'width',
				'height',
				'frameborder',
				'allow',
				'allowfullscreen',
				'referrerpolicy',
			],
			source: ['src', 'type'],
		},
		allowedSchemes: ['https', 'http'],
		allowedSchemesByTag: {
			source: ['https', 'http'],
			iframe: ['https', 'http'],
		},
		allowProtocolRelative: false,
		transformTags: {
			iframe: sanitize.simpleTransform('iframe', {
				sandbox: '',
				referrerpolicy: 'strict-origin-when-cross-origin',
				allow: 'fullscreen; autoplay; encrypted-media',
			}),
		},
	});
}

const ALLOWED_FORM_FIELDS_KEYS = [
	'fieldLabel',
	'fieldType',
	'placeholder',
	'fieldOptions',
	'multiselect',
	'multipleFiles',
	'acceptFileTypes',
	'formatDate',
	'requiredField',
];

const ALLOWED_FIELD_TYPES = [
	'date',
	'dropdown',
	'email',
	'file',
	'number',
	'password',
	'text',
	'textarea',
];

export const tryToParseJsonToFormFields = (value: unknown): FormFieldsParameter => {
	const fields: FormFieldsParameter = [];

	try {
		const rawFields = jsonParse<Array<{ [key: string]: unknown }>>(value as string, {
			acceptJSObject: true,
		});

		for (const [index, field] of rawFields.entries()) {
			for (const key of Object.keys(field)) {
				if (!ALLOWED_FORM_FIELDS_KEYS.includes(key)) {
					throw new Error(`Key '${key}' in field ${index} is not valid for form fields`);
				}
				if (
					key !== 'fieldOptions' &&
					!['string', 'number', 'boolean'].includes(typeof field[key])
				) {
					field[key] = String(field[key]);
				} else if (typeof field[key] === 'string') {
					field[key] = field[key].replace(/</g, '&lt;').replace(/>/g, '&gt;');
				}

				if (key === 'fieldType' && !ALLOWED_FIELD_TYPES.includes(field[key] as string)) {
					throw new Error(
						`Field type '${field[key] as string}' in field ${index} is not valid for form fields`,
					);
				}

				if (key === 'fieldOptions') {
					if (Array.isArray(field[key])) {
						field[key] = { values: field[key] };
					}

					if (
						typeof field[key] !== 'object' ||
						!(field[key] as { [key: string]: unknown }).values
					) {
						throw new Error(
							`Field dropdown in field ${index} does has no 'values' property that contain an array of options`,
						);
					}

					for (const [optionIndex, option] of (
						(field[key] as { [key: string]: unknown }).values as Array<{
							[key: string]: { option: string };
						}>
					).entries()) {
						if (Object.keys(option).length !== 1 || typeof option.option !== 'string') {
							throw new Error(
								`Field dropdown in field ${index} has an invalid option ${optionIndex}`,
							);
						}
					}
				}
			}

			fields.push(field as FormFieldsParameter[number]);
		}
	} catch (error) {
		if (error instanceof Error) throw error;

		throw new Error('Value is not valid JSON');
	}

	return fields;
};
