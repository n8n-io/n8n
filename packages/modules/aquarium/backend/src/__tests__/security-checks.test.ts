import type { IConnections, INode, INodeParameters } from 'n8n-workflow';

import { securityRisksOf, type CheckedWorkflow } from '../security-checks';

function node(name: string, type: string, parameters: INodeParameters = {}): INode {
	return {
		id: name,
		name,
		type: `n8n-nodes-base.${type}`,
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};
}

function connect(from: string, to: string): IConnections {
	return { [from]: { main: [[{ node: to, type: 'main', index: 0 }]] } };
}

function workflow(
	nodes: INode[],
	{ connections = {}, published = true }: { connections?: IConnections; published?: boolean } = {},
): CheckedWorkflow {
	return { nodes, connections, activeVersionId: published ? 'v1' : null };
}

describe('securityRisksOf', () => {
	describe('webhooks', () => {
		it('flags a published webhook with no authentication', () => {
			expect(securityRisksOf(workflow([node('Webhook', 'webhook')]))).toEqual([
				'unprotectedWebhook',
			]);
		});

		it('does not flag a webhook with authentication', () => {
			const webhook = node('Webhook', 'webhook', { authentication: 'headerAuth' });

			expect(securityRisksOf(workflow([webhook]))).toEqual([]);
		});

		it('does not flag a webhook in a workflow that is not published', () => {
			expect(securityRisksOf(workflow([node('Webhook', 'webhook')], { published: false }))).toEqual(
				[],
			);
		});

		it('does not flag a webhook followed by a node that can validate the payload', () => {
			const nodes = [node('Webhook', 'webhook'), node('Check', 'if')];

			expect(
				securityRisksOf(workflow(nodes, { connections: connect('Webhook', 'Check') })),
			).toEqual([]);
		});

		it('flags a webhook followed by a node that cannot validate the payload', () => {
			const nodes = [node('Webhook', 'webhook'), node('Set', 'set')];

			expect(securityRisksOf(workflow(nodes, { connections: connect('Webhook', 'Set') }))).toEqual([
				'unprotectedWebhook',
			]);
		});
	});

	describe('SQL', () => {
		it('flags an expression in the query of an Execute Query operation', () => {
			const sql = node('Query', 'postgres', {
				operation: 'executeQuery',
				query: '=SELECT * FROM users WHERE id = {{ $json.id }}',
			});

			expect(securityRisksOf(workflow([sql]))).toEqual(['sqlExpression']);
		});

		it('does not flag a fixed query', () => {
			const sql = node('Query', 'mySql', { operation: 'executeQuery', query: 'SELECT 1' });

			expect(securityRisksOf(workflow([sql]))).toEqual([]);
		});
	});

	it('flags Execute Command and SSH nodes', () => {
		expect(securityRisksOf(workflow([node('Run', 'executeCommand')]))).toEqual(['shellAccess']);
		expect(securityRisksOf(workflow([node('Remote', 'ssh')]))).toEqual(['shellAccess']);
	});

	it('does not flag Code and HTTP Request nodes', () => {
		expect(securityRisksOf(workflow([node('Code', 'code'), node('Call', 'httpRequest')]))).toEqual(
			[],
		);
	});

	it('lists each risk once, in a fixed order', () => {
		const nodes = [
			node('Run', 'executeCommand'),
			node('Remote', 'ssh'),
			node('Webhook', 'webhook'),
			node('Other webhook', 'webhook'),
		];

		expect(securityRisksOf(workflow(nodes))).toEqual(['unprotectedWebhook', 'shellAccess']);
	});
});
