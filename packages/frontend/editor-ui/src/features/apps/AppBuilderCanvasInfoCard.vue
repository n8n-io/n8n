<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { InstanceAiWorkflowAttachment } from '@n8n/api-types';

import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useStorage } from '@n8n/composables/useStorage';
import { LOCAL_STORAGE_APP_BUILDER_CANVAS_INFO_CARD_DISMISSED } from '@/app/constants';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useInstanceAiReady } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import {
	ensurePersonalProjectId,
	useInstanceAiHandoff,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import { useWebAppCandidateWorkflow } from './useWebAppCandidateWorkflow';

// Floating onboarding card nudging users whose active workflow returns HTML
// from a webhook — the pattern people already use to serve a mini web app —
// toward building a proper one with the App Builder instead. Conditions:
//
//   - Instance AI is ready to act on a hand-off
//   - workflow is active (published)
//   - workflow pairs a Webhook trigger with a Respond to Webhook node
//   - the card hasn't been dismissed for this workflow before
//
// All four must hold. Dismiss state is scoped per-workflow, like the
// evaluations canvas info card this mirrors.

const locale = useI18n();
const telemetry = useTelemetry();
const workflowDocumentStore = injectWorkflowDocumentStore();
const instanceAiReady = useInstanceAiReady();
const isCandidateWorkflow = useWebAppCandidateWorkflow();
const { startThread } = useInstanceAiHandoff();

const dismissedStorage = useStorage(LOCAL_STORAGE_APP_BUILDER_CANVAS_INFO_CARD_DISMISSED);

const dismissedSet = computed<Set<string>>(() => {
	const raw = dismissedStorage.value;
	if (!raw) return new Set();
	return new Set(raw.split(',').filter(Boolean));
});

const workflowId = computed(() => workflowDocumentStore.value?.workflowId ?? '');
const workflowName = computed(() => workflowDocumentStore.value?.name ?? undefined);
const isWorkflowActive = computed(() => workflowDocumentStore.value?.active ?? false);

const isDismissed = computed(() => {
	if (!workflowId.value) return true;
	return dismissedSet.value.has(workflowId.value);
});

const isVisible = computed(
	() =>
		instanceAiReady.value &&
		isWorkflowActive.value &&
		isCandidateWorkflow.value &&
		!isDismissed.value,
);

function dismiss() {
	const wfId = workflowId.value;
	if (!wfId) return;
	const next = new Set(dismissedSet.value);
	next.add(wfId);
	dismissedStorage.value = [...next].join(',');
}

async function openInAssistant() {
	const projectId = await ensurePersonalProjectId();
	if (!projectId) return;

	telemetry.track('User opened Instance AI from app builder canvas info card', {
		workflow_id: workflowId.value,
	});

	const attachment: InstanceAiWorkflowAttachment = {
		type: 'workflow',
		id: workflowId.value,
		name: workflowName.value,
	};
	await startThread(
		projectId,
		locale.baseText('apps.canvasInfoCard.prompt'),
		{ source: 'app_builder_canvas_info_card', origin: 'internal' },
		[attachment],
	);
}
</script>

<template>
	<aside
		v-if="isVisible"
		:class="$style.card"
		role="complementary"
		data-test-id="app-builder-canvas-info-card"
	>
		<button
			type="button"
			:class="$style.dismiss"
			:aria-label="locale.baseText('generic.dismiss')"
			data-test-id="app-builder-canvas-info-card-dismiss"
			@click="dismiss"
		>
			<N8nIcon icon="x" size="small" />
		</button>

		<div :class="$style.body">
			<N8nText size="small" bold color="text-dark">
				{{ locale.baseText('apps.canvasInfoCard.title') }}
			</N8nText>
			<N8nText size="small" color="text-base" :class="$style.description">
				{{ locale.baseText('apps.canvasInfoCard.description') }}
			</N8nText>
		</div>

		<div :class="$style.footer">
			<N8nButton
				variant="solid"
				size="medium"
				type="button"
				icon="app-window"
				:class="$style.setupButton"
				data-test-id="app-builder-canvas-info-card-cta"
				@click="openInAssistant"
			>
				{{ locale.baseText('apps.canvasInfoCard.cta') }}
			</N8nButton>
		</div>
	</aside>
</template>

<style module lang="scss">
.card {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 280px;
	padding: var(--spacing--sm);
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--border-radius--base);
	box-shadow: var(--shadow--md);
}

.dismiss {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	padding: 0;
	background: transparent;
	border: none;
	border-radius: var(--border-radius--base);
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover,
	&:focus-visible {
		color: var(--color--text);
		background-color: var(--background--subtle);
	}

	&:focus-visible {
		outline: 1px solid var(--focus--border-color);
	}
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-right: var(--spacing--md);
}

.description {
	display: block;
	line-height: 1.4;
}

.footer {
	display: flex;
}

.setupButton {
	width: 100%;
}
</style>
