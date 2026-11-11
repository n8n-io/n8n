import { useSettingsStore } from '@n8n/stores/settings.store';
import type { IWorkflowSettings } from 'n8n-workflow';
import { ref } from 'vue';

import { mockEngineV2Compatibility } from '../__tests__/mocks';
import type { EngineCompatibilityReason } from '../engineV2Check';
import { describeEngineV2Block, useEngineV2Compatibility } from './useEngineV2Compatibility';

const blockingReason: EngineCompatibilityReason = {
	code: 'trigger-external-identity',
	severity: 'blocking',
	nodeId: 'node-1',
	nodeName: 'Webhook',
	message: 'Engine v2 cannot run the "Webhook" trigger yet.',
};

const warningReason: EngineCompatibilityReason = {
	code: 'error-workflow',
	severity: 'warning',
	message: 'Engine v2 does not run an error workflow yet.',
};

function setup({
	moduleActive,
	settings,
}: {
	moduleActive: boolean;
	settings: IWorkflowSettings | undefined;
}) {
	useSettingsStore().settings.activeModules = moduleActive ? ['engine-v2'] : [];
	return useCompatibility(settings);
}

function useCompatibility(settings: IWorkflowSettings | undefined) {
	const workflowSettings = ref(settings);
	const settingsSnapshot = vi.fn(() => ({ ...workflowSettings.value }));
	const compatibility = useEngineV2Compatibility({
		nodes: () => [],
		connections: () => ({}),
		settings: () => workflowSettings.value,
		settingsSnapshot,
	});
	return { workflowSettings, settingsSnapshot, ...compatibility };
}

describe('useEngineV2Compatibility', () => {
	it.each([
		['the module is off', false, { engineType: 'v2' } satisfies IWorkflowSettings],
		['the workflow runs on v1', true, { engineType: 'v1' } satisfies IWorkflowSettings],
		['the workflow has no engine type', true, {}],
		['the workflow has no settings', true, undefined],
	])('reports nothing and never runs the check when %s', (_case, moduleActive, settings) => {
		const { checkWorkflow, isNodeTypeSupported } = mockEngineV2Compatibility({
			reasons: [blockingReason],
			unsupportedNodeTypes: ['n8n-nodes-base.webhook'],
		});

		const { reasons, blockingReasons, isNodeTypeIncompatible, settingsSnapshot } = setup({
			moduleActive,
			settings,
		});

		expect(reasons.value).toEqual([]);
		expect(blockingReasons.value).toEqual([]);
		expect(isNodeTypeIncompatible('n8n-nodes-base.webhook')).toBe(false);
		expect(checkWorkflow).not.toHaveBeenCalled();
		expect(isNodeTypeSupported).not.toHaveBeenCalled();
		expect(settingsSnapshot).not.toHaveBeenCalled();
	});

	it('reports nothing, and `false` for a node type, before the settings load', () => {
		mockEngineV2Compatibility({ unsupportedNodeTypes: ['n8n-nodes-base.webhook'] });
		useSettingsStore().settings.activeModules = undefined as unknown as string[];

		const { reasons, isNodeTypeIncompatible } = useCompatibility({ engineType: 'v2' });

		expect(reasons.value).toEqual([]);
		expect(isNodeTypeIncompatible('n8n-nodes-base.webhook')).toBe(false);
	});

	it('returns the reasons of the check when the module is on and the workflow runs on v2', () => {
		mockEngineV2Compatibility({ reasons: [blockingReason, warningReason] });

		const { reasons, blockingReasons } = setup({
			moduleActive: true,
			settings: { engineType: 'v2' },
		});

		expect(reasons.value).toEqual([blockingReason, warningReason]);
		expect(blockingReasons.value).toEqual([blockingReason]);
	});

	it('reports a node type as incompatible only when the check does not support it', () => {
		mockEngineV2Compatibility({ unsupportedNodeTypes: ['n8n-nodes-base.webhook'] });

		const { isNodeTypeIncompatible } = setup({
			moduleActive: true,
			settings: { engineType: 'v2' },
		});

		expect(isNodeTypeIncompatible('n8n-nodes-base.webhook')).toBe(true);
		expect(isNodeTypeIncompatible('n8n-nodes-base.set')).toBe(false);
	});

	it('does not run the workflow check to answer a node type question', () => {
		const { checkWorkflow } = mockEngineV2Compatibility();

		const { isNodeTypeIncompatible } = setup({
			moduleActive: true,
			settings: { engineType: 'v2' },
		});
		isNodeTypeIncompatible('n8n-nodes-base.webhook');

		expect(checkWorkflow).not.toHaveBeenCalled();
	});

	it('follows a change of the engine type', () => {
		mockEngineV2Compatibility({
			reasons: [blockingReason],
			unsupportedNodeTypes: ['n8n-nodes-base.webhook'],
		});

		const { workflowSettings, reasons, isNodeTypeIncompatible } = setup({
			moduleActive: true,
			settings: { engineType: 'v2' },
		});
		expect(reasons.value).toEqual([blockingReason]);

		workflowSettings.value = { engineType: 'v1' };

		expect(reasons.value).toEqual([]);
		expect(isNodeTypeIncompatible('n8n-nodes-base.webhook')).toBe(false);
	});

	it('passes the workflow to the check', () => {
		const { checkWorkflow } = mockEngineV2Compatibility();
		useSettingsStore().settings.activeModules = ['engine-v2'];
		const node = {
			id: 'node-1',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		const { reasons } = useEngineV2Compatibility({
			nodes: () => [node],
			connections: () => ({ Webhook: { main: [[]] } }),
			settings: () => ({ engineType: 'v2' }),
			settingsSnapshot: () => ({ engineType: 'v2' }),
		});
		void reasons.value;

		expect(checkWorkflow).toHaveBeenCalledWith({
			nodes: [node],
			connections: { Webhook: { main: [[]] } },
			settings: { engineType: 'v2' },
		});
	});
});

describe('describeEngineV2Block', () => {
	it('returns the publish tooltip text', () => {
		expect(describeEngineV2Block()).toBe(
			"This workflow can't run on engine v2 yet. Fix the issues listed on the canvas.",
		);
	});
});
