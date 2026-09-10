import { RuleTester } from '@typescript-eslint/rule-tester';
import path from 'node:path';
import { NoUnsealedWorkflowEntityWriteRule } from './no-unsealed-workflow-entity-write.js';

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
class WorkflowEntity { id: string; name: string; nodes: unknown[]; active: boolean; activeVersionId: string | null; isArchived: boolean; settings: object; }
class CredentialsEntity { id: string; data: string; }
class SharedWorkflow { workflowId: string; projectId: string; workflow: WorkflowEntity; }
class WorkflowHistory { versionId: string; nodes: unknown[]; }
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
	createQueryBuilder(alias?: string): SelectQueryBuilder<T>;
}
declare class WorkflowRepository extends Repository<WorkflowEntity> {
	updateContent(id: string, content: DeepPartial<WorkflowEntity>, ctx: object): Promise<void>;
	createContent(workflow: WorkflowEntity, ctx: object): Promise<WorkflowEntity>;
	upsertImportedContent(content: DeepPartial<WorkflowEntity>, ctx: object): Promise<string>;
}
declare class SharedWorkflowRepository extends Repository<SharedWorkflow> {}
declare class CredentialsRepository extends Repository<CredentialsEntity> {}
declare class WorkflowHistoryRepository extends Repository<WorkflowHistory> {}
declare const Container: { get<T>(c: new (...args: never[]) => T): T };
declare const manager: EntityManager;
declare const repo: WorkflowRepository;
declare const wf: WorkflowEntity;
declare const cred: CredentialsEntity;
declare const shared: SharedWorkflow;
declare const history: WorkflowHistory;
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
const sealedRepository = `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}db${path.sep}src${path.sep}repositories${path.sep}workflow.repository.ts`;
const migration = `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}db${path.sep}src${path.sep}migrations${path.sep}1-foo.ts`;
const testUtils = `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}backend-test-utils${path.sep}src${path.sep}db${path.sep}workflows.ts`;
const integrationTest = `${path.sep}repo${path.sep}packages${path.sep}cli${path.sep}test${path.sep}integration${path.sep}setup.ts`;
const testFolderInRuntimeTree = `${path.sep}repo${path.sep}packages${path.sep}cli${path.sep}src${path.sep}test${path.sep}foo.service.ts`;

const unsealed = [{ messageId: 'unsealedWrite' as const }];
const opaque = [{ messageId: 'opaquePayload' as const }];

ruleTester.run('no-unsealed-workflow-entity-write', NoUnsealedWorkflowEntityWriteRule, {
	valid: [
		// The sanctioned, token-gated write methods, also through an alias.
		typed('repo.updateContent(id, { nodes: [] }, ctx);'),
		typed('repo.createContent(wf, ctx);'),
		typed('repo.upsertImportedContent({ id, nodes: [] }, ctx);'),
		typed('const r = repo; r.updateContent(id, { nodes: [] }, ctx);'),
		// Non-node partial updates: inline, hoisted with an inferred type, spread, or narrowed.
		typed('repo.update(id, { active: true });'),
		typed('repo.update({ id }, { isArchived: false });'),
		typed('const rollback = { active: false, activeVersionId: null }; repo.update(id, rollback);'),
		typed(
			'const rollback = { active: false }; repo.update(id, { ...rollback, isArchived: true });',
		),
		typed(
			"declare const p: Pick<WorkflowEntity, 'active' | 'activeVersionId'>; repo.update(id, p);",
		),
		typed('manager.update(WorkflowEntity, { id }, { settings: {} });'),
		typed('manager.update(WorkflowEntity, { id }, { active: false });'),
		typed(
			"repo.createQueryBuilder().update().set({ active: true }).where('id = :id', { id }).execute();",
		),
		// Existence changes and entity construction are out of the node seal's scope.
		typed('repo.delete(id);'),
		typed('repo.create({ id, nodes: [] });'),
		// Other entities, including one whose relation points at WorkflowEntity.
		typed('manager.save(cred);'),
		typed('manager.save(shared);'),
		typed('manager.save(history);'),
		typed('Container.get(SharedWorkflowRepository).save(shared);'),
		typed('Container.get(CredentialsRepository).save(cred);'),
		typed('Container.get(WorkflowHistoryRepository).insert({ versionId: id, nodes: [] });'),
		typed(
			'declare const sharedRepo: SharedWorkflowRepository; sharedRepo.insert({ workflowId: id, projectId: id });',
		),
		typed(
			"manager.createQueryBuilder().insert().into(CredentialsEntity).values({ data: '' }).execute();",
		),
		// Raw SQL that does not write workflow_entity.
		typed("manager.query('UPDATE credentials_entity SET data = $1 WHERE id = $2', ['', id]);"),
		typed("manager.query('SELECT nodes FROM workflow_entity WHERE id = $1', [id]);"),
		typed("manager.query('DELETE FROM workflow_entity WHERE id = $1', [id]);"),
		// Test files are exempt even with type information.
		{ ...typed('repo.save(wf);'), filename: 'foo.test.ts' },
		// The floor: untyped shapes that were never flagged stay unflagged.
		untyped('this.workflowRepository.update(id, { active: true });', businessLogic),
		untyped('trx.update(WorkflowEntity, { id: workflowId }, { settings });', businessLogic),
		untyped('this.sharedWorkflowRepository.save(sw);', businessLogic),
		untyped('this.sharedWorkflowRepo.save(sw);', businessLogic),
		untyped('this.userRepository.save(user);', businessLogic),
		untyped('manager.save<CredentialsEntity>(cred);', businessLogic),
		// Exempt paths: the sealed repository, migrations, test utilities, integration tests.
		untyped('manager.save<WorkflowEntity>(wf);', sealedRepository),
		untyped("await queryRunner.query('UPDATE workflow_entity SET nodes = ?');", migration),
		untyped('await Container.get(WorkflowRepository).save(newWorkflow(attributes));', testUtils),
		untyped('await workflowRepository.save(workflow);', integrationTest),
	],
	invalid: [
		// Hoisted payloads: inferred, factory-built, spread, declared wide, or untyped.
		{
			...typed("const content = { name: 'x', nodes: [] }; repo.update(id, content);"),
			errors: unsealed,
		},
		{
			...typed('declare function build(): { nodes: unknown[] }; repo.update(id, build());'),
			errors: unsealed,
		},
		{
			...typed('const base = { nodes: [] }; repo.update(id, { ...base, active: true });'),
			errors: unsealed,
		},
		{
			...typed('declare const payload: DeepPartial<WorkflowEntity>; repo.update(id, payload);'),
			errors: opaque,
		},
		{ ...typed('declare const payload: any; repo.update(id, payload);'), errors: opaque },
		{ ...typed('declare const payload: unknown; repo.update(id, payload);'), errors: opaque },
		{
			...typed('declare const extra: any; repo.update(id, { ...extra, active: true });'),
			errors: opaque,
		},
		{
			...typed('const content = { nodes: [] }; manager.update(WorkflowEntity, { id }, content);'),
			errors: unsealed,
		},
		// Receivers resolved by type, whatever their name.
		{
			...typed(`class S {
	constructor(private readonly repository: WorkflowRepository) {}
	run() { const r = this.repository; return r.save(wf); }
}`),
			errors: unsealed,
		},
		{ ...typed('const { manager: m } = repo; m.save(wf);'), errors: unsealed },
		{
			...typed(
				'function persist(r: Repository<WorkflowEntity>) { return r.insert({ nodes: [] }); }',
			),
			errors: unsealed,
		},
		{ ...typed('Container.get(WorkflowRepository).save(wf);'), errors: unsealed },
		{ ...typed('manager.getRepository(WorkflowEntity).save(wf);'), errors: unsealed },
		{
			...typed(
				"declare class Foo extends Repository<WorkflowEntity> {} declare const foo: Foo; foo.upsert({ nodes: [] }, ['id']);",
			),
			errors: unsealed,
		},
		{ ...typed('repo.manager.save(wf);'), errors: unsealed },
		// Entities resolved by type.
		{ ...typed('manager.save(wf);'), errors: unsealed },
		{ ...typed('manager.save([wf]);'), errors: unsealed },
		{
			...typed('declare const w: WorkflowEntity | CredentialsEntity; manager.save(w);'),
			errors: unsealed,
		},
		{ ...typed('manager.save(WorkflowEntity, { nodes: [] });'), errors: unsealed },
		{ ...typed("manager.upsert(WorkflowEntity, { nodes: [] }, ['id']);"), errors: unsealed },
		// Query builders.
		{
			...typed('repo.createQueryBuilder().update().set({ nodes: [] }).execute();'),
			errors: unsealed,
		},
		{
			...typed('repo.createQueryBuilder().update().where("id = :id", { id }).execute();'),
			errors: unsealed,
		},
		{
			...typed('manager.createQueryBuilder().update(WorkflowEntity).set({ nodes: [] }).execute();'),
			errors: unsealed,
		},
		{
			...typed('manager.createQueryBuilder().update(WorkflowEntity, { nodes: [] }).execute();'),
			errors: unsealed,
		},
		{
			...typed(
				'manager.createQueryBuilder().insert().into(WorkflowEntity).values({ nodes: [] }).execute();',
			),
			errors: unsealed,
		},
		{
			...typed('repo.createQueryBuilder().insert().values({ nodes: [] }).execute();'),
			errors: unsealed,
		},
		// Raw SQL.
		{
			...typed("manager.query('UPDATE workflow_entity SET nodes = $1 WHERE id = $2', [[], id]);"),
			errors: unsealed,
		},
		{
			...typed(
				'manager.query(`INSERT INTO "workflow_entity" (id, nodes) VALUES ($1, $2)`, [id, []]);',
			),
			errors: unsealed,
		},
		// Optional chaining and computed keys.
		{ ...typed('repo?.save(wf);'), errors: unsealed },
		{ ...typed("repo['save'](wf);"), errors: unsealed },
		// The floor: untyped shapes that were always flagged.
		{ ...untyped('manager.save<WorkflowEntity>(wf);', businessLogic), errors: unsealed },
		{ ...untyped("tx.upsert(WorkflowEntity, wf, ['id']);", businessLogic), errors: unsealed },
		{ ...untyped('transactionManager.save(WorkflowEntity, wf);', businessLogic), errors: unsealed },
		{ ...untyped('this.workflowRepository.save(wf);', businessLogic), errors: unsealed },
		{
			...untyped('this.workflowRepository.update(id, { nodes: [] });', businessLogic),
			errors: unsealed,
		},
		{
			...untyped("this.workflowRepository.update(id, { 'nodes': [] });", businessLogic),
			errors: unsealed,
		},
		{
			...untyped("this.workflowRepository.update(id, { ['nodes']: [] });", businessLogic),
			errors: unsealed,
		},
		{
			...untyped('this.workflowRepo.save(this.workflowRepo.create({ id, nodes }));', businessLogic),
			errors: unsealed,
		},
		{ ...untyped('this.workflowsRepository.insert(wf);', businessLogic), errors: unsealed },
		{ ...untyped('workflowRepo.update(id, { nodes: [] });', businessLogic), errors: unsealed },
		// Only the sealed repository and migrations are exempt inside @n8n/db.
		{ ...untyped('manager.save<WorkflowEntity>(wf);', dbService), errors: unsealed },
		// A runtime folder that happens to be named `test` is not a test path.
		{ ...untyped('this.workflowRepository.save(wf);', testFolderInRuntimeTree), errors: unsealed },
	],
});
