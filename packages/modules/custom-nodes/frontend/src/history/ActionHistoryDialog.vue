<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nDialog, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import type {
	CustomActionResponse,
	CustomActionRevisionSummary,
	CustomActionVersionDetailResponse,
} from '@n8n/api-types';

import { useCustomNodesStore } from '../custom-nodes.store';

const props = defineProps<{ action?: CustomActionResponse }>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const toast = useToast();
const store = useCustomNodesStore();

const selectedVersion = ref<number | null>(null);
const detail = ref<CustomActionVersionDetailResponse | null>(null);
const loadingDetail = ref(false);
const confirmRevision = ref<number | null>(null);
const rollingBack = ref(false);

/** Newest first. */
const versions = computed(() =>
	[...(props.action?.versions ?? [])].sort((a, b) => b.version - a.version),
);

const revisions = computed(() =>
	[...(detail.value?.revisions ?? [])].sort((a, b) => b.revision - a.revision),
);

function formatDate(value: string) {
	return new Date(value).toLocaleDateString();
}

async function loadDetail(version: number) {
	const action = props.action;
	if (!action) return;
	loadingDetail.value = true;
	try {
		const result = await store.fetchActionVersion(action.id, version);
		if (selectedVersion.value === version) detail.value = result;
	} catch (error) {
		toast.showError(error, i18n.baseText('customNodes.history.load.error'));
	} finally {
		loadingDetail.value = false;
	}
}

function selectVersion(version: number) {
	selectedVersion.value = version;
	confirmRevision.value = null;
	detail.value = null;
	void loadDetail(version);
}

watch(
	open,
	(isOpen) => {
		if (!isOpen) return;
		detail.value = null;
		confirmRevision.value = null;
		const newest = props.action?.newestVersion;
		if (newest !== undefined) selectVersion(newest);
	},
	{ immediate: true },
);

async function rollBack(revision: CustomActionRevisionSummary) {
	const action = props.action;
	const version = selectedVersion.value;
	if (!action || version === null) return;
	rollingBack.value = true;
	try {
		await store.rollbackRevision(action.id, version, { revision: revision.revision });
		toast.showMessage({
			title: i18n.baseText('customNodes.history.rollback.success', {
				interpolate: { revision: String(revision.revision) },
			}),
			type: 'success',
		});
		confirmRevision.value = null;
		await loadDetail(version);
	} catch (error) {
		toast.showError(error, i18n.baseText('customNodes.history.rollback.error'));
	} finally {
		rollingBack.value = false;
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="large"
		:header="
			i18n.baseText('customNodes.history.title', {
				interpolate: { name: action?.name ?? '' },
			})
		"
		data-test-id="custom-nodes-history"
		@update:open="open = $event"
	>
		<div :class="$style.layout">
			<ul :class="$style.list" data-test-id="custom-nodes-history-versions">
				<li v-for="version in versions" :key="version.version">
					<N8nButton
						:variant="version.version === selectedVersion ? 'outline' : 'ghost'"
						:label="
							i18n.baseText('customNodes.history.version', {
								interpolate: { version: String(version.version) },
							})
						"
						data-test-id="custom-nodes-history-version"
						@click="selectVersion(version.version)"
					/>
					<N8nText size="small" color="text-light">
						<template v-if="version.version === action?.newestVersion">
							{{ i18n.baseText('customNodes.history.newest') }} ·
						</template>
						{{ formatDate(version.createdAt) }}
					</N8nText>
				</li>
			</ul>

			<div :class="$style.revisions">
				<N8nText v-if="loadingDetail && !detail" color="text-light">
					{{ i18n.baseText('customNodes.history.loading') }}
				</N8nText>
				<ul v-else :class="$style.list" data-test-id="custom-nodes-history-revisions">
					<li
						v-for="revision in revisions"
						:key="revision.revision"
						:class="$style.revision"
						data-test-id="custom-nodes-history-revision"
					>
						<div>
							<N8nText bold>
								{{
									i18n.baseText('customNodes.history.revision', {
										interpolate: { revision: String(revision.revision) },
									})
								}}
							</N8nText>
							<N8nText size="small" color="text-light">
								<template v-if="revision.current">
									{{ i18n.baseText('customNodes.history.current') }} ·
								</template>
								{{ formatDate(revision.createdAt) }}
							</N8nText>
							<N8nText v-if="revision.changeNote" size="small">
								{{ revision.changeNote }}
							</N8nText>
						</div>
						<div v-if="!revision.current" :class="$style.rowActions">
							<template v-if="confirmRevision === revision.revision">
								<N8nText size="small" data-test-id="custom-nodes-history-confirm-text">
									{{ i18n.baseText('customNodes.history.rollback.confirm') }}
								</N8nText>
								<N8nButton
									variant="solid"
									size="small"
									:loading="rollingBack"
									:label="i18n.baseText('customNodes.history.rollback.confirmButton')"
									data-test-id="custom-nodes-history-confirm"
									@click="rollBack(revision)"
								/>
								<N8nButton
									variant="ghost"
									size="small"
									:disabled="rollingBack"
									:label="i18n.baseText('generic.cancel')"
									data-test-id="custom-nodes-history-cancel"
									@click="confirmRevision = null"
								/>
							</template>
							<N8nButton
								v-else
								variant="outline"
								size="small"
								:label="i18n.baseText('customNodes.history.rollback.button')"
								data-test-id="custom-nodes-history-rollback"
								@click="confirmRevision = revision.revision"
							/>
						</div>
					</li>
				</ul>
			</div>
		</div>
	</N8nDialog>
</template>

<style module lang="scss">
.layout {
	display: grid;
	grid-template-columns: 1fr 2fr;
	gap: var(--spacing--md);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.revisions {
	min-width: 0;
}

.revision {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-bottom: var(--spacing--2xs);
	border-bottom: var(--border);
}

.rowActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
