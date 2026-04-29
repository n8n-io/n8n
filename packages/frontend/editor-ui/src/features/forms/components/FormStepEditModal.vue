<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nTabs } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { FORM_STEP_EDIT_MODAL_KEY } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useFormAppearance } from '../composables/useFormAppearance';
import AppearanceTab from './AppearanceTab.vue';

const props = defineProps<{
	data: Record<string, unknown>;
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();

// nodeId is fixed for the lifetime of this modal instance.
const nodeId = props.data?.nodeId as string;

const node = computed(() => workflowsStore.workflow.nodes.find((n) => n.id === nodeId));
const title = computed(() => node.value?.name ?? i18n.baseText('formStep.editForm'));

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type ModalTab = 'fields' | 'appearance';

const tabs = computed(() => [
	{ label: i18n.baseText('formStep.modal.tab.fields'), value: 'fields' as ModalTab },
	{ label: i18n.baseText('formStep.modal.tab.appearance'), value: 'appearance' as ModalTab },
]);
const activeTab = ref<ModalTab>('appearance');

// ---------------------------------------------------------------------------
// Appearance — composable must be called at top level of setup.
// ---------------------------------------------------------------------------

const appearance = useFormAppearance(nodeId);

async function onSave() {
	await appearance.save(appearance.scope.value);
}

function onReset() {
	appearance.reset();
}
</script>

<template>
	<Modal :name="FORM_STEP_EDIT_MODAL_KEY" :title="title" width="80%" height="90%">
		<template #content>
			<div :class="$style.modalBody">
				<div :class="$style.tabsRow">
					<N8nTabs v-model="activeTab" :options="tabs" />
				</div>

				<!-- Fields tab (placeholder) -->
				<div v-if="activeTab === 'fields'" :class="$style.fieldsPlaceholder" />

				<!-- Appearance tab -->
				<div v-else-if="activeTab === 'appearance'" :class="$style.appearanceLayout">
					<!-- Left: live preview -->
					<div :class="$style.previewPane">
						<iframe
							v-if="appearance.previewHtml.value"
							:ref="(el) => (appearance.iframeEl.value = el as HTMLIFrameElement)"
							:srcdoc="appearance.previewHtml.value"
							sandbox="allow-same-origin"
							scrolling="no"
							:class="$style.previewIframe"
							@load="appearance.onIframeLoad"
						/>
						<div v-else :class="$style.previewSkeleton" />
					</div>

					<!-- Right: controls -->
					<div :class="$style.controlsPane">
						<AppearanceTab
							:model-value="appearance.localOverrides.value"
							:append-attribution="appearance.localAppendAttribution.value"
							:scope="appearance.scope.value"
							@update:model-value="(v) => (appearance.localOverrides.value = v)"
							@update:append-attribution="(v) => (appearance.localAppendAttribution.value = v)"
							@update:scope="(v) => (appearance.scope.value = v)"
						/>
					</div>
				</div>
			</div>
		</template>

		<template v-if="activeTab === 'appearance'" #footer>
			<div :class="$style.footer">
				<N8nButton
					type="secondary"
					:label="i18n.baseText('formStep.appearance.reset')"
					@click="onReset"
				/>
				<N8nButton
					type="primary"
					:label="i18n.baseText('formStep.appearance.save')"
					:loading="appearance.isSaving.value"
					@click="onSave"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.modalBody {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.tabsRow {
	flex-shrink: 0;
	margin-bottom: var(--spacing--sm);
}

.fieldsPlaceholder {
	flex: 1;
}

.appearanceLayout {
	flex: 1;
	min-height: 0;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--lg);
	overflow: hidden;
}

.previewPane {
	overflow-y: auto;
	background: var(--color--background--shade-1);
	border-radius: var(--radius--lg);
	padding: var(--spacing--lg);
}

.previewIframe {
	display: block;
	width: 100%;
	border: none;
	pointer-events: none;
}

.previewSkeleton {
	height: 300px;
	background: linear-gradient(
		90deg,
		var(--color--foreground--tint-2) 25%,
		var(--color--foreground--tint-1) 50%,
		var(--color--foreground--tint-2) 75%
	);
	background-size: 200% 100%;
	border-radius: var(--radius--lg);
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

.controlsPane {
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
