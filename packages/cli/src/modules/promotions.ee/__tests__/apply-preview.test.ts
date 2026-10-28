import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import type { PackageDirectoryInventory } from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { BlockingIssue } from '@/modules/n8n-packages/n8n-packages.types';

import { toApplyCheck } from '../apply-preview';

describe('toApplyCheck', () => {
	it('names the project whose plan raised a blocker that stops the whole project', () => {
		// An Apply of the whole instance plans Alpha and Beta. Only the plan of Beta is blocked.
		const checkNotRun: BlockingIssue = { type: 'policy-check-failed', point: 'contentImport' };
		const scope = (id: string, blockingIssues: BlockingIssue[]) => ({
			project: { id },
			plan: { blockingIssues, variablePlan: { matched: [] } },
		});
		const plan = {
			projectPlan: { items: [] },
			scopes: [scope('p1', []), scope('p2', [checkNotRun])],
			issues: [checkNotRun],
		} as unknown as PackageImportPlan;
		const inventory = {
			projects: [
				{ id: 'p1', name: 'Alpha', path: 'projects/alpha' },
				{ id: 'p2', name: 'Beta', path: 'projects/beta' },
			],
			workflows: [],
			folders: [],
			credentials: [],
			variables: [],
			dataTables: [],
		} as unknown as PackageDirectoryInventory;

		const { preflight } = toApplyCheck({
			plan,
			inventory,
			credentials: [],
			variables: [],
			moves: { workflows: [], folders: [] },
		});

		expect(preflight.conflicts).toEqual([
			{
				kind: 'project',
				code: 'check-not-run',
				project: { id: 'p2', name: 'Beta' },
				reason: 'contentImport',
			},
		]);
	});
});
