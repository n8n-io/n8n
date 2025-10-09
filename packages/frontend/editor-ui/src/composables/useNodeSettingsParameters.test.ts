import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useNodeSettingsParameters } from './useNodeSettingsParameters';
import * as nodeHelpers from '@/composables/useNodeHelpers';
import * as workflowHelpers from '@/composables/useWorkflowHelpers';
import * as nodeSettingsUtils from '@/utils/nodeSettingsUtils';
import * as nodeTypesUtils from '@/utils/nodeTypesUtils';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';

describe('useNodeSettingsParameters', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	describe('handleFocus', () => {
		let ndvStore: MockedStore<typeof useNDVStore>;
		let focusPanelStore: MockedStore<typeof useFocusPanelStore>;

		beforeEach(() => {
			setActivePinia(createTestingPinia());

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
			ndvStore.unsetActiveNodeName = vi.fn();
			ndvStore.resetNDVPushRef = vi.fn();
			focusPanelStore.openWithFocusedNodeParameter = vi.fn();
			focusPanelStore.focusPanelActive = false;
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('sets focused node parameter', () => {
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

			expect(focusPanelStore.openWithFocusedNodeParameter).toHaveBeenCalledWith({
				nodeId: node.id,
				parameterPath: path,
				parameter,
			});

			expect(ndvStore.unsetActiveNodeName).toHaveBeenCalled();
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

			expect(focusPanelStore.openWithFocusedNodeParameter).not.toHaveBeenCalled();
		});
	});

	describe('shouldDisplayNodeParameter', () => {
		const displayParameterSpy = vi.fn();
		function mockNodeHelpers({ isCustomApiCallSelected = false } = {}) {
			const originalNodeHelpers = nodeHelpers.useNodeHelpers();

			vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
				return {
					...originalNodeHelpers,
					isCustomApiCallSelected: vi.fn(() => isCustomApiCallSelected),
					displayParameter: displayParameterSpy,
				};
			});
		}

		let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;

		const mockParameter: INodeProperties = {
			name: 'foo',
			type: 'string',
			displayName: 'Foo',
			displayOptions: {},
			default: '',
		};

		const mockNodeType: INodeTypeDescription = {
			version: 1,
			name: 'testNode',
			displayName: 'Test Node',
			description: 'A test node',
			group: ['input'],
			defaults: {
				name: 'Test Node',
			},
			inputs: ['main'],
			outputs: [],
			properties: [mockParameter],
		};

		beforeEach(() => {
			setActivePinia(createTestingPinia());

			nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValueOnce(mockNodeType);
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('returns false for hidden parameter type', () => {
			mockNodeHelpers();

			const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

			const result = shouldDisplayNodeParameter({}, null, { ...mockParameter, type: 'hidden' });
			expect(result).toBe(false);
		});

		it('returns false for custom API call with mustHideDuringCustomApiCall', () => {
			vi.spyOn(nodeSettingsUtils, 'mustHideDuringCustomApiCall').mockReturnValueOnce(true);
			mockNodeHelpers({ isCustomApiCallSelected: true });

			const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

			const result = shouldDisplayNodeParameter({}, null, mockParameter);
			expect(result).toBe(false);
		});

		it('returns false if parameter is auth-related', () => {
			vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(true);
			vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(mockParameter);
			mockNodeHelpers();

			const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

			const result = shouldDisplayNodeParameter({}, null, mockParameter);
			expect(result).toBe(false);
		});

		it('returns true if displayOptions is undefined', () => {
			vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
			mockNodeHelpers();

			const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

			const result = shouldDisplayNodeParameter({}, null, {
				...mockParameter,
				displayOptions: undefined,
			});
			expect(result).toBe(true);
		});

		it('calls displayParameter with correct arguments', () => {
			vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
			mockNodeHelpers();
			displayParameterSpy.mockReturnValueOnce(false);

			const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

			const parameter: INodeProperties = {
				name: 'foo',
				type: 'string',
				displayName: 'Foo',
				disabledOptions: {},
				default: '',
			};
			const nodeParameters = { foo: 'bar' };
			const node: INodeUi = {
				id: '1',
				name: 'Node1',
				position: [0, 0],
				typeVersion: 1,
				type: 'n8n-nodes-base.set',
				parameters: nodeParameters,
			};

			const result = shouldDisplayNodeParameter(
				nodeParameters,
				node,
				parameter,
				'',
				'disabledOptions',
			);

			expect(displayParameterSpy).toHaveBeenCalledWith(
				nodeParameters,
				parameter,
				'',
				node,
				'disabledOptions',
			);
			expect(result).toBe(false);
		});

		it('calls displayParameter with default displayOptions', () => {
			vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
			mockNodeHelpers();
			displayParameterSpy.mockReturnValueOnce(true);

			const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

			const nodeParameters = { foo: 'bar' };
			const node: INodeUi = {
				id: '1',
				name: 'Node1',
				position: [0, 0],
				typeVersion: 1,
				type: 'n8n-nodes-base.set',
				parameters: nodeParameters,
			};

			const result = shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

			expect(displayParameterSpy).toHaveBeenCalledWith(
				nodeParameters,
				mockParameter,
				'',
				node,
				'displayOptions',
			);
			expect(result).toBe(true);
		});

		it('resolves expressions and calls displayParameter with resolved parameters', () => {
			vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
			mockNodeHelpers();
			displayParameterSpy.mockReturnValueOnce(true);
			const originalWorkflowHelpers = workflowHelpers.useWorkflowHelpers();
			vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
				...originalWorkflowHelpers,
				resolveExpression: (expr: string) => (expr === '=1+1' ? 2 : expr),
			}));

			const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

			const nodeParameters = { foo: '=1+1' };
			const node: INodeUi = {
				id: '1',
				name: 'Node1',
				position: [0, 0],
				typeVersion: 1,
				type: 'n8n-nodes-base.set',
				parameters: nodeParameters,
			};

			const result = shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

			expect(displayParameterSpy).toHaveBeenCalledWith(
				{ foo: 2 },
				mockParameter,
				'',
				node,
				'displayOptions',
			);

			expect(displayParameterSpy).toHaveBeenCalled();
			expect(result).toBe(true);
		});
	});
});
