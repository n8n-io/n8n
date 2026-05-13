export type SchemaMap = {
	resolveWorkflowId(name: string): string | null;
	hasReadAccess(workflowId: string): boolean;
	accessibleWorkflowIds: readonly string[];
	tablePrefix: string;
	dialect: 'postgresdb' | 'sqlite';
};
