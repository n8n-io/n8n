import { createUnsealedEntityWriteRule } from './unsealed-entity-write.factory.js';

export const NoUnsealedCredentialsEntityWriteRule = createUnsealedEntityWriteRule({
	entityName: 'CredentialsEntity',
	repositoryName: 'CredentialsRepository',
	sealedMethod: 'updateContent',
	// A sibling like `sharedCredentialsRepository` stays out because the match is anchored.
	receiverPattern: /^credentials?Repo/,
	// `type` is the only field the credential policy check reads, so a data-only write
	// (an OAuth token refresh) stays clean.
	policedKey: 'type',
	persistenceFile:
		/([\\/]@n8n[\\/]db[\\/]src[\\/]repositories[\\/]credentials\.repository\.ts$|[\\/]migrations[\\/])/,
	tableName: 'credentials_entity',
	narrowExample: 'Pick<CredentialsEntity, "data">',
});
