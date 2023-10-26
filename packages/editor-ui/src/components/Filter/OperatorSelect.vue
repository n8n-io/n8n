<script setup lang="ts">
import { useI18n } from '@/composables';
import { OPERATOR_GROUPS } from './constants';
import { reactive, computed } from 'vue';

interface Props {
	selected: string;
}

const props = defineProps<Props>();

const state = reactive({ selected: props.selected });
const emit = defineEmits<{
	(event: 'operatorChange', value: string): void;
}>();

const i18n = useI18n();

const groups = OPERATOR_GROUPS;

const onOperatorChange = (operator: string): void => {
	state.selected = operator;
	emit('operatorChange', operator);
};

const selectedGroupIcon = computed(
	() => groups.find((group) => group.id === state.selected.split(':')[0])?.icon,
);
</script>

<template>
	<div data-test-id="operator-select">
		<n8n-select size="small" :modelValue="state.selected" @update:modelValue="onOperatorChange">
			<template v-if="selectedGroupIcon" #prefix>
				<n8n-icon :class="$style.selectedGroupIcon" :icon="selectedGroupIcon" />
			</template>
			<div :class="$style.groups">
				<div :key="group.name" v-for="group of groups">
					<div v-if="group.children.length > 0" :class="$style.groupTitle">
						<n8n-icon v-if="group.icon" :icon="group.icon" />
						<span>{{ i18n.baseText(group.name) }}</span>
					</div>
					<n8n-option
						v-for="operator in group.children"
						:key="operator.id"
						:value="operator.id"
						:label="i18n.baseText(operator.name)"
					/>
				</div>
			</div>
		</n8n-select>
	</div>
</template>

<style lang="scss" module>
.selectedGroupIcon {
	color: var(--color-text-light);
}

.groups {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.groupTitle {
	display: flex;
	gap: var(--spacing-4xs);
	align-items: baseline;
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
	padding: var(--spacing-2xs) var(--spacing-xs);
}
</style>
