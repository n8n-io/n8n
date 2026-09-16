<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nStatusDot,
	N8nText,
	type UserAction,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { IUser } from 'n8n-workflow';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';

import { SELF_HEALING_SETTINGS_HASH } from '../selfHealing.constants';
import { useSelfHealingStore } from '../selfHealing.store';
import type { SelfHealingConfig } from '../selfHealing.types';
import SelfHealingConfigDialog from './SelfHealingConfigDialog.vue';

type ConfigAction = 'edit' | 'pause' | 'resume' | 'delete';

const props = defineProps<{
	projectId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const route = useRoute();
const store = useSelfHealingStore();

const sectionRef = ref<HTMLElement | null>(null);
const dialogOpen = ref(false);
const editingConfig = ref<SelfHealingConfig | null>(null);

const configs = computed(() => store.getProjectConfigs(props.projectId));

function scopeLabel(config: SelfHealingConfig): string {
	const excluded = config.excludedWorkflowIds.length;
	return excluded === 0
		? i18n.baseText('selfHealing.scope.all')
		: i18n.baseText('selfHealing.scope.allExcept', { interpolate: { count: String(excluded) } });
}

function autonomyLabel(config: SelfHealingConfig): string {
	return i18n.baseText(`selfHealing.autonomy.${config.autonomy}.label`);
}

function statusLabel(config: SelfHealingConfig): string {
	return i18n.baseText(`selfHealing.status.${config.status}`);
}

function actionsFor(config: SelfHealingConfig): Array<UserAction<IUser>> {
	return [
		{ label: i18n.baseText('generic.edit'), value: 'edit' },
		config.status === 'active'
			? { label: i18n.baseText('selfHealing.projectSettings.action.pause'), value: 'pause' }
			: { label: i18n.baseText('selfHealing.projectSettings.action.resume'), value: 'resume' },
		{ label: i18n.baseText('generic.delete'), value: 'delete' },
	];
}

function openCreate() {
	editingConfig.value = null;
	dialogOpen.value = true;
}

function openEdit(config: SelfHealingConfig) {
	editingConfig.value = config;
	dialogOpen.value = true;
}

async function onAction(config: SelfHealingConfig, action: string) {
	switch (action as ConfigAction) {
		case 'edit':
			openEdit(config);
			break;
		case 'pause':
			store.setConfigStatus(props.projectId, config.id, 'paused');
			break;
		case 'resume':
			store.setConfigStatus(props.projectId, config.id, 'active');
			break;
		case 'delete': {
			const confirmed = await message.confirm(
				i18n.baseText('selfHealing.projectSettings.delete.message', {
					interpolate: { name: config.name },
				}),
				i18n.baseText('selfHealing.projectSettings.delete.headline'),
				{
					type: 'warning',
					confirmButtonText: i18n.baseText('generic.delete'),
					cancelButtonText: i18n.baseText('generic.cancel'),
				},
			);
			if (confirmed !== MODAL_CONFIRM) return;
			store.deleteConfig(props.projectId, config.id);
			toast.showMessage({
				title: i18n.baseText('selfHealing.projectSettings.deleted'),
				type: 'success',
			});
			break;
		}
	}
}

function onSaved() {
	toast.showMessage({
		title: i18n.baseText('selfHealing.projectSettings.saved'),
		type: 'success',
	});
}

// The workflow settings modal deep-links here, so bring the section into view.
onMounted(async () => {
	if (route.hash !== SELF_HEALING_SETTINGS_HASH) return;
	await nextTick();
	sectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
</script>

<template>
	<fieldset
		:id="SELF_HEALING_SETTINGS_HASH.slice(1)"
		ref="sectionRef"
		data-test-id="project-self-healing-section"
	>
		<h3>
			<label>{{ i18n.baseText('selfHealing.title') }}</label>
		</h3>
		<N8nText color="text-light" size="small" :class="$style.help">
			{{ i18n.baseText('selfHealing.projectSettings.description') }}
		</N8nText>

		<div v-if="configs.length > 0" :class="$style.list" data-test-id="self-healing-config-list">
			<div :class="[$style.row, $style.headerRow]" aria-hidden="true">
				<N8nText size="xsmall" color="text-light" bold>
					{{ i18n.baseText('selfHealing.projectSettings.column.name') }}
				</N8nText>
				<N8nText size="xsmall" color="text-light" bold>
					{{ i18n.baseText('selfHealing.projectSettings.column.scope') }}
				</N8nText>
				<N8nText size="xsmall" color="text-light" bold>
					{{ i18n.baseText('selfHealing.projectSettings.column.autonomy') }}
				</N8nText>
				<N8nText size="xsmall" color="text-light" bold>
					{{ i18n.baseText('selfHealing.projectSettings.column.status') }}
				</N8nText>
				<span />
			</div>

			<div
				v-for="config in configs"
				:key="config.id"
				:class="$style.row"
				data-test-id="self-healing-config-row"
			>
				<div :class="$style.nameCell">
					<N8nText size="small" bold color="text-dark" :class="$style.truncate">
						{{ config.name }}
					</N8nText>
					<N8nText
						v-if="config.customInstructions"
						size="xsmall"
						color="text-light"
						:class="$style.truncate"
						:title="config.customInstructions"
					>
						{{ config.customInstructions }}
					</N8nText>
				</div>
				<N8nText size="small" color="text-base">{{ scopeLabel(config) }}</N8nText>
				<div>
					<N8nBadge theme="tertiary" :show-border="false">{{ autonomyLabel(config) }}</N8nBadge>
				</div>
				<div :class="$style.statusCell">
					<N8nStatusDot :variant="config.status === 'active' ? 'success' : 'warning'" />
					<N8nText size="small" color="text-base">{{ statusLabel(config) }}</N8nText>
				</div>
				<N8nActionToggle
					:actions="actionsFor(config)"
					placement="bottom-end"
					theme="dark"
					data-test-id="self-healing-config-actions"
					@action="onAction(config, $event)"
				/>
			</div>
		</div>
		<N8nText
			v-else
			size="small"
			color="text-light"
			:class="$style.empty"
			data-test-id="self-healing-config-empty"
		>
			{{ i18n.baseText('selfHealing.projectSettings.empty') }}
		</N8nText>

		<N8nButton
			variant="subtle"
			size="small"
			icon="plus"
			native-type="button"
			:label="i18n.baseText('selfHealing.projectSettings.add')"
			data-test-id="self-healing-add-config"
			@click="openCreate"
		/>

		<SelfHealingConfigDialog
			v-model:open="dialogOpen"
			:project-id="projectId"
			:config="editingConfig"
			@saved="onSaved"
		/>
	</fieldset>
</template>

<style lang="scss" module>
.help {
	display: block;
	margin-bottom: var(--spacing--sm);
}

.list {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius);
	margin-bottom: var(--spacing--sm);
	overflow: hidden;
}

.row {
	display: grid;
	grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto auto var(--spacing--xl);
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);

	&:first-child {
		border-top: none;
	}
}

.headerRow {
	background-color: var(--color--background--light-2);
	padding-top: var(--spacing--2xs);
	padding-bottom: var(--spacing--2xs);
}

.nameCell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.truncate {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.statusCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	white-space: nowrap;
}

.empty {
	display: block;
	margin-bottom: var(--spacing--sm);
}
</style>
