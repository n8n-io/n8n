import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { IdDeriver } from '../id-deriver';

describe('IdDeriver', () => {
	function makeDeriver(encryptionKey: string): IdDeriver {
		return new IdDeriver(mock<InstanceSettings>({ encryptionKey }));
	}

	it('should produce a stable ID for the same inputs', () => {
		const deriver = makeDeriver('instance-secret-1');
		const a = deriver.derive('proj-1', 'src-wf-1');
		const b = deriver.derive('proj-1', 'src-wf-1');
		expect(a).toBe(b);
	});

	it('should prefix the derived ID with the project ID', () => {
		const deriver = makeDeriver('instance-secret-1');
		const id = deriver.derive('proj-1', 'src-wf-1');
		expect(id.startsWith('proj-1-')).toBe(true);
	});

	it('should produce different IDs for different source IDs', () => {
		const deriver = makeDeriver('instance-secret-1');
		const a = deriver.derive('proj-1', 'src-wf-1');
		const b = deriver.derive('proj-1', 'src-wf-2');
		expect(a).not.toBe(b);
	});

	it('should produce different IDs for different project IDs', () => {
		const deriver = makeDeriver('instance-secret-1');
		const a = deriver.derive('proj-1', 'src-wf-1');
		const b = deriver.derive('proj-2', 'src-wf-1');
		expect(a).not.toBe(b);
	});

	it('should produce different IDs across instances with different secrets', () => {
		const a = makeDeriver('secret-A').derive('proj-1', 'src-wf-1');
		const b = makeDeriver('secret-B').derive('proj-1', 'src-wf-1');
		expect(a).not.toBe(b);
	});

	it('should not leak the source ID in the derived suffix', () => {
		const deriver = makeDeriver('instance-secret-1');
		const id = deriver.derive('proj-1', 'src-wf-with-recognisable-name');
		// suffix is hex digest; raw source id should not appear after the prefix
		expect(id).not.toContain('src-wf-with-recognisable-name');
	});
});
