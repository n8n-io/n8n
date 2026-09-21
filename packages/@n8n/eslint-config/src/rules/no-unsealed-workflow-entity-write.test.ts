import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoUnsealedWorkflowEntityWriteRule } from './no-unsealed-workflow-entity-write.js';

const ruleTester = new RuleTester();
const errors = [{ messageId: 'unsealedWrite' as const }];

ruleTester.run('no-unsealed-workflow-entity-write', NoUnsealedWorkflowEntityWriteRule, {
	valid: [
		'workflowRepository.update(id, { active: false });',
		'workflowRepository.updateContent(id, { nodes: [] }, ctx);',
		{ code: 'workflowRepository.save(workflow);', filename: '/src/example.test.ts' },
		{
			code: 'workflowRepository.save(workflow);',
			filename: '/repositories/workflow.repository.ts',
		},
	],
	invalid: [
		{ code: 'workflowRepository.save(workflow);', errors },
		{ code: 'workflowRepo.insert(workflow);', errors },
		{ code: 'workflowRepository.update(id, { nodes: [] });', errors },
		{ code: 'manager.save(WorkflowEntity, workflow);', errors },
		{ code: 'queryBuilder.insert().into(WorkflowEntity);', errors },
		{ code: "manager.query('UPDATE workflow_entity SET nodes = ?');", errors },
		{ code: 'manager.query(`INSERT INTO workflow_entity (nodes) VALUES (?)`);', errors },
		{ code: 'manager.query(`UPDATE ${prefix}workflow_entity SET nodes = ?`);', errors },
	],
});
