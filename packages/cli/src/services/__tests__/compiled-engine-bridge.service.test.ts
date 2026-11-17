import { mock } from 'vitest-mock-extended';

import {
	CompiledEngineBridge,
	type CompiledEngineProvider,
} from '@/services/compiled-engine-bridge.service';

describe('CompiledEngineBridge', () => {
	const compiled = { id: 'wf1', settings: { engineType: 'compiled' as const } };

	it('runs a workflow that selects the compiled engine on v1 when the module is not enabled', () => {
		const bridge = new CompiledEngineBridge();
		expect(bridge.selects(compiled)).toBe(false);
		expect(bridge.handles(compiled)).toBe(false);
	});

	it('handles a workflow that selects the compiled engine, and no other workflow', () => {
		const bridge = new CompiledEngineBridge();
		bridge.registerProvider(mock<CompiledEngineProvider>());
		expect(bridge.handles(compiled)).toBe(true);
		expect(bridge.handles({ id: 'wf2', settings: {} })).toBe(false);
		expect(bridge.handles(undefined)).toBe(false);
	});

	it('runs the published version on v1 for a reason, and on the compiled engine again later', () => {
		const bridge = new CompiledEngineBridge();
		bridge.registerProvider(mock<CompiledEngineProvider>());

		bridge.runOnV1('wf1', 'The loop has no exit.');
		expect(bridge.handles(compiled)).toBe(false);
		// The workflow still selects the engine: a manual run of its draft can compile.
		expect(bridge.selects(compiled)).toBe(true);
		expect(bridge.reasonForV1('wf1')).toBe('The loop has no exit.');
		expect(bridge.handles({ id: 'wf3', settings: compiled.settings })).toBe(true);

		bridge.runOnCompiledEngine('wf1');
		expect(bridge.handles(compiled)).toBe(true);
		expect(bridge.reasonForV1('wf1')).toBeUndefined();
	});
});
