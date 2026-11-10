import { createUnsealedEntityWriteRule } from './unsealed-entity-write.factory.js';

export const NoUnsealedWorkflowEntityWriteRule = createUnsealedEntityWriteRule({
	entityName: 'WorkflowEntity',
	tableName: 'workflow_entity',
	repositoryName: 'WorkflowRepository',
	repositoryReceiver: /^(?:workflow|workflows)Repo(?:sitory)?$/i,
	repositoryFile: /[\\/]repositories[\\/]workflow\.repository\.ts$/,
	policedKey: 'nodes',
	description: 'Route workflow content writes through policy-cleared repository methods.',
	message: 'Route WorkflowEntity content writes through a policy-cleared repository method.',
});
