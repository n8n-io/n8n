import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import {
	applyCredentialMissingMode,
	createCredentialMissingModeHandler,
	MustPreexistCredentialMissingModeHandler,
} from '../credential-missing-mode';
import { createFailure, createSuccessBinding } from '../credential.types';

describe('MustPreexistCredentialMissingModeHandler', () => {
	const handler = new MustPreexistCredentialMissingModeHandler();

	it('returns the result when there are no failures', () => {
		const result = { successes: [createSuccessBinding('a', 'b')], failures: [] };
		expect(handler.handle(result)).toBe(result);
	});

	it('throws when failures are present', () => {
		const requirement = {
			id: 'cred-1',
			name: 'X',
			type: 'githubApi',
			usedByWorkflows: ['wf-1'],
		};

		expect(() =>
			handler.handle({
				successes: [],
				failures: [createFailure(requirement, 'not_found')],
			}),
		).toThrow();
	});
});

describe('createCredentialMissingModeHandler', () => {
	it('returns MustPreexistCredentialMissingModeHandler for must-preexist', () => {
		expect(createCredentialMissingModeHandler('must-preexist')).toBeInstanceOf(
			MustPreexistCredentialMissingModeHandler,
		);
	});

	it('rejects unsupported credential missing modes', () => {
		expect(() => createCredentialMissingModeHandler('invalid' as 'must-preexist')).toThrow(
			BadRequestError,
		);
	});
});

describe('applyCredentialMissingMode', () => {
	it('delegates to the handler for the given mode', () => {
		const result = { successes: [createSuccessBinding('a', 'b')], failures: [] };
		expect(applyCredentialMissingMode('must-preexist', result)).toBe(result);
	});
});
