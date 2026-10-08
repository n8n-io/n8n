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
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { type PackageSizeLimit, packageSizeLimitMessage } from './base64-limits';
import { errorWorkflowProblemText } from './import-outcome';
import { instanceMcpPackageSizeLimit } from './mcp-package-size-limit';
import {
	classifyMcpWorkflowAccessFailure,
	packageToolError,
	reasonForClient,
} from './package-tool-error';
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
	published: z
		.boolean()
		.describe(
			'True when a version of the workflow is live after the import. The warnings say when the live version is not the imported one.',
		),
	newVersionLive: z
		.boolean()
		.describe(
			'True when the live version is the version that this import wrote. False when no version is live, or when an earlier version stays live.',
		),
	credentialsNeedingSetup: z
		.array(z.object({ name: z.string(), type: z.string(), id: z.string() }))
		.describe(
			'Credentials that the workflow uses and that hold no value: the empty credentials that this import created, and existing ones that are still empty, for example from an earlier import. Set them up before the workflow can run.',
		),
	missingNodeTypes: z
		.array(z.string())
		.describe(
			'Node types that this instance does not have, as "type@version". The workflow cannot be published until they are installed.',
		),
	warnings: z
		.array(z.string())
		.describe(
			'What the import did not copy or changed, for example tags, data tables, variables, matched credentials, the error workflow and the live version, and what to do',
		),
} satisfies z.ZodRawShape;

type Output = z.infer<z.ZodObject<typeof outputSchema>>;

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

const NOT_AVAILABLE_IN_MCP =
	'The workflow is not available in MCP, so MCP clients cannot change it. Turn on MCP access in its workflow settings.';

/**
 * A workflow that an MCP client creates is available in MCP, as with create_workflow_from_code,
 * so that the client can update or publish it later. Gives a warning when that fails.
 */
async function keepAvailableInMcp(user: User, workflowId: string): Promise<string[]> {
	const mcpSettings = Container.get(McpSettingsService);
	try {
		const { changedWorkflows, updatedCount, unchangedCount } =
			await mcpSettings.bulkSetAvailableInMCP(user, {
				workflowIds: [workflowId],
				availableInMCP: true,
			});
		void mcpSettings.broadcastWorkflowMCPAvailabilityChanged(changedWorkflows);
		return updatedCount + unchangedCount > 0 ? [] : [NOT_AVAILABLE_IN_MCP];
	} catch (error) {
		return [`Could not turn on MCP access: ${reasonForClient(error)}. ${NOT_AVAILABLE_IN_MCP}`];
	}
}

function mcpErrorWorkflowProblemText(reason: WorkflowAccessError['reason']): string {
	if (reason === 'not_available_in_mcp') return 'it is not available in MCP';
	if (reason === 'workflow_archived') return 'it is archived';
	return errorWorkflowProblemText('not-found');
}

/**
 * MCP clients link a workflow only to an error workflow that is available in MCP and not
 * archived, as with update_workflow. A copy that an MCP client imports follows the same rule.
 */
async function mcpErrorWorkflowProblem(user: User, errorWorkflowId: string) {
	const errorWorkflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
		errorWorkflowId,
		user,
		['workflow:read'],
	);
	try {
		validateMcpWorkflow(errorWorkflow);
		return undefined;
	} catch (error) {
		if (!(error instanceof WorkflowAccessError)) throw error;
		return mcpErrorWorkflowProblemText(error.reason);
	}
}

/** The rules of the MCP surface for the workflow that an import writes. */
export const MCP_IMPORT_RULES: WorkflowPackageImportRules = {
	assertUpdatable: assertUpdatableOverMcp,
	afterImport: keepAvailableInMcp,
	classifyFailure: classifyMcpWorkflowAccessFailure,
	errorWorkflowRule: mcpErrorWorkflowProblem,
};

const IMPORT_DESCRIPTION = [
	'Import a workflow package from export_workflow_package into a project.',
	'Importing the same package again updates the workflow instead of making a copy, but only while that workflow is available in MCP and not archived.',
	'Credentials that this instance does not have become empty credentials to set up. The import uses an existing credential with the same name and type, and names it in warnings.',
	'The import does not create tags, data tables or variables: it lists them in warnings.',
	'A re-import keeps the credentials that the copy uses, and the data tables that it uses in place of tables that the project does not have.',
	'A new workflow stays unpublished and is available in MCP.',
	'When the workflow is published, a re-import publishes the new version only if the source publishes it. Otherwise an earlier version stays live. The warnings say which version is live.',
	'A re-import keeps the error workflow of the copy. A new copy keeps the error workflow of the package only if you can use that workflow here and it is available in MCP.',
].join(' ');

function importWorkflowPackageTool(
	user: User,
	limit: PackageSizeLimit,
): CapabilityToolDefinition<InputSchema> {
	return {
		name: IMPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME,
		config: {
			description: IMPORT_DESCRIPTION,
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
				// Fails to compile when the result and the output schema drift apart.
				const structuredContent: Output = output;
				return {
					content: [{ type: 'text', text: describeImport(output) }],
					structuredContent,
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
