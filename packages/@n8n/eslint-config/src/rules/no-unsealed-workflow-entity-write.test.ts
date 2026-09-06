import { RuleTester } from '@typescript-eslint/rule-tester';

// Syntactic detection: it flags WorkflowEntity writes by the shapes that actually occur — a
// `WorkflowEntity` generic arg or first-arg identifier on an EntityManager/query-builder write,
// a full-entity write on a workflow-repository receiver, or a `.update(…, { nodes })` payload.
// Aliased receivers and `getRepository(WorkflowEntity)` are the known ceiling (see the rule's
// doc comment).
import { NoUnsealedWorkflowEntityWriteRule } from './no-unsealed-workflow-entity-write.js';

const ruleTester = new RuleTester();

const businessLogic = '/repo/packages/cli/src/services/foo.service.ts';

ruleTester.run('no-unsealed-workflow-entity-write', NoUnsealedWorkflowEntityWriteRule, {
	valid: [
		// Persistence layer (path contains `@n8n/db`) may write WorkflowEntity directly.
		{
			code: 'manager.save<WorkflowEntity>(wf);',
			filename: '/repo/packages/@n8n/db/src/repositories/workflow.repository.ts',
		},
		// The sanctioned, token-gated write method is allowed.
		{ code: 'this.workflowRepository.updateContent(id, content, ctx);', filename: businessLogic },
		// A non-node partial update (active/archive/folder) is untouched.
		{ code: 'this.workflowRepository.update(id, { active: true });', filename: businessLogic },
		// A delete changes existence, not node content — out of the node seal's scope.
		{ code: 'this.workflowRepository.delete(id);', filename: businessLogic },
		// A raw EntityManager update to WorkflowEntity that touches no nodes (settings/active) is
		// out of the node seal's scope (the typeorm-boundary rule governs raw manager use).
		{
			code: 'trx.update(WorkflowEntity, { id: workflowId }, { settings });',
			filename: businessLogic,
		},
		{
			code: 'trx.update(WorkflowEntity, { id: workflowId }, { active: false });',
			filename: businessLogic,
		},
		// Writes to other entities are irrelevant.
		{ code: 'manager.save<CredentialsEntity>(cred);', filename: businessLogic },
		{ code: 'this.userRepository.save(user);', filename: businessLogic },
		// A sibling repository that merely ends in "workflowRepository" is a different entity.
		{ code: 'this.sharedWorkflowRepository.save(sw);', filename: businessLogic },
		{
			code: 'this.sharedWorkflowRepository.insert({ workflowId, projectId });',
			filename: businessLogic,
		},
		{ code: 'this.sharedWorkflowRepo.save(sw);', filename: businessLogic },
		// `create` builds an entity without persisting it.
		{ code: 'this.workflowRepo.create({ id, nodes });', filename: businessLogic },
		// Tests/fixtures write WorkflowEntity for setup — exempt.
		{
			code: 'await workflowRepository.save(workflow);',
			filename: '/repo/packages/cli/test/integration/foo.test.ts',
		},
	],
	invalid: [
		{
			code: 'manager.save<WorkflowEntity>(wf);',
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		{
			code: "tx.upsert(WorkflowEntity, wf, ['id']);",
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		{
			code: 'transactionManager.save(WorkflowEntity, wf);',
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		{
			code: 'manager.createQueryBuilder().update(WorkflowEntity).set({ nodes: [] }).execute();',
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		{
			code: 'this.workflowRepository.save(wf);',
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		{
			code: 'this.workflowRepository.update(id, { nodes: [] });',
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		// The repository injected under a shorter name is the same write.
		{
			code: 'this.workflowRepo.save(this.workflowRepo.create({ id, nodes }));',
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		{
			code: 'this.workflowsRepository.insert(wf);',
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		{
			code: 'workflowRepo.update(id, { nodes: [] });',
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		// A string-literal or computed `nodes` key is the same node write as `{ nodes }`.
		{
			code: "this.workflowRepository.update(id, { 'nodes': [] });",
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
		{
			code: "this.workflowRepository.update(id, { ['nodes']: [] });",
			filename: businessLogic,
			errors: [{ messageId: 'unsealedWrite' }],
		},
	],
});
