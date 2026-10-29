import { createUnsealedEntityWriteRule } from './unsealed-entity-write.factory.js';

export const NoUnsealedCredentialsEntityWriteRule = createUnsealedEntityWriteRule({
	entityName: 'CredentialsEntity',
	tableName: 'credentials_entity',
	repositoryName: 'CredentialsRepository',
	// A sibling like `sharedCredentialsRepository` stays out because the match is anchored.
	repositoryReceiver: /^(?:credential|credentials)Repo(?:sitory)?$/i,
	repositoryFile: /[\\/]repositories[\\/]credentials\.repository\.ts$/,
	// `type` is the only field the credential policy check reads, so a data-only write
	// (an OAuth token refresh) stays clean.
	policedKey: 'type',
	description: 'Route credential type writes through policy-cleared repository methods.',
	message: 'Route CredentialsEntity type writes through a policy-cleared repository method.',
});
