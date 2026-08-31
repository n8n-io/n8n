import { createHash } from 'node:crypto';

import type { PolicedWorkflow } from '../policy-check';
import { workflowSubject } from '../policy-cleared';

const policed = (workflow: object) => workflow as unknown as PolicedWorkflow;

const hashOf = (nodes: unknown) => createHash('sha256').update(JSON.stringify(nodes)).digest('hex');

describe('workflowSubject', () => {
	it('binds to the workflow id when it exists', () => {
		expect(workflowSubject(policed({ id: 'wf-9', name: 'x', nodes: [] }))).toEqual({
			type: 'workflow',
			id: 'wf-9',
		});
	});

	it('binds a new workflow to the sha256 of its nodes', () => {
		const nodes = [{ name: 'Start' }];

		expect(workflowSubject(policed({ id: null, name: 'x', nodes }))).toEqual({
			type: 'workflow',
			id: hashOf(nodes),
		});
	});

	it('gives the same id for the same nodes and a different id for different nodes', () => {
		const base = { id: null, name: 'x' };
		const a = workflowSubject(policed({ ...base, nodes: [{ name: 'A' }] }));
		const aAgain = workflowSubject(policed({ ...base, nodes: [{ name: 'A' }] }));
		const b = workflowSubject(policed({ ...base, nodes: [{ name: 'B' }] }));

		expect(a.id).toBe(aAgain.id);
		expect(a.id).not.toBe(b.id);
	});

	// An entity generates its id on insert, so a create carries `undefined`, not `null`. Binding
	// to that would give every create the same subject and make one create's token clear another.
	it.each([undefined, ''])('falls back to the node hash for an id of %p', (id) => {
		const nodes = [{ name: 'Start' }];

		expect(workflowSubject(policed({ id, name: 'x', nodes }))).toEqual({
			type: 'workflow',
			id: hashOf(nodes),
		});
	});
});
