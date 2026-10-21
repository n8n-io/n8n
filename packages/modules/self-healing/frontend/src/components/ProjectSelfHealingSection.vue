<script setup lang="ts">
import type { SelfHealingConfigurationDto } from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nAvatar,
	N8nButton,
	N8nDataTableServer,
	N8nIconButton,
	N8nSwitch,
	N8nText,
	N8nTimeAgo,
	useMessage,
	type TableHeader,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { SELF_HEALING_CONFIGURATION_VIEW } from '@n8n/frontend-constants/self-healing';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useSelfHealingStore } from '../self-healing.store';

const props = defineProps<{ projectId: string }>();
const store = useSelfHealingStore();
const rootStore = useRootStore();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const router = useRouter();
const route = useRoute();
const sectionRef = ref<HTMLElement | null>(null);

const loading = ref(false);
const isUpdating = ref(false);
const failed = ref(false);

const configurations = computed(() => store.configurations[props.projectId] ?? []);

const headers = computed<Array<TableHeader<SelfHealingConfigurationDto>>>(() => [
	{
		title: i18n.baseText('selfHealing.config.scope'),
		key: 'scope',
		width: 240,
		disableSort: true,
	},
	{
		title: i18n.baseText('selfHealing.config.peopleToNotify'),
		key: 'reviewerIds',
		width: 200,
		disableSort: true,
	},
	{
		title: i18n.baseText('selfHealing.config.lastActivity'),
		key: 'lastActivity',
		width: 200,
		disableSort: true,
	},
	{
		title: i18n.baseText('selfHealing.config.active'),
		key: 'enabled',
		width: 110,
		disableSort: true,
	},
	{ title: '', key: 'actions', align: 'end', width: 46, disableSort: true, value: () => undefined },
]);
const configActions = computed(() => [
	{ label: i18n.baseText('generic.edit'), value: 'edit' },
	{ label: i18n.baseText('generic.delete'), value: 'delete', destructive: true },
]);
const reviewersById = computed(
	() =>
		new Map(store.options[props.projectId]?.reviewers.map((reviewer) => [reviewer.id, reviewer])),
);

function scopeLabel(configuration: SelfHealingConfigurationDto) {
	if (configuration.scope === 'all') {
		return i18n.baseText('selfHealing.config.all');
	}

	return i18n.baseText('selfHealing.config.selectedCount', {
		adjustToNumber: configuration.workflowIds.length,
		interpolate: { count: configuration.workflowIds.length },
	});
}

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
		if (route.hash === '#self-healing') {
			await nextTick();
			sectionRef.value?.scrollIntoView({ block: 'start' });
		}
	}
}

watch(() => props.projectId, load, { immediate: true });

function edit(id: number | 'new') {
	void router.push({
		name: SELF_HEALING_CONFIGURATION_VIEW,
		params: { projectId: props.projectId, configurationId: String(id) },
	});
}

function reviewerName(id: string) {
	const user = reviewersById.value.get(id);
	return user
		? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
		: i18n.baseText('selfHealing.config.unavailableReviewer');
}

async function toggle(configuration: SelfHealingConfigurationDto) {
	isUpdating.value = true;

	try {
		await store.setEnabled(props.projectId, configuration.id, !configuration.enabled);
	} catch (error) {
		toast.showError(error, i18n.baseText('selfHealing.config.saveError'));
	} finally {
		isUpdating.value = false;
	}
}

async function remove(configuration: SelfHealingConfigurationDto) {
	const answer = await message.confirm(
		i18n.baseText('selfHealing.config.removeMessage'),
		i18n.baseText('selfHealing.config.removeTitle'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);

	if (answer !== 'confirm') {
		return;
	}

	isUpdating.value = true;

	try {
		await store.remove(props.projectId, configuration.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('selfHealing.config.removeError'));
	} finally {
		isUpdating.value = false;
	}
}

async function onAction(configuration: SelfHealingConfigurationDto, action: string) {
	if (action === 'edit') {
		edit(configuration.id);
	} else if (action === 'delete') {
		await remove(configuration);
	}
}
</script>

<template>
	<fieldset id="self-healing" ref="sectionRef" data-test-id="project-self-healing">
		<h3>
			<label>{{ i18n.baseText('selfHealing.config.heading') }}</label>
		</h3>
		<p v-if="loading">{{ i18n.baseText('selfHealing.config.loading') }}</p>
		<N8nButton v-else-if="failed" type="button" variant="outline" @click="load">{{
			i18n.baseText('selfHealing.config.retry')
		}}</N8nButton>
		<N8nText
			v-else-if="!configurations.length"
			size="small"
			color="text-light"
			:class="$style.empty"
			>{{ i18n.baseText('selfHealing.config.empty') }}</N8nText
		>
		<div v-else :class="$style.table">
			<N8nDataTableServer
				:items-per-page="configurations.length"
				:headers="headers"
				:items="configurations"
				:items-length="configurations.length"
				:page-sizes="[configurations.length + 1]"
			>
				<template #[`item.scope`]="{ item }">
					<N8nText size="medium" color="text-dark" data-test-id="self-healing-configuration-row">{{
						scopeLabel(item)
					}}</N8nText>
				</template>
				<template #[`item.reviewerIds`]="{ item }">
					<div :class="$style.people">
						<div v-for="id in item.reviewerIds" :key="id" :class="$style.person">
							<N8nAvatar
								:first-name="reviewersById.get(id)?.firstName"
								:last-name="reviewersById.get(id)?.lastName"
								size="xsmall"
							/>
							<N8nText
								size="medium"
								color="text-dark"
								:class="$style.personName"
								:title="reviewerName(id)"
								>{{ reviewerName(id) }}</N8nText
							>
						</div>
					</div>
				</template>
				<template #[`item.lastActivity`]="{ item }">
					<N8nText size="medium" :color="item.lastActivity ? 'text-dark' : 'text-light'">
						<N8nTimeAgo
							v-if="item.lastActivity"
							:date="item.lastActivity"
							:locale="rootStore.defaultLocale"
						/>
						<template v-else>{{ i18n.baseText('selfHealing.config.noActivity') }}</template>
					</N8nText>
				</template>
				<template #[`item.enabled`]="{ item }">
					<N8nSwitch
						:model-value="item.enabled"
						:disabled="isUpdating"
						:aria-label="i18n.baseText('selfHealing.config.enabled')"
						data-test-id="self-healing-config-active"
						@update:model-value="toggle(item)"
					/>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						:actions="configActions"
						placement="bottom"
						:disabled="isUpdating"
						data-test-id="self-healing-config-actions"
						@action="onAction(item, $event)"
					>
						<N8nIconButton
							icon="ellipsis"
							variant="ghost"
							size="small"
							:disabled="isUpdating"
							:aria-label="i18n.baseText('selfHealing.config.actions')"
						/>
					</N8nActionToggle>
				</template>
			</N8nDataTableServer>
		</div>
		<N8nButton
			variant="outline"
			size="large"
			icon="plus"
			type="button"
			data-test-id="self-healing-create"
			@click="edit('new')"
			>{{ i18n.baseText('selfHealing.config.create') }}</N8nButton
		>
	</fieldset>
</template>

<style module lang="scss">
.table {
	margin-bottom: var(--spacing--sm);

	:global(.table-scroll) {
		scrollbar-gutter: auto;
	}
}

.people {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) 0;
}

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.personName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty {
	display: block;
	margin-bottom: var(--spacing--sm);
}
</style>
