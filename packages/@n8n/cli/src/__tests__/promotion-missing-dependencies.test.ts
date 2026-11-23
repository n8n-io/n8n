import { describe, it, expect } from 'vitest';

import type { PromotionDependencyWarning, PromotionMissingDependency } from '../client';
import {
	applyDependencyLines,
	countOutsideAccess,
	promoteDependencyLines,
} from '../commands/promotion-environment/missing-dependencies';

const PROJECT = { id: 'proj-finance', name: 'Finance' };

const usedBy = (...names: string[]) => [
	{ project: PROJECT, workflows: names.map((name, index) => ({ id: `wf-${index}`, name })) },
];

const dependency = (
	overrides: Partial<PromotionMissingDependency> &
		Pick<PromotionMissingDependency, 'name' | 'group' | 'reason'>,
): PromotionMissingDependency => ({
	kind: 'credential',
	id: 'cred-1',
	credentialType: 'httpHeaderAuth',
	accessible: true,
	blocking: false,
	consumers: usedBy('Weekly report'),
	...overrides,
});

const warning = (
	overrides: Partial<PromotionDependencyWarning> = {},
): PromotionDependencyWarning => ({
	kind: 'variable',
	code: 'missing-on-source',
	name: 'API_URL',
	blocking: false,
	consumers: usedBy('Weekly report'),
	...overrides,
});

const OTHER_PROJECT = dependency({
	name: 'Billing API',
	group: 'other-project',
	reason: 'not-on-branch',
});
const OUTSIDE_ACCESS = dependency({
	kind: 'workflow',
	name: 'Send alert',
	credentialType: undefined,
	group: 'outside-access',
	reason: 'not-on-branch',
	accessible: false,
});
const PERSONAL = dependency({ name: 'My token', group: 'personal', reason: 'personal-project' });
const NEEDS_ACTION = dependency({
	name: 'Billing API',
	group: 'needs-action',
	reason: 'not-on-instance',
	blocking: true,
});

describe('promoteDependencyLines', () => {
	it('lists the groups in the order of the UI, each with its title, count and entries', () => {
		// The order of the input must not decide the order of the groups.
		const lines = promoteDependencyLines(
			[PERSONAL, OUTSIDE_ACCESS, OTHER_PROJECT, { ...OTHER_PROJECT, name: 'CRM' }],
			[warning()],
		);

		expect(lines).toEqual([
			'In another project (2)',
			'These dependencies are in other projects that you can access. This Promote does not include them.',
			'  Credential "Billing API" (httpHeaderAuth): used by Weekly report',
			'  Credential "CRM" (httpHeaderAuth): used by Weekly report',
			'',
			'Outside your access (1)',
			'You do not have access to these dependencies.',
			'  Workflow "Send alert": used by Weekly report',
			'',
			'Cannot be promoted (1)',
			'These dependencies are in a personal project. Move them to a team project to promote them.',
			'  Credential "My token" (httpHeaderAuth): used by Weekly report',
			'',
			'Warnings (1)',
			'These references point to something that does not exist on the source instance.',
			'  Variable "API_URL": used by Weekly report',
		]);
	});

	it('leaves out a group that has no entry', () => {
		expect(promoteDependencyLines([PERSONAL], [])).toEqual([
			'Cannot be promoted (1)',
			'These dependencies are in a personal project. Move them to a team project to promote them.',
			'  Credential "My token" (httpHeaderAuth): used by Weekly report',
		]);
	});

	it('lists warnings when no dependency is missing', () => {
		expect(promoteDependencyLines([], [warning({ kind: 'credential', name: 'Old key' })])).toEqual([
			'Warnings (1)',
			'These references point to something that does not exist on the source instance.',
			'  Credential "Old key": used by Weekly report',
		]);
	});

	it('says when an entry or a warning stops the Promote', () => {
		const lines = promoteDependencyLines(
			[{ ...PERSONAL, kind: 'workflow', credentialType: undefined, blocking: true }],
			[warning({ kind: 'workflow', name: 'Deleted helper', blocking: true })],
		);

		expect(lines).toContain('  Workflow "My token": stops the Promote; used by Weekly report');
		expect(lines).toContain(
			'  Workflow "Deleted helper": stops the Promote; used by Weekly report',
		);
	});

	it('returns no line when nothing is missing', () => {
		expect(promoteDependencyLines([], [])).toEqual([]);
	});

	it('returns no line when the server does not send the lists', () => {
		expect(promoteDependencyLines(undefined, undefined)).toEqual([]);
	});
});

describe('applyDependencyLines', () => {
	it('lists the groups in the order of the UI, each with its title, count and entries', () => {
		const lines = applyDependencyLines([
			{ ...OUTSIDE_ACCESS, kind: 'credential', reason: 'not-on-instance', blocking: true },
			NEEDS_ACTION,
			dependency({
				kind: 'variable',
				id: undefined,
				credentialType: undefined,
				name: 'API_URL',
				group: 'needs-action',
				reason: 'not-on-instance',
				blocking: true,
			}),
		]);

		expect(lines).toEqual([
			'Needs your action (2)',
			'Create these dependencies before you apply.',
			'  Credential "Billing API" (httpHeaderAuth): not on this instance; stops the Apply; used by Weekly report',
			'  Variable "API_URL": not on this instance; stops the Apply; used by Weekly report',
			'',
			'Outside your access (1)',
			'You do not have access to these dependencies.',
			'  Credential "Send alert": not on this instance; stops the Apply; used by Weekly report',
		]);
	});

	it.each([
		['not-on-instance', 'not on this instance'],
		['not-shared', 'this project cannot use it'],
		['type-mismatch', 'has another type on this instance'],
		['unknown-type', 'its type is not installed on this instance'],
		['incompatible-usage-scope', 'this project cannot use an instance credential'],
		['archived', 'archived on this instance'],
		['caller-policy', 'its caller policy refuses the workflow'],
	] as const)('explains the reason %s', (reason, text) => {
		const lines = applyDependencyLines([{ ...NEEDS_ACTION, reason, blocking: false }]);

		expect(lines[2]).toBe(
			`  Credential "Billing API" (httpHeaderAuth): ${text}; used by Weekly report`,
		);
	});

	it('names every workflow of every consumer', () => {
		const lines = applyDependencyLines([
			{
				...NEEDS_ACTION,
				consumers: [...usedBy('Weekly report', 'Invoices'), ...usedBy('Sync contacts')],
			},
		]);

		expect(lines[2]).toContain('used by Weekly report, Invoices, Sync contacts');
	});

	it('cuts a long list of workflows and counts the rest', () => {
		const lines = applyDependencyLines([
			{ ...NEEDS_ACTION, consumers: usedBy('A', 'B', 'C', 'D', 'E', 'F', 'G') },
		]);

		expect(lines[2]).toContain('used by A, B, C, D, E (+2 more)');
	});

	it('returns no line when nothing is missing', () => {
		expect(applyDependencyLines([])).toEqual([]);
	});

	it('returns no line when the server does not send the list', () => {
		expect(applyDependencyLines(undefined)).toEqual([]);
	});
});

describe('the project of a dependency', () => {
	it('is never in the output, although each consumer carries a project', () => {
		const text = [
			...promoteDependencyLines([OTHER_PROJECT, OUTSIDE_ACCESS, PERSONAL], [warning()]),
			...applyDependencyLines([NEEDS_ACTION, { ...OUTSIDE_ACCESS, reason: 'archived' }]),
		].join('\n');

		expect(text).toContain('Weekly report');
		expect(text).not.toContain(PROJECT.name);
		expect(text).not.toContain(PROJECT.id);
	});
});

describe('countOutsideAccess', () => {
	it('counts only the entries of the group', () => {
		expect(countOutsideAccess([NEEDS_ACTION, OUTSIDE_ACCESS, OUTSIDE_ACCESS])).toBe(2);
	});

	it('counts nothing when the server does not send the list', () => {
		expect(countOutsideAccess(undefined)).toBe(0);
	});
});
