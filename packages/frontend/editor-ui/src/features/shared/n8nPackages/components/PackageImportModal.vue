<script setup lang="ts">
import { computed, ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { ImportResultDto } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useUIStore } from '@/app/stores/ui.store';
import { getImportBlockingIssues, importPackage } from '../n8nPackages.api';
import { formatImportBlockingIssue } from '../n8nPackages.issues';
import PackageImportResult from './PackageImportResult.vue';

type ImportedAgent = ImportResultDto['agents'][number];

type ImportState =
	| { kind: 'select' }
	| { kind: 'importing' }
	| { kind: 'blocked'; issues: string[] }
	| { kind: 'error'; message: string }
	| { kind: 'imported'; result: ImportResultDto };

const props = defineProps<{
	modalName: string;
	data: {
		projectId: string;
		onImported: (result: ImportResultDto) => Promise<void>;
		agentRoute?: (agent: ImportedAgent) => RouteLocationRaw;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const rootStore = useRootStore();

const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const state = ref<ImportState>({ kind: 'select' });
const selectedFile = ref<File | null>(null);
const refreshing = ref(false);
const refreshFailed = ref(false);

const busy = computed(() => state.value.kind === 'importing' || refreshing.value);

function resetState() {
	state.value = { kind: 'select' };
	selectedFile.value = null;
	refreshing.value = false;
	refreshFailed.value = false;
}

function closeModal() {
	if (busy.value) return;
	resetState();
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeModal();
}

function onFileChange(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;
	selectedFile.value = input.files?.[0] ?? null;
}

function chooseAnotherFile() {
	selectedFile.value = null;
	state.value = { kind: 'select' };
}

function toFailureState(error: unknown): ImportState {
	const issues = getImportBlockingIssues(error);
	if (issues) return { kind: 'blocked', issues: issues.map(formatImportBlockingIssue) };
	return { kind: 'error', message: error instanceof Error ? error.message : '' };
}

async function runImport() {
	const file = selectedFile.value;
	if (!file || busy.value) return;

	state.value = { kind: 'importing' };
	try {
		const result = await importPackage(rootStore.publicApiContext, file, {
			projectId: props.data.projectId,
			conflictPolicy: 'new-version',
		});
		state.value = { kind: 'imported', result };
		await refreshAfterImport(result);
	} catch (error) {
		state.value = toFailureState(error);
	}
}

/** Runs only the caller refresh. The import is done, so a retry must not import again. */
async function refreshAfterImport(result: ImportResultDto) {
	refreshing.value = true;
	try {
		await props.data.onImported(result);
		refreshFailed.value = false;
	} catch {
		refreshFailed.value = true;
	} finally {
		refreshing.value = false;
	}
}

async function retryRefresh() {
	if (state.value.kind !== 'imported' || refreshing.value) return;
	await refreshAfterImport(state.value.result);
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:header="i18n.baseText('packages.import.title')"
		:close-on-overlay-click="!busy"
		:close-on-escape="!busy"
		:show-close-button="!busy"
		data-testid="package-import-modal"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<div :class="$style.content">
				<template v-if="state.kind === 'select' || state.kind === 'importing'">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('packages.import.description') }}
					</N8nText>
					<label :class="$style.fileField">
						<N8nText size="small" :bold="true">
							{{ i18n.baseText('packages.import.fileLabel') }}
						</N8nText>
						<input
							type="file"
							accept=".n8np"
							:disabled="state.kind === 'importing'"
							data-testid="package-import-file-input"
							@change="onFileChange"
						/>
					</label>
				</template>

				<N8nCallout
					v-if="state.kind === 'blocked'"
					theme="danger"
					data-testid="package-import-blocked"
				>
					{{ i18n.baseText('packages.import.blocked') }}
					<ul :class="$style.issues">
						<li v-for="(issue, index) in state.issues" :key="index">{{ issue }}</li>
					</ul>
				</N8nCallout>

				<N8nCallout v-if="state.kind === 'error'" theme="danger" data-testid="package-import-error">
					<div>{{ i18n.baseText('packages.import.error') }}</div>
					<div v-if="state.message">{{ state.message }}</div>
				</N8nCallout>

				<template v-if="state.kind === 'imported'">
					<PackageImportResult
						:result="state.result"
						:agent-route="props.data.agentRoute"
						@navigate="closeModal"
					/>
					<N8nCallout
						v-if="refreshFailed"
						theme="danger"
						data-testid="package-import-refresh-error"
					>
						{{ i18n.baseText('packages.import.refreshError') }}
					</N8nCallout>
				</template>
			</div>
		</N8nDialogBody>

		<N8nDialogFooter>
			<template v-if="state.kind === 'select' || state.kind === 'importing'">
				<N8nButton
					variant="outline"
					:disabled="busy"
					:label="i18n.baseText('generic.cancel')"
					data-testid="package-import-cancel"
					@click="closeModal"
				/>
				<N8nButton
					:label="i18n.baseText('packages.import.submit')"
					:disabled="!selectedFile || busy"
					:loading="state.kind === 'importing'"
					data-testid="package-import-submit"
					@click="runImport"
				/>
			</template>

			<template v-if="state.kind === 'blocked' || state.kind === 'error'">
				<N8nButton
					variant="outline"
					:label="i18n.baseText('packages.import.chooseAnotherFile')"
					data-testid="package-import-choose-another"
					@click="chooseAnotherFile"
				/>
				<N8nButton
					:label="i18n.baseText('packages.import.retry')"
					data-testid="package-import-retry"
					@click="runImport"
				/>
			</template>

			<template v-if="state.kind === 'imported'">
				<N8nButton
					v-if="refreshFailed"
					variant="outline"
					:label="i18n.baseText('packages.import.refreshAgain')"
					:loading="refreshing"
					:disabled="refreshing"
					data-testid="package-import-refresh-again"
					@click="retryRefresh"
				/>
				<N8nButton
					:label="i18n.baseText('packages.import.done')"
					:disabled="refreshing"
					data-testid="package-import-done"
					@click="closeModal"
				/>
			</template>
		</N8nDialogFooter>
	</N8nDialog>
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

.issues {
	margin: var(--spacing--2xs) 0 0;
	padding-left: var(--spacing--md);
	list-style: disc;
}
</style>
