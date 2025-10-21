import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../../types';
import { FileAccessRule } from '../file-access.rule';

describe('FileAccessRule', () => {
	const logger = mock<Logger>({
		scoped: jest.fn().mockReturnThis(),
		error: jest.fn(),
	});

	let rule: FileAccessRule;

	const createWorkflow = (
		id: string,
		name: string,
		nodes: INode[],
		active = true,
	): WorkflowEntity =>
		({
			id,
			name,
			active,
			nodes,
		}) as WorkflowEntity;

	const createNode = (name: string, type: string): INode => ({
		id: `node-${name}`,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new FileAccessRule(logger);
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toEqual({
				id: 'file-access-restriction-v2',
				version: 'v2',
				title: 'File Access Restrictions',
				description: 'File access is now restricted to a default directory for security purposes',
				category: BreakingChangeCategory.WORKFLOW,
				severity: BreakingChangeSeverity.HIGH,
			});
		});
	});

	describe('detect()', () => {
		it('should return no issues when no file access nodes are found', async () => {
			const result = await rule.detect({ workflows: [] });

			expect(result).toEqual({
				ruleId: 'file-access-restriction-v2',
				isAffected: false,
				affectedWorkflows: [],
				instanceIssues: [],
				recommendations: [],
			});
		});

		it('should detect ReadWriteFile node usage', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Read File', 'n8n-nodes-base.readWriteFile'),
			]);

			const result = await rule.detect({ workflows: [workflow] });

			expect(result.isAffected).toBe(true);
			expect(result.affectedWorkflows).toHaveLength(1);
			expect(result.affectedWorkflows[0]).toMatchObject({
				id: 'wf-1',
				name: 'Test Workflow',
				active: true,
				issues: [
					{
						title: "File access node 'n8n-nodes-base.readWriteFile' affected",
						description: 'File access for this node is now restricted to configured directories.',
						level: IssueLevel.WARNING,
					},
				],
			});
			expect(result.recommendations).toHaveLength(1);
			expect(result.recommendations[0]).toMatchObject({
				action: 'Configure file access paths',
				description:
					'Set N8N_RESTRICT_FILE_ACCESS_TO to a semicolon-separated list of allowed paths if workflows need to access files outside the default directory',
			});
		});

		it('should detect ReadBinaryFiles node usage', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Read Binary', 'n8n-nodes-base.readBinaryFiles'),
			]);

			const result = await rule.detect({ workflows: [workflow] });

			expect(result.isAffected).toBe(true);
			expect(result.affectedWorkflows[0].issues[0]).toMatchObject({
				title: "File access node 'n8n-nodes-base.readBinaryFiles' affected",
				level: IssueLevel.WARNING,
			});
		});

		it('should detect both file access nodes in the same workflow', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Read File', 'n8n-nodes-base.readWriteFile'),
				createNode('Read Binary', 'n8n-nodes-base.readBinaryFiles'),
			]);

			const result = await rule.detect({ workflows: [workflow] });

			expect(result.affectedWorkflows[0].issues).toHaveLength(2);
			expect(result.affectedWorkflows[0].issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						title: "File access node 'n8n-nodes-base.readWriteFile' affected",
					}),
					expect.objectContaining({
						title: "File access node 'n8n-nodes-base.readBinaryFiles' affected",
					}),
				]),
			);
		});

		it('should detect file nodes across multiple workflows', async () => {
			const workflow1 = createWorkflow('wf-1', 'Workflow 1', [
				createNode('Read File', 'n8n-nodes-base.readWriteFile'),
			]);
			const workflow2 = createWorkflow('wf-2', 'Workflow 2', [
				createNode('Read Binary', 'n8n-nodes-base.readBinaryFiles'),
			]);

			const result = await rule.detect({ workflows: [workflow1, workflow2] });

			expect(result.affectedWorkflows).toHaveLength(2);
			expect(result.affectedWorkflows[0].id).toBe('wf-1');
			expect(result.affectedWorkflows[1].id).toBe('wf-2');
		});

		it('should include inactive workflows', async () => {
			const workflow = createWorkflow(
				'wf-1',
				'Inactive Workflow',
				[createNode('Read File', 'n8n-nodes-base.readWriteFile')],
				false,
			);

			const result = await rule.detect({ workflows: [workflow] });

			expect(result.affectedWorkflows[0]).toMatchObject({
				id: 'wf-1',
				name: 'Inactive Workflow',
				active: false,
			});
		});

		it('should only flag file access nodes, not other nodes', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Read File', 'n8n-nodes-base.readWriteFile'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('Code', 'n8n-nodes-base.code'),
			]);

			const result = await rule.detect({ workflows: [workflow] });

			expect(result.affectedWorkflows[0].issues).toHaveLength(1);
			expect(result.affectedWorkflows[0].issues[0].title).toContain('readWriteFile');
		});
	});
});
