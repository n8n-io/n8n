import { createUnsealedEntityWriteRule } from './unsealed-entity-write.factory.js';

export const NoUnsealedWorkflowEntityWriteRule = createUnsealedEntityWriteRule({
	entityName: 'WorkflowEntity',
	repositoryName: 'WorkflowRepository',
	sealedMethod: 'updateContent',
	// A sibling like `sharedWorkflowRepository` stays out because the match is anchored.
	receiverPattern: /^workflows?Repo/,
	policedKey: 'nodes',
	persistenceFile:
		/([\\/]@n8n[\\/]db[\\/]src[\\/]repositories[\\/]workflow\.repository\.ts$|[\\/]migrations[\\/])/,
	tableName: 'workflow_entity',
	narrowExample: 'Pick<WorkflowEntity, "active">',
});
