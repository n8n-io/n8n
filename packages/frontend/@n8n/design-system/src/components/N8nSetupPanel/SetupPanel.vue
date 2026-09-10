<script setup lang="ts">
import { VisuallyHidden } from 'reka-ui';
import { computed, nextTick, useId, useTemplateRef, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import type { SetupPanelProps } from './SetupPanel.types';

const props = defineProps<SetupPanelProps>();
const emit = defineEmits<{
	'update:activeItemId': [id: string | undefined];
}>();
const { t } = useI18n();
const activeItem = computed(() =>
	props.items.find((item) => item.id === props.activeItemId && !item.disabled),
);
const panel = useTemplateRef<HTMLElement>('panel');
const overlay = useTemplateRef<HTMLElement>('overlay');
const titleId = useId();
watch(
	() => activeItem.value?.id,
	async (id, previousId) => {
		await nextTick();
		if (id) overlay.value?.querySelector<HTMLButtonElement>('button')?.focus();
		else if (previousId) {
			Array.from(
				panel.value?.querySelectorAll<HTMLButtonElement>('button[data-setup-item-id]') ?? [],
			)
				.find((button) => button.dataset.setupItemId === previousId)
				?.focus();
		}
	},
);
</script>

<template>
	<section
		v-if="items.length"
		ref="panel"
		:class="$style.panel"
		:aria-label="t('setupPanel.label')"
	>
		<div
			v-if="activeItem"
			ref="overlay"
			:class="$style.overlay"
			role="dialog"
			:aria-labelledby="titleId"
			data-test-id="setup-panel-overlay"
			@keydown.esc.stop="emit('update:activeItemId', undefined)"
		>
			<header :class="$style.header">
				<N8nButton
					variant="ghost"
					size="small"
					:aria-label="t('setupPanel.back')"
					data-test-id="setup-panel-back"
					@click="emit('update:activeItemId', undefined)"
				>
					<N8nIcon icon="chevron-left" size="small" />
					<span :id="titleId" :class="$style.title">{{ activeItem.title }}</span>
				</N8nButton>
			</header>
			<div :class="$style.detail">
				<slot name="detail" :item="activeItem" />
			</div>
		</div>
		<ul
			:class="[$style.rows, { [$style.hidden]: activeItem }]"
			:inert="Boolean(activeItem)"
			:aria-hidden="activeItem ? true : undefined"
		>
			<li v-for="item in items" :key="item.id">
				<component
					:is="item.hasAction ? 'div' : 'button'"
					:role="item.hasAction ? 'group' : undefined"
					:aria-label="item.hasAction ? item.title : undefined"
					:type="item.hasAction ? undefined : 'button'"
					:class="[
						$style.row,
						{ [$style.actionRow]: item.hasAction, [$style.completedRow]: item.completed },
					]"
					:disabled="item.hasAction ? undefined : item.disabled"
					data-test-id="setup-panel-row"
					:data-setup-item-id="item.id"
					@click="!item.hasAction && emit('update:activeItemId', item.id)"
				>
					<span :class="[$style.icon, { [$style.complete]: item.completed }]">
						<N8nIcon v-if="item.completed" icon="circle-check" size="small" />
						<slot v-else name="icon" :item="item" />
					</span>
					<span :class="$style.title">{{ item.title }}</span>
					<slot v-if="item.hasAction" name="action" :item="item" />
					<span v-else-if="!item.completed && item.subtitle" :class="$style.subtitle">
						{{ item.subtitle }}
					</span>
					<VisuallyHidden v-if="item.completed" :aria-hidden="false">{{
						t('setupPanel.complete')
					}}</VisuallyHidden>
					<N8nIcon
						v-if="!item.hasAction"
						icon="chevron-right"
						size="small"
						:class="$style.chevron"
					/>
				</component>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.panel {
	position: relative;
	min-width: 0;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
}

.rows,
.overlay {
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
}

.overlay {
	--animation--popover-in--translate-y: var(--spacing--2xs);
	--animation--popover-in--scale: 0.95;

	position: absolute;
	inset: auto 0 0;
	z-index: 1;
	display: flex;
	flex-direction: column;
	max-height: 60vh;
	transform-origin: bottom center;
	@include motion.popover-in;
}

.header,
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
}

.header {
	border-bottom: var(--border);
	flex-shrink: 0;
}

.rows {
	list-style: none;
	margin: 0;
	padding: var(--spacing--2xs);
	max-height: 50vh;
	overflow-y: auto;
	transform-origin: bottom center;
	transition:
		transform var(--duration--snappy) var(--easing--ease-out),
		opacity var(--duration--snappy) var(--easing--ease-out);
	@include motion.reduced-motion;
}

.hidden {
	visibility: hidden;
	opacity: 0;
	transform: scale(0.92);
}

.row {
	width: 100%;
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: var(--text-color);
	font: inherit;
	text-align: left;
	cursor: pointer;
	min-height: var(--height--xl);

	&:hover:not(:disabled) {
		background: var(--background--hover);
	}

	&:disabled {
		cursor: default;
		color: var(--text-color--disabled);
	}
}

.actionRow {
	cursor: default;

	&:hover:not(:disabled) {
		background: none;
	}
}

.title {
	flex: 1;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.completedRow .title {
	color: var(--text-color--subtler);
}

.subtitle {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtler);
}

.icon {
	display: inline-flex;
	flex-shrink: 0;
}

.complete {
	color: var(--icon-color--success);
}

.chevron {
	flex-shrink: 0;
	color: var(--icon-color);
}

.detail {
	min-height: 0;
	padding: var(--spacing--sm);
	overflow-y: auto;
}
</style>
