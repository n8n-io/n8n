import type { BuiltTelemetry } from '../../types/telemetry';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

function builtTelemetry(overrides: Partial<BuiltTelemetry> = {}): BuiltTelemetry {
	return {
		enabled: true,
		recordInputs: true,
		recordOutputs: true,
		integrations: [],
		...overrides,
	};
}

describe('RuntimeTelemetry.resolve()', () => {
	it('stamps own telemetry with the runtime name only when it lacks a functionId, without mutating the config', () => {
		const telemetry = builtTelemetry();
		const config = { name: 'my-agent', telemetry } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		expect(runtimeTelemetry.resolve(undefined)?.functionId).toBe('my-agent');
		expect(telemetry.functionId).toBeUndefined();

		const explicit = builtTelemetry({ functionId: 'explicit-id' });
		const explicitRuntime = new RuntimeTelemetry({
			name: 'my-agent',
			telemetry: explicit,
		} as AgentRuntimeConfig);
		expect(explicitRuntime.resolve(undefined)?.functionId).toBe('explicit-id');
	});

	it('re-labels inherited telemetry with the runtime name', () => {
		const inherited = builtTelemetry({ functionId: 'parent-agent' });
		const config = { name: 'child-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		expect(runtimeTelemetry.resolve({ telemetry: inherited })?.functionId).toBe('child-agent');
		expect(runtimeTelemetry.resolve(undefined)).toBeUndefined();
	});
});
