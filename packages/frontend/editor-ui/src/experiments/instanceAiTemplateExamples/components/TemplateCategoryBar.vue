<!-- Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment -->
<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import type { ITemplatesCategory } from '@n8n/rest-api-client/api/templates';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { CATEGORY_BAR_REVEAL_DELAY_MS } from '../constants';

const HIDDEN_CATEGORIES = new Set(['Other']);
const LAST_CATEGORIES = new Set(['Personal Productivity']);

const i18n = useI18n();
const telemetry = useTelemetry();

const props = withDefaults(
	defineProps<{
		categories: ITemplatesCategory[];
		selectedCategoryId: string;
		compact?: boolean;
		extraCompact?: boolean;
	}>(),
	{ compact: false, extraCompact: false },
);

const sortedCategories = computed(() => {
	const main = props.categories.filter(
		(c) => !HIDDEN_CATEGORIES.has(c.name) && !LAST_CATEGORIES.has(c.name),
	);
	const last = props.categories.filter((c) => LAST_CATEGORIES.has(c.name));
	return [...main, ...last];
});

const emit = defineEmits<{
	select: [categoryId: string];
}>();

function selectCategory(categoryId: string, categoryName: string) {
	telemetry.track('AI Assistant template examples category clicked', {
		category_id: categoryId,
		category_name: categoryName,
	});
	emit('select', categoryId);
}

const scrollRef = ref<HTMLElement | null>(null);
const showLeftFade = ref(false);
const showRightFade = ref(false);
const revealed = ref(false);

function updateFades() {
	const el = scrollRef.value;
	if (!el) return;
	showLeftFade.value = el.scrollLeft > 0;
	showRightFade.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
}

onMounted(() => {
	updateFades();
	setTimeout(() => {
		revealed.value = true;
	}, CATEGORY_BAR_REVEAL_DELAY_MS);
});
</script>

<template>
	<div>
		<p
			:class="[
				$style.description,
				props.compact && $style.descriptionCompact,
				props.extraCompact && $style.descriptionExtraCompact,
			]"
		>
			{{ i18n.baseText('experiments.instanceAiTemplateExamples.description' as BaseTextKey) }}
		</p>

		<div :class="$style.wrapper">
			<div v-if="showLeftFade" :class="$style.fadeLeft" />
			<div ref="scrollRef" :class="$style.container" @scroll="updateFades">
				<button
					v-for="(category, index) in sortedCategories"
					:key="category.id"
					:class="[
						$style.pill,
						selectedCategoryId === String(category.id) && $style.active,
						revealed && $style.visible,
					]"
					:style="{ '--entrance-delay': `${index * 30}ms` }"
					@click="selectCategory(String(category.id), category.name)"
				>
					{{ category.name }}
				</button>
			</div>
			<div v-if="showRightFade" :class="$style.fadeRight" />
		</div>
	</div>
</template>

<style lang="scss" module>
.heading {
	margin-bottom: var(--spacing--2xs);
	margin-top: var(--spacing--md) !important;
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--medium);
	color: var(--color--neutral);
	text-align: center;
}
.description {
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	margin-bottom: var(--spacing--xs);
	margin-top: var(--spacing--xl) !important;
}

.descriptionCompact {
	margin-top: var(--spacing--xs) !important;
}

.descriptionExtraCompact {
	margin-top: 0 !important;
	margin-bottom: var(--spacing--3xs);
}
.wrapper {
	position: relative;
}

.container {
	display: flex;
	gap: var(--spacing--3xs);
	overflow-x: auto;
	scrollbar-width: none;
	-ms-overflow-style: none;
	padding: var(--spacing--3xs) 0;

	&::before,
	&::after {
		content: '';
		flex: 1;
	}

	&::-webkit-scrollbar {
		display: none;
	}
}

.fadeLeft,
.fadeRight {
	position: absolute;
	top: 0;
	bottom: 0;
	width: 60px;
	pointer-events: none;
	z-index: 1;
}

.fadeLeft {
	left: 0;
	background: linear-gradient(to right, var(--color--background--light-2), transparent);
}

.fadeRight {
	right: 0;
	background: linear-gradient(to left, var(--color--background--light-2), transparent);
}

.pill {
	user-select: none;
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-radius: var(--radius--xl);
	border: 1px solid var(--color--foreground);
	background: transparent;
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	cursor: pointer;
	white-space: nowrap;
	flex-shrink: 0;
	opacity: 0;
	transform: translateY(4px);
	transition:
		opacity 0.2s ease var(--entrance-delay, 0ms),
		transform 0.2s ease var(--entrance-delay, 0ms),
		background 0.15s ease 0ms,
		border-color 0.15s ease 0ms,
		color 0.15s ease 0ms;

	&:hover {
		background: var(--color--foreground--tint-1);
	}
}

.visible {
	opacity: 1;
	transform: translateY(0);
}

.active {
	border-color: var(--color--neutral-400);
}
</style>
