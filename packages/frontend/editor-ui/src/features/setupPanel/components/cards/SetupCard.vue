<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';

const props = withDefaults(
	defineProps<{
		isComplete: boolean;
		cardTestId: string;
		title: string;
		showFooter?: boolean;
		showCallout?: boolean;
		telemetryPayload?: Record<string, unknown>;
	}>(),
	{
		showFooter: true,
		showCallout: false,
		telemetryPayload: () => ({}),
	},
);

const expanded = defineModel<boolean>('expanded', { default: false });

const i18n = useI18n();
const telemetry = useTelemetry();
const workflowsStore = useWorkflowsStore();

const hadManualInteraction = ref(false);

const markInteracted = () => {
	hadManualInteraction.value = true;
};

const onHeaderClick = () => {
	expanded.value = !expanded.value;
};

watch(
	() => props.isComplete,
	(isComplete) => {
		if (isComplete) {
			expanded.value = false;

			if (hadManualInteraction.value) {
				telemetry.track('User completed setup step', {
					template_id: workflowsStore.workflow.meta?.templateId,
					workflow_id: workflowsStore.workflowId,
					...props.telemetryPayload,
				});
				hadManualInteraction.value = false;
			}
		}
	},
);

onMounted(() => {
	if (props.isComplete) {
		expanded.value = false;
	}
});

defineExpose({ markInteracted });
</script>

<template>
	<div
		:data-test-id="cardTestId"
		:class="[
			$style.card,
			{
				[$style.collapsed]: !expanded,
				[$style.completed]: isComplete,
				[$style['no-footer']]: !showFooter && expanded,
			},
		]"
	>
		<header :data-test-id="`${cardTestId}-header`" :class="$style.header" @click="onHeaderClick">
			<N8nIcon
				v-if="!expanded && isComplete"
				:data-test-id="`${cardTestId}-complete-icon`"
				icon="check"
				:class="$style['complete-icon']"
				size="medium"
			/>
			<slot v-else name="icon" />
			<N8nText :class="$style['card-title']" size="medium" color="text-dark">
				{{ title }}
			</N8nText>
			<div :class="$style['header-extra']">
				<slot name="header-extra" />
			</div>
			<N8nIcon
				:class="$style.chevron"
				:icon="expanded ? 'chevrons-down-up' : 'chevrons-up-down'"
				size="large"
				color="text-light"
			/>
		</header>

		<template v-if="expanded">
			<slot name="card-description" />
			<Transition name="callout-fade">
				<div v-if="showCallout" :class="$style['callout-grid']">
					<div :class="$style['callout-inner']">
						<slot name="callout" />
					</div>
				</div>
			</Transition>
			<slot />

			<footer v-if="showFooter" :class="$style.footer">
				<div v-if="isComplete" :class="$style['footer-complete-check']">
					<N8nIcon icon="check" :class="$style['complete-icon']" size="large" />
					<N8nText size="medium" color="success">
						{{ i18n.baseText('generic.complete') }}
					</N8nText>
				</div>
				<slot name="footer-actions" />
			</footer>
		</template>
	</div>
</template>

<style module lang="scss">
.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);

	&.no-footer {
		padding-bottom: var(--spacing--xs);
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	user-select: none;
	padding: var(--spacing--xs) var(--spacing--xs) 0;

	.header-extra {
		display: flex;
	}

	.chevron {
		display: none;
	}

	&:hover {
		.chevron {
			display: block;
		}

		.header-extra {
			display: none;
		}
	}

	.card:not(.collapsed) & {
		margin-bottom: var(--spacing--5xs);
	}
}

.card-title {
	flex: 1;
	font-weight: var(--font-weight--medium);
}

.complete-icon {
	color: var(--color--success);
}

.footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}

.footer-complete-check {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.card.collapsed {
	.header {
		padding: var(--spacing--xs);
	}

	.card-title {
		color: var(--color--text--tint-1);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.card.completed {
	border-color: var(--color--success);

	.footer {
		justify-content: space-between;
	}
}

.callout-grid {
	display: grid;
	grid-template-rows: 1fr;
}

.callout-inner {
	overflow: hidden;
	min-height: 0;
}
</style>

<style lang="scss" scoped>
.callout-fade-enter-active,
.callout-fade-leave-active {
	transition:
		grid-template-rows 200ms ease,
		opacity 200ms ease;
}

.callout-fade-enter-from,
.callout-fade-leave-to {
	grid-template-rows: 0fr;
	opacity: 0;
}
</style>
