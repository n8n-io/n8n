import {
	describeRestrictionScope,
	matchRestrictedByQuery as matchByQuery,
} from '../restricted-types';

interface RestrictedType {
	name: string;
	displayName: string;
	scope: 'instance' | 'project';
}

const matchRestrictedByQuery = (query: string, restricted: readonly RestrictedType[]) =>
	matchByQuery(query, restricted, (node) => node.name);

const gmailTrigger: RestrictedType = {
	name: 'n8n-nodes-base.gmailTrigger',
	displayName: 'Gmail Trigger',
	scope: 'instance',
};
const readBinary: RestrictedType = {
	name: 'n8n-nodes-base.readBinaryFile',
	displayName: 'Read/Write Files from Disk',
	scope: 'project',
};

describe('matchRestrictedByQuery', () => {
	it('finds a restricted type when the query names its service', () => {
		expect(matchRestrictedByQuery('gmail', [gmailTrigger, readBinary])).toEqual([gmailTrigger]);
	});

	it('ignores case', () => {
		expect(matchRestrictedByQuery('GMAIL Trigger', [gmailTrigger])).toEqual([gmailTrigger]);
	});

	it('needs every query word to be a whole word of the name', () => {
		expect(matchRestrictedByQuery('gmail slack', [gmailTrigger])).toEqual([]);
		expect(matchRestrictedByQuery('gma', [gmailTrigger])).toEqual([]);
	});

	it('does not match on words that are not in the name', () => {
		expect(matchRestrictedByQuery('read new emails', [gmailTrigger])).toEqual([]);
	});

	it('ignores short words next to longer ones, so they cannot raise a notice', () => {
		expect(matchRestrictedByQuery('gmail to', [gmailTrigger])).toEqual([gmailTrigger]);
		expect(matchRestrictedByQuery('a to', [gmailTrigger, readBinary])).toEqual([]);
	});

	it('matches a query of short words only against a display name made of those words', () => {
		const ifNode: RestrictedType = {
			name: 'n8n-nodes-base.if',
			displayName: 'If',
			scope: 'instance',
		};

		expect(matchRestrictedByQuery('if', [ifNode, gmailTrigger])).toEqual([ifNode]);
		expect(matchRestrictedByQuery('IF', [ifNode])).toEqual([ifNode]);
		expect(matchRestrictedByQuery('if', [readBinary])).toEqual([]);
	});

	it('matches the type name as well as the display name', () => {
		expect(matchRestrictedByQuery('readBinaryFile', [readBinary])).toEqual([readBinary]);
		expect(matchRestrictedByQuery('disk files', [readBinary])).toEqual([readBinary]);
	});

	it('returns nothing for an empty query', () => {
		expect(matchRestrictedByQuery('', [gmailTrigger])).toEqual([]);
	});
});

describe('describeRestrictionScope', () => {
	it('names the instance policy and the project policy', () => {
		expect(describeRestrictionScope('instance')).toBe('an instance policy');
		expect(describeRestrictionScope('project')).toBe("this project's policy");
	});
});
