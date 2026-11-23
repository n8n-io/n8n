import { describe, it, expect } from 'vitest';

import type { PromotionDependencyWarning, PromotionMissingDependency } from '../client';
import {
	applyDependencyLines,
	countBlockingOutsideAccess,
	countByBlocking,
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

	it('says that someone with access must move an entry that the user cannot access', () => {
		const lines = promoteDependencyLines([PERSONAL, { ...PERSONAL, accessible: false }], []);

		expect(lines).toEqual([
			'Cannot be promoted (2)',
			'These dependencies are in a personal project. Someone with access must move them to a team project to promote them.',
			'  Credential "My token" (httpHeaderAuth): used by Weekly report',
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

	it('never says that an entry stops the Promote', () => {
		// An older server can still mark an entry as blocking.
		const lines = promoteDependencyLines(
			[{ ...PERSONAL, kind: 'workflow', credentialType: undefined, blocking: true }],
			// An older server sends `blocking` on a warning.
			[{ ...warning({ kind: 'workflow', name: 'Deleted helper' }), blocking: true } as never],
		);

		expect(lines).toContain('  Workflow "My token": used by Weekly report');
		expect(lines).toContain('  Workflow "Deleted helper": used by Weekly report');
	});

	it('lists an entry of a group that it does not know in a last section without description', () => {
		const lines = promoteDependencyLines(
			[
				{ ...OTHER_PROJECT, name: 'New', group: 'future-group' as never, blocking: true },
				// An Apply group is not a group of a Promote.
				{ ...NEEDS_ACTION, name: 'Stray' },
				OTHER_PROJECT,
			],
			[warning()],
		);

		expect(lines).toEqual([
			'In another project (1)',
			'These dependencies are in other projects that you can access. This Promote does not include them.',
			'  Credential "Billing API" (httpHeaderAuth): used by Weekly report',
			'',
			'Warnings (1)',
			'These references point to something that does not exist on the source instance.',
			'  Variable "API_URL": used by Weekly report',
			'',
			'Other (2)',
			'  Credential "New" (httpHeaderAuth): used by Weekly report',
			'  Credential "Stray" (httpHeaderAuth): used by Weekly report',
		]);
	});

	it('prints a kind that it does not know as it is', () => {
		const lines = promoteDependencyLines(
			[{ ...OTHER_PROJECT, kind: 'data-table' as never, credentialType: undefined }],
			[warning({ kind: 'tag' as never, name: 'Old tag' })],
		);

		expect(lines).toContain('  data-table "Billing API": used by Weekly report');
		expect(lines).toContain('  tag "Old tag": used by Weekly report');
		expect(lines.join('\n')).not.toContain('undefined');
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
			'Resolve these dependencies on this instance. An entry that stops the Apply must be resolved before you apply.',
			'  Credential "Billing API" (httpHeaderAuth): not on this instance; stops the Apply; used by Weekly report',
			'  Variable "API_URL": not on this instance; stops the Apply; used by Weekly report',
			'',
			'Outside your access (1)',
			'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
			'  Credential "Send alert": not on this instance; stops the Apply; used by Weekly report',
		]);
	});

	it.each([
		['not-on-branch', 'not on this instance and not on the branch'],
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

	it('explains an entry that this instance lacks and that the branch does not hold', () => {
		const lines = applyDependencyLines([OUTSIDE_ACCESS]);

		expect(lines).toEqual([
			'Outside your access (1)',
			'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
			'  Workflow "Send alert": not on this instance and not on the branch; used by Weekly report',
		]);
	});

	it('prints no reason for a reason that it does not know', () => {
		const lines = applyDependencyLines([
			{
				...NEEDS_ACTION,
				reason: 'future-reason' as PromotionMissingDependency['reason'],
			},
		]);

		expect(lines[2]).toBe(
			'  Credential "Billing API" (httpHeaderAuth): stops the Apply; used by Weekly report',
		);
		expect(lines.join('\n')).not.toContain('undefined');
	});

	it('lists an entry of a group that it does not know in a last section without description', () => {
		const lines = applyDependencyLines([
			{ ...NEEDS_ACTION, name: 'New', group: 'future-group' as never },
			// A Promote group is not a group of an Apply.
			{ ...OTHER_PROJECT, name: 'Stray', reason: 'not-shared' },
			{ ...OUTSIDE_ACCESS, reason: 'archived' },
		]);

		expect(lines).toEqual([
			'Outside your access (1)',
			'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
			'  Workflow "Send alert": archived on this instance; used by Weekly report',
			'',
			'Other (2)',
			'  Credential "New" (httpHeaderAuth): not on this instance; stops the Apply; used by Weekly report',
			'  Credential "Stray" (httpHeaderAuth): this project cannot use it; used by Weekly report',
		]);
	});

	it('prints a kind that it does not know as it is', () => {
		const lines = applyDependencyLines([
			{ ...NEEDS_ACTION, kind: 'data-table' as never, credentialType: undefined },
		]);

		expect(lines[2]).toBe(
			'  data-table "Billing API": not on this instance; stops the Apply; used by Weekly report',
		);
		expect(lines.join('\n')).not.toContain('undefined');
	});

	it.each([
		// The Apply archives or deletes the workflow, so the reason is not a present state.
		[
			'target-selected',
			'archived',
			'archived by this Apply; used by Weekly report; only when the Apply includes wf-9',
		],
		[
			'target-selected',
			'not-on-instance',
			'deleted by this Apply; used by Weekly report; only when the Apply includes wf-9',
		],
		[
			'target-selected',
			'caller-policy',
			'its caller policy refuses the workflow; used by Weekly report; only when the Apply includes wf-9',
		],
		[
			'target-not-selected',
			'archived',
			'archived on this instance; used by Weekly report; only when the Apply does not include wf-9',
		],
		[
			'target-not-selected',
			'not-on-instance',
			'not on this instance; used by Weekly report; only when the Apply does not include wf-9',
		],
	] as const)(
		'names the workflow of the condition %s by its id, with the reason %s',
		(condition, reason, facts) => {
			const lines = applyDependencyLines([
				dependency({
					kind: 'workflow',
					id: 'wf-9',
					credentialType: undefined,
					name: 'Send alert',
					group: 'needs-action',
					reason,
					condition,
				}),
			]);

			expect(lines[2]).toBe(`  Workflow "Send alert" (id wf-9): ${facts}`);
		},
	);

	it('names the workflow of a condition as this workflow when the entry has no id', () => {
		const lines = applyDependencyLines([
			dependency({
				kind: 'workflow',
				id: undefined,
				credentialType: undefined,
				name: 'Send alert',
				group: 'needs-action',
				reason: 'archived',
				condition: 'target-not-selected',
			}),
		]);

		expect(lines[2]).toBe(
			'  Workflow "Send alert": archived on this instance; used by Weekly report; only when the Apply does not include this workflow',
		);
	});

	it('prints no id and no condition for an entry without a condition', () => {
		const lines = applyDependencyLines([
			dependency({
				kind: 'workflow',
				id: 'wf-9',
				credentialType: undefined,
				name: 'Send alert',
				group: 'needs-action',
				reason: 'archived',
			}),
		]);

		expect(lines[2]).toBe(
			'  Workflow "Send alert": archived on this instance; used by Weekly report',
		);
	});

	it('prints no id and no condition for a condition that it does not know', () => {
		const lines = applyDependencyLines([
			dependency({
				kind: 'workflow',
				id: 'wf-9',
				credentialType: undefined,
				name: 'Send alert',
				group: 'needs-action',
				reason: 'archived',
				condition: 'future-condition' as PromotionMissingDependency['condition'],
			}),
		]);

		expect(lines[2]).toBe(
			'  Workflow "Send alert": archived on this instance; used by Weekly report',
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

	it('lists the references that are missing on the source as warnings, and no other warning', () => {
		const lines = applyDependencyLines(
			[NEEDS_ACTION],
			[
				{
					kind: 'variable',
					code: 'variable-shadowed',
					name: 'REGION',
					scope: { kind: 'global' },
					consumers: usedBy('Weekly report'),
				},
				warning({ kind: 'workflow', name: 'Deleted helper' }),
			],
		);

		expect(lines).toEqual([
			'Needs your action (1)',
			'Resolve these dependencies on this instance. An entry that stops the Apply must be resolved before you apply.',
			'  Credential "Billing API" (httpHeaderAuth): not on this instance; stops the Apply; used by Weekly report',
			'',
			'Warnings (1)',
			'These references point to something that does not exist on the source instance.',
			'  Workflow "Deleted helper": used by Weekly report',
		]);
	});

	it('lists an entry of a group that it does not know after the warnings', () => {
		const lines = applyDependencyLines(
			[{ ...OUTSIDE_ACCESS, group: 'future-group' as never }],
			[warning({ kind: 'workflow', name: 'Deleted helper' })],
		);

		expect(lines).toEqual([
			'Warnings (1)',
			'These references point to something that does not exist on the source instance.',
			'  Workflow "Deleted helper": used by Weekly report',
			'',
			'Other (1)',
			'  Workflow "Send alert": not on this instance and not on the branch; used by Weekly report',
		]);
	});

	it('returns no line when nothing is missing', () => {
		expect(applyDependencyLines([])).toEqual([]);
	});

	it('returns no line when the server does not send the list', () => {
		expect(applyDependencyLines(undefined)).toEqual([]);
	});
});

describe('the project of a dependency', () => {
	it('is in the line of an entry that has one, by its name', () => {
		const lines = promoteDependencyLines(
			[
				{ ...OTHER_PROJECT, project: { id: 'proj-sales', name: 'Sales' } },
				OUTSIDE_ACCESS,
				PERSONAL,
			],
			[],
		);

		expect(lines).toContain(
			'  Credential "Billing API" (httpHeaderAuth): in project "Sales"; used by Weekly report',
		);
		expect(lines.filter((line) => line.includes('Sales'))).toHaveLength(1);
		expect(lines.join('\n')).not.toContain('proj-sales');
	});

	it('is not in the output of an entry without one, although each consumer carries a project', () => {
		const text = [
			...promoteDependencyLines([OTHER_PROJECT, OUTSIDE_ACCESS, PERSONAL], [warning()]),
			...applyDependencyLines([NEEDS_ACTION, { ...OUTSIDE_ACCESS, reason: 'archived' }]),
		].join('\n');

		expect(text).toContain('Weekly report');
		expect(text).not.toContain(PROJECT.name);
		expect(text).not.toContain(PROJECT.id);
	});
});

describe('countBlockingOutsideAccess', () => {
	it('counts only the entries of the group that stop the Apply', () => {
		const blocking = { ...OUTSIDE_ACCESS, blocking: true };

		expect(countBlockingOutsideAccess([NEEDS_ACTION, OUTSIDE_ACCESS, blocking, blocking])).toBe(2);
	});

	it('counts nothing when the server does not send the list', () => {
		expect(countBlockingOutsideAccess(undefined)).toBe(0);
	});
});

describe('countByBlocking', () => {
	it('separates the entries that stop the operation from the entries that need a confirmation', () => {
		expect(countByBlocking([NEEDS_ACTION, OUTSIDE_ACCESS, OTHER_PROJECT])).toEqual({
			blocking: 1,
			confirmable: 2,
		});
	});

	it('counts nothing when the server does not send the list', () => {
		expect(countByBlocking(undefined)).toEqual({ blocking: 0, confirmable: 0 });
	});
});
