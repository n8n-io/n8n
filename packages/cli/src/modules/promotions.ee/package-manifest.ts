import { BadRequestError } from '@n8n/errors';

import { N8N_VERSION } from '@/constants';
import { FORMAT_VERSION } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { deriveLists } from './branch-manifest';
import {
	joinWorkflowRequirements,
	parseWorkflowRequirements,
	workflowRequirementsPath,
	type WorkflowRequirements,
} from './workflow-requirements';

/** Where the package on a branch comes from. It has no manifest that names its source. */
export const BRANCH_PACKAGE_SOURCE_ID = 'promotion-branch';

/**
 * The manifest of a package that a branch holds. The branch has no `manifest.json`: the lists
 * come from the entity files, the requirements from the file of each workflow, and the header is
 * filled in here. A `manifest.json` that an older branch still holds is not read.
 * `files` are package-relative paths with their content.
 */
export function manifestFromFiles(
	files: Iterable<[path: string, content: string | Buffer]>,
): PackageManifest {
	const entries = [...files];
	const lists = deriveLists(entries);

	const contents = new Map(entries);
	const byWorkflow = new Map<string, WorkflowRequirements>();
	for (const { id, target } of lists.workflows ?? []) {
		const path = workflowRequirementsPath(target);
		const raw = contents.get(path);
		if (raw === undefined) continue;
		const requirements = parseWorkflowRequirements(raw);
		if (!requirements) {
			throw new BadRequestError(`The requirements file "${path}" in the package is not valid`);
		}
		byWorkflow.set(id, requirements);
	}
	const requirements = joinWorkflowRequirements(byWorkflow);

	return {
		packageFormatVersion: FORMAT_VERSION,
		sourceN8nVersion: N8N_VERSION,
		sourceId: BRANCH_PACKAGE_SOURCE_ID,
		...lists,
		...(requirements ? { requirements } : {}),
	};
}
