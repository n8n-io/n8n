import { RuleTester } from '@typescript-eslint/rule-tester';
import path from 'node:path';
import { NoDeploymentKeyDeleteRule } from './no-deployment-key-delete.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parserOptions: {
			projectService: {
				allowDefaultProject: ['*.ts'],
			},
			tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
		},
	},
});

/** Minimal stand-in mirroring the repository from @n8n/db. */
const repositoryClass = `
class DeploymentKeyRepository {
	async delete(criteria: unknown): Promise<unknown> { return {}; }
	async remove(entity: unknown): Promise<unknown> { return {}; }
	async softDelete(criteria: unknown): Promise<unknown> { return {}; }
	async clear(): Promise<void> {}
	async update(id: string, patch: unknown): Promise<unknown> { return {}; }
}
`;

ruleTester.run('no-deployment-key-delete', NoDeploymentKeyDeleteRule, {
	valid: [
		// Deactivation is the sanctioned lifecycle operation
		{
			code: `${repositoryClass}
declare const deploymentKeyRepository: DeploymentKeyRepository;
void deploymentKeyRepository.update('id', { status: 'inactive' });`,
			filename: 'service.ts',
		},
		// delete on unrelated repositories stays allowed
		{
			code: `class WebhookRepository {
	async delete(criteria: unknown): Promise<unknown> { return {}; }
}
declare const webhookRepository: WebhookRepository;
void webhookRepository.delete({});`,
			filename: 'service.ts',
		},
		// Plain collections are untouched
		{
			code: `const seen = new Map<string, string>();
seen.delete('x');
new Set<string>().clear();`,
			filename: 'service.ts',
		},
		// Test files may clean up rows
		{
			code: `${repositoryClass}
declare const deploymentKeyRepository: DeploymentKeyRepository;
void deploymentKeyRepository.delete({});`,
			filename: 'cleanup.test.ts',
			languageOptions: { parserOptions: { projectService: false } },
		},
		// The repository itself legitimately reaches the entity via the manager
		{
			code: `declare class DeploymentKey {}
declare const tx: { getRepository(entity: unknown): unknown };
tx.getRepository(DeploymentKey);`,
			filename: `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}db${path.sep}src${path.sep}repositories${path.sep}deployment-key.repository.ts`,
			languageOptions: { parserOptions: { projectService: false } },
		},
		// Reaching other entities through the manager stays allowed
		{
			code: `declare class WebhookEntity {}
declare const tx: { getRepository(entity: unknown): unknown };
tx.getRepository(WebhookEntity);`,
			filename: 'service.ts',
		},
		// Collections that merely hold entities are not a delete surface
		{
			code: `class DeploymentKey { id: string = ''; }
declare const cache: Map<string, DeploymentKey>;
cache.delete('x');`,
			filename: 'service.ts',
		},
	],
	invalid: [
		{
			code: `${repositoryClass}
declare const deploymentKeyRepository: DeploymentKeyRepository;
void deploymentKeyRepository.delete({});`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		{
			code: `${repositoryClass}
declare const deploymentKeyRepository: DeploymentKeyRepository;
void deploymentKeyRepository.softDelete({});`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		{
			code: `${repositoryClass}
class Holder {
	constructor(private readonly repository: DeploymentKeyRepository) {}
	async run() { await this.repository.clear(); }
}`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		// Entity-manager form is caught syntactically
		{
			code: `declare class DeploymentKey {}
declare const tx: { delete(entity: unknown, criteria: unknown): Promise<unknown> };
void tx.delete(DeploymentKey, { id: '1' });`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		{
			code: `declare class DeploymentKey {}
declare const manager: { remove(entity: unknown, entities: unknown): Promise<unknown> };
void manager.remove(DeploymentKey, []);`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		// A typed entity instance is caught even without naming the class
		{
			code: `class DeploymentKey { id: string = ''; }
declare const manager: { remove(entity: unknown): Promise<unknown> };
declare const key: DeploymentKey;
void manager.remove(key);`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		// … including arrays of entities
		{
			code: `class DeploymentKey { id: string = ''; }
declare const manager: { softRemove(entities: unknown): Promise<unknown> };
declare const keys: DeploymentKey[];
void manager.softRemove(keys);`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		// Alternative surfaces over the entity bypass the repository lockdown
		{
			code: `declare class DeploymentKey {}
declare const dataSource: { getRepository(entity: unknown): { delete(c: unknown): Promise<unknown> } };
void dataSource.getRepository(DeploymentKey).delete({});`,
			filename: 'service.ts',
			errors: [{ messageId: 'noAlternativeSurface', data: { method: 'getRepository' } }],
		},
		{
			code: `declare class DeploymentKey {}
declare const qb: { delete(): { from(entity: unknown): { execute(): Promise<unknown> } } };
void qb.delete().from(DeploymentKey).execute();`,
			filename: 'service.ts',
			errors: [{ messageId: 'noAlternativeSurface', data: { method: 'from' } }],
		},
		{
			code: `declare class DeploymentKey {}
declare const manager: { createQueryBuilder(entity: unknown, alias: string): unknown };
void manager.createQueryBuilder(DeploymentKey, 'dk');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noAlternativeSurface', data: { method: 'createQueryBuilder' } }],
		},
		// A receiver whose name gives no hint is still caught by its type
		{
			code: `${repositoryClass}
declare const repo: DeploymentKeyRepository;
void repo.delete({});`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		// The generic TypeORM repository instantiated for the entity
		{
			code: `class DeploymentKey { id: string = ''; }
class Repository<T> {
	async delete(criteria: unknown): Promise<T | undefined> { return undefined; }
}
declare const repo: Repository<DeploymentKey>;
void repo.delete({});`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		// Entity instances arriving through any expression shape
		{
			code: `class DeploymentKey { id: string = ''; }
declare function loadKey(): Promise<DeploymentKey>;
declare const manager: { remove(entity: unknown): Promise<unknown> };
export const run = async () => await manager.remove(await loadKey());`,
			filename: 'service.ts',
			errors: [{ messageId: 'noDelete' }],
		},
		// String entity targets: class name or table name
		{
			code: `declare const tx: { getRepository(entity: unknown): unknown };
tx.getRepository('DeploymentKey');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noAlternativeSurface', data: { method: 'getRepository' } }],
		},
		{
			code: `declare const qb: { delete(): { from(entity: unknown): { execute(): Promise<unknown> } } };
void qb.delete().from('deployment_key').execute();`,
			filename: 'service.ts',
			errors: [{ messageId: 'noAlternativeSurface', data: { method: 'from' } }],
		},
		// A no-substitution template literal is just another string spelling
		{
			code: 'declare const tx: { getRepository(entity: unknown): unknown };\ntx.getRepository(`deployment_key`);',
			filename: 'service.ts',
			errors: [{ messageId: 'noAlternativeSurface', data: { method: 'getRepository' } }],
		},
	],
});
