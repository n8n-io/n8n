<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router/composables';
import { useUsageStore } from '@/stores/usage';

const usageStore = useUsageStore();
const route = useRoute();

const viewPlansUrl = computed(() => `${usageStore.viewPlansUrl}&callback=${encodeURIComponent(`${window.location.origin}${route.fullPath}`)}`);
const activationKeyModal = ref(false);
const activationKey = ref('');

const onLicenseActivation = () => {
	activationKeyModal.value = false;
	usageStore.activateLicense(activationKey.value);
};

onMounted(async () => {
	if(route.query.activationKey) {
		await usageStore.activateLicense(route.query.activationKey as string);
	}

	if(usageStore.canUserActivateLicense) {
		await usageStore.refreshLicenseManagementToken();
	} else {
		await usageStore.getData();
	}
});

</script>

<template>
	<div  v-if="!usageStore.isLoading">
		<n8n-heading size="2xlarge">{{ $locale.baseText('settings.usageAndPlan.title') }}</n8n-heading>
		<n8n-heading :class="$style.title" size="large">
			{{ $locale.baseText('settings.usageAndPlan.plan', { interpolate: {plan: usageStore.planName } } ) }}
		</n8n-heading>
		<div :class="$style.quota">
			<n8n-text size="medium" color="text-light">{{ $locale.baseText('settings.usageAndPlan.activeWorkflows') }}</n8n-text>
			<i18n :class="$style.count" path="settings.usageAndPlan.activeWorkflows.count">
				<template #count>{{ usageStore.executionCount }}</template>
				<template #limit>
					<span v-if="usageStore.executionLimit < 0">{{ $locale.baseText('_reusableBaseText.unlimited') }}</span>
					<span v-else>{{ usageStore.executionLimit }}</span>
				</template>
			</i18n>
		</div>
		<n8n-info-tip>
			<i18n path="settings.usageAndPlan.activeWorkflows.hint">
				<template #link>
					<a href="https://n8n.io/contact" target="_blank">{{ $locale.baseText('_reusableBaseText.contactUs') }}</a>
				</template>
			</i18n>
		</n8n-info-tip>
		<div :class="$style.buttons">
			<n8n-button @click="activationKeyModal = !activationKeyModal" v-if="usageStore.canUserActivateLicense" type="secondary" size="large">
				{{ $locale.baseText('settings.usageAndPlan.button.activation') }}
			</n8n-button>
			<n8n-button v-if="usageStore.managementToken" size="large">
				<a :href="usageStore.managePlansUrl">{{ $locale.baseText('settings.usageAndPlan.button.manage') }}</a>
			</n8n-button>
			<n8n-button v-else size="large">
				<a :href="viewPlansUrl">{{ $locale.baseText('settings.usageAndPlan.button.plans') }}</a>
			</n8n-button>
		</div>
		<el-dialog
			:visible.sync="activationKeyModal"
			:title="$locale.baseText('settings.usageAndPlan.dialog.activation.title')"
		>
			<template #default>
				<n8n-input
					v-model="activationKey"
					:placeholder="$locale.baseText('settings.usageAndPlan.dialog.activation.label')"
				/>
			</template>
			<template #footer>
				<n8n-button @click="activationKeyModal = false" size="large" type="secondary">
					{{ $locale.baseText('_reusableBaseText.cancel') }}
				</n8n-button>
				<n8n-button @click="onLicenseActivation" size="large">
					{{ $locale.baseText('_reusableBaseText.activate') }}
				</n8n-button>
			</template>
		</el-dialog>
	</div>
</template>

<style lang="scss" module>
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
