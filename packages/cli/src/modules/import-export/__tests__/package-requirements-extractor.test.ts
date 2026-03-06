import type { INode } from 'n8n-workflow';

import {
	PackageRequirementsExtractor,
	type PackageContents,
} from '../package-requirements-extractor';

describe('PackageRequirementsExtractor', () => {
	let extractor: PackageRequirementsExtractor;

	const emptyPackage: PackageContents = {
		credentialIds: new Set(),
		workflowIds: new Set(),
	};

	beforeEach(() => {
		extractor = new PackageRequirementsExtractor();
	});

	describe('credentials', () => {
		it('should list credential as requirement', () => {
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						slackApi: { id: 'cred-1', name: 'My Slack' },
					},
				},
			];

			const result = extractor.extract([{ workflowId: 'wf-1', nodes }], emptyPackage);

			expect(result.credentials).toHaveLength(1);
			expect(result.credentials[0]).toEqual({
				id: 'cred-1',
				name: 'My Slack',
				type: 'slackApi',
				usedByWorkflows: ['wf-1'],
			});
		});

		it('should NOT list credential already in package', () => {
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						slackApi: { id: 'cred-1', name: 'My Slack' },
					},
				},
			];

			const result = extractor.extract([{ workflowId: 'wf-1', nodes }], {
				credentialIds: new Set(['cred-1']),
				workflowIds: new Set(),
			});

			expect(result.credentials).toHaveLength(0);
		});

		it('should skip credentials without an id', () => {
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						slackApi: { id: null, name: 'My Slack' },
					},
				},
			];

			const result = extractor.extract([{ workflowId: 'wf-1', nodes }], emptyPackage);

			expect(result.credentials).toHaveLength(0);
		});

		it('should deduplicate credential refs across workflows', () => {
			const node1: INode = {
				id: 'node-1',
				name: 'Slack 1',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
			};
			const node2: INode = {
				id: 'node-2',
				name: 'Slack 2',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
			};

			const result = extractor.extract(
				[
					{ workflowId: 'wf-1', nodes: [node1] },
					{ workflowId: 'wf-2', nodes: [node2] },
				],
				emptyPackage,
			);

			expect(result.credentials).toHaveLength(1);
			expect(result.credentials[0].usedByWorkflows).toEqual(['wf-1', 'wf-2']);
		});
	});

	describe('sub-workflows', () => {
		it('should list sub-workflow call not in package', () => {
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1,
					position: [0, 0],
					parameters: { workflowId: 'sub-wf-1' },
				},
			];

			const result = extractor.extract([{ workflowId: 'wf-1', nodes }], emptyPackage);

			expect(result.subWorkflows).toHaveLength(1);
			expect(result.subWorkflows[0]).toEqual({
				id: 'sub-wf-1',
				usedByWorkflows: ['wf-1'],
			});
		});

		it('should NOT list sub-workflow with source=parameter', () => {
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1,
					position: [0, 0],
					parameters: { source: 'parameter', workflowId: 'sub-wf-1' },
				},
			];

			const result = extractor.extract([{ workflowId: 'wf-1', nodes }], emptyPackage);

			expect(result.subWorkflows).toHaveLength(0);
		});

		it('should NOT list sub-workflow already in package', () => {
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1,
					position: [0, 0],
					parameters: { workflowId: 'sub-wf-1' },
				},
			];

			const result = extractor.extract([{ workflowId: 'wf-1', nodes }], {
				credentialIds: new Set(),
				workflowIds: new Set(['sub-wf-1']),
			});

			expect(result.subWorkflows).toHaveLength(0);
		});

		it('should handle workflowId as object with value', () => {
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1,
					position: [0, 0],
					parameters: { workflowId: { value: 'sub-wf-2' } },
				},
			];

			const result = extractor.extract([{ workflowId: 'wf-1', nodes }], emptyPackage);

			expect(result.subWorkflows).toHaveLength(1);
			expect(result.subWorkflows[0].id).toBe('sub-wf-2');
		});

		it('should skip non-executeWorkflow nodes', () => {
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [0, 0],
					parameters: { workflowId: 'sub-wf-1' },
				},
			];

			const result = extractor.extract([{ workflowId: 'wf-1', nodes }], emptyPackage);

			expect(result.subWorkflows).toHaveLength(0);
		});
	});

	describe('node types', () => {
		it('should collect node types with typeVersion', () => {
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'node-2',
					name: 'HTTP',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4,
					position: [0, 0],
					parameters: {},
				},
			];

			const result = extractor.extract([{ workflowId: 'wf-1', nodes }], emptyPackage);

			expect(result.nodeTypes).toHaveLength(2);
			expect(result.nodeTypes).toContainEqual({
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				usedByWorkflows: ['wf-1'],
			});
			expect(result.nodeTypes).toContainEqual({
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				usedByWorkflows: ['wf-1'],
			});
		});

		it('should deduplicate same node type and version across workflows', () => {
			const node1: INode = {
				id: 'node-1',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};
			const node2: INode = {
				id: 'node-2',
				name: 'Slack 2',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const result = extractor.extract(
				[
					{ workflowId: 'wf-1', nodes: [node1] },
					{ workflowId: 'wf-2', nodes: [node2] },
				],
				emptyPackage,
			);

			const slackType = result.nodeTypes.find((n) => n.type === 'n8n-nodes-base.slack');
			expect(slackType?.typeVersion).toBe(1);
			expect(slackType?.usedByWorkflows).toEqual(['wf-1', 'wf-2']);
		});

		it('should keep different typeVersions as separate entries', () => {
			const nodeV1: INode = {
				id: 'node-1',
				name: 'HTTP v1',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};
			const nodeV4: INode = {
				id: 'node-2',
				name: 'HTTP v4',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				position: [0, 0],
				parameters: {},
			};

			const result = extractor.extract(
				[{ workflowId: 'wf-1', nodes: [nodeV1, nodeV4] }],
				emptyPackage,
			);

			const httpTypes = result.nodeTypes.filter((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpTypes).toHaveLength(2);
			expect(httpTypes.map((n) => n.typeVersion).sort()).toEqual([1, 4]);
		});
	});

	describe('merge', () => {
		it('should merge two requirements objects and deduplicate', () => {
			const a = {
				credentials: [{ id: 'c1', name: 'Slack', type: 'slackApi', usedByWorkflows: ['wf-1'] }],
				subWorkflows: [{ id: 'sw1', usedByWorkflows: ['wf-1'] }],
				nodeTypes: [{ type: 'n8n-nodes-base.slack', typeVersion: 1, usedByWorkflows: ['wf-1'] }],
				variables: [],
			};

			const b = {
				credentials: [{ id: 'c1', name: 'Slack', type: 'slackApi', usedByWorkflows: ['wf-2'] }],
				subWorkflows: [{ id: 'sw2', usedByWorkflows: ['wf-2'] }],
				nodeTypes: [{ type: 'n8n-nodes-base.slack', typeVersion: 1, usedByWorkflows: ['wf-2'] }],
				variables: [],
			};

			const merged = PackageRequirementsExtractor.merge(a, b);

			expect(merged.credentials).toHaveLength(1);
			expect(merged.credentials[0].usedByWorkflows).toEqual(['wf-1', 'wf-2']);

			expect(merged.subWorkflows).toHaveLength(2);

			expect(merged.nodeTypes).toHaveLength(1);
			expect(merged.nodeTypes[0].usedByWorkflows).toEqual(['wf-1', 'wf-2']);
		});

		it('should keep different typeVersions separate during merge', () => {
			const a = {
				credentials: [],
				subWorkflows: [],
				nodeTypes: [
					{ type: 'n8n-nodes-base.httpRequest', typeVersion: 1, usedByWorkflows: ['wf-1'] },
				],
				variables: [],
			};

			const b = {
				credentials: [],
				subWorkflows: [],
				nodeTypes: [
					{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4, usedByWorkflows: ['wf-2'] },
				],
				variables: [],
			};

			const merged = PackageRequirementsExtractor.merge(a, b);

			expect(merged.nodeTypes).toHaveLength(2);
			expect(merged.nodeTypes.map((n) => n.typeVersion).sort()).toEqual([1, 4]);
		});
	});
});
