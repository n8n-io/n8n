<script setup lang="ts">
import {
	N8nActionToggle,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nSettingsRow,
	N8nStatusDot,
	N8nText,
	type StatusDotVariant,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { usePromotionCheckout } from '../composables/usePromotionCheckout';
import type { PromotionEnvironment } from '../promotionsSettings.api';
import { promotionEnvironmentBranch, promotionProviderIcon } from '../promotionsSettings.utils';
import ApplyInstanceDialog from './ApplyInstanceDialog.vue';
import PromoteInstanceDialog from './PromoteInstanceDialog.vue';

const props = defineProps<{
	environment: PromotionEnvironment;
	busy?: 'retry' | 'remove';
	connectError?: string;
	canClone: boolean;
}>();

const emit = defineEmits<{
	retry: [];
	edit: [];
	remove: [];
}>();

const i18n = useI18n();
const { permissions } = usePromotionCheckout();

const dialogOpen = ref(false);

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
	props.environment.direction === 'apply' ? !!permissions.value.pull : !!permissions.value.push,
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
			<template #info>
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
			<template #action>
				<div :class="$style.actions">
					<N8nButton
						v-if="status !== 'connected' && canClone"
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
			:environment-name="environment.name"
			:create-branch-on-promotion="environment.settings.createBranchOnPromotion"
			:provider-type="environment.provider.type"
			@update:open="dialogOpen = $event"
		/>
		<ApplyInstanceDialog
			v-if="dialogOpen && environment.direction === 'apply'"
			:open="dialogOpen"
			:environment-id="environment.id"
			:branch-name="environment.settings.branchName"
			:environment-name="environment.name"
			@update:open="dialogOpen = $event"
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
</style>
