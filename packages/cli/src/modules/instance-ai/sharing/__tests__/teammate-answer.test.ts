import { buildResumeData, toConfirmationData } from '@n8n/instance-ai/confirmation-payload';
import { InstanceAiConfirmRequestDto } from '@n8n/api-types';
import fc from 'fast-check';

import { withoutStandingApproval } from '../teammate-answer';

describe('withoutStandingApproval', () => {
	it.each([
		[
			'an "always allow" approval',
			{ kind: 'approval', approved: true, scope: 'session' },
			{ kind: 'approval', approved: true, scope: 'once' },
		],
		[
			'a domain approved for the thread',
			{ kind: 'domainAccessApprove', domainAccessAction: 'allow_domain' },
			{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' },
		],
		[
			'all domains approved for the thread',
			{ kind: 'domainAccessApprove', domainAccessAction: 'allow_all' },
			{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' },
		],
		[
			'a resource allowed for the session',
			{ kind: 'resourceDecision', resourceDecision: 'allowForSession' },
			{ kind: 'resourceDecision', resourceDecision: 'allowOnce' },
		],
		[
			'raw resume data with an "always allow" scope',
			{ approved: true, scope: 'session', userInput: 'ok' },
			{ approved: true, scope: 'once', userInput: 'ok' },
		],
	])('turns %s into a one-time answer', (_label, answer, expected) => {
		expect(withoutStandingApproval(answer)).toEqual(expected);
	});

	it.each([
		['a one-time approval', { kind: 'approval', approved: true, scope: 'once' }],
		['an approval without a scope', { kind: 'approval', approved: true }],
		['a denial', { kind: 'approval', approved: false, scope: 'once' }],
		[
			'a one-time domain approval',
			{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' },
		],
		['a domain denial', { kind: 'domainAccessDeny' }],
		['a one-time resource decision', { kind: 'resourceDecision', resourceDecision: 'allowOnce' }],
		['a resource denial', { kind: 'resourceDecision', resourceDecision: 'denyOnce' }],
		['a capability decision', { kind: 'capabilityDecision', approved: true, values: { a: 'b' } }],
	])('keeps %s as it is', (_label, answer) => {
		expect(withoutStandingApproval(answer)).toEqual(answer);
	});

	it.each([null, undefined, 'session', 42, ['scope', 'session']])(
		'returns a value that is not an object as it is: %s',
		(value) => {
			expect(withoutStandingApproval(value)).toBe(value);
		},
	);

	it('does not change the answer that it gets', () => {
		const answer = { kind: 'approval', approved: true, scope: 'session' };

		withoutStandingApproval(answer);

		expect(answer.scope).toBe('session');
	});

	it('does not touch a "session" value under another key', () => {
		const answer = { kind: 'questions', answers: [], note: 'session', userInput: 'allow_all' };

		expect(withoutStandingApproval(answer)).toEqual(answer);
	});

	it('gives the tool a one-time scope after the card body is converted', () => {
		const body = withoutStandingApproval({ kind: 'approval', approved: true, scope: 'session' });
		const parsed = InstanceAiConfirmRequestDto.parse(body);

		expect(buildResumeData(toConfirmationData(parsed))).toEqual({
			approved: true,
			scope: 'once',
		});
	});

	it('never leaves a standing choice in any answer', () => {
		const standing = {
			scope: 'session',
			domainAccessAction: 'allow_domain',
			resourceDecision: 'allowForSession',
		};
		const anyValue = fc.oneof(
			fc.constantFrom('session', 'allow_domain', 'allow_all', 'allowForSession', 'once'),
			fc.string(),
			fc.boolean(),
		);
		const answer = fc.dictionary(
			fc.constantFrom('scope', 'domainAccessAction', 'resourceDecision', 'kind', 'approved'),
			anyValue,
		);
		fc.assert(
			fc.property(answer, (value) => {
				const result = withoutStandingApproval(value);
				expect(result).toBeInstanceOf(Object);
				const fields = result as Record<string, unknown>;
				expect(fields.scope).not.toBe(standing.scope);
				expect(['allow_domain', 'allow_all']).not.toContain(fields.domainAccessAction);
				expect(fields.resourceDecision).not.toBe(standing.resourceDecision);
				expect(Object.keys(fields).sort()).toEqual(Object.keys(value).sort());
			}),
		);
	});
});
