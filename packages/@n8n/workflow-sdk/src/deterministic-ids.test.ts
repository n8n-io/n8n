import { createHash } from 'crypto';

import { parseWorkflowCodeToBuilder, generateWorkflowCode } from './index';
import { workflow } from './workflow-builder';
import { node, trigger } from './workflow-builder/node-builders/node-builder';

/**
 * Generate a deterministic UUID based on workflow ID, node type, and node name.
 * This is the function signature we expect to implement.
 */
function generateDeterministicNodeId(
	workflowId: string,
	nodeType: string,
	nodeName: string,
): string {
	const hash = createHash('sha256')
		.update(`${workflowId}:${nodeType}:${nodeName}`)
		.digest('hex')
		.slice(0, 32);

	// Format as valid UUID v4 structure
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		'4' + hash.slice(13, 16), // Version 4
		((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // Variant
		hash.slice(20, 32),
	].join('-');
}

describe('Deterministic Node ID Generation', () => {
	describe('generateDeterministicNodeId', () => {
		it('should produce same ID for same inputs', () => {
			const id1 = generateDeterministicNodeId('wf-123', 'n8n-nodes-base.httpRequest', 'Fetch Data');
			const id2 = generateDeterministicNodeId('wf-123', 'n8n-nodes-base.httpRequest', 'Fetch Data');
			expect(id1).toBe(id2);
		});

		it('should produce different IDs for different workflow IDs', () => {
			const id1 = generateDeterministicNodeId('wf-123', 'n8n-nodes-base.httpRequest', 'Fetch Data');
			const id2 = generateDeterministicNodeId('wf-456', 'n8n-nodes-base.httpRequest', 'Fetch Data');
			expect(id1).not.toBe(id2);
		});

		it('should produce different IDs for different node types', () => {
			const id1 = generateDeterministicNodeId('wf-123', 'n8n-nodes-base.httpRequest', 'Process');
			const id2 = generateDeterministicNodeId('wf-123', 'n8n-nodes-base.set', 'Process');
			expect(id1).not.toBe(id2);
		});

		it('should produce different IDs for different node names', () => {
			const id1 = generateDeterministicNodeId('wf-123', 'n8n-nodes-base.httpRequest', 'Fetch Data');
			const id2 = generateDeterministicNodeId('wf-123', 'n8n-nodes-base.httpRequest', 'Send Data');
			expect(id1).not.toBe(id2);
		});

		it('should produce valid UUID format', () => {
			const id = generateDeterministicNodeId('wf-123', 'n8n-nodes-base.httpRequest', 'Test');
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		});
	});

	describe('WorkflowBuilder.regenerateNodeIds()', () => {
		it('should regenerate node IDs deterministically', () => {
			const wf = workflow('test-workflow-id', 'Test Workflow').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}).to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Set Data' } })),
			);

			// Regenerate IDs deterministically
			wf.regenerateNodeIds();
			const json = wf.toJSON();

			// Check that IDs are now deterministic
			const startNode = json.nodes.find((n) => n.name === 'Start');
			const setNode = json.nodes.find((n) => n.name === 'Set Data');

			expect(startNode?.id).toBe(
				generateDeterministicNodeId('test-workflow-id', 'n8n-nodes-base.manualTrigger', 'Start'),
			);
			expect(setNode?.id).toBe(
				generateDeterministicNodeId('test-workflow-id', 'n8n-nodes-base.set', 'Set Data'),
			);
		});

		it('should update connections to use new IDs', () => {
			const wf = workflow('test-workflow-id', 'Test Workflow').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}).to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Set Data' } })),
			);

			wf.regenerateNodeIds();
			const json = wf.toJSON();

			// Verify connections use the correct node references
			const startConnections = json.connections['Start'];
			expect(startConnections).toBeDefined();
			expect(startConnections?.main?.[0]?.[0]?.node).toBe('Set Data');
		});

		it('should produce same IDs when called multiple times', () => {
			const wf = workflow('test-workflow-id', 'Test Workflow').add(
				trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } }),
			);

			wf.regenerateNodeIds();
			const json1 = wf.toJSON();
			const id1 = json1.nodes[0].id;

			// Create the same workflow again and regenerate
			const wf2 = workflow('test-workflow-id', 'Test Workflow').add(
				trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } }),
			);
			wf2.regenerateNodeIds();
			const json2 = wf2.toJSON();
			const id2 = json2.nodes[0].id;

			expect(id1).toBe(id2);
		});

		it('should preserve correct connections when nodes have duplicate names that get auto-renamed', () => {
			// Two nodes with the same config name - the second will be auto-renamed to "Process 1"
			const processA = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Process' },
			});
			const processB = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Process' }, // Will become "Process 1"
			});
			const downstream = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Send Data' },
			});

			const wf = workflow('test-workflow-id', 'Test Workflow').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				})
					.to(processA)
					.to(processB)
					.to(downstream),
			);

			wf.regenerateNodeIds();
			const json = wf.toJSON();

			// Verify auto-rename happened
			const nodeNames = json.nodes.map((n) => n.name);
			expect(nodeNames).toContain('Process');
			expect(nodeNames).toContain('Process 1');

			// "Process" should connect to "Process 1" (not to itself or "Send Data")
			expect(json.connections['Process']?.main?.[0]?.[0]?.node).toBe('Process 1');

			// "Process 1" should connect to "Send Data", NOT "Process"
			expect(json.connections['Process 1']?.main?.[0]?.[0]?.node).toBe('Send Data');

			// "Process 1" should have exactly 1 connection on output 0
			expect(json.connections['Process 1']?.main?.[0]).toHaveLength(1);
		});

		it('should not create spurious connections after regenerateNodeIds with duplicate names and branching', () => {
			// Mimics the purchase-request-approval bug: two same-named nodes on
			// different branches with different downstream targets
			const approvalA = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Approval' },
			});
			const approvalB = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Approval' }, // Will become "Approval 1"
			});
			const targetA = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Target A' },
			});
			const targetB = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Target B' },
			});
			const router = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Router' },
			});

			const wf = workflow('test-workflow-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						config: { name: 'Start' },
					}).to(router),
				)
				.add(router.output(0).to(approvalA.to(targetA)))
				.add(router.output(1).to(approvalB.to(targetB)));

			wf.regenerateNodeIds();
			const json = wf.toJSON();

			// "Approval" should connect ONLY to "Target A"
			const approvalConns = json.connections['Approval']?.main?.[0] ?? [];
			expect(approvalConns).toHaveLength(1);
			expect(approvalConns[0]?.node).toBe('Target A');

			// "Approval 1" should connect ONLY to "Target B"
			const approval1Conns = json.connections['Approval 1']?.main?.[0] ?? [];
			expect(approval1Conns).toHaveLength(1);
			expect(approval1Conns[0]?.node).toBe('Target B');

			// Router output 0 should connect ONLY to "Approval"
			const routerOut0 = json.connections['Router']?.main?.[0] ?? [];
			expect(routerOut0).toHaveLength(1);
			expect(routerOut0[0]?.node).toBe('Approval');

			// Router output 1 should connect ONLY to "Approval 1"
			const routerOut1 = json.connections['Router']?.main?.[1] ?? [];
			expect(routerOut1).toHaveLength(1);
			expect(routerOut1[0]?.node).toBe('Approval 1');
		});

		it('should produce unique deterministic IDs for auto-renamed duplicate nodes', () => {
			const processA = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Process' },
			});
			const processB = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Process' }, // Will become "Process 1"
			});

			const wf = workflow('test-workflow-id', 'Test Workflow').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				})
					.to(processA)
					.to(processB),
			);

			wf.regenerateNodeIds();
			const json = wf.toJSON();

			const processNode = json.nodes.find((n) => n.name === 'Process');
			const process1Node = json.nodes.find((n) => n.name === 'Process 1');

			// Both nodes must exist
			expect(processNode).toBeDefined();
			expect(process1Node).toBeDefined();

			// They must have different deterministic IDs
			expect(processNode!.id).not.toBe(process1Node!.id);

			// IDs should match what we'd expect from the map key (not instance.name)
			expect(processNode!.id).toBe(
				generateDeterministicNodeId('test-workflow-id', 'n8n-nodes-base.set', 'Process'),
			);
			expect(process1Node!.id).toBe(
				generateDeterministicNodeId('test-workflow-id', 'n8n-nodes-base.set', 'Process 1'),
			);
		});

		it('should produce correct connections and unique IDs when toJSON is called twice after regenerateNodeIds', () => {
			// This test verifies that the second toJSON() call produces the same
			// correct result as the first (staleIdToKeyMap must not be cleared)
			const approvalA = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Approval' },
			});
			const approvalB = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Approval' }, // Will become "Approval 1"
			});
			const targetA = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Target A' },
			});
			const targetB = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Target B' },
			});
			const router = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Router' },
			});

			const wf = workflow('test-workflow-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						config: { name: 'Start' },
					}).to(router),
				)
				.add(router.output(0).to(approvalA.to(targetA)))
				.add(router.output(1).to(approvalB.to(targetB)));

			wf.regenerateNodeIds();

			// Call toJSON() twice
			const json1 = wf.toJSON();
			const json2 = wf.toJSON();

			for (const json of [json1, json2]) {
				// Verify unique IDs for auto-renamed nodes
				const approvalNode = json.nodes.find((n) => n.name === 'Approval');
				const approval1Node = json.nodes.find((n) => n.name === 'Approval 1');
				expect(approvalNode).toBeDefined();
				expect(approval1Node).toBeDefined();
				expect(approvalNode!.id).not.toBe(approval1Node!.id);

				// "Approval" should connect ONLY to "Target A"
				const approvalConns = json.connections['Approval']?.main?.[0] ?? [];
				expect(approvalConns).toHaveLength(1);
				expect(approvalConns[0]?.node).toBe('Target A');

				// "Approval 1" should connect ONLY to "Target B"
				const approval1Conns = json.connections['Approval 1']?.main?.[0] ?? [];
				expect(approval1Conns).toHaveLength(1);
				expect(approval1Conns[0]?.node).toBe('Target B');

				// Router output 0 -> "Approval", output 1 -> "Approval 1"
				const routerOut0 = json.connections['Router']?.main?.[0] ?? [];
				expect(routerOut0).toHaveLength(1);
				expect(routerOut0[0]?.node).toBe('Approval');

				const routerOut1 = json.connections['Router']?.main?.[1] ?? [];
				expect(routerOut1).toHaveLength(1);
				expect(routerOut1[0]?.node).toBe('Approval 1');
			}

			// Both calls should produce identical JSON
			expect(json1).toEqual(json2);
		});

		it('should replace existing random ID with deterministic ID', () => {
			// This test verifies that regenerateNodeIds() replaces existing random IDs
			// with deterministic ones based on workflow ID, node type, and node name
			const code = `
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const wf = workflow('existing-workflow', 'Existing');
export default wf.add(start);
			`;
			const builder = parseWorkflowCodeToBuilder(code);

			// Get the original ID before regeneration
			const jsonBefore = builder.toJSON();
			const originalId = jsonBefore.nodes[0].id;

			// Regenerate IDs - this should create deterministic IDs
			builder.regenerateNodeIds();
			const jsonAfter = builder.toJSON();

			// The ID should now be deterministic, not the original random one
			const expectedId = generateDeterministicNodeId(
				'existing-workflow',
				'n8n-nodes-base.manualTrigger',
				'Start',
			);
			expect(jsonAfter.nodes[0].id).toBe(expectedId);
			expect(jsonAfter.nodes[0].id).not.toBe(originalId);
		});
	});

	describe('Roundtrip with deterministic IDs', () => {
		it('should produce same IDs after code regeneration and reparse', () => {
			// Create workflow
			const wf1 = workflow('roundtrip-test', 'Roundtrip Test').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}).to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Process' } })),
			);

			wf1.regenerateNodeIds();
			const json1 = wf1.toJSON();

			// Generate code from the workflow
			const code = generateWorkflowCode(json1);

			// Parse the code back to a builder
			const wf2 = parseWorkflowCodeToBuilder(code);
			wf2.regenerateNodeIds();
			const json2 = wf2.toJSON();

			// IDs should be the same
			expect(json2.nodes[0].id).toBe(json1.nodes[0].id);
			expect(json2.nodes[1].id).toBe(json1.nodes[1].id);
		});
	});
});
