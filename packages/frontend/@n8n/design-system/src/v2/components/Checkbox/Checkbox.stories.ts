/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import Checkbox from './Checkbox.vue';

const meta = {
	title: 'Core/Checkbox',
	component: Checkbox,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		modelValue: { control: 'boolean' },
		disabled: { control: 'boolean' },
		indeterminate: { control: 'boolean' },
		label: { control: 'text' },
	},
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	render: (args) => ({
		components: { Checkbox },
		setup() {
			return { args };
		},
		template: `
			<Checkbox
				:model-value="args.modelValue"
				:label="args.label"
				:disabled="args.disabled"
				:indeterminate="args.indeterminate"
				@update:model-value="args.modelValue = $event"
			/>
		`,
	}),
	args: {
		modelValue: false,
		label: 'Label',
		disabled: false,
		indeterminate: false,
	},
} satisfies Story;

export const States = {
	render: () => ({
		components: { Checkbox },
		template: `
		<div style="display: flex; flex-direction: column; gap: 16px;">
			<Checkbox :model-value="false" label="Unchecked"/>
			<Checkbox :model-value="true" label="Checked"/>
			<Checkbox indeterminate label="Indeterminate"/>
			<Checkbox :model-value="false" label="Disabled unchecked" disabled/>
			<Checkbox :model-value="true" label="Disabled checked" disabled/>
			<Checkbox indeterminate label="Disabled indeterminate" disabled/>
		</div>
		`,
	}),
} satisfies Story;

export const IndeterminateGroup = {
	render: () => ({
		components: { Checkbox },
		setup() {
			const checkAll = ref(false);
			const isIndeterminate = ref(true);
			const checkedCities = ref(['Shanghai', 'Beijing']);
			const cities = ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen'];

			function toggleCheckAll(value: boolean) {
				checkedCities.value = value ? [...cities] : [];
				isIndeterminate.value = false;
			}

			function toggleCitySelection(city: string) {
				const index = checkedCities.value.indexOf(city);
				if (index > -1) {
					checkedCities.value.splice(index, 1);
				} else {
					checkedCities.value.push(city);
				}

				const checkedCount = checkedCities.value.length;
				checkAll.value = checkedCount === cities.length;
				isIndeterminate.value = checkedCount > 0 && checkedCount < cities.length;
			}

			return {
				checkAll,
				isIndeterminate,
				checkedCities,
				cities,
				toggleCitySelection,
				toggleCheckAll,
			};
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: 8px;">
			<Checkbox
				:indeterminate="isIndeterminate"
				v-model="checkAll"
				label="Check all"
				@update:model-value="toggleCheckAll"
			/>
			<Checkbox
				v-for="city in cities"
				:key="city"
				:label="city"
				:model-value="checkedCities.includes(city)"
				@update:model-value="toggleCitySelection(city)"
			/>
		</div>
		`,
	}),
} satisfies Story;

export const WithCustomLabel = {
	render: () => ({
		components: { Checkbox },
		setup() {
			const value = ref(false);
			return { value };
		},
		template: `
			<Checkbox v-model="value">
				<template #label>
					I accept the <a href="#" style="color: var(--color--primary);">terms and conditions</a>
				</template>
			</Checkbox>
		`,
	}),
} satisfies Story;
