export interface ToolDescriptor {
	name: string;
	description: string;
	inputSchema: Record<string, unknown> | null;
	outputSchema: Record<string, unknown> | null;
	hasSuspend: boolean;
	hasResume: boolean;
	hasToMessage: boolean;
	requireApproval: boolean;
	providerOptions: Record<string, unknown> | null;
}

export interface CustomToolEntry {
	code: string;
	descriptor: ToolDescriptor;
}

export interface AgentPublishedVersion {
	schema: unknown | null;
	model: string | null;
	provider: string | null;
	credentialId: string | null;
	publishedAt: string;
	publishedById: string | null;
}

export type Agent = {
	id: string;
	name: string;
	description: string | null;
	projectId: string;
	credentialId: string | null;
	provider: string | null;
	model: string | null;
	isCompiled: boolean;
	createdAt: string;
	updatedAt: string;
	tools: Record<string, CustomToolEntry>;
	publishedVersion: AgentPublishedVersion | null;
};
