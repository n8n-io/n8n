import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useNodeSettingsParameters } from './useNodeSettingsParameters';
import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';

describe('useNodeSettingsParameters', () => {
	describe('nameIsParameter', () => {
		beforeEach(() => {
			setActivePinia(createTestingPinia());
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it.each([
			['', false],
			['parameters', false],
			['parameters.', true],
			['parameters.path.to.some', true],
			['', false],
		])('%s should be %s', (input, expected) => {
			const { nameIsParameter } = useNodeSettingsParameters();
			const result = nameIsParameter({ name: input } as never);
			expect(result).toBe(expected);
		});

		it('should reject path on other input', () => {
			const { nameIsParameter } = useNodeSettingsParameters();
			const result = nameIsParameter({
				name: 'aName',
				value: 'parameters.path.to.parameters',
			} as never);
			expect(result).toBe(false);
		});
	});

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

	describe('formatAsExpression', () => {
		it('wraps string value with "="', () => {
			const { formatAsExpression } = useNodeSettingsParameters();
			expect(formatAsExpression('foo', 'string')).toBe('=foo');
		});

		it('wraps number value with "={{ }}"', () => {
			const { formatAsExpression } = useNodeSettingsParameters();
			expect(formatAsExpression(42, 'number')).toBe('={{ 42 }}');
		});

		it('wraps boolean value with "={{ }}"', () => {
			const { formatAsExpression } = useNodeSettingsParameters();
			expect(formatAsExpression(true, 'boolean')).toBe('={{ true }}');
		});

		it('wraps multiOptions value with "={{ }}" and stringifies', () => {
			const { formatAsExpression } = useNodeSettingsParameters();
			expect(formatAsExpression(['a', 'b'], 'multiOptions')).toBe('={{ ["a","b"] }}');
		});

		it('returns "={{ 0 }}" for number with empty value', () => {
			const { formatAsExpression } = useNodeSettingsParameters();
			expect(formatAsExpression('', 'number')).toBe('={{ 0 }}');
			expect(formatAsExpression('[Object: null]', 'number')).toBe('={{ 0 }}');
		});

		it('wraps non-string, non-number, non-boolean value with "={{ }}"', () => {
			const { formatAsExpression } = useNodeSettingsParameters();
			expect(formatAsExpression({ foo: 'bar' }, 'string')).toBe('={{ [object Object] }}');
		});

		it('handles resourceLocator value', () => {
			const { formatAsExpression } = useNodeSettingsParameters();
			const value = { __rl: true, value: 'abc', mode: 'url' };
			expect(formatAsExpression(value, 'resourceLocator')).toEqual({
				__rl: true,
				value: '=abc',
				mode: 'url',
			});
		});

		it('handles resourceLocator value as string', () => {
			const { formatAsExpression } = useNodeSettingsParameters();
			expect(formatAsExpression('abc', 'resourceLocator')).toEqual({
				__rl: true,
				value: '=abc',
				mode: '',
			});
		});
	});

	describe('parseFromExpression', () => {
		it('removes expression from multiOptions string value', () => {
			const { parseFromExpression } = useNodeSettingsParameters();
			const options: INodePropertyOptions[] = [
				{ name: 'Option A', value: 'a' },
				{ name: 'Option B', value: 'b' },
				{ name: 'Option C', value: 'c' },
			];
			expect(parseFromExpression('', 'a,b,c', 'multiOptions', [], options)).toEqual([
				'a',
				'b',
				'c',
			]);
			expect(parseFromExpression('', 'a,x', 'multiOptions', [], options)).toEqual(['a']);
		});

		it('removes expression from resourceLocator value', () => {
			const { parseFromExpression } = useNodeSettingsParameters();
			const modelValue = { __rl: true, value: '=abc', mode: 'url' };
			expect(parseFromExpression(modelValue, 'abc', 'resourceLocator', '', [])).toEqual({
				__rl: true,
				value: 'abc',
				mode: 'url',
			});
		});

		it('removes leading "=" from string parameter', () => {
			const { parseFromExpression } = useNodeSettingsParameters();
			expect(parseFromExpression('=foo', undefined, 'string', '', [])).toBe('foo');
			expect(parseFromExpression('==bar', undefined, 'string', '', [])).toBe('bar');
			expect(parseFromExpression('', undefined, 'string', '', [])).toBeNull();
		});

		it('returns value if defined and not string/resourceLocator/multiOptions', () => {
			const { parseFromExpression } = useNodeSettingsParameters();
			expect(parseFromExpression(123, 456, 'number', 0, [])).toBe(456);
			expect(parseFromExpression(true, false, 'boolean', true, [])).toBe(false);
		});

		it('returns defaultValue for number/boolean if value is undefined', () => {
			const { parseFromExpression } = useNodeSettingsParameters();
			expect(parseFromExpression(123, undefined, 'number', 0, [])).toBe(0);
			expect(parseFromExpression(true, undefined, 'boolean', false, [])).toBe(false);
		});

		it('returns null for other types if value is undefined', () => {
			const { parseFromExpression } = useNodeSettingsParameters();
			expect(parseFromExpression({}, undefined, 'json', null, [])).toBeNull();
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
