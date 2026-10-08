import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import z from 'zod';

import { getMcpWorkflow } from '@/modules/mcp/tools/workflow-validation.utils';
import {
	type CapabilityToolDefinition,
	defineCapability,
} from '@/services/capabilities/capability';
import { EXPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME } from '@/services/capabilities/capability-scopes';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { PackageSizeLimit } from './base64-limits';
import { instanceMcpPackageSizeLimit } from './mcp-package-size-limit';
import { classifyMcpWorkflowAccessFailure, packageToolError } from './package-tool-error';
import { describeExport } from './package-tool-text';
import { exportWorkflowPackage, type PackageSourceWorkflow } from './workflow-package-export';

const inputSchema = {
	workflowId: z.string().min(1).describe('The ID of the workflow to export'),
} satisfies z.ZodRawShape;

const credentialSchema = z.object({ name: z.string(), type: z.string() });

const outputSchema = {
	packageBase64: z
		.string()
		.describe('The workflow package (.n8np) as base64. Pass it to import_workflow_package as is.'),
	workflowName: z.string(),
	sizeBytes: z.number().int().nonnegative().describe('Size of the package before base64'),
	requirements: z
		.object({
			nodeTypes: z
				.array(z.string())
				.describe('Node types that the workflow uses, as "type@version"'),
			credentials: z
				.array(credentialSchema)
				.describe('Credentials that the workflow uses. The package carries no credential data.'),
		})
		.describe('What the instance that imports the package must have'),
	warnings: z
		.array(z.string())
		.describe('What the package does not copy, for example the error workflow and variable values'),
} satisfies z.ZodRawShape;

/** Finds the workflow as the MCP tools do: readable, available in MCP and not archived. */
async function findMcpWorkflow(user: User, workflowId: string): Promise<PackageSourceWorkflow> {
	return await getMcpWorkflow(
		workflowId,
		user,
		['workflow:read'],
		Container.get(WorkflowFinderService),
	);
}

const EXPORT_DESCRIPTION = [
	'Export one workflow as an n8n package (.n8np, base64) to copy it to another n8n instance with import_workflow_package.',
	'The package is in packageBase64 of the structured content, not in the text.',
	'It has no credential data and no variable values: it lists the credentials and node types the workflow needs, and the warnings name the variables.',
	'It holds the name and the columns, but not the rows, of each data table that the workflow uses.',
	'The workflow must be available in MCP.',
	'A workflow that calls a sub-workflow by a fixed ID cannot be exported, because a package holds one workflow only.',
	'The package does not hold the error workflow of the workflow. A new copy keeps the link only if the user who imports it can use that workflow there.',
].join(' ');

function exportWorkflowPackageTool(
	user: User,
	limit: PackageSizeLimit,
): CapabilityToolDefinition<typeof inputSchema> {
	return {
		name: EXPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME,
		config: {
			description: EXPORT_DESCRIPTION,
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Export workflow package',
				readOnlyHint: true,
				openWorldHint: false,
			},
		},
		handler: async ({ workflowId }) => {
			try {
				const output = await exportWorkflowPackage({
					user,
					workflowId,
					findWorkflow: async (id) => await findMcpWorkflow(user, id),
					classifyFailure: classifyMcpWorkflowAccessFailure,
					limit,
				});
				return {
					content: [{ type: 'text', text: describeExport(output) }],
					structuredContent: output,
				};
			} catch (error) {
				const result = packageToolError(error);
				if (result) return result;
				throw error;
			}
		},
	};
}

/** MCP only: another n8n instance calls it to copy a workflow. The n8n Assistant needs no package. */
export const exportWorkflowPackageCapability = defineCapability({
	name: EXPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME,
	scope: 'workflow:read',
	surfaces: ['mcp'],
	build: ({ user }) => exportWorkflowPackageTool(user, instanceMcpPackageSizeLimit()),
});
