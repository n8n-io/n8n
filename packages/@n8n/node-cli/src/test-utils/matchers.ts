import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { expect } from 'vitest';

import type { CommandResult } from './command-tester';
import type { MockPrompt } from './mock-prompts';
import { isEnoentError } from '../utils/validation';

export function stripAnsiCodes(text: string): string {
	// Need to strip ANSI escape codes for colors and styles
	// eslint-disable-next-line no-control-regex
	return text.replace(/\u001b\[.*?m/g, '');
}

function createLogMatcher(logLevel: 'success' | 'warning' | 'error') {
	return function (received: CommandResult, expected: string) {
		const messages = received.getLogMessages(logLevel);
		const cleanMessages = messages.map(stripAnsiCodes);
		const hasMessage = cleanMessages.some((msg) => msg.includes(expected));

		return {
			pass: hasMessage,
			message: () =>
				hasMessage
					? `Expected command NOT to log ${logLevel} message containing "${expected}"`
					: `Expected command to log ${logLevel} message containing "${expected}". Got: ${cleanMessages.join(', ')}`,
		};
	};
}

expect.extend({
	toHaveLoggedSuccess: createLogMatcher('success'),
	toHaveLoggedWarning: createLogMatcher('warning'),
	toHaveLoggedError: createLogMatcher('error'),
	toHaveFile(received: string, filename: string) {
		const fullPath = path.resolve(received, filename);
		const exists = fsSync.existsSync(fullPath);

		return {
			pass: exists,
			message: () =>
				exists
					? `Expected file "${filename}" NOT to exist`
					: `Expected file "${filename}" to exist`,
		};
	},
	async toHaveFileEqual(received: string, filename: string, expectedContent?: string) {
		const fullPath = path.resolve(received, filename);
		let content: string | undefined;

		try {
			content = await fs.readFile(fullPath, 'utf8');
		} catch (error) {
			if (isEnoentError(error)) {
				content = undefined;
			} else {
				throw error;
			}
		}

		if (content === undefined) {
			return {
				pass: false,
				message: () => `Expected file "${filename}" to exist`,
			};
		}

		if (expectedContent !== undefined && content !== expectedContent) {
			return {
				pass: false,
				message: () =>
					`Expected file "${filename}" to have content "${expectedContent}". Got: "${content}"`,
			};
		}

		return {
			pass: true,
			message: () =>
				expectedContent !== undefined
					? `Expected file "${filename}" NOT to have content "${expectedContent}"`
					: `Expected file "${filename}" NOT to exist`,
		};
	},
	async toHaveFileContaining(received: string, filename: string, text: string) {
		const fullPath = path.resolve(received, filename);
		let content: string | undefined;

		try {
			content = await fs.readFile(fullPath, 'utf8');
		} catch (error) {
			if (isEnoentError(error)) {
				content = undefined;
			} else {
				throw error;
			}
		}

		const contains = content?.includes(text) ?? false;

		return {
			pass: contains,
			message: () =>
				contains
					? `Expected file "${filename}" NOT to contain "${text}"`
					: `Expected file "${filename}" to contain "${text}". File content: "${content ?? 'File not found'}"`,
		};
	},
	async toHaveFileMatchingPattern(received: string, filename: string, pattern: RegExp) {
		const fullPath = path.resolve(received, filename);
		let content: string | undefined;

		try {
			content = await fs.readFile(fullPath, 'utf8');
		} catch (error) {
			if (isEnoentError(error)) {
				content = undefined;
			} else {
				throw error;
			}
		}

		const matches = content ? new RegExp(pattern).test(content) : false;

		return {
			pass: matches,
			message: () =>
				matches
					? `Expected file "${filename}" NOT to match pattern ${pattern.toString()}`
					: `Expected file "${filename}" to match pattern ${pattern.toString()}. File content: "${content ?? 'File not found'}"`,
		};
	},
	toNotHaveFile(received: string, filename: string) {
		const fullPath = path.resolve(received, filename);
		const exists = fsSync.existsSync(fullPath);

		return {
			pass: !exists,
			message: () =>
				exists
					? `Expected file "${filename}" NOT to exist`
					: `Expected file "${filename}" to exist`,
		};
	},
	toHaveAskedAllQuestions(received: typeof MockPrompt) {
		const questionAnswers = received['questionAnswers'];
		const askedQuestions = received['askedQuestions'];

		const expectedQuestions = Array.from(questionAnswers.keys());
		const askedQuestionsArray = Array.from(askedQuestions);
		const unaskedQuestions = expectedQuestions.filter((q) => !askedQuestions.has(q));

		const allAsked = unaskedQuestions.length === 0;

		return {
			pass: allAsked,
			message: () =>
				allAsked
					? 'Expected some questions to remain unasked'
					: `Expected questions were not asked: ${unaskedQuestions.join(', ')}\nExpected: [${expectedQuestions.join(', ')}]\nAsked: [${askedQuestionsArray.join(', ')}]`,
		};
	},
	toHaveAskedQuestion(received: typeof MockPrompt, question: string) {
		const askedQuestions = received.getAskedQuestions();
		const wasAsked = askedQuestions.includes(question);

		return {
			pass: wasAsked,
			message: () =>
				wasAsked
					? `Expected question "${question}" NOT to have been asked`
					: `Expected question "${question}" to have been asked. Asked questions: [${askedQuestions.join(', ')}]`,
		};
	},
});

declare module 'vitest' {
	interface Assertion<T> {
		toHaveLoggedSuccess(message: string): T;
		toHaveLoggedWarning(message: string): T;
		toHaveLoggedError(message: string): T;
		toHaveFile(filename: string): T;
		toHaveFileEqual(filename: string, expectedContent?: string): Promise<T>;
		toHaveFileContaining(filename: string, text: string): Promise<T>;
		toHaveFileMatchingPattern(filename: string, pattern: RegExp): Promise<T>;
		toNotHaveFile(filename: string): T;
		toHaveAskedAllQuestions(): T;
		toHaveAskedQuestion(question: string): T;
	}
}
