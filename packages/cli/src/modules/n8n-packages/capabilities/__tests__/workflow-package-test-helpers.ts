import type { CallToolResult } from '@modelcontextprotocol/server';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import type z from 'zod';

import type { RegisterToolFn, ToolDefinition, ToolHandlerResult } from '@/modules/mcp/mcp.types';
import type { Capability } from '@/services/capabilities/capability';

import { exportWorkflowPackageCapability } from '../export-workflow-package.capability';
import { importWorkflowPackageCapability } from '../import-workflow-package.capability';

/** Calls a capability exactly as the MCP server does for one user request. */
async function callTool(
	capability: Capability,
	user: User,
	args: Record<string, unknown>,
): Promise<CallToolResult> {
	const tools: ToolDefinition<z.ZodRawShape, ToolHandlerResult>[] = [];
	const register: RegisterToolFn = (tool) => {
		tools.push(tool);
	};
	capability.registerOn(register, { user });
	const result = await tools[0].handler(args);
	if ('resultType' in result) throw new Error('Unexpected input request');
	return result;
}

export const exportTool = async (user: User, workflowId: string) =>
	await callTool(exportWorkflowPackageCapability, user, { workflowId });

export const importTool = async (user: User, args: Record<string, unknown>) =>
	await callTool(importWorkflowPackageCapability, user, args);

export const textOf = (result: CallToolResult) =>
	result.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n');

export type ExportOutput = {
	packageBase64: string;
	workflowName: string;
	sizeBytes: number;
	requirements: { nodeTypes: string[]; credentials: { name: string; type: string }[] };
	warnings: string[];
};

export type ImportOutput = {
	workflowId: string;
	workflowName: string;
	created: boolean;
	published: boolean;
	credentialsNeedingSetup: { name: string; type: string; id: string }[];
	missingNodeTypes: string[];
	warnings: string[];
};

export function exported(result: CallToolResult): ExportOutput {
	expect(result.isError, textOf(result)).toBeUndefined();
	return result.structuredContent as ExportOutput;
}

export function imported(result: CallToolResult): ImportOutput {
	expect(result.isError, textOf(result)).toBeUndefined();
	return result.structuredContent as ImportOutput;
}

export const httpNode = (credential: Pick<CredentialsEntity, 'id' | 'name'>): INode => ({
	id: 'http-1',
	name: 'Call Stripe',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
});

export const workflowCountIn = async (project: Project) =>
	await Container.get(SharedWorkflowRepository).count({ where: { projectId: project.id } });

export const storedWorkflow = async (workflowId: string) =>
	await Container.get(WorkflowRepository).findOneByOrFail({ id: workflowId });
