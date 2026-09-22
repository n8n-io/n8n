import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoUnsealedCredentialsEntityWriteRule } from './no-unsealed-credentials-entity-write.js';

const ruleTester = new RuleTester();
const errors = [{ messageId: 'unsealedWrite' as const }];

ruleTester.run('no-unsealed-credentials-entity-write', NoUnsealedCredentialsEntityWriteRule, {
	valid: [
		// An OAuth token refresh writes ciphertext, never the type.
		'credentialsRepository.update(id, { data });',
		'credentialsRepository.update(id, { data, updatedAt });',
		'credentialsRepository.update(id);',
		// The sanctioned, token-gated write methods.
		'credentialsRepository.updateContent(id, { type }, ctx);',
		'credentialsRepository.createContent(credential, ctx);',
		'credentialsRepository.saveInstanceCredential(credential, ctx);',
		// Reads and existence changes are out of the type seal's scope.
		'credentialsRepository.delete(id);',
		'credentialsRepository.existsBy({ id });',
		"manager.query('DELETE FROM credentials_entity WHERE id = ?');",
		"manager.query('SELECT data FROM credentials_entity WHERE id = ?');",
		// Anchored, so a sibling repository stays out.
		'sharedCredentialsRepository.save(sharedCredential);',
		'credentialDependencyRepository.save(dependency);',
		// A different entity.
		'workflowRepository.save(workflow);',
		'manager.save(WorkflowEntity, workflow);',
		"manager.query('UPDATE workflow_entity SET nodes = ?');",
		{ code: 'credentialsRepository.save(credential);', filename: '/src/example.test.ts' },
		{
			code: 'credentialsRepository.save(credential);',
			filename: '/repositories/credentials.repository.ts',
		},
		{
			code: 'credentialsRepository.save(credential);',
			filename: '/packages/@n8n/backend-test-utils/src/db/credentials.ts',
		},
		// A database migration owns its table.
		{
			code: 'credentialsRepository.save(credential);',
			filename: '/packages/@n8n/db/src/migrations/common/1700000000000-Foo.ts',
		},
		{
			code: 'credentialsRepository.save(credential);',
			filename: '/packages/@n8n/engine/src/database/migrations/1700000000000-Foo.ts',
		},
	],
	invalid: [
		{ code: 'credentialsRepository.save(credential);', errors },
		{ code: 'this.credentialsRepository.save(credential);', errors },
		{ code: "this.credentialsRepo.update(id, { type: 'slackApi' });", errors },
		{ code: "credentialsRepository['save'](credential);", errors },
		{ code: 'credentialRepo.insert(credential);', errors },
		{ code: 'Container.get(CredentialsRepository).save(credential);', errors },
		{ code: 'dataSource.getRepository(CredentialsEntity).save(credential);', errors },
		{ code: 'manager.getRepository(CredentialsEntity).insert(credential);', errors },
		{ code: "manager.getRepository(CredentialsEntity).upsert(credential, ['id']);", errors },
		{ code: "manager.getRepository(CredentialsEntity).update(id, { type: 'slackApi' });", errors },
		{ code: "manager.getRepository('credentials_entity').save(credential);", errors },
		{ code: 'credentialsRepository?.save(credential);', errors },
		{ code: "credentialsRepository.update(id, { type: 'slackApi' });", errors },
		{ code: "credentialsRepository.update(id, { 'type': 'slackApi' });", errors },
		{ code: 'manager.save(CredentialsEntity, credential);', errors },
		{ code: "manager.upsert(CredentialsEntity, credential, ['id']);", errors },
		{ code: "manager.update(CredentialsEntity, id, { type: 'slackApi' });", errors },
		{ code: "manager.update<CredentialsEntity>(id, { type: 'slackApi' });", errors },
		{ code: 'queryBuilder.insert().into(CredentialsEntity);', errors },
		{
			code: "manager.createQueryBuilder().update(CredentialsEntity).set({ type: 'slackApi' });",
			errors,
		},
		{
			code: "credentialsRepository.createQueryBuilder().update().set({ type: 'slackApi' });",
			errors,
		},
		{ code: "manager.query('UPDATE credentials_entity SET type = ?');", errors },
		{ code: 'manager.query(`INSERT INTO credentials_entity (type) VALUES (?)`);', errors },
		{ code: 'manager.query(`UPDATE ${prefix}credentials_entity SET type = ?`);', errors },
		{ code: "manager.query('UPDATE public.credentials_entity SET type = ?');", errors },
		// A folder merely named `migrations` is not a database migration.
		{
			code: 'credentialsRepository.save(credential);',
			filename: '/packages/cli/src/modules/breaking-changes/migrations/foo.migration.ts',
			errors,
		},
		{ code: 'manager.query(`UPDATE "public"."credentials_entity" SET type = ?`);', errors },
	],
});
