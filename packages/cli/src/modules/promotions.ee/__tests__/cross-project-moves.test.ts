import type { InventoryWorkflow } from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';

import {
	crossProjectMoves,
	describePromotedMoves,
	type InstanceProject,
} from '../cross-project-moves';

const alpha = { id: 'p1', name: 'Alpha', path: 'projects/alpha' };
const beta = { id: 'p2', name: 'Beta', path: 'projects/beta' };
const team = (id: string, name: string): InstanceProject => ({ id, name, type: 'team' });
const workflow = (id: string, projectId: string) =>
	({ id, name: id.toUpperCase(), projectId }) as InventoryWorkflow;
const folderEntry = (id: string, projectId: string) => ({
	path: `projects/x/folders/${id}/folder.json`,
	projectId,
	folder: { id, name: id.toUpperCase(), parentFolderId: null },
});

describe('crossProjectMoves', () => {
	// w1 moved from Beta to Alpha, w2 from Alpha to Beta, w3 stayed in Alpha.
	const inventory = {
		projects: [alpha, beta],
		workflows: [workflow('w2', 'p1'), workflow('w1', 'p2'), workflow('w3', 'p1')],
		// f1 moved from Alpha to Beta, f2 from Beta to Alpha.
		folders: [folderEntry('f1', 'p2'), folderEntry('f2', 'p1')],
	};
	const owners = new Map([
		['w1', team('p1', 'Alpha')],
		['w2', team('p2', 'Beta')],
		['w3', team('p1', 'Alpha')],
	]);
	const folderHomes = new Map([
		['f1', team('p1', 'Alpha')],
		['f2', team('p2', 'Beta')],
	]);
	const existingProjectIds = new Set(['p1', 'p2']);

	it('lists every move between projects for the whole instance, sorted by id', () => {
		const moves = crossProjectMoves({ inventory, owners, folderHomes, existingProjectIds });

		expect(moves.workflows.map(({ id }) => id)).toEqual(['w1', 'w2']);
		expect(moves.workflows[0]).toEqual({
			id: 'w1',
			name: 'W1',
			project: { id: 'p2', name: 'Beta' },
			projectExists: true,
			instanceProject: { id: 'p1', name: 'Alpha' },
		});
		expect(moves.folders.map(({ id }) => id)).toEqual(['f1', 'f2']);
	});

	it('counts workflows on either side of a project, and folders only on the branch side', () => {
		const moves = crossProjectMoves({
			inventory,
			owners,
			folderHomes,
			existingProjectIds,
			projectId: 'p1',
		});

		expect(moves.workflows.map(({ id }) => id)).toEqual(['w1', 'w2']);
		// f1 moved out of Alpha on the branch. The import of Alpha never reads it.
		expect(moves.folders.map(({ id }) => id)).toEqual(['f2']);
	});

	it('flags a branch project that does not exist here, and leaves out a personal project name', () => {
		const moves = crossProjectMoves({
			inventory: { ...inventory, folders: [] },
			owners: new Map([['w1', { id: 'p9', name: 'Ada <ada@example.com>', type: 'personal' }]]),
			folderHomes: new Map(),
			existingProjectIds: new Set(['p1']),
		});

		// A personal project's name holds its owner's email.
		expect(moves.workflows).toEqual([
			expect.objectContaining({ id: 'w1', projectExists: false, instanceProject: { id: 'p9' } }),
		]);
	});
});

describe('describePromotedMoves', () => {
	const move = {
		id: 'w1',
		name: 'Invoices',
		project: { id: 'p2', name: 'Beta' },
		projectExists: true,
		instanceProject: { id: 'p1', name: 'Alpha' },
	};

	it('names no personal project, and says when the branch project does not exist here', () => {
		const message = describePromotedMoves({
			workflows: [{ ...move, projectExists: false, instanceProject: { id: 'p1' } }],
			folders: [],
		});

		expect(message).toContain('is in a personal project here');
		expect(message).toContain('and project "Beta" does not exist on this instance yet');
		expect(message).not.toContain('Alpha');
	});

	it('tells promote to move them back on this instance', () => {
		expect(describePromotedMoves({ workflows: [move], folders: [] })).toBe(
			'Promote can\'t move workflows or folders between projects, because Apply would refuse them on the destination: workflow "Invoices" (w1) is in project "Alpha" here and in project "Beta" on the branch. Move them back on this instance, then promote again.',
		);
	});
});
