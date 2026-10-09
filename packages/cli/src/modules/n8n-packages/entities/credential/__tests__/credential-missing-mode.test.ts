import { credentialBlockingFailures, credentialsToStub } from '../credential-missing-mode';
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
				{ id: 'cred-1', name: 'X', type: 'githubApi', usedBy: [{ kind: 'workflow', id: 'wf-1' }] },
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
				{ id: 'cred-1', name: 'X', type: 'githubApi', usedBy: [{ kind: 'workflow', id: 'wf-1' }] },
				'not_found',
			);

			expect(
				credentialBlockingFailures('create-stub', { successes: new Map(), failures: [failure] }),
			).toEqual([]);
		});

		it('still blocks not_found when an explicit binding target is missing', () => {
			const failure = {
				...createFailure(
					{
						id: 'cred-1',
						name: 'X',
						type: 'githubApi',
						usedBy: [{ kind: 'workflow', id: 'wf-1' }],
					},
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
				{ id: 'cred-1', name: 'X', type: 'bad', usedBy: [{ kind: 'workflow', id: 'wf-1' }] },
				'unknown_type',
			);
			const sourceNotFound = createFailure(
				{ id: 'cred-2', name: 'Y', type: 'githubApi', usedBy: [{ kind: 'workflow', id: 'wf-2' }] },
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

describe('credentialsToStub', () => {
	const notFound = (id: string, workflowIds = ['wf-1']) =>
		createFailure(
			{
				id,
				name: id,
				type: 'githubApi',
				usedBy: workflowIds.map((workflowId) => ({ kind: 'workflow', id: workflowId })),
			},
			'not_found',
		);

	it('stubs nothing under must-preexist', () => {
		expect(
			credentialsToStub('must-preexist', { successes: new Map(), failures: [notFound('cred-1')] }),
		).toEqual([]);
	});

	it('stubs only not_found failures without an explicit binding target', () => {
		const stubbable = notFound('cred-1');
		const bound = { ...notFound('cred-2'), targetId: 'target-missing' };
		const unknownType = createFailure(
			{ id: 'cred-3', name: 'X', type: 'bad', usedBy: [{ kind: 'workflow', id: 'wf-1' }] },
			'unknown_type',
		);

		expect(
			credentialsToStub('create-stub', {
				successes: new Map(),
				failures: [stubbable, bound, unknownType],
			}),
		).toEqual([stubbable]);
	});

	it('keeps one failure per source id, in first-seen order', () => {
		const repeated = notFound('cred-1', ['wf-3']);
		const other = notFound('cred-2');

		expect(
			credentialsToStub('create-stub', {
				successes: new Map(),
				failures: [notFound('cred-1', ['wf-1']), other, repeated],
			}),
		).toEqual([repeated, other]);
	});
});
