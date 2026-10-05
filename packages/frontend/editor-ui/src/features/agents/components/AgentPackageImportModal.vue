<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import type { ImportResult, WorkflowPublishingOutcome } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { isRecord } from '@n8n/utils/is-record';

import { useUIStore } from '@/app/stores/ui.store';
import AgentModal from './modals/AgentModal.vue';

const props = defineProps<{
	modalName: string;
	data: {
		onConfirm: (file: File) => Promise<ImportResult>;
		onImported: (result: ImportResult) => Promise<void>;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const selectedFile = ref<File | null>(null);
const errorMessage = ref('');
const errorDetails = ref<string[]>([]);
const refreshError = ref('');
const importing = ref(false);
const result = ref<ImportResult | null>(null);
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

const publicationIssues = computed(() => {
	if (!result.value) return [];
	return [...result.value.agents, ...result.value.workflows].flatMap(({ name, publishing }) => {
		const message = publicationIssue(publishing);
		return message ? [`${name}: ${message}`] : [];
	});
});
const needsAttention = computed(
	() =>
		publicationIssues.value.length > 0 ||
		(result.value?.credentials.stubbed.length ?? 0) > 0 ||
		!!refreshError.value,
);

function publicationIssue(outcome: WorkflowPublishingOutcome): string | undefined {
	if (outcome.state === 'failed') {
		return i18n.baseText('agents.builder.importPackageModal.publishFailed', {
			interpolate: { error: outcome.error ?? '' },
		});
	}
	const reason = outcome.blockedReason ?? outcome.skippedPublishReason;
	if (reason === 'stub-credential') {
		return i18n.baseText('agents.builder.importPackageModal.publishNeedsCredentials');
	}
	if (reason === 'missing-node-type') {
		return i18n.baseText('agents.builder.importPackageModal.publishNeedsNodes');
	}
	return undefined;
}

function closeModal() {
	if (importing.value) return;
	selectedFile.value = null;
	errorMessage.value = '';
	errorDetails.value = [];
	result.value = null;
	refreshError.value = '';
	if (fileInput.value) fileInput.value.value = '';
	uiStore.closeModal(props.modalName);
}

function onFileChange(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement) || importing.value) return;
	selectedFile.value = null;
	errorMessage.value = '';
	errorDetails.value = [];
	const file = input.files?.[0];
	if (!file) return;
	if (!file.name.toLowerCase().endsWith('.n8np')) {
		errorMessage.value = i18n.baseText('agents.builder.importPackageModal.invalidFile');
		return;
	}
	selectedFile.value = file;
}

function blockingIssueDetails(error: unknown): string[] {
	if (!(error instanceof ResponseError) || !Array.isArray(error.meta?.issues)) return [];
	return error.meta.issues.filter(isRecord).map((issue) => {
		const id = String(issue.sourceAgentId ?? issue.sourceWorkflowId ?? issue.sourceId ?? '');
		switch (issue.type) {
			case 'agent-id-conflict':
			case 'workflow-id-conflict':
				return i18n.baseText('agents.builder.importPackageModal.idConflict', {
					interpolate: { id },
				});
			case 'agent-dependency-unresolved':
				return i18n.baseText('agents.builder.importPackageModal.missingDependency', {
					interpolate: { id: String(issue.dependencyId) },
				});
			case 'credential-unresolved':
				return i18n.baseText('agents.builder.importPackageModal.missingCredential', {
					interpolate: { id },
				});
			case 'missing-node-type':
				return i18n.baseText('agents.builder.importPackageModal.missingNode', {
					interpolate: { name: String(issue.nodeType) },
				});
			default:
				return i18n.baseText('agents.builder.importPackageModal.resolveConflict', {
					interpolate: { id: id || String(issue.projectId ?? issue.name ?? '') },
				});
		}
	});
}

async function refreshEditor(imported: ImportResult) {
	try {
		await props.data.onImported(imported);
	} catch {
		// The import completed. A refresh failure must not offer the same import again.
		refreshError.value = i18n.baseText('agents.builder.importPackageModal.refreshError');
	}
}

async function onConfirm() {
	if (!selectedFile.value || importing.value || result.value) return;
	importing.value = true;
	errorMessage.value = '';
	errorDetails.value = [];
	try {
		result.value = await props.data.onConfirm(selectedFile.value);
		await refreshEditor(result.value);
	} catch (error) {
		errorMessage.value = getErrorMessage(error);
		errorDetails.value = blockingIssueDetails(error);
	} finally {
		importing.value = false;
	}
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="i18n.baseText('agents.builder.importPackageModal.title')"
		:busy="importing"
		:show-cancel="!result"
		size="large"
		data-testid="agent-package-import-modal"
		@update:open="!$event && closeModal()"
	>
		<div :class="$style.content">
			<template v-if="result">
				<N8nCallout
					:theme="needsAttention ? 'warning' : 'success'"
					data-testid="agent-package-import-result"
				>
					{{
						i18n.baseText(
							needsAttention
								? 'agents.builder.importPackageModal.needsAttention'
								: 'agents.builder.importPackageModal.imported',
						)
					}}
				</N8nCallout>
				<N8nText size="small">
					{{
						i18n.baseText('agents.builder.importPackageModal.summary', {
							interpolate: { agents: result.agents.length, workflows: result.workflows.length },
						})
					}}
				</N8nText>
				<ul v-if="result.agents.length" :class="$style.results">
					<li v-for="agent in result.agents" :key="agent.localId">
						{{ agent.name }}:
						{{ i18n.baseText(`agents.builder.importPackageModal.${agent.status}`) }}
					</li>
				</ul>
				<N8nText v-if="result.credentials.stubbed.length" size="small">
					{{
						i18n.baseText('agents.builder.importPackageModal.credentials', {
							interpolate: { count: result.credentials.stubbed.length },
						})
					}}
				</N8nText>
				<ul v-if="publicationIssues.length" :class="$style.results">
					<li v-for="issue in publicationIssues" :key="issue">{{ issue }}</li>
				</ul>
				<N8nText v-if="refreshError" size="small">{{ refreshError }}</N8nText>
			</template>
			<template v-else>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.importPackageModal.description') }}
				</N8nText>
				<label :class="$style.fileField">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.importPackageModal.fileLabel') }}
					</N8nText>
					<input
						ref="fileInput"
						type="file"
						accept=".n8np"
						:disabled="importing"
						data-testid="agent-package-import-file-input"
						@change="onFileChange"
					/>
				</label>
				<N8nCallout v-if="errorMessage" theme="danger" data-testid="agent-package-import-error">
					{{ errorMessage }}
					<ul v-if="errorDetails.length" :class="$style.results">
						<li v-for="detail in errorDetails" :key="detail">{{ detail }}</li>
					</ul>
				</N8nCallout>
			</template>
		</div>
		<template #footerActions>
			<N8nButton
				v-if="result"
				:label="i18n.baseText('generic.close')"
				:disabled="importing"
				@click="closeModal"
			/>
			<N8nButton
				v-else
				:label="i18n.baseText('agents.builder.importPackageModal.import')"
				:disabled="!selectedFile || importing"
				:loading="importing"
				data-testid="agent-package-import-confirm"
				@click="onConfirm"
			/>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.fileField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
.results {
	padding-left: var(--spacing--md);
	overflow-wrap: anywhere;
}
</style>
