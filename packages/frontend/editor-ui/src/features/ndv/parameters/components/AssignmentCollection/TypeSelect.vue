<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { ASSIGNMENT_TYPES } from './constants';
import { computed, useCssModule } from 'vue';
import { Primitive } from 'reka-ui';

import { N8nIcon } from '@n8n/design-system';
import {
	N8nDropdownMenu,
	type DropdownMenuItemProps,
} from '@n8n/design-system/v2/components/DropdownMenu';

interface Props {
	modelValue: string;
	isReadOnly?: boolean;
	stacked?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	stacked: false,
});

const emit = defineEmits<{
	'update:model-value': [type: string];
}>();

const i18n = useI18n();
const $style = useCssModule();

const types = ASSIGNMENT_TYPES;

const selectedType = computed(() => types.find((type) => type.type === props.modelValue));

const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() => {
	return types.map((type) => ({
		id: type.type,
		label: i18n.baseText(`type.${type.type}` as BaseTextKey),
		icon: { type: 'icon' as const, value: type.icon },
		checked: type.type === props.modelValue,
		class: type.type === props.modelValue ? $style.selected : '',
	}));
});

const onSelect = (type: string): void => {
	emit('update:model-value', type);
};
</script>

<template>
	<div
		:class="{ [$style.wrapper]: true, [$style.stacked]: stacked }"
		data-test-id="assignment-type-select"
	>
		<N8nDropdownMenu
			:items="menuItems"
			:disabled="isReadOnly"
			placement="bottom-start"
			:extra-popper-class="$style.dropdownContent"
			@select="onSelect"
		>
			<template #trigger>
				<Primitive as="button" type="button" :class="$style.trigger" :disabled="isReadOnly">
					<N8nIcon
						v-if="selectedType?.icon"
						:icon="selectedType.icon"
						color="text-light"
						size="small"
					/>
					<span :class="$style.label">{{
						i18n.baseText(`type.${modelValue}` as BaseTextKey)
					}}</span>
					<N8nIcon icon="chevron-down" color="text-light" size="small" />
				</Primitive>
			</template>
		</N8nDropdownMenu>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	--parameter-input-options--height: 22px;
	width: 100%;
	height: 100%;
	padding-top: var(--parameter-input-options--height);

	&.stacked {
		padding-top: 0;
	}
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	height: 100%;
	min-height: 30px;
	padding: 0 var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--input--border-color, var(--border-color));
	border-top-left-radius: var(--input--radius--top-left, var(--input--radius, 0));
	border-bottom-left-radius: var(--input--radius--bottom-left, var(--input--radius, 0));
	border-top-right-radius: var(--input-triple--radius--top-right, var(--input--radius, 0));
	border-bottom-right-radius: var(--input-triple--radius--bottom-right, var(--input--radius, 0));
	background-color: var(--color--background--light-2);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;

	&:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.label {
	flex: 1;
	text-align: left;
	font-weight: var(--font-weight--regular);
}

.selected span {
	color: var(--color--primary);
	font-weight: var(--font-weight--bold);
}

.dropdownContent {
	z-index: var(--ndv--z);
}
</style>
