import { describe, expect, it } from 'vitest';
import type { NodeError } from 'n8n-workflow';
import {
	buildExplainErrorQuestion,
	parseExplainErrorResponse,
	type ExplainErrorResult,
} from './explainError.prompt';

const baseError = {
	name: 'NodeOperationError',
	message: 'Authorization failed',
	description: 'Please check your credentials',
	node: {
		id: 'n1',
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4,
		position: [0, 0],
		parameters: { url: 'https://api.example.com', authentication: 'genericCredentialType' },
	},
} as unknown as NodeError;

describe('buildExplainErrorQuestion', () => {
	it('includes node name, type and error message', () => {
		const question = buildExplainErrorQuestion(baseError);
		expect(question).toContain('HTTP Request');
		expect(question).toContain('n8n-nodes-base.httpRequest');
		expect(question).toContain('Authorization failed');
	});

	it('asks the assistant for a JSON object with three keys', () => {
		const question = buildExplainErrorQuestion(baseError);
		expect(question).toContain('"summary"');
		expect(question).toContain('"culprit"');
		expect(question).toContain('"nextStep"');
	});

	it('produces a stable fingerprint for the same error', () => {
		const a = buildExplainErrorQuestion(baseError);
		const b = buildExplainErrorQuestion(baseError);
		expect(a).toEqual(b);
	});
});

describe('parseExplainErrorResponse', () => {
	it('parses a fenced JSON block', () => {
		const raw = [
			'Here is the analysis:',
			'```json',
			'{ "summary": "Auth failed.", "culprit": "credentials", "nextStep": "Re-enter API key." }',
			'```',
		].join('\n');
		const result = parseExplainErrorResponse(raw);
		const expected: ExplainErrorResult = {
			kind: 'structured',
			summary: 'Auth failed.',
			culprit: 'credentials',
			nextStep: 'Re-enter API key.',
		};
		expect(result).toEqual(expected);
	});

	it('parses an unfenced JSON object', () => {
		const raw = '{ "summary": "s", "culprit": "c", "nextStep": "n" }';
		const result = parseExplainErrorResponse(raw);
		expect(result.kind).toBe('structured');
	});

	it('falls back to raw text when JSON is missing', () => {
		const raw = 'Sorry, the model returned a free-form answer.';
		const result = parseExplainErrorResponse(raw);
		expect(result).toEqual({ kind: 'raw', text: raw });
	});

	it('falls back to raw text when JSON keys are wrong', () => {
		const raw = '```json\n{ "foo": "bar" }\n```';
		const result = parseExplainErrorResponse(raw);
		expect(result.kind).toBe('raw');
	});
});
