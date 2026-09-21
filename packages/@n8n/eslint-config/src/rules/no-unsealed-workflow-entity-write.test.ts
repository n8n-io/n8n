import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoUnsealedWorkflowEntityWriteRule } from './no-unsealed-workflow-entity-write.js';

const ruleTester = new RuleTester();
const errors = [{ messageId: 'unsealedWrite' as const }];

ruleTester.run('no-unsealed-workflow-entity-write', NoUnsealedWorkflowEntityWriteRule, {
	valid: [
		'workflowRepository.update(id, { active: false });',
		'workflowRepository.update(id);',
		'workflowRepository.updateContent(id, { nodes: [] }, ctx);',
		"manager.query('DELETE FROM workflow_entity WHERE id = ?');",
		"manager.query('SELECT nodes FROM workflow_entity WHERE id = ?');",
		{ code: 'workflowRepository.save(workflow);', filename: '/src/example.test.ts' },
		{
			code: 'workflowRepository.save(workflow);',
			filename: '/repositories/workflow.repository.ts',
		},
	],
	invalid: [
		{ code: 'workflowRepository.save(workflow);', errors },
		{ code: 'this.workflowRepository.save(workflow);', errors },
		{ code: 'this.workflowRepo.update(id, { nodes: [] });', errors },
		{ code: "workflowRepository['save'](workflow);", errors },
		{ code: 'workflowsRepo.insert(workflow);', errors },
		{ code: 'Container.get(WorkflowRepository).save(workflow);', errors },
		{ code: 'dataSource.getRepository(WorkflowEntity).save(workflow);', errors },
		{ code: 'manager.getRepository(WorkflowEntity).insert(workflow);', errors },
		{ code: "manager.getRepository(WorkflowEntity).upsert(workflow, ['id']);", errors },
		{ code: 'manager.getRepository(WorkflowEntity).update(id, { nodes: [] });', errors },
		{ code: 'workflowRepository?.save(workflow);', errors },
		{ code: 'workflowRepo.insert(workflow);', errors },
		{ code: 'workflowRepository.update(id, { nodes: [] });', errors },
		{ code: "workflowRepository.update(id, { 'nodes': [] });", errors },
		{ code: 'manager.save(WorkflowEntity, workflow);', errors },
		{ code: "manager.upsert(WorkflowEntity, workflow, ['id']);", errors },
		{ code: 'manager.update(WorkflowEntity, id, { nodes: [] });', errors },
		{ code: 'manager.update<WorkflowEntity>(id, { nodes: [] });', errors },
		{ code: 'queryBuilder.insert().into(WorkflowEntity);', errors },
		{
			code: 'manager.createQueryBuilder().update(WorkflowEntity).set({ nodes: [] });',
			errors,
		},
		{
			code: 'workflowRepository.createQueryBuilder().update().set({ nodes: [] });',
			errors,
		},
		{ code: "manager.query('UPDATE workflow_entity SET nodes = ?');", errors },
		{ code: 'manager.query(`INSERT INTO workflow_entity (nodes) VALUES (?)`);', errors },
		{ code: 'manager.query(`UPDATE ${prefix}workflow_entity SET nodes = ?`);', errors },
		{ code: 'manager.query(`UPDATE\\x20workflow_entity SET nodes = ?`);', errors },
		{ code: "manager.query('UPDATE public.workflow_entity SET nodes = ?');", errors },
		{ code: 'manager.query(`UPDATE "public"."workflow_entity" SET nodes = ?`);', errors },
	],
});
