import type { ModuleRegistry } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { WorkflowEngineDefaults } from '@/workflows/workflow-engine-defaults';

describe('WorkflowEngineDefaults', () => {
	const setup = (defaultType: 'v1' | 'v2', engineV2Active: boolean) => {
		const engineConfig = new EngineConfig();
		engineConfig.defaultType = defaultType;
		const moduleRegistry = mock<ModuleRegistry>();
		moduleRegistry.isActive.mockImplementation((name) => engineV2Active && name === 'engine-v2');
		return new WorkflowEngineDefaults(engineConfig, moduleRegistry);
	};

	describe('getSetup', () => {
		it('returns v2 for new workflows when v2 is the default and the module is active', () => {
			expect(setup('v2', true).getSetup()).toEqual({
				engineV2Available: true,
				newWorkflowEngine: 'v2',
			});
		});

		it('returns v1 for new workflows when v1 is the default', () => {
			expect(setup('v1', true).getSetup()).toEqual({
				engineV2Available: true,
				newWorkflowEngine: 'v1',
			});
		});

		it('returns v1 for new workflows when the module is not active', () => {
			expect(setup('v2', false).getSetup()).toEqual({
				engineV2Available: false,
				newWorkflowEngine: 'v1',
			});
		});
	});

	describe('applyTo', () => {
		it('puts a workflow without an engine on v2 when the instance runs new workflows on v2', () => {
			expect(setup('v2', true).applyTo({})).toEqual({ engineType: 'v2' });
		});

		it('keeps the engine that the creator chose', () => {
			expect(setup('v2', true).applyTo({ engineType: 'v1' })).toEqual({ engineType: 'v1' });
		});

		it('does not change the settings when the module is not active', () => {
			expect(setup('v2', false).applyTo({})).toEqual({});
		});
	});
});
