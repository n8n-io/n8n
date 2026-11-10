import {
	buildOwnerFilterOptions,
	buildProjectFilterOptions,
	ownerLabel,
	projectLabel,
} from './workflowLabels';
import { PERSONAL_PROJECTS } from './workflowFilters';
import { owner, workflowRow } from './__tests__/workflowRow';

describe('workflowLabels', () => {
	it.each([
		['the full name', owner('ada', { firstName: 'Ada', lastName: 'Lovelace' }), 'Ada Lovelace'],
		['the first name alone', owner('ada', { firstName: 'Ada' }), 'Ada'],
		['the email without a name', owner('ada'), 'ada@example.com'],
		['the fallback without a name or email', owner('ada', { email: null }), 'Unassigned'],
		['the fallback without an owner', undefined, 'Unassigned'],
	])('should show %s for the owner', (_, rowOwner, label) => {
		expect(ownerLabel(workflowRow({ owner: rowOwner }), 'Unassigned')).toBe(label);
	});

	it.each([
		['a personal project', { homeProjectType: 'personal' as const }, 'Personal'],
		['a team project', { homeProjectType: 'team' as const, homeProjectName: 'Ops' }, 'Ops'],
		['no project', {}, '—'],
	])('should label %s', (_, project, label) => {
		expect(projectLabel(workflowRow(project), 'Personal')).toBe(label);
	});

	it('should list each owner once, sorted by label', () => {
		const grace = owner('grace', { firstName: 'grace' });
		const rows = [
			workflowRow({ id: '1', owner: grace }),
			workflowRow({ id: '2', owner: owner('ada', { firstName: 'Ada' }) }),
			workflowRow({ id: '3', owner: grace }),
			workflowRow({ id: '4' }),
		];

		expect(buildOwnerFilterOptions(rows, 'Unassigned')).toEqual([
			{ id: 'ada', label: 'Ada' },
			{ id: 'grace', label: 'grace' },
		]);
	});

	it('should list personal projects as one option before the sorted team projects', () => {
		const rows = [
			workflowRow({
				id: '1',
				homeProjectType: 'team',
				homeProjectId: 'p-ops',
				homeProjectName: 'ops',
			}),
			workflowRow({ id: '2', homeProjectType: 'personal', homeProjectId: 'p-ada' }),
			workflowRow({ id: '3', homeProjectType: 'personal', homeProjectId: 'p-grace' }),
			workflowRow({
				id: '4',
				homeProjectType: 'team',
				homeProjectId: 'p-ai',
				homeProjectName: 'AI',
			}),
			workflowRow({ id: '5', homeProjectType: 'team', homeProjectId: 'p-x' }),
		];

		expect(buildProjectFilterOptions(rows, 'Personal')).toEqual([
			{ id: PERSONAL_PROJECTS, label: 'Personal' },
			{ id: 'p-ai', label: 'AI' },
			{ id: 'p-ops', label: 'ops' },
			{ id: 'p-x', label: 'p-x' },
		]);
	});

	it('should leave out the personal option when no workflow is personal', () => {
		const rows = [
			workflowRow({ homeProjectType: 'team', homeProjectId: 'p-ops', homeProjectName: 'Ops' }),
		];

		expect(buildProjectFilterOptions(rows, 'Personal')).toEqual([{ id: 'p-ops', label: 'Ops' }]);
	});
});
