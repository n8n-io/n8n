<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nRadioButtons, N8nSwitch2 } from '@n8n/design-system';
import { ElSelect, ElOption } from 'element-plus';
import Modal from '@/app/components/Modal.vue';
import { FORM_STEP_EDIT_MODAL_KEY, FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useFormAppearance } from '../composables/useFormAppearance';
import AppearanceTab from './AppearanceTab.vue';
import FieldsTab from './FieldsTab.vue';

const props = defineProps<{
	data: Record<string, unknown>;
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();

// nodeId is fixed for the lifetime of this modal instance.
const nodeId = props.data?.nodeId as string;

const node = computed(() => workflowsStore.workflow.nodes.find((n) => n.id === nodeId));
const isTrigger = computed(() => node.value?.type === FORM_TRIGGER_NODE_TYPE);
const title = i18n.baseText('formStep.editForm');

const applyToAll = computed({
	get: () => appearance.scope.value === 'all',
	set: (v) => (appearance.scope.value = v ? 'all' : 'current'),
});

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

const themeOptions = computed(() => {
	const named = [
		{ value: 'light', label: i18n.baseText('formStep.appearance.theme.light') },
		{ value: 'dark', label: i18n.baseText('formStep.appearance.theme.dark') },
		{ value: 'dense', label: i18n.baseText('formStep.appearance.theme.dense') },
		{ value: 'compact', label: i18n.baseText('formStep.appearance.theme.compact') },
		{ value: 'compactDark', label: i18n.baseText('formStep.appearance.theme.compactDark') },
		{ value: 'enterprise', label: i18n.baseText('formStep.appearance.theme.enterprise') },
		{ value: 'enterpriseDark', label: i18n.baseText('formStep.appearance.theme.enterpriseDark') },
		{ value: 'fun', label: i18n.baseText('formStep.appearance.theme.fun') },
		{ value: 'funColorful', label: i18n.baseText('formStep.appearance.theme.funColorful') },
	];
	if (appearance.activeTheme.value === 'custom') {
		named.push({ value: 'custom', label: i18n.baseText('formStep.appearance.theme.custom') });
	}
	return named;
});

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
					<N8nRadioButtons v-model="activeTab" :options="tabs" size="medium" />
				</div>

				<!-- Fields tab -->
				<FieldsTab v-if="activeTab === 'fields'" :node-id="nodeId" :class="$style.fieldsLayout" />

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
						<div :class="$style.headerRow">
							<span :class="$style.nodeName">{{ node?.name }}</span>
							<ElSelect
								:model-value="appearance.activeTheme.value"
								size="small"
								:class="$style.themeSelect"
								@change="(v: string) => appearance.applyTheme(v)"
							>
								<ElOption
									v-for="opt in themeOptions"
									:key="opt.value"
									:label="opt.label"
									:value="opt.value"
									:disabled="opt.value === 'custom'"
								/>
							</ElSelect>
						</div>
						<AppearanceTab
							:model-value="appearance.localOverrides.value"
							:append-attribution="appearance.localAppendAttribution.value"
							:is-trigger="isTrigger"
							@update:model-value="(v) => (appearance.localOverrides.value = v)"
							@update:append-attribution="(v) => (appearance.localAppendAttribution.value = v)"
						/>
						<div :class="$style.footer">
							<div :class="$style.scopeControl">
								<span :class="$style.scopeLabel">{{
									i18n.baseText('formStep.appearance.applyToAll')
								}}</span>
								<N8nSwitch2 v-model="applyToAll" size="small" />
							</div>
							<div :class="$style.footerButtons">
								<N8nButton
									variant="subtle"
									:label="i18n.baseText('formStep.appearance.reset')"
									@click="onReset"
								/>
								<N8nButton variant="solid" :class="$style.saveButton" @click="onSave">
									<span :class="$style.saveContent">
										<span :class="$style.saveSide">
											<span v-if="appearance.hasUnsavedChanges.value" :class="$style.unsavedDot" />
										</span>
										<span>{{ i18n.baseText('formStep.appearance.save') }}</span>
										<span :class="$style.saveSide" />
									</span>
								</N8nButton>
							</div>
						</div>
					</div>
				</div>
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

.headerRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--3xs) var(--spacing--3xs) var(--spacing--3xs) 0;
	margin-bottom: var(--spacing--sm);
}

.themeSelect {
	flex-shrink: 0;
	width: 200px;
}

.nodeName {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.scopeControl {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.scopeLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.tabsRow {
	flex-shrink: 0;
	display: flex;
	justify-content: center;
	margin-bottom: var(--spacing--sm);
}

.fieldsLayout {
	flex: 1;
	min-height: 0;
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
	border-radius: var(--radius--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
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
	align-items: center;
	justify-content: space-between;
	padding-top: var(--spacing--sm);
	margin-top: auto;
	border-top: var(--border);
}

.footerButtons {
	display: flex;
	gap: var(--spacing--xs);
}

.saveButton {
	min-width: 96px;
}

.saveContent {
	display: grid;
	grid-template-columns: 16px 1fr 16px;
	align-items: center;
	width: 100%;
}

.saveSide {
	display: flex;
	align-items: center;
	justify-content: center;
}

.unsavedDot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
	opacity: 0.8;
}
</style>
