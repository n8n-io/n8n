<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUsageStore } from '@/stores/usage.store';
import { i18n as locale } from '@/plugins/i18n';
import { useToast } from '@/composables/useToast';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { hasPermission } from '@/utils/rbac/permissions';
import N8nInfoTip from '@n8n/design-system/components/N8nInfoTip';

const usageStore = useUsageStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const documentTitle = useDocumentTitle();

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

const isCommunityEditionRegistered = computed(
	() => usageStore.planName.toLowerCase() === 'registered community',
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
</script>

<template>
	<div class="settings-usage-and-plan">
		<n8n-heading tag="h2" size="2xlarge">{{
			locale.baseText('settings.usageAndPlan.title')
		}}</n8n-heading>
		<div v-if="!usageStore.isLoading">
			<n8n-heading tag="h3" :class="$style.title" size="large">
				<i18n-t keypath="settings.usageAndPlan.description" tag="span">
					<template #name>{{ badgedPlanName.name ?? usageStore.planName }}</template>
					<template #type>
						<span v-if="usageStore.planId">{{
							locale.baseText('settings.usageAndPlan.plan')
						}}</span>
						<span v-else>{{ locale.baseText('settings.usageAndPlan.edition') }}</span>
					</template>
				</i18n-t>
				<span v-if="badgedPlanName.badge && badgedPlanName.name" :class="$style.titleTooltip">
					<N8nTooltip placement="top">
						<template #content>
							<i18n-t
								v-if="isCommunityEditionRegistered"
								keypath="settings.usageAndPlan.license.communityRegistered.tooltip"
							>
							</i18n-t>
						</template>
						<N8nBadge>{{ badgedPlanName.badge }}</N8nBadge>
					</N8nTooltip>
				</span>
			</n8n-heading>

			<div :class="$style.quota">
				<n8n-text size="medium" color="text-light">
					{{ locale.baseText('settings.usageAndPlan.activeWorkflows') }}
				</n8n-text>
				<div :class="$style.chart">
					<span v-if="usageStore.activeWorkflowTriggersLimit > 0" :class="$style.chartLine">
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
						<template #count>{{ usageStore.activeWorkflowTriggersCount }}</template>
						<template #limit>
							<span v-if="usageStore.activeWorkflowTriggersLimit < 0">{{
								locale.baseText('settings.usageAndPlan.activeWorkflows.unlimited')
							}}</span>
							<span v-else>{{ usageStore.activeWorkflowTriggersLimit }}</span>
						</template>
					</i18n-t>
				</div>
			</div>

			<N8nInfoTip>{{ locale.baseText('settings.usageAndPlan.activeWorkflows.hint') }}</N8nInfoTip>
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
	display: flex;
	align-items: center;
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

.titleTooltip {
	display: flex;
	align-items: center;
	margin: 0 0 0 var(--spacing-2xs);
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
