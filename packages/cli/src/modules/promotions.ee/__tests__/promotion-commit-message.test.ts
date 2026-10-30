import {
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

	it('lists added, updated and removed workflows', () => {
		expect(
			buildSelectionPromotionCommitMessage({
				projectName,
				added: [{ id: 'w1', name: 'Lead intake' }],
				updated: [{ id: 'w2', name: 'Daily digest' }],
				removed: [{ id: 'w3', name: 'Legacy sync' }],
			}),
		).toBe(
			[
				'Promote 3 workflows from "Marketing Ops"',
				'Added:\n- Lead intake (w1)',
				'Updated:\n- Daily digest (w2)',
				'Removed:\n- Legacy sync (w3)',
			].join('\n\n'),
		);
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
});
