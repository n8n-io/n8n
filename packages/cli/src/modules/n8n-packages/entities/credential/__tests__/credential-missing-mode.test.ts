import type { Project, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import {
	applyCredentialMissingMode,
	CredentialMissingModeHandler,
	createCredentialMissingModeHandler,
	MustPreexistCredentialMissingModeHandler,
} from '../credential-missing-mode';
import type { CredentialMissingModeContext } from '../credential.types';
import { createFailure, createSuccessBinding } from '../credential.types';

const context: CredentialMissingModeContext = {
	requirements: undefined,
	targetProject: mock<Project>(),
	user: mock<User>(),
};

describe('MustPreexistCredentialMissingModeHandler', () => {
	const handler: CredentialMissingModeHandler = new MustPreexistCredentialMissingModeHandler();

	it('returns the result when there are no failures', async () => {
		const result = { successes: [createSuccessBinding('a', 'b')], failures: [] };
		await expect(handler.handle(result, context)).resolves.toBe(result);
	});

	it('throws when failures are present', async () => {
		const requirement = {
			id: 'cred-1',
			name: 'X',
			type: 'githubApi',
			usedByWorkflows: ['wf-1'],
		};

		await expect(
			handler.handle(
				{
					successes: [],
					failures: [createFailure(requirement, 'not_found')],
				},
				context,
			),
		).rejects.toThrow();
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
	it('delegates to the handler for the given mode', async () => {
		const result = { successes: [createSuccessBinding('a', 'b')], failures: [] };
		await expect(applyCredentialMissingMode('must-preexist', result, context)).resolves.toBe(
			result,
		);
	});
});
