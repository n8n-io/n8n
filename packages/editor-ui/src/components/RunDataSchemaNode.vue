<script setup lang="ts">
import { useDataSchema } from '@/composables/useDataSchema';
import { useDebounce } from '@/composables/useDebounce';
import { useI18n } from '@/composables/useI18n';
import type { Schema } from '@/Interface';
import { snakeCase } from 'lodash-es';
import { computed, ref } from 'vue';

type Props = {
	title: string;
	schema: Schema | null;
	baseExpression?: string;
	subtitle?: string;
	itemsCount?: number | null;
	search?: string;
	context?: 'ndv' | 'modal';
	open?: boolean;
	disabled?: boolean;
	isTrigger?: boolean;
	mappingEnabled?: boolean;
	disableScrollInView?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	context: 'ndv',
	open: undefined,
	disabled: false,
	isTrigger: false,
	mappingEnabled: false,
	disableScrollInView: false,
	baseExpression: '',
});

const emit = defineEmits<{
	toggleOpen: [exclusive?: boolean];
	dragStart: [el: HTMLElement];
	dragEnd: [el: HTMLElement];
}>();

const i18n = useI18n();
const { debounce } = useDebounce();
const { isSchemaEmpty } = useDataSchema();

const draggingPath = ref('');
const localOpen = ref(false);

const isOpen = computed(() => props.open ?? localOpen.value);

function toggleOpen(exclusive = false) {
	console.log(localOpen.value, isOpen.value, props.open);
	localOpen.value = !localOpen.value;
	emit('toggleOpen', exclusive);
}

function onDragStart(el: HTMLElement) {
	draggingPath.value = el.dataset.value as string;
	emit('dragStart', el);
}

function onDragEnd(el: HTMLElement) {
	draggingPath.value = '';
	emit('dragEnd', el);
}

const onTransitionStart = debounce(
	(event: TransitionEvent) => {
		if (isOpen.value && event.target instanceof HTMLElement && !props.disableScrollInView) {
			event.target.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'nearest',
			});
		}
	},
	{ debounceTime: 100, trailing: true },
);

defineSlots<{ icon?(): never }>();
</script>

<template>
	<div data-test-id="run-data-schema-node" :class="[$style.node, { [$style.open]: isOpen }]">
		<div
			:class="[
				$style.header,
				{
					[$style.trigger]: isTrigger,
				},
			]"
			data-test-id="run-data-schema-node-header"
		>
			<div :class="$style.expand" @click="toggleOpen()">
				<font-awesome-icon icon="angle-right" :class="$style.expandIcon" />
			</div>

			<div
				:class="$style.titleContainer"
				data-test-id="run-data-schema-node-name"
				@click="toggleOpen(true)"
			>
				<div v-if="$slots.icon" :class="$style.nodeIcon">
					<slot name="icon" />
				</div>

				<div :class="$style.title">
					{{ title }}
					<span v-if="subtitle" :class="$style.subtitle">{{ subtitle }}</span>
				</div>
				<font-awesome-icon v-if="isTrigger" :class="$style.triggerIcon" icon="bolt" size="xs" />
			</div>

			<Transition name="items">
				<div
					v-if="itemsCount && isOpen"
					:class="$style.items"
					data-test-id="run-data-schema-node-item-count"
				>
					{{
						i18n.baseText('ndv.output.items', {
							interpolate: { count: itemsCount },
						})
					}}
				</div>
			</Transition>
		</div>

		<Draggable
			type="mapping"
			target-data-key="mappable"
			:disabled="!mappingEnabled"
			@dragstart="onDragStart"
			@dragend="onDragEnd"
		>
			<template #preview="{ canDrop, el }">
				<MappingPill v-if="el" :html="el.outerHTML" :can-drop="canDrop" />
			</template>

			<Transition name="schema">
				<div
					v-if="schema || search"
					:class="[$style.schema, $style.animated]"
					data-test-id="run-data-schema-node-schema"
					@transitionstart="onTransitionStart"
				>
					<div :class="$style.innerSchema" @transitionstart.stop>
						<div v-if="disabled" :class="$style.notice" data-test-id="run-data-schema-disabled">
							{{ i18n.baseText('dataMapping.schemaView.disabled') }}
						</div>

						<div
							v-else-if="isSchemaEmpty(schema)"
							:class="$style.notice"
							data-test-id="run-data-schema-empty"
						>
							{{ i18n.baseText('dataMapping.schemaView.emptyData') }}
						</div>

						<RunDataSchemaItem
							v-else-if="schema"
							:schema="schema"
							:level="0"
							:parent="null"
							:sub-key="`${context}_${snakeCase(title)}`"
							:mapping-enabled="mappingEnabled"
							:dragging-path="draggingPath"
							:base-expression="baseExpression"
							:search="search"
						/>
					</div>
				</div>
			</Transition>
		</Draggable>
	</div>
</template>
<style lang="scss" module>
@import '@/styles/variables';

.node {
	.schema {
		padding-left: var(--title-spacing-left);
		scroll-margin-top: var(--header-height);
	}

	.notice {
		padding-left: var(--spacing-l);
	}
}

.schema {
	display: grid;
	grid-template-rows: 1fr;

	&.animated {
		grid-template-rows: 0fr;
		transform: translateX(-8px);
		opacity: 0;

		transition:
			grid-template-rows 0.2s $ease-out-expo,
			opacity 0.2s $ease-out-expo 0s,
			transform 0.2s $ease-out-expo 0s;
	}
}

.notice {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
}

.innerSchema {
	min-height: 0;
	min-width: 0;

	> div {
		margin-bottom: var(--spacing-xs);
	}
}

.titleContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	flex-basis: 100%;
	cursor: pointer;
}

.subtitle {
	margin-left: auto;
	padding-left: var(--spacing-2xs);
	color: var(--color-text-light);
	font-weight: var(--font-weight-regular);
}

.header {
	display: flex;
	align-items: center;
	position: sticky;
	top: 0;
	z-index: 1;
	padding-bottom: var(--spacing-2xs);
	background: var(--color-run-data-background);
}

.expand {
	--expand-toggle-size: 30px;
	width: var(--expand-toggle-size);
	height: var(--expand-toggle-size);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;

	&:hover,
	&:active {
		color: var(--color-text-dark);
	}
}

.expandIcon {
	transition: transform 0.2s $ease-out-expo;
}

.open {
	.expandIcon {
		transform: rotate(90deg);
	}

	.schema {
		transition:
			grid-template-rows 0.2s $ease-out-expo,
			opacity 0.2s $ease-out-expo,
			transform 0.2s $ease-out-expo;
		grid-template-rows: 1fr;
		opacity: 1;
		transform: translateX(0);
	}
}

.nodeIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-xlight);
}

.noMatch {
	display: flex;
	flex-grow: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-xl) var(--spacing-s);
	text-align: center;

	> * {
		max-width: 316px;
		margin-bottom: var(--spacing-2xs);
	}
}

.title {
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
}

.items {
	flex-shrink: 0;
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-left: var(--spacing-2xs);

	transition:
		opacity 0.2s $ease-out-expo,
		transform 0.2s $ease-out-expo;
}

.triggerIcon {
	margin-left: var(--spacing-2xs);
	color: var(--color-primary);
}

.trigger {
	.nodeIcon {
		border-radius: 16px 4px 4px 16px;
	}
}

@container schema (max-width: 24em) {
	.depth {
		display: none;
	}
}
</style>

<style lang="scss" scoped>
@import '@/styles/variables';

.items-enter-from,
.items-leave-to {
	transform: translateX(-4px);
	opacity: 0;
}

.items-enter-to,
.items-leave-from {
	transform: translateX(0);
	opacity: 1;
}

.schema-enter-from,
.schema-leave-to {
	grid-template-rows: 0fr;
	transform: translateX(-8px);
	opacity: 0;
}

.schema-enter-to,
.schema-leave-from {
	transform: translateX(0);
	grid-template-rows: 1fr;
	opacity: 1;
}
</style>
