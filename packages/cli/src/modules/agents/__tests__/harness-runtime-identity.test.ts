import type { AgentJsonConfig } from '@n8n/api-types';

import { createHarnessRuntimeIdentity } from '../utils/harness-runtime-identity';

function config(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'anthropic/claude-sonnet-5',
		credential: 'credential-1',
		instructions: 'Help the user',
		engine: { type: 'harness', adapter: 'claude-code' },
		tools: [],
		...overrides,
	};
}

function identity(value: AgentJsonConfig): string {
	return createHarnessRuntimeIdentity({
		config: value,
		instructions: value.instructions,
		sandboxProvider: 'daytona',
		toolDescriptors: {},
		toolCodeByName: {},
	});
}

describe('createHarnessRuntimeIdentity', () => {
	it('ignores visual and display-only configuration', () => {
		const base = config();
		const renamed = config({
			name: 'Renamed agent',
			personalisation: {
				icon: 'rocket',
				gradient: { from: '#000000', to: '#FFFFFF', angle: 90, fromStop: 0, toStop: 100 },
			},
		});

		expect(identity(renamed)).toBe(identity(base));
	});

	it('changes when execution-affecting settings change', () => {
		const base = config();

		expect(identity(config({ model: 'anthropic/claude-opus-5' }))).not.toBe(identity(base));
		expect(identity(config({ instructions: 'Do something else' }))).not.toBe(identity(base));
		expect(identity(config({ tools: [{ type: 'workflow', workflow: 'Run report' }] }))).not.toBe(
			identity(base),
		);
	});

	it('changes when the sandbox provider changes', () => {
		const value = config();
		const daytona = identity(value);
		const n8nSandbox = createHarnessRuntimeIdentity({
			config: value,
			instructions: value.instructions,
			sandboxProvider: 'n8n-sandbox',
			toolDescriptors: {},
			toolCodeByName: {},
		});

		expect(n8nSandbox).not.toBe(daytona);
	});
});
