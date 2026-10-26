import { z } from 'zod';

import '../../openapi-extend';
import { exportPackageRequestFieldDocs } from './export-package-request.openapi';
import { Z } from '../../zod-class';

export class ExportPackageRequestDto extends Z.class(
	{
		agentIds: z
			.array(z.string().trim().min(1))
			.min(1)
			.max(300)
			.optional()
			.openapi(exportPackageRequestFieldDocs.agentIds),
		workflowIds: z
			.array(z.string().trim().min(1))
			.min(1)
			.max(300)
			.optional()
			.openapi(exportPackageRequestFieldDocs.workflowIds),
		folderIds: z
			.array(z.string().trim().min(1))
			.min(1)
			.max(300)
			.optional()
			.openapi(exportPackageRequestFieldDocs.folderIds),
		projectIds: z
			.array(z.string().trim().min(1))
			.min(1)
			.max(300)
			.optional()
			.openapi(exportPackageRequestFieldDocs.projectIds),
		includeVariableValues: z
			.boolean()
			.default(true)
			.openapi(exportPackageRequestFieldDocs.includeVariableValues),
		includeTags: z.boolean().default(true).openapi(exportPackageRequestFieldDocs.includeTags),
		dependencyPolicy: z
			.enum(['fail', 'reference-only', 'include-in-package'])
			.optional()
			.default('fail')
			.openapi(exportPackageRequestFieldDocs.dependencyPolicy),
		versionPolicy: z
			.enum(['published-strict', 'prefer-published', 'ignore-unpublished', 'latest'])
			.optional()
			.default('latest')
			.openapi(exportPackageRequestFieldDocs.versionPolicy),
		credentialExportPolicy: z
			.enum(['expression-values-only', 'no-values'])
			.optional()
			.default('expression-values-only')
			.openapi(exportPackageRequestFieldDocs.credentialExportPolicy),
		includeArchivedWorkflows: z
			.boolean()
			.default(false)
			.openapi(exportPackageRequestFieldDocs.includeArchivedWorkflows),
	},
	{ strict: true },
) {}
