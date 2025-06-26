import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNodeSettingsParameters } from './useNodeSettingsParameters';

describe('useNodeSettingsParameters', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('nameIsParameter', () => {
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
});
