<script setup lang="ts">
import {
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxItemIndicator,
	ComboboxLabel,
	ComboboxRoot,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxViewport,
} from 'reka-ui';
import N8nIcon from '../N8nIcon';

const options = [
	{
		name: 'Fruit',
		children: [
			{ name: 'Apple' },
			{ name: 'Banana' },
			{ name: 'Orange' },
			{ name: 'Honeydew' },
			{ name: 'Grapes' },
			{ name: 'Watermelon' },
			{ name: 'Cantaloupe' },
			{ name: 'Pear' },
		],
	},
	{
		name: 'Vegetable',
		children: [
			{ name: 'Cabbage' },
			{ name: 'Broccoli' },
			{ name: 'Carrots' },
			{ name: 'Lettuce' },
			{ name: 'Spinach' },
			{ name: 'Bok Choy' },
			{ name: 'Cauliflower' },
			{ name: 'Potatoes' },
		],
	},
];
</script>

<template>
	<ComboboxRoot class="ComboboxRoot" :open="true">
		<ComboboxAnchor class="ComboboxAnchor">
			<ComboboxInput class="ComboboxInput" placeholder="Placeholder..." />
		</ComboboxAnchor>
		<ComboboxContent class="ComboboxContent" defaultOpen>
			<ComboboxViewport class="ComboboxViewport">
				<ComboboxEmpty class="ComboboxEmpty" />
				<template v-for="(group, index) in options" :key="group.name">
					<ComboboxGroup v-if="group.children.length">
						<ComboboxSeparator v-if="index !== 0" class="ComboboxSeparator" />

						<ComboboxLabel class="ComboboxLabel">
							{{ group.name }}
						</ComboboxLabel>

						<ComboboxItem
							v-for="option in group.children"
							:key="option.name"
							:value="option.name"
							class="ComboboxItem"
						>
							<ComboboxItemIndicator class="ComboboxItemIndicator">
								<Icon icon="radix-icons:check" />
							</ComboboxItemIndicator>
							<span>
								{{ option.name }}
							</span>
						</ComboboxItem>
					</ComboboxGroup>
				</template>
			</ComboboxViewport>
		</ComboboxContent>
	</ComboboxRoot>
</template>

<style lang="scss" scoped>
/* reset */
/* button,
input {
	all: unset;
}

.ComboboxRoot {
	position: relative;
	max-width: 300px;
}

.ComboboxAnchor {
	display: inline-flex;
	align-items: center;
	justify-content: between;
	font-size: 13px;
	line-height: 1;
	height: 35px;
	padding: 0 15px;
	gap: 5px;
	background-color: white;
	color: var(--grass-11);
	border-radius: 4px;
	box-shadow: 0 2px 10px var(--black-a7);
}
.ComboboxAnchor:hover {
	background-color: var(--mauve-3);
}

.ComboboxInput {
	height: 100%;
	background-color: transparent;
	color: var(--grass-11);
}
.ComboboxInput[data-placeholder] {
	color: var(--grass-9);
}

.ComboboxIcon {
	width: 16px;
	height: 16px;
	color: var(--grass-11);
}

.ComboboxContent {
	z-index: 10;
	width: 100%;
	position: absolute;
	overflow: hidden;
	background-color: white;
	border-radius: 6px;
	margin-top: 8px;
	box-shadow:
		0 10px 38px -10px rgba(22, 23, 24, 0.35),
		0 10px 20px -15px rgba(22, 23, 24, 0.2);
}

.ComboboxViewport {
	padding: 5px;
}

.ComboboxEmpty {
	padding-top: 0.5rem;
	padding-bottom: 0.5rem;
	text-align: center;
	font-size: 0.75rem;
	line-height: 1rem;
	font-weight: 500;
	color: var(--mauve-11);
}

.ComboboxItem {
	font-size: 13px;
	line-height: 1;
	color: var(--grass-11);
	border-radius: 3px;
	display: flex;
	align-items: center;
	height: 25px;
	padding: 0 35px 0 25px;
	position: relative;
	user-combobox: none;
}
.ComboboxItem[data-disabled] {
	color: var(--mauve-8);
	pointer-events: none;
}
.ComboboxItem[data-highlighted] {
	outline: none;
	background-color: var(--grass-9);
	color: var(--grass-1);
}

.ComboboxLabel {
	padding: 0 25px;
	font-size: 12px;
	line-height: 25px;
	color: var(--mauve-11);
}

.ComboboxSeparator {
	height: 1px;
	background-color: var(--grass-6);
	margin: 5px;
}

.ComboboxItemIndicator {
	position: absolute;
	left: 0;
	width: 25px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
} */
</style>
