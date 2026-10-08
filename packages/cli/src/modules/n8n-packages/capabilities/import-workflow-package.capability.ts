import { base64EncodedSize } from '@n8n/api-types';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import z from 'zod';

import { WorkflowAccessError } from '@/modules/mcp/mcp.errors';
import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import { validateMcpWorkflow } from '@/modules/mcp/tools/workflow-validation.utils';
import {
	type CapabilityToolDefinition,
	defineCapability,
} from '@/services/capabilities/capability';
import { IMPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME } from '@/services/capabilities/capability-scopes';

import { type PackageSizeLimit, packageSizeLimitMessage } from './base64-limits';
import { instanceMcpPackageSizeLimit } from './mcp-package-size-limit';
import { packageToolError } from './package-tool-error';
import { describeImport } from './package-tool-text';
import { importWorkflowPackage, type WorkflowPackageImportRules } from './workflow-package-import';

function buildInputSchema(limit: PackageSizeLimit) {
	return {
		packageBase64: z
			.string()
			.min(1)
			// Rejects a package over the limit before the handler decodes it.
			.max(base64EncodedSize(limit.maxBytes), packageSizeLimitMessage(limit))
			.describe('The packageBase64 value of export_workflow_package'),
		projectId: z
			.string()
			.min(1)
			.optional()
			.describe('The project to import into. Defaults to your personal project.'),
		sourceWorkflowId: z
			.string()
			.min(1)
			.optional()
			.describe('When set, the import fails unless the package contains this source workflow'),
	} satisfies z.ZodRawShape;
}

type InputSchema = ReturnType<typeof buildInputSchema>;

const outputSchema = {
	workflowId: z.string().describe('The ID of the workflow on this instance'),
	workflowName: z.string(),
	created: z
		.boolean()
		.describe('True for a new workflow, false when the import updated an earlier import'),
	credentialsNeedingSetup: z
		.array(z.object({ name: z.string(), type: z.string(), id: z.string() }))
		.describe(
			'Empty credentials that this import created. Set them up before the workflow can run. A credential that an earlier import created is matched by name and type, so it is not listed again.',
		),
	missingNodeTypes: z
		.array(z.string())
		.describe(
			'Node types that this instance does not have, as "type@version". The workflow cannot be published until they are installed.',
		),
	warnings: z
		.array(z.string())
		.describe('What the import did not copy, for example tags and data tables, and what to do'),
} satisfies z.ZodRawShape;

/**
 * MCP clients change only workflows that are available in MCP and not archived, as with the
 * built-in tools. The import would update the given workflow, so the same rule applies.
 */
function assertUpdatableOverMcp(workflow: WorkflowEntity): void {
	try {
		validateMcpWorkflow(workflow);
	} catch (error) {
		if (!(error instanceof WorkflowAccessError)) throw error;
		throw new WorkflowAccessError(
			`The package matches the workflow "${workflow.name}" (${workflow.id}) in the target project, so the import would update that workflow. ${error.message} You can also import the package into another project.`,
			error.reason,
		);
	}
}

/**
 * A workflow that an MCP client creates is available in MCP, as with create_workflow_from_code,
 * so that the client can update or publish it later. Gives a warning when that fails.
 */
async function keepAvailableInMcp(user: User, workflowId: string): Promise<string[]> {
	const mcpSettings = Container.get(McpSettingsService);
	const { changedWorkflows, updatedCount, unchangedCount } =
		await mcpSettings.bulkSetAvailableInMCP(user, {
			workflowIds: [workflowId],
			availableInMCP: true,
		});
	void mcpSettings.broadcastWorkflowMCPAvailabilityChanged(changedWorkflows);
	if (updatedCount + unchangedCount > 0) return [];
	return [
		'The workflow is not available in MCP, so MCP clients cannot change it. Turn on MCP access in its workflow settings.',
	];
}

/** The rules of the MCP surface for the workflow that an import writes. */
export const MCP_IMPORT_RULES: WorkflowPackageImportRules = {
	assertUpdatable: assertUpdatableOverMcp,
	afterImport: keepAvailableInMcp,
};

function importWorkflowPackageTool(
	user: User,
	limit: PackageSizeLimit,
): CapabilityToolDefinition<InputSchema> {
	return {
		name: IMPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME,
		config: {
			description:
				'Import a workflow package from export_workflow_package into a project. Importing the same package again updates the workflow instead of making a copy, but only while that workflow is available in MCP and not archived. Credentials that this instance does not have become empty credentials to set up. The import does not create tags or data tables: it lists them in warnings. A new workflow stays unpublished and is available in MCP.',
			inputSchema: buildInputSchema(limit),
			outputSchema,
			annotations: {
				title: 'Import workflow package',
				readOnlyHint: false,
				// A re-import replaces the content of the workflow that an earlier import created.
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		handler: async ({ packageBase64, projectId, sourceWorkflowId }) => {
			try {
				const output = await importWorkflowPackage({
					user,
					packageBase64,
					limit,
					projectId,
					sourceWorkflowId,
					rules: MCP_IMPORT_RULES,
				});
				return {
					content: [{ type: 'text', text: describeImport(output) }],
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

/** MCP only: another n8n instance calls it to copy a workflow here. */
export const importWorkflowPackageCapability = defineCapability({
	name: IMPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME,
	scope: 'workflow:write',
	surfaces: ['mcp'],
	build: ({ user }) => importWorkflowPackageTool(user, instanceMcpPackageSizeLimit()),
});
