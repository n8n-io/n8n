import type { CustomActionDraft, CustomActionDraftIssue } from '@n8n/api-types';
import { UserError } from '@n8n/errors';

import { hasControlCharacter } from './base-url-validator';
import { RESERVED_BODY_KEYS, RESERVED_INPUT_NAMES } from './node-description.generator';

/**
 * Validates a custom action draft before every save.
 *
 * A definition holds only plain values. The validator rejects a value that contains `{{` or
 * starts with `=`. The generator builds every expression of the node itself.
 */

const INPUT_NAME_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const PLACEHOLDER_PATTERN = /\{([^{}]*)\}/g;
/** An HTTP header name is a token (RFC 9110). */
const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
/** The largest fixed body, in bytes of its JSON text. */
export const MAX_BODY_BYTES = 64 * 1024;
/** A body input key uses dot and bracket notation. Each part becomes an object key. */
const BODY_KEY_SEPARATORS = /[.[\]]/;

export class InvalidCustomActionError extends UserError {
	constructor(readonly issues: CustomActionDraftIssue[]) {
		super('The custom action is not valid');
	}
}

const containsExpression = (value: string) =>
	value.includes('{{') || value.trimStart().startsWith('=');

/** Collects every string leaf and every object key of a value, with its path. */
function collectStrings(
	root: unknown,
	rootPath: string,
): Array<{ path: string; text: string; isKey: boolean }> {
	const found: Array<{ path: string; text: string; isKey: boolean }> = [];
	// Iterative on purpose: a deeply nested body must not overflow the stack.
	const stack: Array<{ value: unknown; path: string }> = [{ value: root, path: rootPath }];
	while (stack.length > 0) {
		const { value, path } = stack.pop()!;
		if (typeof value === 'string') {
			found.push({ path, text: value, isKey: false });
		} else if (Array.isArray(value)) {
			value.forEach((item, index) => stack.push({ value: item, path: `${path}[${index}]` }));
		} else if (value !== null && typeof value === 'object') {
			for (const [key, child] of Object.entries(value)) {
				const childPath = `${path}.${key}`;
				found.push({ path: childPath, text: key, isKey: true });
				stack.push({ value: child, path: childPath });
			}
		}
	}
	return found;
}

/** The JSON size of the body. A body that cannot be serialized counts as too large. */
function bodyBytes(body: Record<string, unknown>): number {
	try {
		return Buffer.byteLength(JSON.stringify(body));
	} catch {
		return Number.POSITIVE_INFINITY;
	}
}

/** Whether a default has the value type of the parameter that the generator builds. */
function defaultFitsType(input: CustomActionDraft['inputs'][number]): boolean {
	const value = input.default;
	if (value === undefined) return true;
	switch (input.type) {
		case 'number':
			return typeof value === 'number';
		case 'boolean':
			return typeof value === 'boolean';
		case 'string':
		case 'json':
			return typeof value === 'string';
		case 'options':
			return (input.options ?? []).some((option) => option.value === value);
	}
}

function placeholderNames(text: string): string[] {
	return [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]);
}

export interface ValidateDraftOptions {
	/** A custom action in a parent node has no base URL, so its URL must be absolute. */
	absoluteUrl?: boolean;
}

export function validateDraft(
	draft: CustomActionDraft,
	options: ValidateDraftOptions = {},
): CustomActionDraftIssue[] {
	const issues: CustomActionDraftIssue[] = [];
	const add = (path: string, code: string, message: string) => issues.push({ path, code, message });

	const { request, inputs } = draft;

	// Expressions
	const checkExpression = (path: string, text: unknown) => {
		if (typeof text === 'string' && containsExpression(text)) {
			add(path, 'expression_not_allowed', 'A value must not contain an expression.');
		}
	};

	checkExpression('request.url', request.url);
	for (const [name, value] of Object.entries(request.headers)) {
		checkExpression(`request.headers.${name}`, name);
		checkExpression(`request.headers.${name}`, value);
		if (!HEADER_NAME_PATTERN.test(name)) {
			add(
				`request.headers.${name}`,
				'invalid_header_name',
				`"${name}" is not a valid header name.`,
			);
		}
	}
	for (const [key, value] of Object.entries(request.query)) {
		checkExpression(`request.query.${key}`, key);
		checkExpression(`request.query.${key}`, value);
	}
	// Report each body path once, even when both the key and the value are bad.
	const seenBodyPaths = new Set<string>();
	for (const { path, text, isKey } of collectStrings(request.body, 'request.body')) {
		if (isKey && RESERVED_BODY_KEYS.includes(text)) {
			add(path, 'reserved_body_key', `The body key "${text}" is not allowed.`);
		}
		if (containsExpression(text) && !seenBodyPaths.has(path)) {
			seenBodyPaths.add(path);
			checkExpression(path, text);
		}
	}
	inputs.forEach((input, index) => {
		checkExpression(`inputs[${index}].key`, input.key);
		// Defaults and option values become parameter defaults of a real node.
		checkExpression(`inputs[${index}].default`, input.default);
		input.options?.forEach((option, optionIndex) =>
			checkExpression(`inputs[${index}].options[${optionIndex}].value`, option.value),
		);
	});

	// URL
	const allNames = new Set(placeholderNames(request.url));
	const pathNames = new Set<string>();
	{
		const absolute = /^([^:/?#]*):\/\/([^/?#]*)(.*)$/s.exec(request.url);
		let rest: string | undefined;
		// The URL parser reads these characters in another way than the pattern above.
		if (request.url.includes('\\')) {
			add('request.url', 'invalid_url', 'The URL must not contain a backslash.');
		} else if (hasControlCharacter(request.url)) {
			add('request.url', 'invalid_url', 'The URL must not contain a control character.');
		} else if (absolute) {
			const [, scheme, authority, remainder] = absolute;
			if (scheme.includes('{') || scheme.includes('}')) {
				add('request.url', 'placeholder_in_host', 'A placeholder is not allowed in the scheme.');
			} else if (scheme !== 'http' && scheme !== 'https') {
				add('request.url', 'invalid_url', 'The URL must use http or https.');
			} else if (authority === '') {
				add('request.url', 'invalid_url', 'The URL must have a host.');
			} else if (authority.includes('{') || authority.includes('}')) {
				add('request.url', 'placeholder_in_host', 'A placeholder is not allowed in the host.');
			} else if (authority.includes('@')) {
				add('request.url', 'invalid_url', 'The URL must not contain user information.');
			} else {
				rest = remainder;
			}
		} else if (request.url.startsWith('/') && !request.url.startsWith('//')) {
			if (options.absoluteUrl) {
				add(
					'request.url',
					'absolute_url_required',
					'The URL of a custom action in a node must be an absolute http or https URL.',
				);
			} else {
				rest = request.url;
			}
		} else {
			add(
				'request.url',
				'invalid_url',
				'The URL must be an absolute http or https URL, or a path that starts with /.',
			);
		}

		// A `{{` is already reported as an expression. Skip the brace checks for it.
		if (rest !== undefined && !request.url.includes('{{')) {
			const split = rest.search(/[?#]/);
			const pathPart = split === -1 ? rest : rest.slice(0, split);
			const tail = split === -1 ? '' : rest.slice(split);
			if (/[{}]/.test(tail)) {
				add(
					'request.url',
					'invalid_url',
					'A placeholder is not allowed in the query string. Use the query parameters of the request.',
				);
			}
			if (/[{}]/.test(pathPart.replace(PLACEHOLDER_PATTERN, ''))) {
				add('request.url', 'invalid_url', 'The URL has an unmatched brace.');
			}
			for (const name of placeholderNames(pathPart)) {
				if (INPUT_NAME_PATTERN.test(name)) {
					pathNames.add(name);
				} else {
					add('request.url', 'invalid_url', `The placeholder {${name}} has an invalid name.`);
				}
			}
		}
	}

	for (const name of pathNames) {
		if (!inputs.some((i) => i.target === 'url' && i.key === name && i.name === name)) {
			add('request.url', 'unknown_placeholder', `The placeholder {${name}} has no input.`);
		}
	}
	inputs.forEach((input, index) => {
		if (input.target !== 'url') return;
		if (input.key !== input.name || !allNames.has(input.key)) {
			add(
				`inputs[${index}].key`,
				'url_input_not_in_url',
				'A URL input must be a placeholder of the same name in the URL.',
			);
		}
	});

	// Inputs
	const names = new Set<string>();
	const targetKeys = new Set<string>();
	// Header names are not case-sensitive.
	const slot = (target: string, key: string) =>
		`${target}\u0000${target === 'header' ? key.toLowerCase() : key}`;
	for (const name of Object.keys(request.headers)) targetKeys.add(slot('header', name));
	for (const key of Object.keys(request.query)) targetKeys.add(slot('query', key));

	inputs.forEach((input, index) => {
		if (names.has(input.name)) {
			add(
				`inputs[${index}].name`,
				'duplicate_input_name',
				`The input name "${input.name}" is used twice.`,
			);
		}
		names.add(input.name);

		if (RESERVED_INPUT_NAMES.includes(input.name)) {
			add(
				`inputs[${index}].name`,
				'reserved_input_name',
				`The input name "${input.name}" is reserved.`,
			);
		}
		// An empty value of an optional URL input would change the path structure.
		if (input.target === 'url' && !input.required) {
			add(`inputs[${index}].required`, 'url_input_not_required', 'A URL input must be required.');
		}

		const id = slot(input.target, input.key);
		if (targetKeys.has(id)) {
			add(
				`inputs[${index}].key`,
				'duplicate_target_key',
				`The ${input.target} key "${input.key}" is already set.`,
			);
		}
		targetKeys.add(id);

		if (input.target === 'header' && !HEADER_NAME_PATTERN.test(input.key)) {
			add(
				`inputs[${index}].key`,
				'invalid_header_name',
				`"${input.key}" is not a valid header name.`,
			);
		}
		if (
			input.target === 'body' &&
			input.key.split(BODY_KEY_SEPARATORS).some((part) => RESERVED_BODY_KEYS.includes(part))
		) {
			add(
				`inputs[${index}].key`,
				'reserved_body_key',
				`The body key "${input.key}" is not allowed.`,
			);
		}

		if (input.type === 'options' && (!input.options || input.options.length === 0)) {
			add(
				`inputs[${index}].options`,
				'options_missing',
				'An options input needs at least one option.',
			);
		}
		if (input.type === 'options') {
			const values = new Set<string>();
			input.options?.forEach((option, optionIndex) => {
				if (values.has(option.value)) {
					add(
						`inputs[${index}].options[${optionIndex}].value`,
						'duplicate_option_value',
						`The option value "${option.value}" is used twice.`,
					);
				}
				values.add(option.value);
			});
		}
		if (!defaultFitsType(input)) {
			add(
				`inputs[${index}].default`,
				'invalid_default',
				input.type === 'options'
					? 'The default must be one of the option values.'
					: `The default must be a value of the type ${input.type}.`,
			);
		}
	});

	// Body
	if (bodyBytes(request.body) > MAX_BODY_BYTES) {
		add('request.body', 'body_too_large', 'The body must not be larger than 64 KiB.');
	}
	if (request.bodyType === 'none') {
		if (Object.keys(request.body).length > 0) {
			add(
				'request.body',
				'body_without_body_type',
				'The body type is none, but the request has a body.',
			);
		}
		inputs.forEach((input, index) => {
			if (input.target === 'body') {
				add(
					`inputs[${index}].target`,
					'body_without_body_type',
					'The body type is none, but an input targets the body.',
				);
			}
		});
	}

	return issues;
}
