<script setup lang="ts">
import { ref, watch } from 'vue';
import { N8nButton, N8nCollapsiblePanel, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getSlackAgentAppManifest } from '../composables/useAgentApi';

const props = defineProps<{
	agentName: string;
	projectId: string;
	agentId: string;
	connected?: boolean;
	disabled?: boolean;
	setupSlackApp?: (appConfigurationToken: string) => Promise<boolean>;
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const manifestCopied = ref(false);
const appConfigurationToken = ref('');
const setupLoading = ref(false);
const setupError = ref(false);
const manualConfigurationOpen = ref(false);
const slackAppManifest = ref('');
const manifestLoading = ref(false);
const manifestError = ref(false);

async function copyManifest() {
	if (!slackAppManifest.value) return;

	await navigator.clipboard.writeText(slackAppManifest.value);
	manifestCopied.value = true;
	setTimeout(() => {
		manifestCopied.value = false;
	}, 2000);
}

async function loadSlackAppManifest() {
	manifestLoading.value = true;
	manifestError.value = false;
	try {
		const { manifest } = await getSlackAgentAppManifest(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		slackAppManifest.value = JSON.stringify(manifest, null, 2);
	} catch {
		slackAppManifest.value = '';
		manifestError.value = true;
	} finally {
		manifestLoading.value = false;
	}
}

async function createSlackApp() {
	const token = appConfigurationToken.value.trim();
	if (!token || !props.setupSlackApp || props.disabled || props.connected) return;

	setupLoading.value = true;
	setupError.value = false;
	try {
		const completed = await props.setupSlackApp(token);
		if (completed) {
			appConfigurationToken.value = '';
		}
	} catch {
		setupError.value = true;
	} finally {
		setupLoading.value = false;
	}
}

watch(
	() => [props.projectId, props.agentId, props.connected] as const,
	() => {
		if (!props.connected) {
			void loadSlackAppManifest();
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.slackSettings">
		<div v-if="!connected" :class="$style.setupSection">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.builder.addTrigger.slack.setup.title') }}
			</N8nText>
			<N8nText :class="$style.setupHint" size="small">
				{{ i18n.baseText('agents.builder.addTrigger.slack.setup.hint') }}
				<a
					href="https://api.slack.com/apps"
					target="_blank"
					rel="noopener noreferrer"
					:class="$style.docsLink"
					data-testid="slack-app-configuration-token-link"
				>
					{{ i18n.baseText('agents.builder.addTrigger.slack.setup.tokenLink') }}
				</a>
			</N8nText>
			<div :class="$style.setupInputRow">
				<N8nInput
					v-model="appConfigurationToken"
					:class="$style.setupInput"
					type="password"
					size="medium"
					:placeholder="i18n.baseText('agents.builder.addTrigger.slack.setup.tokenPlaceholder')"
					data-testid="slack-app-configuration-token"
					:disabled="disabled || setupLoading"
					@keydown.enter.prevent="createSlackApp"
				/>
				<N8nButton
					variant="solid"
					size="small"
					:loading="setupLoading"
					:disabled="!appConfigurationToken.trim() || disabled || setupLoading || !setupSlackApp"
					data-testid="slack-create-app"
					@click="createSlackApp"
				>
					<template #prefix>
						<N8nIcon icon="plus" size="xsmall" />
					</template>
					{{ i18n.baseText('agents.builder.addTrigger.slack.setup.button') }}
				</N8nButton>
			</div>
			<N8nText
				v-if="setupError"
				:class="$style.setupError"
				size="small"
				data-testid="slack-app-setup-error"
			>
				{{ i18n.baseText('agents.builder.addTrigger.slack.setup.error') }}
			</N8nText>
		</div>

		<N8nCollapsiblePanel
			v-if="!connected"
			v-model="manualConfigurationOpen"
			:class="$style.manualPanel"
			:title="i18n.baseText('agents.builder.addTrigger.slack.manual.title')"
			:show-actions-on-hover="false"
			:disable-animation="true"
			data-testid="slack-manual-configuration"
		>
			<div :class="$style.manualConfiguration">
				<N8nText :class="$style.manualDescription" size="small">
					{{ i18n.baseText('agents.builder.addTrigger.slack.manual.description') }}
				</N8nText>

				<div :class="$style.manifestSection">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.addTrigger.slack.manifestTitle') }}
					</N8nText>
					<N8nText :class="$style.manifestHint" size="small">
						{{ i18n.baseText('agents.builder.addTrigger.slack.manifestHint') }}
						<a
							href="https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests"
							target="_blank"
							rel="noopener noreferrer"
							:class="$style.docsLink"
						>
							{{ i18n.baseText('agents.builder.addTrigger.slack.docsCalloutLink') }}
						</a>
					</N8nText>
					<N8nText
						v-if="manifestLoading"
						:class="$style.manifestHint"
						size="small"
						data-testid="slack-manifest-loading"
					>
						{{ i18n.baseText('agents.builder.addTrigger.slack.manifestLoading') }}
					</N8nText>
					<N8nText
						v-else-if="manifestError"
						:class="$style.setupError"
						size="small"
						data-testid="slack-manifest-error"
					>
						{{ i18n.baseText('agents.builder.addTrigger.slack.manifestError') }}
					</N8nText>
					<div v-else :class="$style.codeBlock">
						<N8nButton
							variant="outline"
							size="small"
							:class="$style.codeBlockCopy"
							:disabled="!slackAppManifest"
							data-testid="slack-copy-manifest"
							@click="copyManifest"
						>
							<template #prefix>
								<N8nIcon :icon="manifestCopied ? 'check' : 'copy'" size="xsmall" />
							</template>
							{{
								manifestCopied
									? i18n.baseText('agents.builder.addTrigger.copied')
									: i18n.baseText('agents.builder.addTrigger.copy')
							}}
						</N8nButton>
						<pre :class="$style.manifestCode">{{ slackAppManifest }}</pre>
					</div>
				</div>

				<slot name="manualConfiguration" />
			</div>
		</N8nCollapsiblePanel>
	</div>
</template>

<style module lang="scss">
.slackSettings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.setupSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-bottom: var(--spacing--xs);
}

.manualConfiguration {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}

.manualPanel {
	background-color: transparent;
}

.manualDescription {
	color: var(--color--text--tint-1);
}

.manifestSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.setupHint {
	color: var(--color--text--tint-1);
}

.setupInputRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.setupInput {
	flex: 1 1 16rem;
	min-width: 0;
}

.setupError {
	color: var(--color--danger);
}

.docsCallout {
	margin-bottom: var(--spacing--3xs);
}

.docsLink {
	color: var(--color--primary);
	text-decoration: underline;
}

.manifestHint {
	color: var(--color--text--tint-1);
}

.codeBlock {
	position: relative;
	margin-top: var(--spacing--3xs);
}

/* Sit on top of the rounded container itself rather than inside the scrolling
   <pre>, so the button stays put as the user scrolls and never collides with
   the scrollbar groove. The right offset clears typical macOS / overlay
   scrollbars (~14px) plus our normal inner padding. */
.codeBlockCopy {
	position: absolute;
	top: var(--spacing--2xs);
	right: var(--spacing--lg);
	z-index: 1;
}

.manifestCode {
	margin: 0;
	padding: var(--spacing--xs);
	padding-right: calc(var(--spacing--2xl) + var(--spacing--lg));
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	overflow-x: auto;
	max-height: 240px;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	white-space: pre;
	font-family: monospace;
	color: var(--color--text);
}
</style>
