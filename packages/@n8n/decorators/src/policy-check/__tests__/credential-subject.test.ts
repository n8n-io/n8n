import { createHash } from 'node:crypto';

import { credentialContentSubject, credentialSubject } from '../policy-cleared';

const hashOf = (type: string) => createHash('sha256').update(type).digest('hex');

describe('credentialSubject', () => {
	it('binds to the credential id when it exists', () => {
		expect(credentialSubject({ id: 'cred-9', type: 'slackApi' })).toEqual({
			type: 'credential',
			id: 'cred-9',
		});
	});

	it('binds a new credential to the sha256 of its type', () => {
		expect(credentialSubject({ id: null, type: 'slackApi' })).toEqual({
			type: 'credential',
			id: hashOf('slackApi'),
		});
	});

	it('gives different types different subjects', () => {
		const slack = credentialSubject({ id: null, type: 'slackApi' });
		const github = credentialSubject({ id: null, type: 'githubApi' });

		expect(slack.id).not.toBe(github.id);
	});

	// An entity generates its id on insert, so a create can carry `undefined` or `''`. Binding
	// to that would give every create the same subject.
	it.each([undefined, ''])('falls back to the type hash for an id of %p', (id) => {
		expect(credentialSubject({ id: id as unknown as string, type: 'slackApi' })).toEqual({
			type: 'credential',
			id: hashOf('slackApi'),
		});
	});
});

describe('credentialContentSubject', () => {
	it('ignores a supplied id and binds to the type', () => {
		expect(credentialContentSubject({ id: 'cred-9', type: 'slackApi' })).toEqual({
			type: 'credential',
			id: hashOf('slackApi'),
		});
	});
});
