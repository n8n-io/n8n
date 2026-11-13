<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
	type DropdownMenuItemProps,
	type IconName,
} from '@n8n/design-system';
import AgentChipButton from './AgentChipButton.vue';

const props = withDefaults(
	defineProps<{
		label: string;
		description?: string;
		addLabel: string;
		emptyText?: string;
		items: Array<DropdownMenuItemProps<string>>;
		showItems?: boolean;
		pills: Array<{
			value: string;
			label: string;
			icon?: IconName;
			invalid?: boolean;
			editable?: boolean;
		}>;
		disabled?: boolean;
		embedded?: boolean;
		testId?: string;
	}>(),
	{ testId: 'agent-pill-field', showItems: true },
);
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{
	select: [value: string];
	remove: [value: string];
	edit: [value: string];
}>();
const i18n = useI18n();
function select(value: unknown) {
	if (props.disabled || typeof value !== 'string') return;
	emit('select', value);
	open.value = false;
}
watch(
	() => props.disabled || !props.showItems,
	(inactive) => {
		if (inactive) open.value = false;
	},
);
</script>

<template>
	<div
		:class="[$style.field, { [$style.embedded]: embedded }]"
		role="group"
		:aria-label="label"
		:data-testid="testId"
	>
		<div v-if="$slots.header" :class="$style.fullRow"><slot name="header" /></div>
		<template v-if="showItems">
			<div :class="$style.labelInfo">
				<N8nText bold size="medium" :class="$style.label">{{ label }}</N8nText>
				<N8nText v-if="description" size="small" :class="$style.description">{{
					description
				}}</N8nText>
			</div>
			<div :class="$style.pills">
				<AgentChipButton
					v-if="!pills.length && emptyText"
					:clickable="false"
					:deactivated="disabled"
					:class="$style.pill"
					:data-testid="`${testId}-placeholder`"
					>{{ emptyText }}</AgentChipButton
				>
				<AgentChipButton
					v-for="pill in pills"
					:key="pill.value"
					:clickable="false"
					:deactivated="disabled"
					:invalid="pill.invalid"
					:icon="pill.icon"
					:class="[$style.pill, $style.removablePill]"
					:title="pill.label"
					:data-testid="`${testId}-pill`"
				>
					<template v-if="$slots['pill-icon']" #icon
						><slot name="pill-icon" :item="pill"
					/></template>
					<span :class="$style.pillContent">
						<button
							v-if="pill.editable"
							type="button"
							:class="$style.pillName"
							:disabled="disabled"
							@click="!disabled && emit('edit', pill.value)"
						>
							{{ pill.label }}
						</button>
						<span v-else :class="$style.pillName">{{ pill.label }}</span>
						<N8nIconButton
							icon="x"
							variant="ghost"
							size="small"
							:disabled="disabled"
							:aria-label="
								i18n.baseText('agents.pillField.remove', { interpolate: { name: pill.label } })
							"
							:data-testid="`${testId}-remove`"
							@click="!disabled && emit('remove', pill.value)"
						/>
					</span>
				</AgentChipButton>
			</div>
			<N8nDropdownMenu
				v-model="open"
				:items="items"
				:disabled="disabled || !items.length"
				:teleported="false"
				:modal="false"
				placement="bottom-end"
				width="var(--spacing--5xl)"
				@select="select"
			>
				<template #trigger>
					<N8nTooltip
						as-child
						:disabled="open || disabled || !items.length"
						:content-class="$style.addTooltip"
						:disable-hoverable-content="true"
						:content="addLabel"
						:teleported="true"
					>
						<N8nButton
							variant="ghost"
							size="small"
							icon-only
							:disabled="disabled || !items.length"
							:aria-label="addLabel"
							:data-testid="`${testId}-add`"
						>
							<template #icon><N8nIcon icon="plus" :size="16" /></template>
						</N8nButton>
					</N8nTooltip>
				</template>
				<template v-if="$slots['item-leading']" #item-leading="slotProps"
					><slot name="item-leading" v-bind="slotProps"
				/></template>
			</N8nDropdownMenu>
		</template>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';
.field {
	width: 100%;
	display: grid;
	grid-template-columns: fit-content(30%) minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
}
.embedded {
	border: 0;
	border-radius: 0;
	padding: 0;
}
.labelInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	overflow-wrap: anywhere;
}
.description {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
}
.label {
	font-size: var(--font-size--sm);
	overflow-wrap: anywhere;
}
.pills {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	min-height: var(--height--md);
	min-width: 0;
}
.pill {
	max-width: 100%;
}
.removablePill {
	padding-inline-end: var(--spacing--4xs);
}
.pillContent {
	pointer-events: auto;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 100%;
}
.pillName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	border: 0;
	padding: 0;
	background: transparent;
	color: inherit;
	font: inherit;
}
button.pillName {
	@include focus.focus-visible-ring;
	cursor: pointer;
}
// The floating wrapper must also let clicks reach nearby controls.
:global([data-reka-popper-content-wrapper]):has(.addTooltip) {
	pointer-events: none;
}

.addTooltip {
	pointer-events: none;
}
.fullRow {
	grid-column: 1 / -1;
}
</style>
