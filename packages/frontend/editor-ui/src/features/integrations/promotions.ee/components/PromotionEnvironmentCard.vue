<script setup lang="ts">
import {
	N8nActionToggle,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nSettingsRow,
	N8nStatusDot,
	N8nText,
	N8nTooltip,
	type StatusDotVariant,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { usePromotionCheckout } from '../composables/usePromotionCheckout';
import {
	PROTOTYPE_MISSING_PROJECTS,
	type PrototypeMissingProject,
} from '../prototypeMissingProjects';
import type { PromotionEnvironment } from '../promotionsSettings.api';
import { promotionEnvironmentBranch, promotionProviderIcon } from '../promotionsSettings.utils';
import ApplyInstanceDialog from './ApplyInstanceDialog.vue';
import ApplyNewProjectsDialog from './ApplyNewProjectsDialog.vue';
import PromoteInstanceDialog from './PromoteInstanceDialog.vue';

const props = withDefaults(
	defineProps<{
		environment: PromotionEnvironment;
		busy?: 'retry' | 'remove';
		connectError?: string;
		canConnect: boolean;
		/** Projects on the apply branch that do not exist on this instance yet. */
		missingProjects?: PrototypeMissingProject[];
	}>(),
	{ missingProjects: () => PROTOTYPE_MISSING_PROJECTS },
);

const emit = defineEmits<{
	retry: [];
	edit: [];
	remove: [];
}>();

const i18n = useI18n();
const { permissions } = usePromotionCheckout();

const dialogOpen = ref(false);
const newProjectsOpen = ref(false);

const branch = computed(() => promotionEnvironmentBranch(props.environment));

const status = computed(() => {
	const { hasCheckout, matchesEnvironment } = props.environment.checkout;
	if (!hasCheckout) return 'notConnected';
	return matchesEnvironment ? 'connected' : 'outOfDate';
});

const statusDotVariant: Record<typeof status.value, StatusDotVariant> = {
	connected: 'success',
	outOfDate: 'warning',
	notConnected: 'danger',
};

const canRun = computed(() =>
	props.environment.direction === 'apply' ? !!permissions.value.apply : !!permissions.value.promote,
);

const hasNewProjects = computed(() => props.missingProjects.length > 0);

const newProjectsSummary = computed(() =>
	hasNewProjects.value
		? i18n.baseText('settings.promotions.apply.newProjects.summary', {
				adjustToNumber: props.missingProjects.length,
				interpolate: { count: props.missingProjects.length, name: props.environment.name },
			})
		: i18n.baseText('settings.promotions.apply.newProjects.empty', {
				interpolate: { name: props.environment.name },
			}),
);

const canApplyNewProjects = computed(
	() => hasNewProjects.value && status.value === 'connected' && canRun.value && !props.busy,
);

const newProjectsButtonLabel = computed(() =>
	hasNewProjects.value
		? i18n.baseText('settings.promotions.apply.newProjects.dialog.confirm', {
				adjustToNumber: props.missingProjects.length,
				interpolate: { count: props.missingProjects.length },
			})
		: i18n.baseText('settings.promotions.apply.newProjects.button'),
);

const actions = computed(() => [
	{ label: i18n.baseText('generic.edit'), value: 'edit' as const },
	{
		label: i18n.baseText('settings.promotions.environment.remove'),
		value: 'remove' as const,
		destructive: true,
	},
]);

function onAction(action: 'edit' | 'remove') {
	if (action === 'edit') emit('edit');
	else emit('remove');
}
</script>

<template>
	<div>
		<N8nSettingsRow
			:title="i18n.baseText(`settings.promotions.environments.${environment.direction}.title`)"
			:show-divider="false"
		>
			<template #action>
				<N8nActionToggle
					:actions="actions"
					:disabled="!!busy"
					data-test-id="promotion-environment-menu"
					@action="onAction"
				>
					<N8nIconButton
						variant="ghost"
						icon="ellipsis"
						size="small"
						:disabled="!!busy"
						:aria-label="i18n.baseText('settings.promotions.environment.menu')"
					/>
				</N8nActionToggle>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow :show-divider="false">
			<template #info>
				<N8nText bold color="text-dark">{{ environment.name }}</N8nText>
				<N8nText :class="$style.remote" size="small" color="text-light">
					{{
						i18n.baseText('settings.promotions.environment.remoteSummary', {
							interpolate: {
								type: i18n.baseText(
									`settings.promotions.providers.type.${environment.provider.type}`,
								),
								remoteUrl: environment.remote.remoteUrl,
								branch,
							},
						})
					}}
				</N8nText>
				<div role="status" :class="$style.status" data-test-id="promotion-environment-status">
					<div :class="$style.state">
						<N8nStatusDot :variant="statusDotVariant[status]" />
						<N8nText size="small" color="text-dark">
							{{ i18n.baseText(`settings.promotions.environment.status.${status}`) }}
						</N8nText>
					</div>
					<N8nText v-if="status === 'outOfDate'" size="small" color="warning">
						{{ i18n.baseText('settings.promotions.environment.status.outOfDate.description') }}
					</N8nText>
					<N8nText v-if="status !== 'connected' && connectError" size="small" color="danger">
						{{ connectError }}
					</N8nText>
				</div>
			</template>
			<template #visual>
				<N8nIcon
					:icon="promotionProviderIcon[environment.provider.type]"
					color="text-dark"
					size="xlarge"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow :show-divider="false">
			<template #action>
				<div :class="$style.actions">
					<N8nButton
						v-if="status !== 'connected' && canConnect"
						variant="outline"
						size="small"
						:loading="busy === 'retry'"
						:disabled="busy === 'remove'"
						data-test-id="promotion-environment-retry"
						@click="emit('retry')"
					>
						{{
							i18n.baseText(
								status === 'outOfDate'
									? 'settings.promotions.environment.reconnect'
									: 'generic.retry',
							)
						}}
					</N8nButton>
					<N8nTooltip v-if="environment.direction === 'apply'" :content="newProjectsSummary">
						<span :class="{ [$style.disabledTooltipTarget]: !canApplyNewProjects }">
							<N8nButton
								variant="outline"
								size="small"
								:disabled="!canApplyNewProjects"
								data-test-id="apply-new-projects-button"
								@click="newProjectsOpen = true"
							>
								{{ newProjectsButtonLabel }}
							</N8nButton>
						</span>
					</N8nTooltip>
					<N8nButton
						v-if="canRun"
						size="small"
						:disabled="status !== 'connected' || !!busy"
						:data-test-id="`${environment.direction}-instance-button`"
						@click="dialogOpen = true"
					>
						{{ i18n.baseText(`settings.promotions.${environment.direction}.button`) }}
					</N8nButton>
				</div>
			</template>
		</N8nSettingsRow>

		<PromoteInstanceDialog
			v-if="dialogOpen && environment.direction === 'promote'"
			:open="dialogOpen"
			:environment-id="environment.id"
			:base-branch-name="environment.settings.baseBranchName"
			:create-branch-on-promotion="environment.settings.createBranchOnPromotion"
			:provider-type="environment.provider.type"
			@update:open="dialogOpen = $event"
		/>
		<ApplyInstanceDialog
			v-if="dialogOpen && environment.direction === 'apply'"
			:open="dialogOpen"
			:environment-id="environment.id"
			:branch-name="environment.settings.branchName"
			@update:open="dialogOpen = $event"
		/>
		<ApplyNewProjectsDialog
			v-if="newProjectsOpen && environment.direction === 'apply'"
			:open="newProjectsOpen"
			:environment-name="environment.name"
			:projects="missingProjects"
			@update:open="newProjectsOpen = $event"
		/>
	</div>
</template>

<style lang="scss" module>
.remote {
	overflow-wrap: anywhere;
}

.status {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.state {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}

/* A disabled button does not receive hover, so the wrapper keeps the tooltip. */
.disabledTooltipTarget {
	display: inline-flex;

	button {
		pointer-events: none;
	}
}
</style>
