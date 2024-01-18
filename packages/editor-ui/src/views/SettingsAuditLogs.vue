<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { useAuditLogsStore } from '@/stores/auditLogs.store';
import { useUIStore } from '@/stores/ui.store';

const locale = useI18n();
const uiStore = useUIStore();
const auditLogsStore = useAuditLogsStore();

const goToUpgrade = () => {
	void uiStore.goToUpgrade('audit-logs', 'upgrade-audit-logs');
};
</script>

<template>
	<div>
		<n8n-heading size="2xlarge" tag="h1">{{
			locale.baseText('settings.auditLogs.title')
		}}</n8n-heading>
		<div
			v-if="auditLogsStore.isEnterpriseAuditLogsFeatureEnabled"
			data-test-id="audit-logs-content-licensed"
		></div>
		<n8n-action-box
			v-else
			data-test-id="audit-logs-content-unlicensed"
			:class="$style.actionBox"
			:description="locale.baseText('settings.auditLogs.actionBox.description')"
			:button-text="locale.baseText('settings.auditLogs.actionBox.buttonText')"
			@click:button="goToUpgrade"
		>
			<template #heading>
				<span>{{ locale.baseText('settings.auditLogs.actionBox.title') }}</span>
			</template>
		</n8n-action-box>
	</div>
</template>

<style lang="scss" module>
.actionBox {
	margin: var(--spacing-2xl) 0 0;
}
</style>
