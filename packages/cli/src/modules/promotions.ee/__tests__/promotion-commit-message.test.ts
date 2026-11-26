import {
	appendMissingDependencies,
	buildInstancePromotionCommitMessage,
	buildSelectionPromotionCommitMessage,
} from '../promotion-commit-message';

describe('buildInstancePromotionCommitMessage', () => {
	it('summarizes the promoted projects and workflows', () => {
		expect(buildInstancePromotionCommitMessage({ projectCount: 12, workflowCount: 84 })).toBe(
			'Promote instance: 12 projects, 84 workflows',
		);
	});

	it('uses the singular for a count of one', () => {
		expect(buildInstancePromotionCommitMessage({ projectCount: 1, workflowCount: 1 })).toBe(
			'Promote instance: 1 project, 1 workflow',
		);
	});
});

describe('buildSelectionPromotionCommitMessage', () => {
	const projectName = 'Marketing Ops';

	it('lists added, updated and removed workflows, and the selected folders', () => {
		expect(
			buildSelectionPromotionCommitMessage({
				projectName,
				added: [{ id: 'w1', name: 'Lead intake' }],
				updated: [{ id: 'w2', name: 'Daily digest' }],
				removed: [{ id: 'w3', name: 'Legacy sync' }],
				folders: [{ id: 'f1', name: 'Campaigns' }],
			}),
		).toBe(
			[
				'Promote 3 workflows and 1 folder from "Marketing Ops"',
				'Added:\n- Lead intake (w1)',
				'Updated:\n- Daily digest (w2)',
				'Removed:\n- Legacy sync (w3)',
				'Folders:\n- Campaigns (f1)',
			].join('\n\n'),
		);
	});

	it('names the project when only the project is promoted', () => {
		expect(
			buildSelectionPromotionCommitMessage({ projectName, added: [], updated: [], removed: [] }),
		).toBe('Promote project "Marketing Ops"');
	});

	it('leaves out empty sections', () => {
		expect(
			buildSelectionPromotionCommitMessage({
				projectName,
				added: [],
				updated: [{ id: 'w2', name: 'Daily digest' }],
				removed: [],
			}),
		).toBe('Promote 1 workflow from "Marketing Ops"\n\nUpdated:\n- Daily digest (w2)');
	});

	it('caps a long list', () => {
		const added = Array.from({ length: 52 }, (_, i) => ({ id: `w${i}`, name: `WF ${i}` }));

		const message = buildSelectionPromotionCommitMessage({
			projectName,
			added,
			updated: [],
			removed: [],
		});

		expect(message).toContain('- WF 49 (w49)\n- …and 2 more');
		expect(message).not.toContain('WF 50');
	});

	it('counts the selected credentials in the title and lists them', () => {
		expect(
			buildSelectionPromotionCommitMessage({
				projectName,
				added: [],
				updated: [],
				removed: [],
				credentials: [{ id: 'c1', name: 'CRM key' }],
			}),
		).toBe(
			['Promote 1 credential from "Marketing Ops"', 'Credentials:\n- CRM key (c1)'].join('\n\n'),
		);
	});
});

describe('appendMissingDependencies', () => {
	const missing = [
		{ kind: 'credential' as const, id: 'c9', name: 'CRM key' },
		{ kind: 'workflow' as const, id: 'w9', name: 'Notify' },
	];
	const section = 'Missing dependencies:\n- credential: CRM key (c9)\n- workflow: Notify (w9)';

	it('adds the section after the sections of a generated message', () => {
		const generated = buildSelectionPromotionCommitMessage({
			projectName: 'Marketing Ops',
			added: [{ id: 'w1', name: 'Lead intake' }],
			updated: [],
			removed: [],
		});

		expect(appendMissingDependencies(generated, missing)).toBe(
			['Promote 1 workflow from "Marketing Ops"', 'Added:\n- Lead intake (w1)', section].join(
				'\n\n',
			),
		);
	});

	it('adds the section to a message of the caller, after a blank line', () => {
		expect(appendMissingDependencies('Release 12', missing)).toBe(`Release 12\n\n${section}`);
	});

	it('leaves the message as it is when nothing is missing', () => {
		expect(appendMissingDependencies('Release 12', [])).toBe('Release 12');
	});

	it('caps a long list', () => {
		const many = Array.from({ length: 52 }, (_, i) => ({
			kind: 'credential' as const,
			id: `c${i}`,
			name: `Key ${i}`,
		}));

		const message = appendMissingDependencies('Release 12', many);

		expect(message).toContain('- credential: Key 49 (c49)\n- …and 2 more');
		expect(message).not.toContain('Key 50');
	});
});
