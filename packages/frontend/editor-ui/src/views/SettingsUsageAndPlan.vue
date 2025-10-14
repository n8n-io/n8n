<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { UsageTelemetry } from '@/stores/usage.store';
import { useUsageStore } from '@/stores/usage.store';
import { telemetry } from '@/plugins/telemetry';
import { i18n as locale } from '@n8n/i18n';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { hasPermission } from '@/utils/rbac/permissions';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/constants';
import { useUsersStore } from '@/stores/users.store';
import { getResourcePermissions } from '@n8n/permissions';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { I18nT } from 'vue-i18n';

import { ElDialog } from 'element-plus';
import {
	N8nBadge,
	N8nButton,
	N8nHeading,
	N8nInfoTip,
	N8nInput,
	N8nNotice,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const usageStore = useUsageStore();
const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const toast = useToast();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const queryParamCallback = ref<string>(
	`callback=${encodeURIComponent(`${window.location.origin}${window.location.pathname}`)}`,
);
const viewPlansUrl = computed(
	() => `${usageStore.viewPlansUrl}&${queryParamCallback.value}&source=usage_page`,
);
const managePlanUrl = computed(() => `${usageStore.managePlanUrl}&${queryParamCallback.value}`);
const activationKeyModal = ref(false);
const activationKey = ref('');
const activationKeyInput = ref<HTMLInputElement | null>(null);

const canUserActivateLicense = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'license:manage' } }),
);

const badgedPlanName = computed(() => {
	const [badge, name] = usageStore.planName.split(' ');
	return {
		name,
		badge,
	};
});

const isCommunity = computed(() => usageStore.planName.toLowerCase() === 'community');

const isCommunityEditionRegistered = computed(
	() => usageStore.planName.toLowerCase() === 'registered community',
);

const canUserRegisterCommunityPlus = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).community.register,
);

const showActivationSuccess = () => {
	toast.showMessage({
		type: 'success',
		title: locale.baseText('settings.usageAndPlan.license.activation.success.title'),
		message: locale.baseText('settings.usageAndPlan.license.activation.success.message', {
			interpolate: {
				name: usageStore.planName,
				type: usageStore.planId
					? locale.baseText('settings.usageAndPlan.plan')
					: locale.baseText('settings.usageAndPlan.edition'),
			},
		}),
	});
};

const showActivationError = (error: Error) => {
	toast.showError(error, locale.baseText('settings.usageAndPlan.license.activation.error.title'));
};

const onLicenseActivation = async () => {
	try {
		await usageStore.activateLicense(activationKey.value);
		activationKeyModal.value = false;
		showActivationSuccess();
	} catch (error) {
		showActivationError(error);
	}
};

onMounted(async () => {
	documentTitle.set(locale.baseText('settings.usageAndPlan.title'));
	usageStore.setLoading(true);
	if (route.query.key) {
		try {
			await usageStore.activateLicense(route.query.key as string);
			await router.replace({ query: {} });
			showActivationSuccess();
			usageStore.setLoading(false);
			return;
		} catch (error) {
			showActivationError(error);
		}
	}
	try {
		if (!route.query.key && canUserActivateLicense.value) {
			await usageStore.refreshLicenseManagementToken();
		} else {
			await usageStore.getLicenseInfo();
		}
		usageStore.setLoading(false);
	} catch (error) {
		if (!error.name) {
			error.name = locale.baseText('settings.usageAndPlan.error');
		}
		toast.showError(error, error.name, error.message);
	}
});

const sendUsageTelemetry = (action: UsageTelemetry['action']) => {
	const telemetryPayload = usageStore.telemetryPayload;
	telemetryPayload.action = action;
	telemetry.track('User clicked button on usage page', telemetryPayload);
};

const onAddActivationKey = () => {
	activationKeyModal.value = true;
	sendUsageTelemetry('add_activation_key');
};

const onViewPlans = () => {
	void pageRedirectionHelper.goToUpgrade('usage_page', 'open');
	sendUsageTelemetry('view_plans');
};

const onManagePlan = () => {
	sendUsageTelemetry('manage_plan');
};

const onDialogClosed = () => {
	activationKey.value = '';
};

const onDialogOpened = () => {
	activationKeyInput.value?.focus();
};

const openCommunityRegisterModal = () => {
	uiStore.openModalWithData({
		name: COMMUNITY_PLUS_ENROLLMENT_MODAL,
		data: {
			customHeading: undefined,
		},
	});
};
</script>

<template>
	<div class="settings-usage-and-plan">
		<N8nHeading tag="h2" size="2xlarge">{{
			locale.baseText('settings.usageAndPlan.title')
		}}</N8nHeading>
		<div v-if="!usageStore.isLoading">
			<N8nHeading tag="h3" :class="$style.title" size="large">
				<I18nT keypath="settings.usageAndPlan.description" tag="span" scope="global">
					<template #name>{{ badgedPlanName.name ?? usageStore.planName }}</template>
					<template #type>
						<span v-if="usageStore.planId">{{
							locale.baseText('settings.usageAndPlan.plan')
						}}</span>
						<span v-else>{{ locale.baseText('settings.usageAndPlan.edition') }}</span>
					</template>
				</I18nT>
				<span v-if="badgedPlanName.badge && badgedPlanName.name" :class="$style.titleTooltip">
					<N8nTooltip placement="top">
						<template #content>
							<I18nT
								v-if="isCommunityEditionRegistered"
								keypath="settings.usageAndPlan.license.communityRegistered.tooltip"
								scope="global"
							>
							</I18nT>
						</template>
						<N8nBadge>{{ badgedPlanName.badge }}</N8nBadge>
					</N8nTooltip>
				</span>
			</N8nHeading>

			<N8nNotice v-if="isCommunity && canUserRegisterCommunityPlus" class="mt-0" theme="warning">
				<I18nT keypath="settings.usageAndPlan.callOut" scope="global">
					<template #link>
						<N8nButton
							class="pl-0 pr-0"
							text
							:label="locale.baseText('settings.usageAndPlan.callOut.link')"
							@click="openCommunityRegisterModal"
						/>
					</template>
				</I18nT>
			</N8nNotice>

			<div :class="$style.quota">
				<N8nText size="medium" color="text-light">
					{{ locale.baseText('settings.usageAndPlan.activeWorkflows') }}
				</N8nText>
				<div :class="$style.chart">
					<span v-if="usageStore.activeWorkflowTriggersLimit > 0" :class="$style.chartLine">
						<span
							:class="$style.chartBar"
							:style="{ width: `${usageStore.executionPercentage}%` }"
						></span>
					</span>
					<I18nT
						tag="span"
						:class="$style.count"
						keypath="settings.usageAndPlan.activeWorkflows.count"
						scope="global"
					>
						<template #count>{{ usageStore.activeWorkflowTriggersCount }}</template>
						<template #limit>
							<span v-if="usageStore.activeWorkflowTriggersLimit < 0">{{
								locale.baseText('settings.usageAndPlan.activeWorkflows.unlimited')
							}}</span>
							<span v-else>{{ usageStore.activeWorkflowTriggersLimit }}</span>
						</template>
					</I18nT>
				</div>
			</div>

			<N8nInfoTip>{{ locale.baseText('settings.usageAndPlan.activeWorkflows.hint') }}</N8nInfoTip>

			<div :class="$style.buttons">
				<N8nButton
					v-if="canUserActivateLicense"
					:class="$style.buttonTertiary"
					type="tertiary"
					size="large"
					@click="onAddActivationKey"
				>
					<span>{{ locale.baseText('settings.usageAndPlan.button.activation') }}</span>
				</N8nButton>
				<N8nButton v-if="usageStore.managementToken" size="large" @click="onManagePlan">
					<a :href="managePlanUrl" target="_blank">{{
						locale.baseText('settings.usageAndPlan.button.manage')
					}}</a>
				</N8nButton>
				<N8nButton v-else size="large" @click.prevent="onViewPlans">
					<a :href="viewPlansUrl" target="_blank">{{
						locale.baseText('settings.usageAndPlan.button.plans')
					}}</a>
				</N8nButton>
			</div>

			<ElDialog
				v-model="activationKeyModal"
				width="480px"
				top="0"
				:title="locale.baseText('settings.usageAndPlan.dialog.activation.title')"
				:modal-class="$style.center"
				@closed="onDialogClosed"
				@opened="onDialogOpened"
			>
				<template #default>
					<N8nInput
						ref="activationKeyInput"
						v-model="activationKey"
						:placeholder="locale.baseText('settings.usageAndPlan.dialog.activation.label')"
					/>
				</template>
				<template #footer>
					<N8nButton type="secondary" @click="activationKeyModal = false">
						{{ locale.baseText('settings.usageAndPlan.dialog.activation.cancel') }}
					</N8nButton>
					<N8nButton @click="onLicenseActivation">
						{{ locale.baseText('settings.usageAndPlan.dialog.activation.activate') }}
					</N8nButton>
				</template>
			</ElDialog>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@/styles/variables' as *;

.center > div {
	justify-content: center;
}

.actionBox {
	margin: var(--spacing--2xl) 0 0;
}

.spacedFlex {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.title {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xl) 0 var(--spacing--md);
}

.quota {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 54px;
	padding: 0 var(--spacing--sm);
	margin: 0 0 var(--spacing--xs);
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: 1px solid var(--color--foreground);
	white-space: nowrap;

	.count {
		text-transform: lowercase;
		font-size: var(--font-size--sm);
	}
}

.buttons {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing--xl) 0 0;

	button {
		margin-left: var(--spacing--xs);

		a {
			display: inline-block;
			color: inherit;
			text-decoration: none;
			padding: var(--spacing--xs) var(--spacing--md);
			margin: calc(var(--spacing--xs) * -1) calc(var(--spacing--md) * -1);
		}
	}
}

.chart {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-grow: 1;
}

.chartLine {
	display: block;
	height: 10px;
	width: 100%;
	max-width: 260px;
	margin: 0 var(--spacing--md);
	border-radius: 10px;
	background: var(--color--background);
}

.chartBar {
	float: left;
	height: 100%;
	max-width: 100%;
	background: var(--color--secondary);
	border-radius: 10px;
	transition: width 0.2s $ease-out-expo;
}

div[class*='info'] > span > span:last-child {
	line-height: 1.4;
	padding: 0 0 0 var(--spacing--4xs);
}

.titleTooltip {
	display: flex;
	align-items: center;
	margin: 0 0 0 var(--spacing--2xs);
}
</style>

<style lang="scss" scoped>
.settings-usage-and-plan {
	:deep(.el-dialog__wrapper) {
		display: flex;
		align-items: center;
		justify-content: center;

		.el-dialog {
			margin: 0;

			.el-dialog__footer {
				button {
					margin-left: var(--spacing--xs);
				}
			}
		}
	}
}
</style>
