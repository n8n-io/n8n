import { z } from 'zod';

import { Z } from '../../zod-class';

export class ExportPackageRequestDto extends Z.class({
	workflowIds: z.array(z.string().trim().min(1)).min(1).max(300).optional(),
	folderIds: z.array(z.string().trim().min(1)).min(1).max(300).optional(),
	projectIds: z.array(z.string().trim().min(1)).min(1).max(300).optional(),
	includeVariableValues: z.boolean().default(true),
	missingWorkflowDependencyPolicy: z
		.enum(['fail', 'reference-only', 'include-in-package'])
		.optional()
		.default('fail'),
}) {}

/** Per-entity counts of what was actually bundled into an exported package. */
export interface ExportCounts {
	workflows: number;
	folders: number;
	credentials: number;
	dataTables: number;
	variables: number;
	projects: number;
}

/** JSON envelope returned by the package export endpoint. */
export interface ExportPackageResponse {
	/** Base64-encoded gzipped tar archive (.n8np) of the exported package. */
	package: string;
	counts: ExportCounts;
}
