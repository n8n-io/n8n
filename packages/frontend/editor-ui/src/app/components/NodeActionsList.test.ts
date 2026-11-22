import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { createTestNode } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeActionsList from './NodeActionsList.vue';

const customActionSelection = vi.hoisted(() => ({
	pinValuesFor: vi.fn(),
	newestPinValuesFor: vi.fn(),
	actionNameFor: vi.fn(),
}));
vi.mock('@n8n/frontend-module-custom-nodes', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useCustomActionSelection: () => customActionSelection,
}));

const NODE_TYPE = 'n8n-custom.acme';

const nodeType = {
	displayName: 'Acme',
	name: NODE_TYPE,
	group: ['transform'],
	description: 'A custom node',
	version: 1,
	defaults: { name: 'Acme' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Action',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			default: '',
			options: [
				{ name: 'Get Weather', value: 'action-1@2', action: 'Get weather' },
				{ name: 'Get Forecast', value: 'forecast', action: 'Get forecast' },
			],
		},
	],
} as unknown as INodeTypeDescription;

const pins: Record<string, Record<string, string>> = {
	'action-1@2': {
		operation: 'action-1@2',
		customActionId: 'action-1',
		customActionName: 'Get weather',
	},
};

const renderComponent = (parameters: Record<string, string>, moduleActive: boolean) => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);
	useNodeTypesStore().setNodeTypes([nodeType]);
	useSettingsStore().settings.activeModules = moduleActive ? ['custom-nodes'] : [];

	return createComponentRenderer(NodeActionsList)({
		pinia,
		props: { node: createTestNode({ name: 'Acme', type: NODE_TYPE, typeVersion: 1, parameters }) },
	});
};

const selectedNames = (container: Element) =>
	Array.from(container.querySelectorAll('[role="button"]'))
		.filter((option) => option.querySelector('svg, [data-icon="check"], .n8n-icon'))
		.map((option) => Array.from(option.querySelectorAll('.n8n-text')).at(-1)?.textContent?.trim());

describe('NodeActionsList', () => {
	beforeEach(() => {
		Element.prototype.scrollIntoView = vi.fn();
		customActionSelection.pinValuesFor.mockReset();
		customActionSelection.pinValuesFor.mockImplementation(
			(_type: string, parameters: { operation?: string }) =>
				parameters.operation ? pins[parameters.operation] : undefined,
		);
	});

	it('marks a custom action as selected by its operation value', () => {
		// The action was renamed after the node stored its name.
		const { container } = renderComponent(
			{ operation: 'action-1@2', customActionId: 'action-1', customActionName: 'Old name' },
			true,
		);

		expect(selectedNames(container)).toEqual(['Get weather']);
	});

	it('marks a built-in action as selected as before', () => {
		const { container } = renderComponent({ operation: 'forecast' }, true);

		expect(selectedNames(container)).toEqual(['Get forecast']);
	});

	it('gives the same selection as before with the module off', () => {
		const { container } = renderComponent(
			{ operation: 'action-1@2', customActionId: 'action-1', customActionName: 'Old name' },
			false,
		);

		expect(selectedNames(container)).toEqual(['Get weather']);
		expect(customActionSelection.pinValuesFor).not.toHaveBeenCalled();
	});
});
