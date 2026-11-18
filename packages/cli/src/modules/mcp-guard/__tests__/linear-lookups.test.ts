import { linearLookups, withIssueDescriptions } from '../linear-lookups';

const overlay = (issues: unknown[]) => ({
	world_version: 1,
	native: {
		linear: {
			teams: [
				{ ref: 'team:A', key: 'AAA' },
				{ ref: 'team:B', key: 'BBB' },
			],
			issues,
		},
	},
});

const described = (result: unknown, issues: unknown[]) =>
	(withIssueDescriptions(overlay(issues), result).native as any).linear.issues;

describe('withIssueDescriptions', () => {
	const real = {
		issues: [
			{ id: 'AAA-7', description: 'from team A' },
			{ id: 'BBB-7', description: 'from team B' },
		],
	};

	it('should match by team key and number', () => {
		expect(
			described(real, [
				{ team: 'team:A', number: 7 },
				{ team: 'team:B', number: 7 },
			]).map((issue: { description: string }) => issue.description),
		).toEqual(['from team A', 'from team B']);
	});

	it('should not guess between two issues with the same number', () => {
		expect(described(real, [{ team: 'team:missing', number: 7 }])[0].description).toBeUndefined();
	});

	it('should match by number when one real issue has it', () => {
		const one = { issues: [{ id: 'AAA-7', description: 'only one' }] };
		expect(described(one, [{ team: 'team:missing', number: 7 }])[0].description).toBe('only one');
	});

	it('should read an issue in an issue field', () => {
		const wrapped = { issue: { id: 'AAA-7', description: 'wrapped' } };
		expect(described(wrapped, [{ team: 'team:A', number: 7 }])[0].description).toBe('wrapped');
	});

	it('should keep a description that the model gave', () => {
		expect(
			described(real, [{ team: 'team:A', number: 7, description: 'mine' }])[0].description,
		).toBe('mine');
	});
});

describe('linearLookups of the issue that a call works on', () => {
	const issueReads = (tool: string, args: Record<string, unknown>) =>
		linearLookups(tool, args).filter((l) => l.tool === 'get_issue');

	it('should read the issue that save_issue changes', () => {
		expect(issueReads('save_issue', { id: 'TRUST-1', state: 'In Review' })).toEqual([
			{ tool: 'get_issue', args: { id: 'TRUST-1' } },
		]);
	});

	it('should read the issue of a comment tool', () => {
		expect(issueReads('save_comment', { issueId: 'TRUST-1', body: 'x' })).toEqual([
			{ tool: 'get_issue', args: { id: 'TRUST-1' } },
		]);
	});

	it('should not read an issue for a save_issue that creates one', () => {
		expect(issueReads('save_issue', { title: 'New', team: 'TRUST' })).toEqual([]);
	});

	it('should not read an issue twice', () => {
		expect(issueReads('save_issue', { id: 'TRUST-1', parentId: 'TRUST-1' })).toHaveLength(1);
	});
});
