import type { PackageRequirements } from '@/modules/n8n-packages/spec/requirements.schema';

import {
	joinWorkflowRequirements,
	parseWorkflowRequirements,
	splitRequirementsByWorkflow,
	workflowRequirementsPath,
} from '../workflow-requirements';

const requirements: PackageRequirements = {
	credentials: [
		{
			id: 'c1',
			name: 'Shared',
			type: 'httpBasicAuth',
			usedBy: [
				{ kind: 'workflow', id: 'w1' },
				{ kind: 'workflow', id: 'w2' },
			],
		},
		{ id: 'c2', name: 'Only two', type: 'slackApi', usedBy: [{ kind: 'workflow', id: 'w2' }] },
	],
	dataTables: [{ id: 'd1', name: 'Table', usedBy: [{ kind: 'workflow', id: 'w1' }] }],
	workflows: [{ id: 'w9', usedBy: [{ kind: 'workflow', id: 'w1' }] }],
	variables: [{ name: 'GLOBAL', usedBy: [{ kind: 'workflow', id: 'w1' }] }],
	tags: [{ id: 't1', name: 'prod', usedBy: [{ kind: 'workflow', id: 'w2' }] }],
	nodeTypes: [
		{ type: 'n8n-nodes-base.set', typeVersion: 3, usedBy: [{ kind: 'workflow', id: 'w1' }] },
	],
};

describe('workflow-requirements', () => {
	describe('splitRequirementsByWorkflow', () => {
		const split = splitRequirementsByWorkflow(requirements, ['w1', 'w2', 'w3']);

		it('lists what each workflow uses, without consumers', () => {
			expect(split.get('w1')).toEqual({
				credentials: [{ id: 'c1', name: 'Shared', type: 'httpBasicAuth' }],
				dataTables: [{ id: 'd1', name: 'Table' }],
				workflows: [{ id: 'w9' }],
				variables: [{ name: 'GLOBAL' }],
			});
			expect(split.get('w2')).toEqual({
				credentials: [
					{ id: 'c1', name: 'Shared', type: 'httpBasicAuth' },
					{ id: 'c2', name: 'Only two', type: 'slackApi' },
				],
				tags: [{ id: 't1', name: 'prod' }],
			});
		});

		it('leaves out a workflow with no requirements and the node types', () => {
			expect(split.has('w3')).toBe(false);
			expect(JSON.stringify([...split.values()])).not.toContain('n8n-nodes-base.set');
		});

		it('ignores consumers that are not workflows', () => {
			const agentOnly = splitRequirementsByWorkflow(
				{
					credentials: [{ id: 'c1', name: 'A', type: 't', usedBy: [{ kind: 'agent', id: 'a1' }] }],
				},
				['a1', 'w1'],
			);

			expect(agentOnly.size).toBe(0);
		});

		it('changes only the file of the workflow that changes', () => {
			const changed = splitRequirementsByWorkflow(
				{
					...requirements,
					dataTables: [
						{
							id: 'd1',
							name: 'Table',
							usedBy: [
								{ kind: 'workflow', id: 'w1' },
								{ kind: 'workflow', id: 'w3' },
							],
						},
					],
				},
				['w1', 'w2', 'w3'],
			);

			expect(changed.get('w2')).toEqual(split.get('w2'));
			expect(changed.get('w1')).toEqual(split.get('w1'));
			expect(changed.get('w3')).toEqual({ dataTables: [{ id: 'd1', name: 'Table' }] });
		});
	});

	describe('joinWorkflowRequirements', () => {
		it('rebuilds the requirements of the package, apart from the node types', () => {
			const split = splitRequirementsByWorkflow(requirements, ['w1', 'w2']);

			const { nodeTypes: _nodeTypes, ...expected } = requirements;
			expect(joinWorkflowRequirements(split)).toEqual(expected);
		});

		it('lists the consumers of a shared row in id order', () => {
			const joined = joinWorkflowRequirements(
				new Map([
					['w2', { credentials: [{ id: 'c1', name: 'Shared', type: 'httpBasicAuth' }] }],
					['w1', { credentials: [{ id: 'c1', name: 'Shared', type: 'httpBasicAuth' }] }],
				]),
			);

			expect(joined?.credentials?.[0].usedBy).toEqual([
				{ kind: 'workflow', id: 'w1' },
				{ kind: 'workflow', id: 'w2' },
			]);
		});

		it('takes the details of a shared row from the first workflow that has them', () => {
			const joined = joinWorkflowRequirements(
				new Map([
					['w1', { credentials: [{ id: 'c1' }] }],
					['w2', { credentials: [{ id: 'c1', name: 'Newer', type: 'httpBasicAuth' }] }],
					['w3', { credentials: [{ id: 'c1', name: 'Other', type: 'oauth2Api' }] }],
				]),
			);

			expect(joined?.credentials?.[0]).toMatchObject({ name: 'Newer', type: 'httpBasicAuth' });
		});

		it('is undefined when no workflow has requirements', () => {
			expect(joinWorkflowRequirements(new Map())).toBeUndefined();
		});
	});

	describe('files', () => {
		it('puts the file next to the workflow file', () => {
			expect(workflowRequirementsPath('projects/a-p1/workflows/one-w1')).toBe(
				'projects/a-p1/workflows/one-w1/requirements.json',
			);
		});

		it('parses a valid file and rejects an invalid one', () => {
			expect(parseWorkflowRequirements('{"variables":[{"name":"X"}]}')).toEqual({
				variables: [{ name: 'X' }],
			});
			expect(parseWorkflowRequirements('{not-json')).toBeNull();
			expect(parseWorkflowRequirements('{"tags":[{"id":"t"}]}')).toBeNull();
			expect(parseWorkflowRequirements(undefined)).toBeNull();
		});
	});
});
