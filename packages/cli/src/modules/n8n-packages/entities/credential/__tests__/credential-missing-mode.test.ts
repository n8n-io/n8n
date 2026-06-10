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
});
