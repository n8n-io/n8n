<script setup lang="ts">
import {
	PLAN_OVERLAY_MESSAGE_SOURCE,
	listPlanComponents,
	renderWireframeDocument,
	type AppPlan,
} from '@n8n/api-types';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{
	name: string;
	plan: AppPlan;
	theme: 'light' | 'dark' | 'both';
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const frame = useTemplateRef<HTMLIFrameElement>('frame');
const selecting = ref(false);

const srcdoc = computed(() =>
	renderWireframeDocument(props.plan, { selectable: true }, { theme: props.theme }),
);

function post(type: 'select:enable' | 'select:disable' | 'select:clear') {
	frame.value?.contentWindow?.postMessage({ source: PLAN_OVERLAY_MESSAGE_SOURCE, type }, '*');
}

function toggleSelect() {
	selecting.value = !selecting.value;
	post(selecting.value ? 'select:enable' : 'select:disable');
}

function onMessage(event: MessageEvent) {
	if (event.source !== frame.value?.contentWindow) return;
	const data: unknown = event.data;
	if (!isRecord(data) || data.source !== PLAN_OVERLAY_MESSAGE_SOURCE) return;
	if (data.type !== 'selected' || typeof data.planId !== 'string') return;
	selecting.value = false;
	const component = listPlanComponents(props.plan).find((c) => c.id === data.planId);
	store.stageElement({
		type: 'element',
		appId: 'plan',
		tagName: component?.kind ?? 'section',
		text: component?.label ?? (data.planId === 'shell' ? 'App layout' : data.planId),
		planId: data.planId,
	});
	store.requestComposerFocus();
}

// A new plan reloads the frame, which drops the selection mode.
watch(srcdoc, () => (selecting.value = false));

onMounted(() => window.addEventListener('message', onMessage));
onBeforeUnmount(() => window.removeEventListener('message', onMessage));
</script>

<template>
	<div :class="$style.root" data-test-id="instance-ai-plan-preview">
		<div :class="$style.bar">
			<div :class="$style.text">
				<N8nText size="small" bold color="text-dark">
					{{ i18n.baseText('instanceAi.appPlan.title', { interpolate: { name } }) }}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{
						selecting
							? i18n.baseText('instanceAi.appPlan.selecting')
							: i18n.baseText('instanceAi.appPlan.hint')
					}}
				</N8nText>
			</div>
			<N8nButton
				size="small"
				:type="selecting ? 'primary' : 'secondary'"
				icon="mouse-pointer"
				data-test-id="instance-ai-plan-select"
				@click="toggleSelect"
			>
				{{ i18n.baseText('instanceAi.appPlan.select') }}
			</N8nButton>
		</div>
		<iframe
			ref="frame"
			:class="$style.frame"
			:srcdoc="srcdoc"
			sandbox="allow-scripts allow-popups"
			:title="i18n.baseText('instanceAi.appPlan.title', { interpolate: { name } })"
			data-test-id="instance-ai-plan-frame"
		/>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	background: var(--color--background--light-3);
}

.bar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.text {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.frame {
	flex: 1;
	width: 100%;
	border: 0;
}
</style>
