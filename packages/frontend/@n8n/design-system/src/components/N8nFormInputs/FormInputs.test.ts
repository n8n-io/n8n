import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import type { IFormInput } from '@n8n/design-system/types';

import FormInputs from './FormInputs.vue';

describe('FormInputs', () => {
	describe('dangling field removal', () => {
		it('should remove values for fields that are no longer in the inputs list', async () => {
			const initialInputs: IFormInput[] = [
				{
					name: 'field1',
					properties: {
						type: 'text',
						label: 'Field 1',
					},
					initialValue: 'value-field1',
				},
				{
					name: 'field2',
					properties: {
						type: 'text',
						label: 'Field 2',
					},
					initialValue: 'value-field2',
				},
				{
					name: 'field3',
					properties: {
						type: 'text',
						label: 'Field 3',
					},
					initialValue: 'value-field3',
				},
			];

			const wrapper = mount(FormInputs, {
				props: {
					inputs: initialInputs,
				},
			});

			await wrapper.vm.$nextTick();

			// Set values for all fields
			// Verify all values are set from initialValue
			const valuesBefore = wrapper.vm.getValues();
			expect(valuesBefore.field1).toBe('value-field1');
			expect(valuesBefore.field2).toBe('value-field2');
			expect(valuesBefore.field3).toBe('value-field3');

			// Remove field2 and field3 from inputs
			const updatedInputs: IFormInput[] = [
				{
					name: 'field1',
					properties: {
						type: 'text',
						label: 'Field 1',
					},
				},
			];

			await wrapper.setProps({
				inputs: updatedInputs,
			});

			await wrapper.vm.$nextTick();

			// Verify field2 and field3 values are removed, but field1 remains
			const valuesAfter = wrapper.vm.getValues();
			expect(valuesAfter.field1).toBe('value-field1');
			expect(valuesAfter.field2).toBeUndefined();
			expect(valuesAfter.field3).toBeUndefined();
		});

		it('should emit update:modelValue when dangling fields are removed', async () => {
			const initialInputs: IFormInput[] = [
				{
					name: 'field1',
					properties: {
						type: 'text',
						label: 'Field 1',
					},
					initialValue: 'value-field1',
				},
				{
					name: 'field2',
					properties: {
						type: 'text',
						label: 'Field 2',
					},
					initialValue: 'value-field2',
				},
			];

			const wrapper = mount(FormInputs, {
				props: {
					inputs: initialInputs,
				},
			});

			await wrapper.vm.$nextTick();

			// Get initial emitted events count
			const initialEmitCount = wrapper.emitted('update:modelValue')?.length ?? 0;

			// Remove field2 from inputs
			const updatedInputs: IFormInput[] = [
				{
					name: 'field1',
					properties: {
						type: 'text',
						label: 'Field 1',
					},
				},
			];

			await wrapper.setProps({
				inputs: updatedInputs,
			});

			await wrapper.vm.$nextTick();

			// Verify update:modelValue was emitted
			const emittedEvents = wrapper.emitted('update:modelValue');
			expect(emittedEvents).toBeDefined();
			expect(emittedEvents!.length).toBeGreaterThan(initialEmitCount);
			const lastEmit = emittedEvents![emittedEvents!.length - 1][0];
			expect(lastEmit).toEqual(
				expect.objectContaining({
					field1: 'value-field1',
				}),
			);
			expect(lastEmit).not.toHaveProperty('field2');
		});

		it('should not remove values when inputs are added', async () => {
			const initialInputs: IFormInput[] = [
				{
					name: 'field1',
					properties: {
						type: 'text',
						label: 'Field 1',
					},
					initialValue: 'value-field1',
				},
			];

			const wrapper = mount(FormInputs, {
				props: {
					inputs: initialInputs,
				},
			});

			await wrapper.vm.$nextTick();

			const valuesBefore = wrapper.vm.getValues();
			expect(valuesBefore.field1).toBe('value-field1');

			// Add field2 (without initialValue since it's only processed on mount)
			const updatedInputs: IFormInput[] = [
				...initialInputs,
				{
					name: 'field2',
					properties: {
						type: 'text',
						label: 'Field 2',
					},
				},
			];

			await wrapper.setProps({
				inputs: updatedInputs,
			});

			await wrapper.vm.$nextTick();

			// Verify field1 value is still present (not removed when field2 was added)
			const valuesAfter = wrapper.vm.getValues();
			expect(valuesAfter.field1).toBe('value-field1');
		});

		it('should handle empty inputs list correctly', async () => {
			const initialInputs: IFormInput[] = [
				{
					name: 'field1',
					properties: {
						type: 'text',
						label: 'Field 1',
					},
				},
			];

			const wrapper = mount(FormInputs, {
				props: {
					inputs: initialInputs.map((input) => ({
						...input,
						initialValue: `value-${input.name}`,
					})),
				},
			});

			await wrapper.vm.$nextTick();

			// Set inputs to empty array
			await wrapper.setProps({
				inputs: [],
			});

			await wrapper.vm.$nextTick();

			// Verify all values are removed
			const valuesAfter = wrapper.vm.getValues();
			expect(valuesAfter.field1).toBeUndefined();
			expect(Object.keys(valuesAfter)).toHaveLength(0);
		});
	});

	describe('getValuesWithMetadata exposed method', () => {
		it('should return values with metadata for all filtered inputs', async () => {
			const inputs: IFormInput[] = [
				{
					name: 'field1',
					metadata: { category: 'user', priority: 'high' },
					properties: {
						type: 'text',
						label: 'Field 1',
					},
					initialValue: 'value1',
				},
				{
					name: 'field2',
					metadata: { category: 'system', priority: 'low' },
					properties: {
						type: 'text',
						label: 'Field 2',
					},
					initialValue: 'value2',
				},
				{
					name: 'field3',
					properties: {
						type: 'text',
						label: 'Field 3',
					},
					initialValue: 'value3',
				},
			];

			const wrapper = mount(FormInputs, {
				props: {
					inputs,
				},
			});

			await wrapper.vm.$nextTick();

			const result = wrapper.vm.getValuesWithMetadata();

			expect(result).toEqual({
				field1: {
					value: 'value1',
					metadata: { category: 'user', priority: 'high' },
				},
				field2: {
					value: 'value2',
					metadata: { category: 'system', priority: 'low' },
				},
				field3: {
					value: 'value3',
					metadata: undefined,
				},
			});
		});

		it('should return empty metadata for inputs without metadata', async () => {
			const inputs: IFormInput[] = [
				{
					name: 'field1',
					properties: {
						type: 'text',
						label: 'Field 1',
					},
					initialValue: 'value1',
				},
			];

			const wrapper = mount(FormInputs, {
				props: {
					inputs,
				},
			});

			await wrapper.vm.$nextTick();

			const result = wrapper.vm.getValuesWithMetadata();

			expect(result.field1.metadata).toBeUndefined();
			expect(result.field1.value).toBe('value1');
		});

		it('should only return values for filtered inputs (respecting shouldDisplay)', async () => {
			// Set up inputs with control fields first, then conditional fields
			const inputs: IFormInput[] = [
				{
					name: 'showField1',
					properties: {
						type: 'checkbox',
						label: 'Show Field 1',
					},
					initialValue: true,
				},
				{
					name: 'showField2',
					properties: {
						type: 'checkbox',
						label: 'Show Field 2',
					},
					initialValue: false,
				},
				{
					name: 'field1',
					metadata: { visible: true },
					properties: {
						type: 'text',
						label: 'Field 1',
					},
					initialValue: 'value1',
					shouldDisplay: (values) => values.showField1 === true,
				},
				{
					name: 'field2',
					metadata: { visible: true },
					properties: {
						type: 'text',
						label: 'Field 2',
					},
					initialValue: 'value2',
					shouldDisplay: (values) => values.showField2 === true,
				},
				{
					name: 'field3',
					metadata: { visible: true },
					properties: {
						type: 'text',
						label: 'Field 3',
					},
					initialValue: 'value3',
				},
			];

			const wrapper = mount(FormInputs, {
				props: {
					inputs,
				},
			});

			await wrapper.vm.$nextTick();

			const result = wrapper.vm.getValuesWithMetadata();

			// Only field1 and field3 should be in the result (field2 is filtered out because showField2 is false)
			expect(result.field1).toBeDefined();
			expect(result.field1.value).toBe('value1');
			expect(result.field2).toBeUndefined();
			expect(result.field3).toBeDefined();
			expect(result.field3.value).toBe('value3');
		});

		it('should return updated values when model values change', async () => {
			const inputs: IFormInput[] = [
				{
					name: 'field1',
					metadata: { category: 'user' },
					properties: {
						type: 'text',
						label: 'Field 1',
					},
					initialValue: 'initial',
				},
			];

			const wrapper = mount(FormInputs, {
				props: {
					inputs,
				},
			});

			await wrapper.vm.$nextTick();

			// Get initial result
			const initialResult = wrapper.vm.getValuesWithMetadata();
			expect(initialResult.field1.value).toBe('initial');

			// Update the value through the form input
			const input = wrapper.find('input');
			await input.setValue('updated');

			await wrapper.vm.$nextTick();

			// Get updated result
			const updatedResult = wrapper.vm.getValuesWithMetadata();
			expect(updatedResult.field1.value).toBe('updated');
			expect(updatedResult.field1.metadata).toEqual({ category: 'user' });
		});

		it('should handle typed metadata correctly', async () => {
			interface CustomMetadata extends Record<string, unknown> {
				userId: number;
				role: string;
			}

			const inputs: Array<IFormInput<CustomMetadata>> = [
				{
					name: 'field1',
					metadata: { userId: 123, role: 'admin' },
					properties: {
						type: 'text',
						label: 'Field 1',
					},
					initialValue: 'value1',
				},
			];

			const wrapper = mount(FormInputs, {
				props: {
					inputs,
				},
			});

			await wrapper.vm.$nextTick();

			const result = wrapper.vm.getValuesWithMetadata<CustomMetadata>();

			expect(result.field1.metadata).toEqual({ userId: 123, role: 'admin' });
			expect(result.field1.metadata?.userId).toBe(123);
			expect(result.field1.metadata?.role).toBe('admin');
		});
	});
});
