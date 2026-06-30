import { credentialBlockingFailures } from '../credential-missing-mode';
import { createFailure } from '../credential.types';

describe('credentialBlockingFailures', () => {
	describe('must-preexist', () => {
		it('treats no failures as nothing blocking', () => {
			expect(
				credentialBlockingFailures('must-preexist', {
					successes: new Map([['a', 'b']]),
					failures: [],
				}),
			).toEqual([]);
		});

		it('treats every unresolved reference as blocking', () => {
			const failure = createFailure(
				{ id: 'cred-1', name: 'X', type: 'githubApi', usedByWorkflows: ['wf-1'] },
				'not_found',
			);

			expect(
				credentialBlockingFailures('must-preexist', { successes: new Map(), failures: [failure] }),
			).toEqual([failure]);
		});
	});

	describe('create-stub', () => {
		it('treats not_found as non-blocking', () => {
			const failure = createFailure(
				{ id: 'cred-1', name: 'X', type: 'githubApi', usedByWorkflows: ['wf-1'] },
				'not_found',
			);

			expect(
				credentialBlockingFailures('create-stub', { successes: new Map(), failures: [failure] }),
			).toEqual([]);
		});

		it('still blocks not_found when an explicit binding target is missing', () => {
			const failure = {
				...createFailure(
					{ id: 'cred-1', name: 'X', type: 'githubApi', usedByWorkflows: ['wf-1'] },
					'not_found',
				),
				targetId: 'target-missing',
			};

			expect(
				credentialBlockingFailures('create-stub', { successes: new Map(), failures: [failure] }),
			).toEqual([failure]);
		});

		it('still blocks unknown_type and source_not_found failures', () => {
			const unknownType = createFailure(
				{ id: 'cred-1', name: 'X', type: 'bad', usedByWorkflows: ['wf-1'] },
				'unknown_type',
			);
			const sourceNotFound = createFailure(
				{ id: 'cred-2', name: 'Y', type: 'githubApi', usedByWorkflows: ['wf-2'] },
				'source_not_found',
			);

			expect(
				credentialBlockingFailures('create-stub', {
					successes: new Map(),
					failures: [unknownType, sourceNotFound],
				}),
			).toEqual([unknownType, sourceNotFound]);
		});
	});
});
