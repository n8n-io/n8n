import type { INodeTypeDescription } from 'n8n-workflow';

import type { RestrictedNodeType } from '@/workflow-builder-agent';

import {
	describeRestrictedMatches,
	resolveRestrictedNodeTypes,
	withoutRestrictedNodeTypes,
} from '../restricted-node-notes';

const gmailTrigger: RestrictedNodeType = {
	name: 'n8n-nodes-base.gmailTrigger',
	displayName: 'Gmail Trigger',
	scope: 'instance',
};

const nodeType = (name: string) => ({ name }) as INodeTypeDescription;

describe('withoutRestrictedNodeTypes', () => {
	const nodes = [nodeType(gmailTrigger.name), nodeType('n8n-nodes-base.set')];

	it('leaves out the restricted types', () => {
		expect(withoutRestrictedNodeTypes(nodes, [gmailTrigger]).map((n) => n.name)).toEqual([
			'n8n-nodes-base.set',
		]);
	});

	it('returns the same list when nothing is restricted', () => {
		expect(withoutRestrictedNodeTypes(nodes, undefined)).toBe(nodes);
		expect(withoutRestrictedNodeTypes(nodes, [])).toBe(nodes);
	});
});

describe('describeRestrictedMatches', () => {
	it('names a restricted type that a query names, with the scope', () => {
		const note = describeRestrictedMatches(['gmail'], [gmailTrigger]);

		expect(note).toContain(
			'Gmail Trigger (n8n-nodes-base.gmailTrigger): restricted by an instance policy.',
		);
		expect(note).toContain('Do not use them');
		expect(note).toContain('say that it is restricted');
	});

	it("names the project when the project's policy restricts the type", () => {
		const note = describeRestrictedMatches(
			['gmail trigger'],
			[{ ...gmailTrigger, scope: 'project' }],
		);

		expect(note).toContain("this project's policy");
	});

	it('lists a type once when several queries name it', () => {
		const note = describeRestrictedMatches(['gmail', 'gmail trigger'], [gmailTrigger]);

		expect(note.match(/Gmail Trigger \(/g)).toHaveLength(1);
	});

	it('says nothing when no query names a restricted type', () => {
		expect(describeRestrictedMatches(['slack'], [gmailTrigger])).toBe('');
		expect(describeRestrictedMatches(['gmail'], undefined)).toBe('');
		expect(describeRestrictedMatches(['gmail'], [])).toBe('');
	});
});

describe('resolveRestrictedNodeTypes', () => {
	const described = [
		{ name: gmailTrigger.name, displayName: 'Gmail Trigger' },
		{ name: gmailTrigger.name, displayName: 'Gmail Trigger (older version)' },
		{ name: 'n8n-nodes-base.set', displayName: 'Edit Fields' },
	] as INodeTypeDescription[];

	it('adds the display name from the builder node list, first entry first', () => {
		expect(
			resolveRestrictedNodeTypes(described, [{ name: gmailTrigger.name, scope: 'project' }]),
		).toEqual([{ name: gmailTrigger.name, scope: 'project', displayName: 'Gmail Trigger' }]);
	});

	it('drops types the builder does not list, such as community nodes', () => {
		expect(
			resolveRestrictedNodeTypes(described, [{ name: 'community.node', scope: 'instance' }]),
		).toEqual([]);
	});

	it('returns nothing when nothing is restricted', () => {
		expect(resolveRestrictedNodeTypes(described, undefined)).toEqual([]);
		expect(resolveRestrictedNodeTypes(described, [])).toEqual([]);
	});
});
