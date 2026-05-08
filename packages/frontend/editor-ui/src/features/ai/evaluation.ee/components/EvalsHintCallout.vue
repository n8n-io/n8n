<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nCallout, N8nIcon } from '@n8n/design-system';

import { useSettingsStore } from '@/app/stores/settings.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowSettingsCache } from '@/app/composables/useWorkflowsCache';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { canManageInstanceAi } from '@/features/ai/instanceAi/instanceAiPermissions';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { isEligibleForEvalsHint } from '../evaluation.utils';

const i18n = useI18n();
const router = useRouter();
const telemetry = useTelemetry();
const settingsStore = useSettingsStore();
const sourceControlStore = useSourceControlStore();
const workflowsCache = useWorkflowSettingsCache();
const instanceAiStore = useInstanceAiStore();
const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);

const dismissed = ref(true);
const lastShownWorkflowId = ref<string | null>(null);

const workflowId = computed(() => workflowDocumentStore?.value?.workflowId ?? '');
const nodes = computed(() => workflowDocumentStore?.value?.allNodes ?? []);
const isReadOnly = computed(() => sourceControlStore.preferences.branchReadOnly);

const isInstanceAiAvailable = computed(
	() =>
		settingsStore.isModuleActive('instance-ai') &&
		settingsStore.moduleSettings['instance-ai']?.enabled !== false &&
		canManageInstanceAi(),
);

const isEligible = computed(() => isEligibleForEvalsHint(nodes.value));

const isVisible = computed(
	() =>
		!isReadOnly.value &&
		isInstanceAiAvailable.value &&
		isEligible.value &&
		!dismissed.value &&
		!!workflowId.value,
);

async function loadDismissedState() {
	if (!workflowId.value) {
		dismissed.value = true;
		return;
	}
	const settings = await workflowsCache.getMergedWorkflowSettings(workflowId.value);
	dismissed.value = settings?.suggestedActions?.['evals-hint']?.ignored ?? false;
}

async function onDismiss() {
	if (!workflowId.value) return;
	dismissed.value = true;
	await workflowsCache.ignoreSuggestedAction(workflowId.value, 'evals-hint');
	telemetry.track('evals_hint_dismissed', { workflowId: workflowId.value });
}

function onSetupEvals() {
	if (!workflowId.value) return;
	telemetry.track('evals_hint_cta_clicked', { workflowId: workflowId.value });
	const message = `Set up evals for workflow ${workflowId.value}`;
	// Stage the message and navigate to the empty InstanceAi view. The view's
	// onMounted hook consumes the staged message and submits it through the
	// same code path as a manually-typed message — including SSE setup, thread
	// persistence, and URL update — so the assistant response streams in
	// reliably.
	instanceAiStore.setPendingInitialMessage(message);
	void router.push({ name: INSTANCE_AI_VIEW });
}

watch(
	workflowId,
	async () => {
		await loadDismissedState();
	},
	{ immediate: false },
);

watch(isVisible, (visible) => {
	if (visible && lastShownWorkflowId.value !== workflowId.value) {
		lastShownWorkflowId.value = workflowId.value;
		telemetry.track('evals_hint_shown', { workflowId: workflowId.value });
	}
});

onMounted(async () => {
	await loadDismissedState();
});
</script>

<template>
	<N8nCallout
		v-if="isVisible"
		:class="$style.callout"
		theme="info"
		icon="sparkles"
		data-test-id="evals-hint-callout"
	>
		{{ i18n.baseText('evaluations.hint.message') }}
		<template #trailingContent>
			<div :class="$style.actions">
				<N8nButton
					type="primary"
					size="mini"
					:label="i18n.baseText('evaluations.hint.cta')"
					data-test-id="evals-hint-cta"
					@click="onSetupEvals"
				/>
				<button
					type="button"
					:class="$style.dismiss"
					:aria-label="i18n.baseText('evaluations.hint.dismiss')"
					data-test-id="evals-hint-dismiss"
					@click="onDismiss"
				>
					<N8nIcon icon="x" size="small" />
				</button>
			</div>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.callout {
	position: absolute;
	top: var(--spacing--sm);
	left: 50%;
	transform: translateX(-50%);
	z-index: 5;
	max-width: 560px;
	box-shadow: var(--box-shadow--light);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-left: var(--spacing--sm);
}

.dismiss {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	cursor: pointer;
	color: var(--callout--color--text--info);
	padding: var(--spacing--3xs);
	border-radius: var(--radius);

	&:hover {
		color: var(--callout--icon-color--info);
	}
}
</style>
