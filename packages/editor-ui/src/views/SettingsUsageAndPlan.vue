<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { UsageTelemetry } from '@/stores/usage.store';
import { useUsageStore } from '@/stores/usage.store';
import { telemetry } from '@/plugins/telemetry';
import { i18n as locale } from '@/plugins/i18n';
import { useUIStore } from '@/stores/ui.store';
import { N8N_PRICING_PAGE_URL } from '@/constants';
import { useToast } from '@/composables/useToast';
import { hasPermission } from '@/utils/rbac/permissions';

const usageStore = useUsageStore();
const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();
const toast = useToast();

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
	toast.showError(
		error,
		locale.baseText('settings.usageAndPlan.license.activation.error.title'),
		error.message,
	);
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
	if (usageStore.isDesktop) {
		return;
	}

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
	void uiStore.goToUpgrade('usage_page', 'open');
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

const openPricingPage = () => {
	sendUsageTelemetry('desktop_view_plans');
	window.open(N8N_PRICING_PAGE_URL, '_blank');
};
</script>

<template>
	<div class="settings-usage-and-plan">
		<n8n-heading size="2xlarge">{{ locale.baseText('settings.usageAndPlan.title') }}</n8n-heading>
		<n8n-action-box
			v-if="usageStore.isDesktop"
			:class="$style.actionBox"
			:heading="locale.baseText('settings.usageAndPlan.desktop.title')"
			:description="locale.baseText('settings.usageAndPlan.desktop.description')"
			:button-text="locale.baseText('settings.usageAndPlan.button.plans')"
			@click:button="openPricingPage"
		/>
		<div v-if="!usageStore.isDesktop && !usageStore.isLoading">
			<n8n-heading :class="$style.title" size="large">
				<i18n-t keypath="settings.usageAndPlan.description" tag="span">
					<template #name>{{ usageStore.planName }}</template>
					<template #type>
						<span v-if="usageStore.planId">{{
							locale.baseText('settings.usageAndPlan.plan')
						}}</span>
						<span v-else>{{ locale.baseText('settings.usageAndPlan.edition') }}</span>
					</template>
				</i18n-t>
			</n8n-heading>

			<div :class="$style.quota">
				<n8n-text size="medium" color="text-light">
					{{ locale.baseText('settings.usageAndPlan.activeWorkflows') }}
				</n8n-text>
				<div :class="$style.chart">
					<span v-if="usageStore.executionLimit > 0" :class="$style.chartLine">
						<span
							:class="$style.chartBar"
							:style="{ width: `${usageStore.executionPercentage}%` }"
						></span>
					</span>
					<i18n-t
						tag="span"
						:class="$style.count"
						keypath="settings.usageAndPlan.activeWorkflows.count"
					>
						<template #count>{{ usageStore.executionCount }}</template>
						<template #limit>
							<span v-if="usageStore.executionLimit < 0">{{
								locale.baseText('settings.usageAndPlan.activeWorkflows.unlimited')
							}}</span>
							<span v-else>{{ usageStore.executionLimit }}</span>
						</template>
					</i18n-t>
				</div>
			</div>

			<n8n-info-tip>{{
				locale.baseText('settings.usageAndPlan.activeWorkflows.hint')
			}}</n8n-info-tip>

			<div :class="$style.buttons">
				<n8n-button
					v-if="canUserActivateLicense"
					:class="$style.buttonTertiary"
					type="tertiary"
					size="large"
					@click="onAddActivationKey"
				>
					<span>{{ locale.baseText('settings.usageAndPlan.button.activation') }}</span>
				</n8n-button>
				<n8n-button v-if="usageStore.managementToken" size="large" @click="onManagePlan">
					<a :href="managePlanUrl" target="_blank">{{
						locale.baseText('settings.usageAndPlan.button.manage')
					}}</a>
				</n8n-button>
				<n8n-button v-else size="large" @click.prevent="onViewPlans">
					<a :href="viewPlansUrl" target="_blank">{{
						locale.baseText('settings.usageAndPlan.button.plans')
					}}</a>
				</n8n-button>
			</div>

			<el-dialog
				v-model="activationKeyModal"
				width="480px"
				top="0"
				:title="locale.baseText('settings.usageAndPlan.dialog.activation.title')"
				:modal-class="$style.center"
				@closed="onDialogClosed"
				@opened="onDialogOpened"
			>
				<template #default>
					<n8n-input
						ref="activationKeyInput"
						v-model="activationKey"
						:placeholder="locale.baseText('settings.usageAndPlan.dialog.activation.label')"
					/>
				</template>
				<template #footer>
					<n8n-button type="secondary" @click="activationKeyModal = false">
						{{ locale.baseText('settings.usageAndPlan.dialog.activation.cancel') }}
					</n8n-button>
					<n8n-button @click="onLicenseActivation">
						{{ locale.baseText('settings.usageAndPlan.dialog.activation.activate') }}
					</n8n-button>
				</template>
			</el-dialog>
		</div>
	</div>
</template>

<style lang="scss" module>
@import '@/styles/variables';

.center > div {
	justify-content: center;
}

.actionBox {
	margin: var(--spacing-2xl) 0 0;
}

.spacedFlex {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.title {
	display: block;
	padding: var(--spacing-2xl) 0 var(--spacing-m);
}

.quota {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 54px;
	padding: 0 var(--spacing-s);
	margin: 0 0 var(--spacing-xs);
	background: var(--color-background-xlight);
	border-radius: var(--border-radius-large);
	border: 1px solid var(--color-foreground-base);
	white-space: nowrap;

	.count {
		text-transform: lowercase;
		font-size: var(--font-size-s);
	}
}

.buttons {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing-xl) 0 0;

	button {
		margin-left: var(--spacing-xs);

		a {
			display: inline-block;
			color: inherit;
			text-decoration: none;
			padding: var(--spacing-xs) var(--spacing-m);
			margin: calc(var(--spacing-xs) * -1) calc(var(--spacing-m) * -1);
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
	margin: 0 var(--spacing-m);
	border-radius: 10px;
	background: var(--color-background-base);
}

.chartBar {
	float: left;
	height: 100%;
	max-width: 100%;
	background: var(--color-secondary);
	border-radius: 10px;
	transition: width 0.2s $ease-out-expo;
}

div[class*='info'] > span > span:last-child {
	line-height: 1.4;
	padding: 0 0 0 var(--spacing-4xs);
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
					margin-left: var(--spacing-xs);
				}
			}
		}
	}
}
</style>
