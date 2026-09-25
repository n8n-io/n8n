import { RuleTester } from '@typescript-eslint/rule-tester';
import { ProjectOwnedEntityTransferRule } from './project-owned-entity-transfer.js';

const ruleTester = new RuleTester();

const SHARED_WORKFLOW_ENTRY = {
	name: 'SharedWorkflow',
	path: 'packages/@n8n/db/src/entities/shared-workflow.ts',
};

ruleTester.run('project-owned-entity-transfer', ProjectOwnedEntityTransferRule, {
	valid: [
		// Entity without any Project reference needs no decision
		{
			code: `
				@Entity()
				export class Webhook {
					@Column()
					method: string;
				}
			`,
		},
		// Project-owned entity listed in the manifest, declared in the listed file
		{
			code: `
				@Entity()
				export class SharedWorkflow {
					@Column()
					projectId: string;
				}
			`,
			filename: '/repo/packages/@n8n/db/src/entities/shared-workflow.ts',
			options: [{ acknowledged: [SHARED_WORKFLOW_ENTRY] }],
		},
		// The Project entity itself is not "project-owned"
		{
			code: `
				@Entity()
				export class Project {
					@Column()
					name: string;
				}
			`,
		},
		// Non-entity class with projectId is ignored
		{
			code: `
				export class SomeDto {
					projectId: string;
				}
			`,
		},
	],
	invalid: [
		// projectId column, no manifest entry
		{
			code: `
				@Entity()
				export class DataTable {
					@Column()
					projectId: string;
				}
			`,
			errors: [{ messageId: 'missingTransferDecision' }],
		},
		// listing OTHER entities does not acknowledge this one
		{
			code: `
				@Entity()
				export class DataTable {
					@Column()
					projectId: string;
				}
			`,
			options: [{ acknowledged: [SHARED_WORKFLOW_ENTRY] }],
			errors: [{ messageId: 'missingTransferDecision' }],
		},
		// same name declared in a DIFFERENT file than the manifest entry
		{
			code: `
				@Entity()
				export class SharedWorkflow {
					@Column()
					projectId: string;
				}
			`,
			filename: '/repo/packages/cli/src/modules/rogue/shared-workflow.ts',
			options: [{ acknowledged: [SHARED_WORKFLOW_ENTRY] }],
			errors: [{ messageId: 'pathMismatch' }],
		},
		// arrow-function relation to Project
		{
			code: `
				@Entity()
				export class Agent {
					@ManyToOne(() => Project, { onDelete: 'CASCADE' })
					project: Project;
				}
			`,
			errors: [{ messageId: 'missingTransferDecision' }],
		},
		// string-form relation to Project
		{
			code: `
				@Entity()
				export class Variables {
					@ManyToOne('Project', { nullable: true })
					project: Project | null;
				}
			`,
			errors: [{ messageId: 'missingTransferDecision' }],
		},
		// many-to-many relation to Project
		{
			code: `
				@Entity()
				export class RoleMappingRule {
					@ManyToMany('Project', (project: Project) => project.roleMappingRules)
					projects: Project[];
				}
			`,
			errors: [{ messageId: 'missingTransferDecision' }],
		},
	],
});
