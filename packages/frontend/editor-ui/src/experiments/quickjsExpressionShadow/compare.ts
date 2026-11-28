import { DateTime, Duration, Interval } from 'luxon';
import { ExpressionExtensions } from 'n8n-workflow';

// Each run reads the clock or a random source, so two engines legitimately disagree.
const NON_DETERMINISTIC_PATTERN =
	/\$now\b|\$today\b|\bDate\b|\bDateTime\s*\.\s*(?:now|local|utc)\b|\bMath\s*\.\s*random\b|\.randomItem\s*\(/;

/** Whether the value of an expression depends on when it runs, so values cannot be compared. */
export function isNonDeterministic(source: string): boolean {
	return NON_DETERMINISTIC_PATTERN.test(source);
}

export function valueType(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	if (DateTime.isDateTime(value)) return 'DateTime';
	if (Duration.isDuration(value)) return 'Duration';
	if (Interval.isInterval(value)) return 'Interval';
	if (value instanceof Date) return 'Date';
	if (value instanceof Map) return 'Map';
	if (value instanceof Set) return 'Set';
	if (value instanceof Error) return 'Error';
	if (value instanceof String) return 'String';
	if (value instanceof Number) return 'Number';
	if (value instanceof Boolean) return 'Boolean';
	return typeof value;
}

const MAX_SKELETON_LENGTH = 300;

// Names that come from JavaScript or n8n, not from the user's data.
const KNOWN_NAMES = new Set(
	[
		'Array BigInt Boolean Date DateTime Duration Error Interval Intl JSON Map Math Number Object',
		'RegExp Set String Symbol decodeURI decodeURIComponent encodeURI encodeURIComponent isFinite',
		'isNaN parseFloat parseInt Infinity NaN false null true undefined',
		'break case catch const continue default delete do else finally for function if in instanceof',
		'let new of return switch this throw try typeof var void while',
		// Roots that the data proxy and the extended functions define. Other `$` names are the user's.
		'$ $agentInfo $average $binary $data $env $evaluateExpression $execution $fromAI $fromAi',
		'$fromai $getPairedItem $if $ifEmpty $input $item $itemIndex $items $jmesPath $jmespath $json',
		'$max $min $mode $node $nodeId $nodeVersion $not $now $pageCount $parameter $position',
		'$prevNode $rawParameter $request $response $runIndex $secrets $self $thisItem $thisItemIndex',
		'$thisRunIndex $today $tool $vars $webhookId $workflow',
	]
		.join(' ')
		.split(' '),
);

// Members that n8n or JavaScript define, so reading them does not reveal user data.
const KNOWN_MEMBERS = new Set(
	'binary context isExecuted item json length pairedItem params runIndex'.split(' '),
);

// n8n data proxy methods, and extensions that are not in the extension maps.
const N8N_METHODS = ['all', 'first', 'isEmpty', 'isNotEmpty', 'itemMatching', 'last'];

let knownMethods: Set<string> | undefined;

/** Methods that JavaScript, luxon or n8n define. Any other called member is code the user wrote. */
function getKnownMethods(): Set<string> {
	if (knownMethods) return knownMethods;

	const names = new Set(N8N_METHODS);
	const statics: object[] = [Object, Array, String, Number, Date, Math, JSON];
	const classes = [Object, Array, String, Number, Boolean, Date, RegExp, Map, Set];
	const luxon = [DateTime, Duration, Interval];
	const prototypes = [...classes, ...luxon].map((type): object => type.prototype);
	for (const owner of [...statics, ...luxon, ...prototypes]) {
		for (const name of Object.getOwnPropertyNames(owner)) names.add(name);
	}
	for (const extensions of ExpressionExtensions) {
		for (const name of Object.keys(extensions.functions)) names.add(name);
	}

	knownMethods = names;
	return names;
}

// Unicode-aware, so a field name in any script becomes `<id>` instead of raw characters.
const IDENTIFIER = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200c\u200d]*/u;
// What is left after names, numbers and strings. Anything else becomes `?`.
const ASCII_PUNCTUATION = /^[!-/:-@[-`{-~]$/;
const NUMBER =
	/^(?:0[xXoObB][\da-fA-F_]+n?|\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?n?|\.\d+(?:[eE][+-]?\d+)?)/;

/**
 * The shape of an expression, without the parts that can hold user data:
 * field names become `<id>`, methods the user wrote `<fn>`, strings `<str>`,
 * numbers `<num>`, and text outside `{{ }}` becomes `<text>`. Known methods,
 * `$` variables and JavaScript names stay, so a mismatch can be reproduced
 * without seeing the original expression.
 */
export function expressionSkeleton(source: string): string {
	const tokens: string[] = [];
	let index = 0;
	let inCode = false;
	let depth = 0;
	let afterDot = false;
	let hasText = false;

	const flushText = () => {
		if (hasText) tokens.push('<text>');
		hasText = false;
	};

	while (index < source.length) {
		if (!inCode) {
			if (source.startsWith('{{', index)) {
				flushText();
				tokens.push('{{');
				inCode = true;
				depth = 0;
				afterDot = false;
				index += 2;
			} else {
				hasText = true;
				index += 1;
			}
			continue;
		}

		const rest = source.slice(index);
		const char = source[index];

		if (depth === 0 && rest.startsWith('}}')) {
			tokens.push('}}');
			inCode = false;
			index += 2;
			continue;
		}
		if (/\s/.test(char)) {
			index += 1;
			continue;
		}
		if (char === '"' || char === "'" || char === '`') {
			index = skipString(source, index);
			tokens.push('<str>');
			afterDot = false;
			continue;
		}

		const number = NUMBER.exec(rest);
		if (number) {
			index += number[0].length;
			tokens.push('<num>');
			afterDot = false;
			continue;
		}

		const identifier = IDENTIFIER.exec(rest);
		if (identifier) {
			const name = identifier[0];
			index += name.length;
			if (afterDot) {
				if (nextNonSpace(source, index) === '(') {
					tokens.push(getKnownMethods().has(name) ? name : '<fn>');
				} else {
					tokens.push(KNOWN_MEMBERS.has(name) ? name : '<id>');
				}
			} else {
				tokens.push(KNOWN_NAMES.has(name) ? name : '<id>');
			}
			afterDot = false;
			continue;
		}

		if (rest.startsWith('?.') && !/\d/.test(rest[2] ?? '')) {
			tokens.push('?.');
			afterDot = true;
			index += 2;
			continue;
		}

		if (char === '{' || char === '(' || char === '[') depth += 1;
		if (char === '}' || char === ')' || char === ']') depth = Math.max(0, depth - 1);
		tokens.push(ASCII_PUNCTUATION.test(char) ? char : '?');
		afterDot = char === '.';
		index += 1;
	}
	flushText();

	const skeleton = joinTokens(tokens);
	return skeleton.length > MAX_SKELETON_LENGTH
		? `${skeleton.slice(0, MAX_SKELETON_LENGTH)}…`
		: skeleton;
}

function skipString(source: string, start: number): number {
	const quote = source[start];
	let index = start + 1;
	while (index < source.length) {
		if (source[index] === '\\') {
			index += 2;
			continue;
		}
		if (source[index] === quote) return index + 1;
		index += 1;
	}
	return index;
}

function nextNonSpace(source: string, start: number): string | undefined {
	let index = start;
	while (index < source.length && /\s/.test(source[index])) index += 1;
	return source[index];
}

function joinTokens(tokens: string[]): string {
	let result = '';
	for (const token of tokens) {
		const needsSpace =
			token === '{{' ||
			token === '}}' ||
			result.endsWith('{{') ||
			result.endsWith('}}') ||
			(/[\w$>]$/.test(result) && /^[\w$<]/.test(token));
		result += result && needsSpace ? ` ${token}` : token;
	}
	return result;
}
