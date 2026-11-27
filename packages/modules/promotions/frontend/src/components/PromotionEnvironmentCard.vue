<script setup lang="ts">
import {
	N8nActionToggle,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nSettingsRow,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { usePromotionCheckout } from '../composables/usePromotionCheckout';
import type { PromotionEnvironment } from '../promotionsSettings.api';
import { PROMOTION_INSTANCE_APPLY_VIEW } from '../promotions.constants';
import {
	promotionDirectionIcon,
	promotionEnvironmentBranch,
	promotionProviderIcon,
} from '../promotionsSettings.utils';
import PromoteInstanceDialog from './PromoteInstanceDialog.vue';
import PromotionMissingProjectsButton from './PromotionMissingProjectsButton.vue';

const props = defineProps<{
	environment: PromotionEnvironment;
	busy?: 'connect' | 'remove';
	connectError?: string;
	canConnect: boolean;
}>();

const emit = defineEmits<{
	connect: [];
	edit: [];
	remove: [];
}>();

const i18n = useI18n();
const router = useRouter();
const { permissions } = usePromotionCheckout();

const dialogOpen = ref(false);

const branch = computed(() => promotionEnvironmentBranch(props.environment));

const canRun = computed(() =>
	props.environment.direction === 'apply' ? !!permissions.value.apply : !!permissions.value.promote,
);

// Test connection sits in the menu: it is optional, and the button row has no room for it.
const actions = computed(() => [
	{ label: i18n.baseText('generic.edit'), value: 'edit' as const },
	...(props.canConnect
		? [
				{
					label: i18n.baseText('settings.promotions.environment.testConnection'),
					value: 'connect' as const,
				},
			]
		: []),
	{
		label: i18n.baseText('settings.promotions.environment.remove'),
		value: 'remove' as const,
		destructive: true,
		divided: true,
	},
]);

// Apply opens its preview page, so users review the whole Apply first. Promote asks in a dialog.
async function run() {
	if (props.environment.direction === 'apply') {
		await router.push({ name: PROMOTION_INSTANCE_APPLY_VIEW });
		return;
	}
	dialogOpen.value = true;
}

function onAction(action: 'edit' | 'connect' | 'remove') {
	if (action === 'edit') emit('edit');
	else if (action === 'connect') emit('connect');
	else emit('remove');
}
</script>

<template>
	<div>
		<N8nSettingsRow :show-divider="false">
			<template #info>
				<div :style="{ display: 'flex', alignItems: 'center', gap: 'var(--spacing--2xs)' }">
					<N8nIcon
						:icon="promotionDirectionIcon[environment.direction]"
						color="text-dark"
						size="small"
					/>
					<N8nText bold size="medium" color="text-dark">
						{{ i18n.baseText(`settings.promotions.environments.${environment.direction}.title`) }}
					</N8nText>
				</div>
			</template>
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
				<div :class="$style.details">
					<div :class="$style.providerIcon">
						<N8nIcon
							:icon="promotionProviderIcon[environment.provider.type]"
							color="text-dark"
							size="xlarge"
						/>
					</div>
					<div :class="$style.description">
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
						<!-- No status from the local checkout: each main has its own, so it differs between mains. -->
						<N8nText
							v-if="busy === 'connect'"
							role="status"
							:class="$style.connectState"
							size="small"
							color="text-light"
							data-test-id="promotion-environment-connecting"
						>
							{{ i18n.baseText('settings.promotions.environment.testingConnection') }}
						</N8nText>
						<N8nText
							v-else-if="connectError"
							role="alert"
							:class="$style.connectState"
							size="small"
							color="danger"
							data-test-id="promotion-environment-connect-error"
						>
							{{ connectError }}
						</N8nText>
					</div>
				</div>
			</template>
		</N8nSettingsRow>
		<!-- No info here: the buttons get the whole row, and wrap when they do not fit. -->
		<N8nSettingsRow :show-divider="false" action-max-width="100%">
			<template #action>
				<div :class="$style.actions">
					<N8nButton
						v-if="connectError && canConnect"
						variant="outline"
						size="small"
						:loading="busy === 'connect'"
						:disabled="busy === 'remove'"
						data-test-id="promotion-environment-retry"
						@click="emit('connect')"
					>
						{{ i18n.baseText('generic.retry') }}
					</N8nButton>
					<PromotionMissingProjectsButton
						v-if="environment.direction === 'apply'"
						:environment-id="environment.id"
						:environment-name="environment.name"
						:busy="!!busy"
					/>
					<N8nButton
						v-if="canRun"
						size="small"
						:disabled="!!busy"
						:data-test-id="`${environment.direction}-instance-button`"
						@click="run"
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
	</div>
</template>

<style lang="scss" module>
.details {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: start;
	gap: var(--spacing--2xs);
}

.providerIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border: var(--border-width) solid var(--border-color--subtle);
	border-radius: var(--radius--2xs);
}

.description {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.remote {
	overflow-wrap: anywhere;
}

.connectState {
	margin-block-start: var(--spacing--3xs);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
