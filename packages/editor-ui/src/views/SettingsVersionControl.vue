<script lang="ts" setup>
import { i18n as locale } from '@/plugins/i18n';
import { useVersionControlStore } from '@/stores/versionControl';
import { useUIStore } from '@/stores/ui';

const versionControlStore = useVersionControlStore();
const uiStore = useUIStore();

const goToUpgrade = () => {
	uiStore.goToUpgrade('version-control', 'upgrade-version-control');
};
</script>

<template>
	<div>
		<n8n-heading size="2xlarge">{{ locale.baseText('settings.versionControl.title') }}</n8n-heading>
		<div
			v-if="versionControlStore.isEnterpriseVersionControlEnabled"
			data-test-id="version-control-content-licensed"
		></div>
		<n8n-action-box
			v-else
			data-test-id="version-control-content-unlicensed"
			:class="$style.actionBox"
			:description="locale.baseText('settings.versionControl.actionBox.description')"
			:buttonText="locale.baseText('settings.versionControl.actionBox.buttonText')"
			@click="goToUpgrade"
		>
			<template #heading>
				<span>{{ locale.baseText('settings.versionControl.actionBox.title') }}</span>
			</template>
		</n8n-action-box>
	</div>
</template>

<style lang="scss" module>
.actionBox {
	margin: var(--spacing-2xl) 0 0;
}
</style>
