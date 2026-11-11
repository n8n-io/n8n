import type { ModuleName } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { packagedModules } from '@/modules/modules.manifest';

/** Every backend module: each `src/modules/<dir>/<name>.module.ts`, and the packaged ones. */
function allModuleNames() {
	const modulesDir = path.join(process.cwd(), 'src', 'modules');
	const cliModules = readdirSync(modulesDir, { withFileTypes: true, recursive: false })
		.filter((entry) => entry.isDirectory())
		.flatMap((dir) => readdirSync(path.join(modulesDir, dir.name)))
		.filter((file) => file.endsWith('.module.ts'))
		.map((file) => file.replace(/\.module\.ts$/, ''));
	return [...new Set([...cliModules, ...Object.keys(packagedModules)])] as ModuleName[];
}

/** The details row belongs to a service account and to nothing else. */
const allowed = new Set(['ServiceAccountDetails.serviceAccount']);

describe('relations to the user table', () => {
	beforeAll(async () => {
		// Every module, so the check sees the module entities too.
		await testModules.loadModules(allModuleNames(), packagedModules);
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('target User, so a relation loads accounts of both kinds', () => {
		const dataSource = Container.get(DataSource);
		const userTable = dataSource.getMetadata(User).tableName;

		const relations = dataSource.entityMetadatas.flatMap((metadata) =>
			metadata.ownRelations
				.filter((relation) => relation.inverseEntityMetadata.tableName === userTable)
				.map((relation) => ({
					name: `${metadata.name}.${relation.propertyName}`,
					target: relation.inverseEntityMetadata.target,
				})),
		);
		const offenders = relations
			.filter(({ name, target }) => target !== User && !allowed.has(name))
			.map(({ name }) => name);

		// The scan must include core and module entities, or the check below proves nothing.
		expect(relations.map(({ name }) => name)).toEqual(
			expect.arrayContaining([
				'AuthIdentity.user',
				'ProjectRelation.user',
				'ChatHubSession.owner',
				'AgentExecutionThread.owner',
				'UserConsent.user',
			]),
		);
		expect(offenders).toEqual([]);
	});
});
