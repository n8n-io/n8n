<script setup lang="ts">
import {
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxItemIndicator,
	ComboboxRoot,
	ComboboxViewport,
} from 'reka-ui';
import N8nIcon from '../N8nIcon';
import { ref } from 'vue';

defineProps<{
	items: Array<{ label: string; id: number; value: string }>;
}>();

const open = ref(true);
</script>

<template>
	<ComboboxRoot
		class="ComboboxRoot"
		v-bind="items"
		multiple
		:open="open"
		@update:open="() => {}"
		@highlight="(e) => console.log(e)"
		@update:modelValue="(e) => console.log(e)"
	>
		<ComboboxAnchor class="ComboboxAnchor">
			<ComboboxInput class="ComboboxInput" placeholder="Placeholder..." />
		</ComboboxAnchor>
		<ComboboxContent class="ComboboxContent">
			<ComboboxViewport class="ComboboxViewport">
				<ComboboxEmpty class="ComboboxEmpty" />
				<template v-for="item in items" :key="item.id">
					<ComboboxItem :value="item.value" class="ComboboxItem">
						<ComboboxItemIndicator class="ComboboxItemIndicator">
							<N8nIcon icon="check" />
						</ComboboxItemIndicator>
						<span>
							{{ item.label }}
						</span>
					</ComboboxItem>
				</template>
			</ComboboxViewport>
		</ComboboxContent>
	</ComboboxRoot>
</template>

<style lang="scss" scoped>
/* reset */
button,
input {
	all: unset;
}

:deep(.ComboboxRoot) {
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
	color: black;
	border-radius: 4px;
}
.ComboboxAnchor:hover {
}

.ComboboxInput {
	height: 100%;
	background-color: transparent;
}
.ComboboxInput[data-placeholder] {
	color: var(--grass-9);
}

.ComboboxIcon {
	width: 16px;
	height: 16px;
}

.ComboboxContent {
	z-index: 10;
	width: 100%;
	max-width: 300px;
	position: absolute;
	overflow: hidden;
	background-color: white;
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
}
.ComboboxItem[data-disabled] {
	pointer-events: none;
}
.ComboboxItem[data-highlighted] {
	outline: none;
	background-color: turquoise;
}

.ComboboxLabel {
	padding: 0 25px;
	font-size: 12px;
	line-height: 25px;
	color: var(--mauve-11);
}

.ComboboxSeparator {
	height: 1px;

	margin: 5px;
}

.ComboboxItemIndicator {
	position: absolute;
	left: 0;
	width: 25px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background-color: turquoise;
}
</style>
