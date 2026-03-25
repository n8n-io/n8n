import {ChildProcess} from 'node:child_process';
import isPlainObject from 'is-plain-obj';
import {isUint8Array, uint8ArrayToString} from '../utils/uint-array.js';

// Check whether the template string syntax is being used
export const isTemplateString = templates => Array.isArray(templates) && Array.isArray(templates.raw);

// Convert execa`file ...commandArguments` to execa(file, commandArguments)
export const parseTemplates = (templates, expressions) => {
	let tokens = [];

	for (const [index, template] of templates.entries()) {
		tokens = parseTemplate({
			templates,
			expressions,
			tokens,
			index,
			template,
		});
	}

	if (tokens.length === 0) {
		throw new TypeError('Template script must not be empty');
	}

	const [file, ...commandArguments] = tokens;
	return [file, commandArguments, {}];
};

const parseTemplate = ({templates, expressions, tokens, index, template}) => {
	if (template === undefined) {
		throw new TypeError(`Invalid backslash sequence: ${templates.raw[index]}`);
	}

	const {nextTokens, leadingWhitespaces, trailingWhitespaces} = splitByWhitespaces(template, templates.raw[index]);
	const newTokens = concatTokens(tokens, nextTokens, leadingWhitespaces);

	if (index === expressions.length) {
		return newTokens;
	}

	const expression = expressions[index];
	const expressionTokens = Array.isArray(expression)
		? expression.map(expression => parseExpression(expression))
		: [parseExpression(expression)];
	return concatTokens(newTokens, expressionTokens, trailingWhitespaces);
};

// Like `string.split(/[ \t\r\n]+/)` except newlines and tabs are:
//  - ignored when input as a backslash sequence like: `echo foo\n bar`
//  - not ignored when input directly
// The only way to distinguish those in JavaScript is to use a tagged template and compare:
//  - the first array argument, which does not escape backslash sequences
//  - its `raw` property, which escapes them
const splitByWhitespaces = (template, rawTemplate) => {
	if (rawTemplate.length === 0) {
		return {nextTokens: [], leadingWhitespaces: false, trailingWhitespaces: false};
	}

	const nextTokens = [];
	let templateStart = 0;
	const leadingWhitespaces = DELIMITERS.has(rawTemplate[0]);

	for (
		let templateIndex = 0, rawIndex = 0;
		templateIndex < template.length;
		templateIndex += 1, rawIndex += 1
	) {
		const rawCharacter = rawTemplate[rawIndex];
		if (DELIMITERS.has(rawCharacter)) {
			if (templateStart !== templateIndex) {
				nextTokens.push(template.slice(templateStart, templateIndex));
			}

			templateStart = templateIndex + 1;
		} else if (rawCharacter === '\\') {
			const nextRawCharacter = rawTemplate[rawIndex + 1];
			if (nextRawCharacter === '\n') {
				// Handles escaped newlines in templates
				templateIndex -= 1;
				rawIndex += 1;
			} else if (nextRawCharacter === 'u' && rawTemplate[rawIndex + 2] === '{') {
				rawIndex = rawTemplate.indexOf('}', rawIndex + 3);
			} else {
				rawIndex += ESCAPE_LENGTH[nextRawCharacter] ?? 1;
			}
		}
	}

	const trailingWhitespaces = templateStart === template.length;
	if (!trailingWhitespaces) {
		nextTokens.push(template.slice(templateStart));
	}

	return {nextTokens, leadingWhitespaces, trailingWhitespaces};
};

const DELIMITERS = new Set([' ', '\t', '\r', '\n']);

// Number of characters in backslash escape sequences: \0 \xXX or \uXXXX
// \cX is allowed in RegExps but not in strings
// Octal sequences are not allowed in strict mode
const ESCAPE_LENGTH = {x: 3, u: 5};

const concatTokens = (tokens, nextTokens, isSeparated) => isSeparated
	|| tokens.length === 0
	|| nextTokens.length === 0
	? [...tokens, ...nextTokens]
	: [
		...tokens.slice(0, -1),
		`${tokens.at(-1)}${nextTokens[0]}`,
		...nextTokens.slice(1),
	];

// Handle `${expression}` inside the template string syntax
const parseExpression = expression => {
	const typeOfExpression = typeof expression;

	if (typeOfExpression === 'string') {
		return expression;
	}

	if (typeOfExpression === 'number') {
		return String(expression);
	}

	if (isPlainObject(expression) && ('stdout' in expression || 'isMaxBuffer' in expression)) {
		return getSubprocessResult(expression);
	}

	if (expression instanceof ChildProcess || Object.prototype.toString.call(expression) === '[object Promise]') {
		// eslint-disable-next-line no-template-curly-in-string
		throw new TypeError('Unexpected subprocess in template expression. Please use ${await subprocess} instead of ${subprocess}.');
	}

	throw new TypeError(`Unexpected "${typeOfExpression}" in template expression`);
};

const getSubprocessResult = ({stdout}) => {
	if (typeof stdout === 'string') {
		return stdout;
	}

	if (isUint8Array(stdout)) {
		return uint8ArrayToString(stdout);
	}

	if (stdout === undefined) {
		throw new TypeError('Missing result.stdout in template expression. This is probably due to the previous subprocess\' "stdout" option.');
	}

	throw new TypeError(`Unexpected "${typeof stdout}" stdout in template expression`);
};
