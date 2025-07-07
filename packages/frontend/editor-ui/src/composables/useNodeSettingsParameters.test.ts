import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useNodeSettingsParameters } from './useNodeSettingsParameters';
import type { INodeProperties } from 'n8n-workflow';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';

describe('useNodeSettingsParameters', () => {
	describe('setValue', () => {
		beforeEach(() => {
			setActivePinia(createTestingPinia());
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('mutates nodeValues as expected', () => {
			const nodeSettingsParameters = useNodeSettingsParameters();

			expect(nodeSettingsParameters.nodeValues.value.color).toBe('#ff0000');
			expect(nodeSettingsParameters.nodeValues.value.parameters).toEqual({});

			nodeSettingsParameters.setValue('color', '#ffffff');

			expect(nodeSettingsParameters.nodeValues.value.color).toBe('#ffffff');
			expect(nodeSettingsParameters.nodeValues.value.parameters).toEqual({});

			nodeSettingsParameters.setValue('parameters.key', 3);

			expect(nodeSettingsParameters.nodeValues.value.parameters).toEqual({ key: 3 });

			nodeSettingsParameters.nodeValues.value = { parameters: { some: { nested: {} } } };
			nodeSettingsParameters.setValue('parameters.some.nested.key', true);

			expect(nodeSettingsParameters.nodeValues.value.parameters).toEqual({
				some: { nested: { key: true } },
			});

			nodeSettingsParameters.setValue('parameters', null);

			expect(nodeSettingsParameters.nodeValues.value.parameters).toBe(undefined);

			nodeSettingsParameters.setValue('newProperty', 'newValue');

			expect(nodeSettingsParameters.nodeValues.value.newProperty).toBe('newValue');
		});
	});

	describe('handleFocus', () => {
		let ndvStore: MockedStore<typeof useNDVStore>;
		let focusPanelStore: MockedStore<typeof useFocusPanelStore>;

		beforeEach(() => {
			vi.clearAllMocks();

			ndvStore = mockedStore(useNDVStore);
			focusPanelStore = mockedStore(useFocusPanelStore);

			ndvStore.activeNode = {
				id: '123',
				name: 'myParam',
				parameters: {},
				position: [0, 0],
				type: 'test',
				typeVersion: 1,
			};
			ndvStore.activeNodeName = 'Node1';
			ndvStore.setActiveNodeName = vi.fn();
			ndvStore.resetNDVPushRef = vi.fn();
			focusPanelStore.setFocusedNodeParameter = vi.fn();
			focusPanelStore.focusPanelActive = false;
		});

		it('sets focused node parameter and activates panel', () => {
			const { handleFocus } = useNodeSettingsParameters();
			const node: INodeUi = {
				id: '1',
				name: 'Node1',
				position: [0, 0],
				typeVersion: 1,
				type: 'test',
				parameters: {},
			};
			const path = 'parameters.foo';
			const parameter: INodeProperties = {
				name: 'foo',
				displayName: 'Foo',
				type: 'string',
				default: '',
			};

			handleFocus(node, path, parameter);

			expect(focusPanelStore.setFocusedNodeParameter).toHaveBeenCalledWith({
				nodeId: node.id,
				parameterPath: path,
				parameter,
			});
			expect(focusPanelStore.focusPanelActive).toBe(true);

			expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(null);
			expect(ndvStore.resetNDVPushRef).toHaveBeenCalled();
		});

		it('does nothing if node is undefined', () => {
			const { handleFocus } = useNodeSettingsParameters();

			const parameter: INodeProperties = {
				name: 'foo',
				displayName: 'Foo',
				type: 'string',
				default: '',
			};

			handleFocus(undefined, 'parameters.foo', parameter);

			expect(focusPanelStore.setFocusedNodeParameter).not.toHaveBeenCalled();
		});
	});
});
