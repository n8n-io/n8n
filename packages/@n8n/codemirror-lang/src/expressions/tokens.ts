import { ExternalTokenizer } from '@lezer/lr';
import { parseScript } from 'esprima-next';

import { Resolvable } from './grammar.terms';

const BACKSLASH = 92;
const BRACE_LEFT = 123;
const BRACE_RIGHT = 125;
const EXPRESSION_STATEMENT = 'ExpressionStatement';
const EMPTY_STATEMENT = 'EmptyStatement';

const parseCandidateProgram = (source: string) => {
	try {
		return parseScript(source);
	} catch {
		return null;
	}
};

const isSentinelExpressionProgram = (source: string) => {
	const program = parseCandidateProgram(source);
	const lastType = String(program?.body.at(-1)?.type);
	return (
		program !== null &&
		program.body.length >= 2 &&
		lastType === EXPRESSION_STATEMENT &&
		program.body
			.slice(0, -1)
			.every(
				(statement) =>
					String(statement.type) === EMPTY_STATEMENT ||
					String(statement.type) === EXPRESSION_STATEMENT,
			)
	);
};

const isParsableExpressionCandidate = (source: string, cache: Map<string, boolean>) => {
	const cached = cache.get(source);
	if (cached !== undefined) {
		return cached;
	}

	const result =
		isSentinelExpressionProgram(`${source};0`) || isSentinelExpressionProgram(`(${source});0`);

	cache.set(source, result);
	return result;
};

export const tokens = new ExternalTokenizer((input) => {
	if (input.next !== BRACE_LEFT || input.peek(1) !== BRACE_LEFT) {
		return;
	}

	input.advance(2);

	let code = '';
	let firstFallbackEnd: number | null = null;
	const parseableExpressionCache = new Map<string, boolean>();

	for (;;) {
		const char = Number(input.next);

		if (char < 0) {
			if (firstFallbackEnd !== null) {
				input.acceptTokenTo(Resolvable, firstFallbackEnd);
			}
			return;
		}

		const nextChar = Number(input.peek(1));

		if (char === BACKSLASH && nextChar === BRACE_RIGHT && Number(input.peek(2)) === BRACE_RIGHT) {
			code += '\\}}';
			input.advance(3);
			continue;
		}

		if (char === BRACE_RIGHT && nextChar === BRACE_RIGHT) {
			const candidateEnd = input.pos + 2;
			firstFallbackEnd ??= candidateEnd;

			if (isParsableExpressionCandidate(code, parseableExpressionCache)) {
				input.acceptTokenTo(Resolvable, candidateEnd);
				return;
			}

			code += '}';
			input.advance();
			continue;
		}

		code += String.fromCharCode(char);
		input.advance();
	}
});
