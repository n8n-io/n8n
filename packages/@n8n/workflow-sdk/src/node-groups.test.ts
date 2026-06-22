import { generateWorkflowCode } from './codegen';
import { parseWorkflowCodeToBuilder } from './codegen/parse-workflow-code';
import type { WorkflowJSON } from './types/base';
import { workflow } from './workflow-builder';
import { node, trigger } from './workflow-builder/node-builders/node-builder';
import { generateDeterministicGroupId } from './workflow-builder/string-utils';

const WF_ID = 'wf-groups-1';

function buildGroupedWorkflow() {
	const start = trigger({
		type: 'n8n-nodes-base.manualTrigger',
		version: 1,
		config: { name: 'Start' },
	});
	const fetchNode = node({
		type: 'n8n-nodes-base.httpRequest',
		version: 4.2,
		config: { name: 'Fetch data' },
	});
	const transform = node({
		type: 'n8n-nodes-base.set',
		version: 3,
		config: { name: 'Transform' },
	});

	return workflow(WF_ID, 'Grouped workflow')
		.add(start)
		.to(fetchNode)
		.to(transform)
		.group('Ingestion', [fetchNode, transform]);
}

describe('SDK node groups', () => {
	describe('builder.group() → toJSON()', () => {
		it('emits nodeGroups with a deterministic id and member ids resolved from names', () => {
			const json = buildGroupedWorkflow().toJSON();

			expect(json.nodeGroups).toHaveLength(1);
			const group = json.nodeGroups![0];
			expect(group.name).toBe('Ingestion');
			expect(group.id).toBe(generateDeterministicGroupId(WF_ID, 'Ingestion'));

			const idByName = new Map(json.nodes.map((n) => [n.name, n.id]));
			expect(group.nodeIds).toEqual([idByName.get('Fetch data'), idByName.get('Transform')]);
		});

		it('drops members that do not resolve to a node in the workflow', () => {
			const start = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const a = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'A' } });
			// `orphan` is never added to the workflow, so it resolves to nothing and is dropped.
			const orphan = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'Orphan' } });

			const json = workflow(WF_ID, 'wf').add(start).to(a).group('G', [a, orphan]).toJSON();

			const idByName = new Map(json.nodes.map((n) => [n.name, n.id]));
			expect(json.nodeGroups![0].nodeIds).toEqual([idByName.get('A')]);
		});

		it('omits nodeGroups entirely when no group was declared', () => {
			const start = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const json = workflow(WF_ID, 'wf').add(start).toJSON();
			expect(json.nodeGroups).toBeUndefined();
		});
	});

	describe('regenerateNodeIds()', () => {
		it('keeps group member ids consistent with the regenerated node ids (never dangling)', () => {
			const builder = buildGroupedWorkflow();
			builder.regenerateNodeIds();
			const json = builder.toJSON();

			const emittedIds = new Set(json.nodes.map((n) => n.id));
			expect(json.nodeGroups![0].nodeIds.length).toBe(2);
			for (const id of json.nodeGroups![0].nodeIds) {
				expect(emittedIds.has(id)).toBe(true);
			}
		});

		it('resolves a grouped auto-renamed duplicate handle to the right node after regeneration', () => {
			const start = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			// Two nodes named "A": the builder auto-renames the second to "A 1".
			const first = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'A' } });
			const second = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'A' } });

			const builder = workflow(WF_ID, 'wf').add(start).to(first).to(second).group('G', [second]); // group the SECOND duplicate by handle
			builder.regenerateNodeIds();
			const json = builder.toJSON();

			const renamed = json.nodes.find((n) => n.name === 'A 1');
			expect(renamed).toBeDefined();
			// The group must reference the renamed duplicate, not the first "A".
			expect(json.nodeGroups![0].nodeIds).toEqual([renamed!.id]);
		});
	});

	describe('fromJSON() → toJSON() round-trip', () => {
		it('preserves the group id and members across a round-trip', () => {
			const source: WorkflowJSON = {
				id: WF_ID,
				name: 'wf',
				nodes: [
					{
						id: 'id-a',
						name: 'A',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'id-b',
						name: 'B',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [10, 0],
						parameters: {},
					},
				],
				connections: { A: { main: [[{ node: 'B', type: 'main', index: 0 }]] } },
				// A UI-assigned (non-deterministic) id, as the canvas creates.
				nodeGroups: [{ id: 'random-uuid', name: 'G', nodeIds: ['id-a', 'id-b'] }],
			};

			const json = workflow.fromJSON(source).toJSON();

			// Compare the whole group so a dropped/changed field (e.g. id) is caught.
			// The source id is carried through, not re-derived — round-trip is lossless.
			expect(json.nodeGroups).toEqual([
				{ id: 'random-uuid', name: 'G', nodeIds: ['id-a', 'id-b'] },
			]);
		});

		it('drops a group member whose id has no matching node', () => {
			const source: WorkflowJSON = {
				id: WF_ID,
				name: 'wf',
				nodes: [
					{
						id: 'id-a',
						name: 'A',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
				// `ghost-id` references no node, so it is dropped on import.
				nodeGroups: [{ id: 'random-uuid', name: 'G', nodeIds: ['id-a', 'ghost-id'] }],
			};

			const json = workflow.fromJSON(source).toJSON();

			expect(json.nodeGroups![0].nodeIds).toEqual(['id-a']);
		});

		it('leaves nodeGroups undefined when the source declares none', () => {
			const source: WorkflowJSON = {
				id: WF_ID,
				name: 'wf',
				nodes: [
					{
						id: 'id-a',
						name: 'A',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};

			const json = workflow.fromJSON(source).toJSON();

			expect(json.nodeGroups).toBeUndefined();
		});
	});

	describe('deterministic group id', () => {
		it('produces the same id for the same name and a different id for a different workflow', () => {
			expect(generateDeterministicGroupId(WF_ID, 'G')).toBe(
				generateDeterministicGroupId(WF_ID, 'G'),
			);
			expect(generateDeterministicGroupId(WF_ID, 'G')).not.toBe(
				generateDeterministicGroupId('other-wf', 'G'),
			);
		});

		it('never collides with a node id derived from the same inputs', () => {
			const json = buildGroupedWorkflow().toJSON();
			const nodeIds = new Set(json.nodes.map((n) => n.id));
			expect(nodeIds.has(json.nodeGroups![0].id)).toBe(false);
		});
	});

	describe('existingGroupIdsByName (toJSON option)', () => {
		it('reuses an existing group id matched by name and derives one for a new group', () => {
			const start = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const a = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'A' } });
			const b = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'B' } });

			const json = workflow(WF_ID, 'wf')
				.add(start)
				.to(a)
				.to(b)
				.group('Existing', [a])
				.group('New', [b])
				// 'Existing' matches a (random) UI-assigned id; 'New' has no match.
				.toJSON({ existingGroupIdsByName: new Map([['Existing', 'ui-random-id']]) });

			const idByName = new Map(json.nodes.map((n) => [n.name, n.id]));
			expect(json.nodeGroups).toEqual([
				{ id: 'ui-random-id', name: 'Existing', nodeIds: [idByName.get('A')] },
				{
					id: generateDeterministicGroupId(WF_ID, 'New'),
					name: 'New',
					nodeIds: [idByName.get('B')],
				},
			]);
		});

		it('lets a group carried from fromJSON keep its id over a name match', () => {
			const source: WorkflowJSON = {
				id: WF_ID,
				name: 'wf',
				nodes: [
					{
						id: 'id-a',
						name: 'A',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
				nodeGroups: [{ id: 'source-id', name: 'G', nodeIds: ['id-a'] }],
			};

			// The carried source id is authoritative and wins over the name-keyed map.
			const json = workflow
				.fromJSON(source)
				.toJSON({ existingGroupIdsByName: new Map([['G', 'other-id']]) });

			expect(json.nodeGroups![0].id).toBe('source-id');
		});
	});

	describe('code round-trip (generate → parse → build)', () => {
		it('emits a .group(...) call and preserves the group through a re-parse', () => {
			const builder = buildGroupedWorkflow();
			builder.regenerateNodeIds();
			const json1 = builder.toJSON();

			const code = generateWorkflowCode(json1);
			expect(code).toContain(".group('Ingestion', [fetch_data, transform])");

			const rebuilt = parseWorkflowCodeToBuilder(code);
			rebuilt.regenerateNodeIds();
			const json2 = rebuilt.toJSON();

			expect(json2.nodeGroups).toHaveLength(1);
			expect(json2.nodeGroups![0].name).toBe('Ingestion');
			// Deterministic ids mean the group survives identically across the round-trip.
			expect(json2.nodeGroups![0].id).toBe(json1.nodeGroups![0].id);
			expect(json2.nodeGroups![0].nodeIds).toEqual(json1.nodeGroups![0].nodeIds);
		});
	});
});
