export type SchemaMap = {
	resolveWorkflowId(nameOrId: string): string | null;
	resolveNodeName(workflowId: string, nameOrId: string): string | null;
	hasReadAccess(workflowId: string): boolean;
	accessibleWorkflowIds: readonly string[];
	tablePrefix: string;
	dialect: 'postgresdb' | 'sqlite';
};
