<script setup lang="ts">
import type { SelfHealingConfigurationDto } from '@n8n/api-types';
import { N8nButton, N8nText, useMessage } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useSelfHealingStore } from '../self-healing.store';

const props = defineProps<{ projectId: string }>();
const store = useSelfHealingStore();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const router = useRouter();

const loading = ref(false);
const busyConfigurationId = ref<number | null>(null);
const failed = ref(false);

const configurations = computed(() => store.configurations[props.projectId] ?? []);

async function load() {
	loading.value = true;
	failed.value = false;

	try {
		await store.load(props.projectId);
	} catch (error) {
		failed.value = true;
		toast.showError(error, i18n.baseText('selfHealing.config.loadError'));
	} finally {
		loading.value = false;
	}
}

watch(() => props.projectId, load, { immediate: true });

function edit(id: number | 'new') {
	void router.push({
		name: 'self-healing-configuration',
		params: { projectId: props.projectId, configurationId: String(id) },
	});
}

function reviewerNames(configuration: SelfHealingConfigurationDto) {
	return configuration.reviewerIds
		.map((id) => {
			const user = store.options[props.projectId]?.reviewers.find((reviewer) => reviewer.id === id);

			return user
				? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
				: i18n.baseText('selfHealing.config.unavailableReviewer');
		})
		.join(', ');
}

async function toggle(configuration: SelfHealingConfigurationDto) {
	busyConfigurationId.value = configuration.id;

	try {
		await store.setEnabled(props.projectId, configuration.id, !configuration.enabled);
	} catch (error) {
		toast.showError(error, i18n.baseText('selfHealing.config.saveError'));
	} finally {
		busyConfigurationId.value = null;
	}
}

async function remove(configuration: SelfHealingConfigurationDto) {
	const answer = await message.confirm(
		i18n.baseText('selfHealing.config.removeMessage'),
		i18n.baseText('selfHealing.config.removeTitle'),
		{
			confirmButtonText: i18n.baseText('selfHealing.config.remove'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);

	if (answer !== 'confirm') {
		return;
	}

	busyConfigurationId.value = configuration.id;

	try {
		await store.remove(props.projectId, configuration.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('selfHealing.config.removeError'));
	} finally {
		busyConfigurationId.value = null;
	}
}
</script>

<template>
	<fieldset id="self-healing" data-test-id="project-self-healing" :class="$style.section">
		<div :class="$style.header">
			<h3>{{ i18n.baseText('selfHealing.config.heading') }}</h3>
			<N8nButton
				type="button"
				variant="outline"
				data-test-id="self-healing-create"
				@click="edit('new')"
				>{{ i18n.baseText('selfHealing.config.create') }}</N8nButton
			>
		</div>
		<N8nText color="text-light">{{ i18n.baseText('selfHealing.config.description') }}</N8nText>
		<p v-if="loading">{{ i18n.baseText('selfHealing.config.loading') }}</p>
		<N8nButton v-else-if="failed" type="button" variant="outline" @click="load">{{
			i18n.baseText('selfHealing.config.retry')
		}}</N8nButton>
		<p v-else-if="!configurations.length">{{ i18n.baseText('selfHealing.config.empty') }}</p>
		<div v-else :class="$style.tableContainer">
			<table :class="$style.table">
				<thead>
					<tr>
						<th>{{ i18n.baseText('selfHealing.config.workflows') }}</th>
						<th>{{ i18n.baseText('selfHealing.config.reviewers') }}</th>
						<th>{{ i18n.baseText('selfHealing.config.status') }}</th>
						<th>{{ i18n.baseText('selfHealing.config.lastActivity') }}</th>
						<th>{{ i18n.baseText('selfHealing.config.actions') }}</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="configuration in configurations"
						:key="configuration.id"
						data-test-id="self-healing-configuration-row"
					>
						<td>
							<N8nButton type="button" variant="ghost" @click="edit(configuration.id)">{{
								configuration.scope === 'all'
									? i18n.baseText('selfHealing.config.all')
									: i18n.baseText('selfHealing.config.selectedCount', {
											interpolate: { count: configuration.workflowIds.length },
										})
							}}</N8nButton>
						</td>
						<td>{{ reviewerNames(configuration) }}</td>
						<td>
							{{
								i18n.baseText(
									configuration.enabled ? 'selfHealing.config.active' : 'selfHealing.config.paused',
								)
							}}
						</td>
						<td>
							{{
								configuration.lastActivity
									? new Date(configuration.lastActivity).toLocaleString()
									: i18n.baseText('selfHealing.config.noActivity')
							}}
						</td>
						<td :class="$style.actions">
							<N8nButton
								type="button"
								variant="ghost"
								:disabled="busyConfigurationId !== null"
								@click="toggle(configuration)"
								>{{
									i18n.baseText(
										configuration.enabled
											? 'selfHealing.config.pause'
											: 'selfHealing.config.resume',
									)
								}}</N8nButton
							>
							<N8nButton
								type="button"
								variant="ghost"
								:disabled="busyConfigurationId !== null"
								@click="remove(configuration)"
								>{{ i18n.baseText('selfHealing.config.remove') }}</N8nButton
							>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</fieldset>
</template>

<style module lang="scss">
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.header,
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
.header {
	justify-content: space-between;
}
.tableContainer {
	overflow-x: auto;
}
.table {
	width: 100%;
	border-collapse: collapse;
	text-align: left;
	th,
	td {
		padding: var(--spacing--xs);
		border-bottom: var(--border);
	}
}
</style>
