import { workflow } from '../../../workflow-builder';
import { node, trigger } from '../../node-builders/node-builder';

/**
 * Copy-pasting a node block carries its `id` along, which would hand two nodes one
 * identity. Node ids key durable state — poll cursors, dedupe records and publication
 * status all use `(workflowId, nodeId)` — so this has to fail the build loudly rather
 * than be silently repaired.
 */
describe('duplicateNodeIdValidator', () => {
	it('should report an error when two nodes declare the same id', () => {
		const wf = workflow('wf-1', 'Duplicate ids').add(
			trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { id: 'shared', name: 'Start' },
			}).to(
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: { id: 'shared', name: 'Set' },
				}),
			),
		);

		const duplicates = wf.validate().errors.filter((e) => e.code === 'DUPLICATE_NODE_ID');

		expect(duplicates).toHaveLength(1);
		expect(duplicates[0].message).toContain('shared');
		expect(duplicates[0].message).toContain('Start');
		expect(duplicates[0].message).toContain('Set');
		expect(duplicates[0].severity).toBe('error');
	});

	it('should not report anything when every id is unique', () => {
		const wf = workflow('wf-1', 'Unique ids').add(
			trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { id: 'start', name: 'Start' },
			}).to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { id: 'set', name: 'Set' } })),
		);

		expect(wf.validate().errors.filter((e) => e.code === 'DUPLICATE_NODE_ID')).toHaveLength(0);
	});

	it('should not report anything when no ids are declared', () => {
		const wf = workflow('wf-1', 'Generated ids').add(
			trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } }).to(
				node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Set' } }),
			),
		);

		expect(wf.validate().errors.filter((e) => e.code === 'DUPLICATE_NODE_ID')).toHaveLength(0);
	});

	/** A blank id must not become a shared identity that this check silently skips. */
	it('should not let two nodes share a blank declared id', () => {
		const wf = workflow('wf-1', 'Blank ids').add(
			trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { id: '', name: 'Start' },
			}).to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { id: '', name: 'Set' } })),
		);

		const ids = wf.toJSON().nodes.map((n) => n.id);

		expect(ids).not.toContain('');
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('should report one error per duplicated id', () => {
		const wf = workflow('wf-1', 'Two collisions').add(
			trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { id: 'a', name: 'T' } })
				.to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { id: 'a', name: 'S1' } }))
				.to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { id: 'b', name: 'S2' } }))
				.to(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { id: 'b', name: 'S3' } })),
		);

		expect(wf.validate().errors.filter((e) => e.code === 'DUPLICATE_NODE_ID')).toHaveLength(2);
	});
});
