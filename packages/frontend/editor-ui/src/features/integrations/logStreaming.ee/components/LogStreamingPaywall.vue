<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nEmptyState, N8nInfoTip } from '@n8n/design-system';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';

const i18n = useI18n();
const pageRedirectHelper = usePageRedirectionHelper();

function goToUpgrade() {
	void pageRedirectHelper.goToUpgrade('log-streaming', 'upgrade-log-streaming');
}
</script>

<template>
	<div>
		<div v-if="i18n.baseText('settings.log-streaming.infoText')" class="mb-l">
			<N8nInfoTip theme="info" type="note">
				<span v-n8n-html="i18n.baseText('settings.log-streaming.infoText')"></span>
			</N8nInfoTip>
		</div>
		<div data-test-id="action-box-unlicensed">
			<N8nEmptyState
				:description="i18n.baseText('settings.log-streaming.actionBox.description')"
				:button-text="i18n.baseText('settings.log-streaming.actionBox.button')"
				@click:button="goToUpgrade"
			>
				<template #heading>
					<span v-n8n-html="i18n.baseText('settings.log-streaming.actionBox.title')" />
				</template>
			</N8nEmptyState>
		</div>
	</div>
</template>
