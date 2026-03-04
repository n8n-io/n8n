<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

const props = withDefaults(
	defineProps<{
		isComplete: boolean;
		loading?: boolean;
		cardTestId: string;
		title: string;
		showFooter?: boolean;
		showCallout?: boolean;
		telemetryPayload?: Record<string, unknown>;
	}>(),
	{
		loading: false,
		showFooter: true,
		showCallout: false,
		telemetryPayload: () => ({}),
	},
);

const expanded = defineModel<boolean>('expanded', { default: false });

const i18n = useI18n();
const telemetry = useTelemetry();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

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
		if (isComplete && hadManualInteraction.value) {
			telemetry.track('User completed setup step', {
				template_id: workflowDocumentStore?.value?.meta?.templateId,
				workflow_id: workflowsStore.workflowId,
				...props.telemetryPayload,
			});
			hadManualInteraction.value = false;
		}
	},
);

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
				v-if="!expanded && loading && !isComplete"
				:data-test-id="`${cardTestId}-loading-icon`"
				icon="spinner"
				:spin="true"
				:class="$style['loading-icon']"
				size="medium"
			/>
			<N8nIcon
				v-else-if="!expanded && isComplete"
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
			<slot name="webhook-urls" />
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
	background-color: var(--color--background--light-3);
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

	.header & {
		display: flex;
		justify-content: center;
		width: var(--spacing--sm);
	}
}

.loading-icon {
	color: var(--color--text--tint-1);
	display: flex;
	justify-content: center;
	width: var(--spacing--sm);
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
		color: var(--color--text);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		transition: color 100ms ease;
	}

	&:hover .card-title {
		color: var(--color--text--shade-1);
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
