<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nSelect,
	N8nOption,
	N8nText,
} from '@n8n/design-system';
import type { CredentialOption, CredentialRequirement } from '../credential-binding.api';
import {
	bindCredential,
	getCredentialBindingOptions,
	getCredentialBindingRequirements,
} from '../credential-binding.api';

const route = useRoute();
const i18n = useI18n();
const { showError, showMessage } = useToast();
const documentTitle = useDocumentTitle();
const rootStore = useRootStore();
const uiStore = useUIStore();

const pr = computed(() => String(route.params.pr));

const loading = ref(false);
const requirements = ref<CredentialRequirement[]>([]);

// Per-row bind UI state, keyed by sourceId.
const optionsBySource = ref<Record<string, CredentialOption[]>>({});
const optionsLoading = ref<Record<string, boolean>>({});
const selectedTarget = ref<Record<string, string>>({});
const binding = ref<Record<string, boolean>>({});

async function fetchRequirements() {
	loading.value = true;
	try {
		const response = await getCredentialBindingRequirements(rootStore.restApiContext, pr.value);
		requirements.value = response.requirements;
	} catch (error) {
		showError(error, i18n.baseText('credentialBinding.fetch.error'));
	} finally {
		loading.value = false;
	}
}

async function loadOptions(req: CredentialRequirement) {
	optionsLoading.value[req.sourceId] = true;
	try {
		const response = await getCredentialBindingOptions(
			rootStore.restApiContext,
			pr.value,
			req.expectedType ?? '',
		);
		optionsBySource.value[req.sourceId] = response.options;
	} catch (error) {
		showError(error, i18n.baseText('credentialBinding.options.error'));
	} finally {
		optionsLoading.value[req.sourceId] = false;
	}
}

async function onBind(req: CredentialRequirement) {
	const targetId = selectedTarget.value[req.sourceId];
	if (!targetId) return;
	binding.value[req.sourceId] = true;
	try {
		await bindCredential(rootStore.restApiContext, pr.value, {
			sourceId: req.sourceId,
			targetId,
		});
		showMessage({ title: i18n.baseText('credentialBinding.bind.success'), type: 'success' });
		await fetchRequirements();
	} catch (error) {
		showError(error, i18n.baseText('credentialBinding.bind.error'));
	} finally {
		binding.value[req.sourceId] = false;
	}
}

function onCreateNew(req: CredentialRequirement) {
	uiStore.openNewCredential(
		req.expectedType ?? '',
		false,
		false,
		undefined,
		`PR ${pr.value} – ${req.sourceId}`,
		undefined,
		undefined,
		{ closeOnSave: true, presetId: req.sourceId },
	);
}

function expectedTypeLabel(req: CredentialRequirement): string {
	return req.expectedType ?? i18n.baseText('credentialBinding.expectedType.unknown');
}

// Re-fetch when navigating between PRs without remounting the view.
watch(pr, async () => {
	await fetchRequirements();
});

onMounted(async () => {
	documentTitle.set(i18n.baseText('credentialBinding.title'));
	await fetchRequirements();
});
</script>

<template>
	<div :class="$style.container" data-test-id="credential-binding-view">
		<div :class="$style.heading">
			<N8nHeading size="2xlarge">{{ i18n.baseText('credentialBinding.title') }}</N8nHeading>
		</div>

		<N8nText :class="$style.description" color="text-light">
			{{ i18n.baseText('credentialBinding.description') }}
		</N8nText>

		<div :class="$style.toolbar">
			<N8nButton
				variant="outline"
				icon="refresh-cw"
				:loading="loading"
				data-test-id="credential-binding-refresh"
				@click="fetchRequirements"
			>
				{{ i18n.baseText('credentialBinding.refresh') }}
			</N8nButton>
		</div>

		<N8nText v-if="loading && requirements.length === 0" color="text-light" :class="$style.message">
			{{ i18n.baseText('credentialBinding.loading') }}
		</N8nText>

		<N8nCallout
			v-else-if="requirements.length === 0"
			theme="success"
			:class="$style.empty"
			data-test-id="credential-binding-empty"
		>
			{{ i18n.baseText('credentialBinding.empty', { interpolate: { pr } }) }}
		</N8nCallout>

		<template v-else>
			<table :class="$style.table" data-test-id="credential-binding-table">
				<thead>
					<tr>
						<th>{{ i18n.baseText('credentialBinding.column.credential') }}</th>
						<th>{{ i18n.baseText('credentialBinding.column.usedBy') }}</th>
						<th>{{ i18n.baseText('credentialBinding.column.status') }}</th>
						<th>{{ i18n.baseText('credentialBinding.column.actions') }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="req in requirements" :key="req.sourceId">
						<td>
							<N8nText bold>{{ req.sourceId }}</N8nText>
							<N8nText size="small" color="text-light" :class="$style.subText">
								{{ expectedTypeLabel(req) }}
							</N8nText>
						</td>
						<td>
							<N8nText size="small" color="text-light">
								{{ req.usedByWorkflows.join(', ') }}
							</N8nText>
						</td>
						<td>
							<N8nBadge v-if="req.satisfied" theme="success">
								{{ i18n.baseText('credentialBinding.status.resolved') }}
							</N8nBadge>
							<N8nBadge v-else theme="danger">
								{{ i18n.baseText('credentialBinding.status.missing') }}
							</N8nBadge>
						</td>
						<td>
							<div v-if="!req.satisfied" :class="$style.actions">
								<N8nButton
									variant="solid"
									size="small"
									data-test-id="credential-binding-create"
									@click="onCreateNew(req)"
								>
									{{ i18n.baseText('credentialBinding.action.createNew') }}
								</N8nButton>
								<div :class="$style.bindGroup">
									<N8nSelect
										v-model="selectedTarget[req.sourceId]"
										size="small"
										filterable
										:placeholder="
											i18n.baseText('credentialBinding.action.bindExisting.placeholder')
										"
										:loading="optionsLoading[req.sourceId]"
										:class="$style.select"
										@visible-change="(visible: boolean) => visible && loadOptions(req)"
									>
										<N8nOption
											v-for="option in optionsBySource[req.sourceId] ?? []"
											:key="option.id"
											:value="option.id"
											:label="option.name"
										/>
									</N8nSelect>
									<N8nButton
										variant="outline"
										size="small"
										:disabled="!selectedTarget[req.sourceId]"
										:loading="binding[req.sourceId]"
										data-test-id="credential-binding-bind"
										@click="onBind(req)"
									>
										{{ i18n.baseText('credentialBinding.action.bindExisting') }}
									</N8nButton>
								</div>
							</div>
						</td>
					</tr>
				</tbody>
			</table>

			<N8nText color="text-light" :class="$style.hint" data-test-id="credential-binding-hint">
				{{ i18n.baseText('credentialBinding.hint') }}
			</N8nText>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg);
}

.heading {
	margin-bottom: var(--spacing--2xs);
}

.description {
	display: block;
	margin-bottom: var(--spacing--lg);
	line-height: var(--line-height--xl);
}

.toolbar {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing--sm);
}

.message {
	display: block;
	padding: var(--spacing--lg) 0;
}

.empty {
	margin-bottom: var(--spacing--lg);
}

.table {
	width: 100%;
	border-collapse: collapse;
	margin-bottom: var(--spacing--lg);

	th {
		text-align: left;
		padding: var(--spacing--xs);
		border-bottom: var(--border);
		color: var(--color--text--tint-1);
		font-size: var(--font-size--sm);
	}

	td {
		padding: var(--spacing--xs);
		border-bottom: var(--border);
		vertical-align: top;
	}
}

.subText {
	display: block;
	margin-top: var(--spacing--5xs);
}

.actions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	align-items: flex-start;
}

.bindGroup {
	display: flex;
	gap: var(--spacing--xs);
	align-items: center;
}

.select {
	min-width: 220px;
}

.hint {
	display: block;
}
</style>
