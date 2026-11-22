import type { CustomActionDraft, CustomActionDraftIssue } from '@n8n/api-types';
import { UserError } from '@n8n/errors';

/**
 * Validates a custom action draft before every save.
 *
 * This is a security boundary. `RoutingNode` evaluates a string that starts with `=` as an
 * expression, and that expression can read credentials. A definition must never carry one.
 */

const INPUT_NAME_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const PLACEHOLDER_PATTERN = /\{([^{}]*)\}/g;

export class InvalidCustomActionError extends UserError {
	constructor(readonly issues: CustomActionDraftIssue[]) {
		super('The custom action is not valid');
	}
}

const containsExpression = (value: string) =>
	value.includes('{{') || value.trimStart().startsWith('=');

/** Collects every string leaf and every object key of a value, with its path. */
function collectStrings(root: unknown, rootPath: string): Array<{ path: string; text: string }> {
	const found: Array<{ path: string; text: string }> = [];
	// Iterative on purpose: a deeply nested body must not overflow the stack.
	const stack: Array<{ value: unknown; path: string }> = [{ value: root, path: rootPath }];
	while (stack.length > 0) {
		const { value, path } = stack.pop()!;
		if (typeof value === 'string') {
			found.push({ path, text: value });
		} else if (Array.isArray(value)) {
			value.forEach((item, index) => stack.push({ value: item, path: `${path}[${index}]` }));
		} else if (value !== null && typeof value === 'object') {
			for (const [key, child] of Object.entries(value)) {
				const childPath = `${path}.${key}`;
				found.push({ path: childPath, text: key });
				stack.push({ value: child, path: childPath });
			}
		}
	}
	return found;
}

function placeholderNames(text: string): string[] {
	return [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]);
}

export function validateDraft(draft: CustomActionDraft): CustomActionDraftIssue[] {
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
	}
	for (const [key, value] of Object.entries(request.query)) {
		checkExpression(`request.query.${key}`, key);
		checkExpression(`request.query.${key}`, value);
	}
	// Report each body path once, even when both the key and the value are bad.
	const seenBodyPaths = new Set<string>();
	for (const { path, text } of collectStrings(request.body, 'request.body')) {
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
		if (absolute) {
			const [, scheme, authority, remainder] = absolute;
			if (scheme.includes('{') || scheme.includes('}')) {
				add('request.url', 'placeholder_in_host', 'A placeholder is not allowed in the scheme.');
			} else if (scheme !== 'http' && scheme !== 'https') {
				add('request.url', 'invalid_url', 'The URL must use http or https.');
			} else if (authority === '') {
				add('request.url', 'invalid_url', 'The URL must have a host.');
			} else if (authority.includes('{') || authority.includes('}')) {
				add('request.url', 'placeholder_in_host', 'A placeholder is not allowed in the host.');
			} else {
				rest = remainder;
			}
		} else if (request.url.startsWith('/') && !request.url.startsWith('//')) {
			rest = request.url;
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

		const id = slot(input.target, input.key);
		if (targetKeys.has(id)) {
			add(
				`inputs[${index}].key`,
				'duplicate_target_key',
				`The ${input.target} key "${input.key}" is already set.`,
			);
		}
		targetKeys.add(id);

		if (input.type === 'options' && (!input.options || input.options.length === 0)) {
			add(
				`inputs[${index}].options`,
				'options_missing',
				'An options input needs at least one option.',
			);
		}
	});

	// Body
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
