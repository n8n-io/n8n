import type { WorkflowEntity } from '@n8n/db';

import type { PackageImportBindings } from '../../../../n8n-packages.types';
import { callerIdsReference } from '../caller-ids.reference';

const workflow = (callerIds: unknown): WorkflowEntity =>
	({ id: 'parent', settings: { callerIds } }) as WorkflowEntity;
const bindings = (workflows: Map<string, string>): PackageImportBindings => ({
	workflows,
	credentials: new Map(),
});

describe('callerIdsReference', () => {
	it('contributes no requirements (an allowlist is not a dependency)', () => {
		expect(callerIdsReference.extract(workflow('a,b'))).toEqual([]);
	});

	it('remaps known caller ids, trims whitespace, and keeps unknown ids', () => {
		const wf = workflow('a, b ,external');
		callerIdsReference.apply(
			wf,
			bindings(
				new Map([
					['a', 'A'],
					['b', 'B'],
				]),
			),
		);
		expect(wf.settings?.callerIds).toBe('A,B,external');
	});

	it('ignores a non-string callerIds', () => {
		const wf = workflow(42);
		callerIdsReference.apply(wf, bindings(new Map()));
		expect(wf.settings?.callerIds).toBe(42);
	});
});
