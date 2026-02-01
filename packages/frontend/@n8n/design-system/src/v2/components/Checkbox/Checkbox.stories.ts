/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import Checkbox from './Checkbox.vue';

const meta = {
	title: 'Components v2/Checkbox',
	component: Checkbox,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	render: (args) => ({
		components: { Checkbox },
		setup() {
			const value = ref(args.modelValue);

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
				args,
				value,
				checkAll,
				isIndeterminate,
				checkedCities,
				cities,
				toggleCitySelection,
				toggleCheckAll,
			};
		},
		template: `
		<div style="padding: 40px;">
			<template v-for="isDisabled in [false, true]" :key="isDisabled">
				<h2 :style="{ margin: '20px 0' }">Disabled: {{ isDisabled }}</h2>
				<Checkbox v-model="value" :disabled="isDisabled"/>
				<Checkbox :model-value="true" label="Checked" :disabled="isDisabled"/>
				<Checkbox :model-value="false" label="Unchecked" :disabled="isDisabled"/>
				<Checkbox indeterminate  label="Indeterminate" :disabled="isDisabled"/>
				<form>
					<Checkbox name="test" v-model="value"  label="Form control" :disabled="isDisabled"/>
				</form>
			</template>

			<h2 :style="{ margin: '20px 0' }">Indeterminate value</h2>
			<Checkbox :indeterminate="isIndeterminate" v-model="checkAll" label="Check all" @update:model-value="toggleCheckAll"/>
			<div>
			<template v-for="city in cities" :key="city">
				<Checkbox :label="city" :model-value="checkedCities.includes(city)" @update:model-value="toggleCitySelection(city)">
					{{ checkedCities.includes(city) }} | {{ city }}
				</Checkbox>
			</template>
			</div>
		</div>
		`,
	}),
	args: {
		modelValue: false,
	},
} satisfies Story;
