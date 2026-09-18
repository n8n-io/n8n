import { RuleTester } from '@typescript-eslint/rule-tester';
import path from 'node:path';
import { NoUnsealedCredentialsEntityWriteRule } from './no-unsealed-credentials-entity-write.js';

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

/** Minimal stand-ins for the TypeORM and `@n8n/db` shapes the rule resolves through. */
const dbTypes = `
class CredentialsEntity { id: string; name: string; type: string; data: string; isManaged: boolean; usageScope: string; }
class WorkflowEntity { id: string; name: string; nodes: unknown[]; active: boolean; }
class SharedCredentials { credentialsId: string; projectId: string; credentials: CredentialsEntity; }
interface ICredentialsDb { id: string; name: string; type: string; data?: string; updatedAt: Date; }
type DeepPartial<T> = { [K in keyof T]?: T[K] };
declare class UpdateQueryBuilder<T> { set(values: DeepPartial<T>): this; where(q: string, p?: object): this; execute(): Promise<unknown>; }
declare class InsertQueryBuilder<T> { into<E>(target: new () => E): InsertQueryBuilder<E>; values(v: DeepPartial<T>): this; execute(): Promise<unknown>; }
declare class SelectQueryBuilder<T> {
	update(): UpdateQueryBuilder<T>;
	update<E>(target: new () => E, values?: DeepPartial<E>): UpdateQueryBuilder<E>;
	insert(): InsertQueryBuilder<T>;
}
declare class EntityManager {
	save<T>(entity: T): Promise<T>;
	save<T>(target: new () => T, entity: DeepPartial<T>): Promise<T>;
	insert<T>(target: new () => T, entity: DeepPartial<T>): Promise<unknown>;
	upsert<T>(target: new () => T, entity: DeepPartial<T>, conflict: string[]): Promise<unknown>;
	update<T>(target: new () => T, criteria: unknown, partial: DeepPartial<T>): Promise<unknown>;
	createQueryBuilder(): SelectQueryBuilder<unknown>;
	getRepository<T>(target: new () => T): Repository<T>;
	query(sql: string, params?: unknown[]): Promise<unknown>;
}
declare class Repository<T> {
	manager: EntityManager;
	create(partial: DeepPartial<T>): T;
	save(entity: T | T[]): Promise<T>;
	insert(entity: DeepPartial<T>): Promise<unknown>;
	upsert(entity: DeepPartial<T>, conflict: string[]): Promise<unknown>;
	update(criteria: unknown, partial: DeepPartial<T>): Promise<unknown>;
	delete(criteria: unknown): Promise<unknown>;
	existsBy(criteria: unknown): Promise<boolean>;
	createQueryBuilder(alias?: string): SelectQueryBuilder<T>;
}
declare class CredentialsRepository extends Repository<CredentialsEntity> {
	createContent(credential: CredentialsEntity, ctx: object): Promise<CredentialsEntity>;
	updateContent(id: string, content: DeepPartial<CredentialsEntity>, ctx: object): Promise<void>;
}
declare class SharedCredentialsRepository extends Repository<SharedCredentials> {}
declare class WorkflowRepository extends Repository<WorkflowEntity> {}
declare const Container: { get<T>(c: new (...args: never[]) => T): T };
declare const manager: EntityManager;
declare const repo: CredentialsRepository;
declare const cred: CredentialsEntity;
declare const shared: SharedCredentials;
declare const wf: WorkflowEntity;
declare const id: string;
declare const ctx: object;
`;

const typed = (code: string) => ({
	name: code,
	code: `${dbTypes}\n${code}`,
	filename: 'foo.service.ts',
});

/** The syntactic floor: no program, so only names and inline literals are inspected. */
const untyped = (code: string, filename: string) => ({
	name: code,
	code,
	filename,
	languageOptions: { parserOptions: { projectService: false } },
});

const businessLogic = `${path.sep}repo${path.sep}packages${path.sep}cli${path.sep}src${path.sep}services${path.sep}foo.service.ts`;
const dbService = `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}db${path.sep}src${path.sep}services${path.sep}foo.service.ts`;
const sealedRepository = `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}db${path.sep}src${path.sep}repositories${path.sep}credentials.repository.ts`;
const workflowRepository = `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}db${path.sep}src${path.sep}repositories${path.sep}workflow.repository.ts`;
const migration = `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}db${path.sep}src${path.sep}migrations${path.sep}1-foo.ts`;
const testUtils = `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}backend-test-utils${path.sep}src${path.sep}db${path.sep}credentials.ts`;
const integrationTest = `${path.sep}repo${path.sep}packages${path.sep}cli${path.sep}test${path.sep}integration${path.sep}setup.ts`;
const testFolderInRuntimeTree = `${path.sep}repo${path.sep}packages${path.sep}cli${path.sep}src${path.sep}test${path.sep}foo.service.ts`;

const unsealed = [{ messageId: 'unsealedWrite' as const }];
const opaque = [{ messageId: 'opaquePayload' as const }];

ruleTester.run('no-unsealed-credentials-entity-write', NoUnsealedCredentialsEntityWriteRule, {
	valid: [
		// The sanctioned, token-gated write methods, also through an alias.
		typed('repo.updateContent(id, { type: "slackApi" }, ctx);'),
		typed('repo.createContent(cred, ctx);'),
		typed('const r = repo; r.updateContent(id, { type: "slackApi" }, ctx);'),
		// An OAuth token refresh writes ciphertext, never the type.
		typed('repo.update(id, { data: "" });'),
		typed('repo.update({ id }, { data: "", isManaged: false });'),
		typed('const refresh = { data: "" }; repo.update(id, refresh);'),
		typed('const refresh = { data: "" }; repo.update(id, { ...refresh, isManaged: true });'),
		typed("declare const p: Pick<CredentialsEntity, 'data'>; repo.update(id, p);"),
		typed("declare const p: Pick<ICredentialsDb, 'data' | 'updatedAt'>; repo.update(id, p);"),
		typed('manager.update(CredentialsEntity, { id }, { data: "" });'),
		typed(
			'repo.createQueryBuilder().update().set({ data: "" }).where(\'id = :id\', { id }).execute();',
		),
		// Existence changes, reads and entity construction are out of the type seal's scope.
		typed('repo.delete(id);'),
		typed('repo.existsBy({ id });'),
		typed('repo.create({ id, type: "slackApi" });'),
		// Other entities, including one whose relation points at CredentialsEntity.
		typed('manager.save(wf);'),
		typed('manager.save(shared);'),
		typed('Container.get(WorkflowRepository).save(wf);'),
		typed('Container.get(SharedCredentialsRepository).save(shared);'),
		typed(
			'declare const sharedRepo: SharedCredentialsRepository; sharedRepo.insert({ credentialsId: id, projectId: id });',
		),
		typed(
			'manager.createQueryBuilder().insert().into(WorkflowEntity).values({ nodes: [] }).execute();',
		),
		// Raw SQL that does not write credentials_entity.
		typed("manager.query('UPDATE workflow_entity SET nodes = $1 WHERE id = $2', [[], id]);"),
		typed("manager.query('SELECT data FROM credentials_entity WHERE id = $1', [id]);"),
		typed("manager.query('DELETE FROM credentials_entity WHERE id = $1', [id]);"),
		// Test files are exempt even with type information.
		{ ...typed('repo.save(cred);'), filename: 'foo.test.ts' },
		// The floor: untyped shapes the syntactic pass cannot inspect.
		untyped('this.credentialsRepository.update(id, { data });', businessLogic),
		untyped('trx.update(CredentialsEntity, { id: credentialId }, { data });', businessLogic),
		untyped('this.sharedCredentialsRepository.save(sc);', businessLogic),
		untyped('this.credentialDependencyRepository.save(dep);', businessLogic),
		untyped('this.userRepository.save(user);', businessLogic),
		untyped('manager.save<WorkflowEntity>(wf);', businessLogic),
		// Exempt paths: the sealed repository, migrations, test utilities, integration tests.
		untyped('manager.save<CredentialsEntity>(cred);', sealedRepository),
		untyped("await queryRunner.query('UPDATE credentials_entity SET type = ?');", migration),
		untyped('await Container.get(CredentialsRepository).save(newCredential());', testUtils),
		untyped('await credentialsRepository.save(credential);', integrationTest),
	],
	invalid: [
		// The shape the ticket's AC names: a full-entity write and a `type` update.
		{ ...typed('manager.save(CredentialsEntity, cred);'), errors: unsealed },
		{ ...typed('repo.update(id, { type: "slackApi" });'), errors: unsealed },
		// A payload type with a required `type`, which is what `ICredentialsDb` gives.
		{
			...typed('declare const payload: ICredentialsDb; repo.update(id, payload);'),
			errors: unsealed,
		},
		{
			...typed(
				'declare function build(): { type: string }; manager.update(CredentialsEntity, id, build());',
			),
			errors: unsealed,
		},
		{
			...typed('const base = { type: "slackApi" }; repo.update(id, { ...base, data: "" });'),
			errors: unsealed,
		},
		// A wide partial cannot be ruled out.
		{
			...typed('declare const payload: DeepPartial<CredentialsEntity>; repo.update(id, payload);'),
			errors: opaque,
		},
		{ ...typed('declare const payload: any; repo.update(id, payload);'), errors: opaque },
		{ ...typed('declare const payload: unknown; repo.update(id, payload);'), errors: opaque },
		{
			...typed('declare const extra: any; repo.update(id, { ...extra, data: "" });'),
			errors: opaque,
		},
		// Receivers resolved by type, whatever their name.
		{
			...typed(`class S {
	constructor(private readonly store: CredentialsRepository) {}
	run() { const r = this.store; return r.save(cred); }
}`),
			errors: unsealed,
		},
		{ ...typed('const { manager: m } = repo; m.save(cred);'), errors: unsealed },
		{
			...typed(
				'function persist(r: Repository<CredentialsEntity>) { return r.insert({ type: "slackApi" }); }',
			),
			errors: unsealed,
		},
		{ ...typed('Container.get(CredentialsRepository).save(cred);'), errors: unsealed },
		{ ...typed('manager.getRepository(CredentialsEntity).save(cred);'), errors: unsealed },
		{ ...typed('repo.manager.save(cred);'), errors: unsealed },
		// Entities resolved by type.
		{ ...typed('manager.save(cred);'), errors: unsealed },
		{ ...typed('manager.save([cred]);'), errors: unsealed },
		{
			...typed('declare const c: CredentialsEntity | WorkflowEntity; manager.save(c);'),
			errors: unsealed,
		},
		{
			...typed("manager.upsert(CredentialsEntity, { type: 'slackApi' }, ['id']);"),
			errors: unsealed,
		},
		// Query builders.
		{
			...typed('repo.createQueryBuilder().update().set({ type: "slackApi" }).execute();'),
			errors: unsealed,
		},
		{
			...typed('repo.createQueryBuilder().update().where("id = :id", { id }).execute();'),
			errors: unsealed,
		},
		{
			...typed(
				'manager.createQueryBuilder().update(CredentialsEntity).set({ type: "slackApi" }).execute();',
			),
			errors: unsealed,
		},
		{
			...typed(
				'manager.createQueryBuilder().insert().into(CredentialsEntity).values({ type: "slackApi" }).execute();',
			),
			errors: unsealed,
		},
		// Raw SQL.
		{
			...typed(
				"manager.query('UPDATE credentials_entity SET type = $1 WHERE id = $2', ['slackApi', id]);",
			),
			errors: unsealed,
		},
		{
			...typed(
				'manager.query(`INSERT INTO "credentials_entity" (id, type) VALUES ($1, $2)`, [id, id]);',
			),
			errors: unsealed,
		},
		// Optional chaining and computed keys.
		{ ...typed('repo?.save(cred);'), errors: unsealed },
		{ ...typed("repo['save'](cred);"), errors: unsealed },
		// The floor: untyped shapes the syntactic pass does catch.
		{ ...untyped('manager.save<CredentialsEntity>(cred);', businessLogic), errors: unsealed },
		{ ...untyped("tx.upsert(CredentialsEntity, cred, ['id']);", businessLogic), errors: unsealed },
		{
			...untyped('transactionManager.save(CredentialsEntity, cred);', businessLogic),
			errors: unsealed,
		},
		{ ...untyped('this.credentialsRepository.save(cred);', businessLogic), errors: unsealed },
		{
			...untyped("this.credentialsRepository.update(id, { type: 'slackApi' });", businessLogic),
			errors: unsealed,
		},
		{
			...untyped("this.credentialsRepository.update(id, { 'type': 'slackApi' });", businessLogic),
			errors: unsealed,
		},
		{
			...untyped("this.credentialsRepository.update(id, { ['type']: 'slackApi' });", businessLogic),
			errors: unsealed,
		},
		{ ...untyped('this.credentialsRepo.insert(cred);', businessLogic), errors: unsealed },
		{ ...untyped('credentialRepo.update(id, { type });', businessLogic), errors: unsealed },
		// Only the credentials repository and migrations are exempt inside @n8n/db.
		{ ...untyped('manager.save<CredentialsEntity>(cred);', dbService), errors: unsealed },
		{ ...untyped('manager.save<CredentialsEntity>(cred);', workflowRepository), errors: unsealed },
		// A runtime folder that happens to be named `test` is not a test path.
		{
			...untyped('this.credentialsRepository.save(cred);', testFolderInRuntimeTree),
			errors: unsealed,
		},
	],
});
