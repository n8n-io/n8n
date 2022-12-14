<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';
import { Notification } from "element-ui";
import { UsageTelemetry, useUsageStore } from '@/stores/usage';
import { UsageState } from "@/Interface";
import { telemetry } from "@/plugins/telemetry";

const usageStore = useUsageStore();
const route = useRoute();
const router = useRouter();

const queryParamCallback = ref<string>(`callback=${encodeURIComponent(`${window.location.origin}${route.fullPath}`)}`);
const viewPlansUrl = computed(() => `${usageStore.viewPlansUrl}&${queryParamCallback.value}`);
const managePlanUrl = computed(() => `${usageStore.managePlanUrl}&${queryParamCallback.value}`);
const activationKeyModal = ref(false);
const activationKey = ref('');

const onLicenseActivation = () => {
	usageStore.activateLicense(activationKey.value).then(() => {
		activationKeyModal.value = false;
	});
};

onMounted(async () => {
	usageStore.setLoading(true);
	if(route.query.key) {
		await usageStore.activateLicense(route.query.key as string).then(() => {
			router.replace({ query: {} });
		});
	} else if(usageStore.canUserActivateLicense) {
		await usageStore.refreshLicenseManagementToken();
	} else {
		await usageStore.getLicenseInfo();
	}
	usageStore.setLoading(false);
});

watch(() => usageStore.error, (error: UsageState['error']) => {
	if(error?.message) {
		Notification.error({
			title: 'Error',
			message: error.message,
			position: 'bottom-right',
		});
	}
});

watch(() => usageStore.success, (success: UsageState['success']) => {
	if(success?.title && success?.message) {
		Notification.success({
			title: success.title,
			message: success.message,
			position: 'bottom-right',
		});
	}
});

const sendUsageTelemetry = (action: UsageTelemetry['action']) => {
	const telemetryPayload = usageStore.telemetryPayload;
	telemetryPayload.action = action;
	telemetry.track('User clicked button on usage page', telemetryPayload);
};

const onContactUs = () => {
	sendUsageTelemetry('contact_us');
};

const onAddActivationKey = () => {
	activationKeyModal.value = true;
	sendUsageTelemetry('add_activation_key');
};

const onViewPlans = () => {
	sendUsageTelemetry('view_plans');
};

const onManagePlan = () => {
	sendUsageTelemetry('manage_plan');
};

const onDialogClosed = () => {
	activationKey.value = '';
};

</script>

<template>
	<div v-if="!usageStore.isLoading">
		<n8n-heading size="2xlarge">{{ $locale.baseText('settings.usageAndPlan.title') }}</n8n-heading>
		<n8n-heading :class="$style.title" size="large">
			{{ $locale.baseText('settings.usageAndPlan.plan', { interpolate: {plan: usageStore.planName } } ) }}
		</n8n-heading>
		<div :class="$style.quota">
			<n8n-text size="medium" color="text-light">{{ $locale.baseText('settings.usageAndPlan.activeWorkflows') }}</n8n-text>
			<div :class="$style.chart">
				<span v-if="usageStore.executionLimit > 0" :class="$style.line">
					<span :class="$style.bar" :style="{ width: `${usageStore.executionPercentage}%` }"></span>
				</span>
				<i18n :class="$style.count" path="settings.usageAndPlan.activeWorkflows.count">
					<template #count>{{ usageStore.executionCount }}</template>
					<template #limit>
						<span v-if="usageStore.executionLimit < 0">{{ $locale.baseText('_reusableBaseText.unlimited') }}</span>
						<span v-else>{{ usageStore.executionLimit }}</span>
					</template>
				</i18n>
			</div>
		</div>
		<n8n-info-tip>
			<i18n path="settings.usageAndPlan.activeWorkflows.hint">
				<template #link>
					<a @click="onContactUs" href="https://n8n.io/contact" target="_blank">{{ $locale.baseText('_reusableBaseText.contactUs') }}</a>
				</template>
			</i18n>
		</n8n-info-tip>
		<div :class="$style.buttons">
			<n8n-button @click="onAddActivationKey" v-if="usageStore.canUserActivateLicense" type="primary" size="large" text :label="$locale.baseText('settings.usageAndPlan.button.activation')" />
			<n8n-button v-if="usageStore.managementToken" @click="onManagePlan" size="large">
				<a :href="managePlanUrl">{{ $locale.baseText('settings.usageAndPlan.button.manage') }}</a>
			</n8n-button>
			<n8n-button v-else @click="onViewPlans" size="large">
				<a :href="viewPlansUrl">{{ $locale.baseText('settings.usageAndPlan.button.plans') }}</a>
			</n8n-button>
		</div>
		<el-dialog
			width="480px"
			top="26vh"
			@closed="onDialogClosed"
			:visible.sync="activationKeyModal"
			:title="$locale.baseText('settings.usageAndPlan.dialog.activation.title')"
		>
			<template #default>
				<n8n-input
					v-model="activationKey"
					size="medium"
					:placeholder="$locale.baseText('settings.usageAndPlan.dialog.activation.label')"
				/>
			</template>
			<template #footer>
				<n8n-button @click="activationKeyModal = false" size="medium" type="secondary">
					{{ $locale.baseText('_reusableBaseText.cancel') }}
				</n8n-button>
				<n8n-button @click="onLicenseActivation" size="medium">
					{{ $locale.baseText('_reusableBaseText.activate') }}
				</n8n-button>
			</template>
		</el-dialog>
	</div>
</template>

<style lang="scss" module>
@import '@/styles/css-animation-helpers.scss';

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
	border: 1px solid var(--color-light-grey);
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

	.line {
		display: block;
		height: 10px;
		width: 100%;
		max-width: 260px;
		margin: 0 var(--spacing-m);
		border-radius: 10px;
		background: var(--color-background-base);

		.bar {
			float: left;
			height: 100%;
			background: var(--color-secondary);
			border-radius: 10px;
			transition: width 0.2s $ease-out-expo;
		}
	}
}

div[class*="info"] > span > span:last-child {
	line-height: 1.4;
	padding: 0 0 0 var(--spacing-4xs);
}
</style>

<style lang="scss" scoped>
:deep(.el-dialog) {
	.el-dialog__footer {
		button {
			margin-left: var(--spacing-xs);
		}
	}
}
</style>
