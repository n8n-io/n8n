<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { N8nHeading, N8nInfoTip, N8nCheckbox, N8nNotice } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useDocumentTitle } from '@/composables/useDocumentTitle';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();

const allowSendingSchema = ref(true);
const allowSendingActualData = ref(true);

const onAllowSendingActualDataChange = (newValue: boolean) => {
	toast.showMessage({
		title: i18n.baseText('settings.ai.updated.succcess'),
		type: 'success',
	});
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.ai'));
});
</script>

<template>
	<div :class="$style.container" data-test-id="ai">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.ai') }}</N8nHeading>
			<N8nInfoTip theme="info" type="note">
				<span v-n8n-html="i18n.baseText('settings.ai.description')"></span>
			</N8nInfoTip>
		</div>
		<div :class="$style.content">
			<N8nCheckbox
				v-model="allowSendingSchema"
				:disabled="true"
				:label="i18n.baseText('settings.ai.allowSendingSchema.label')"
				:tooltip-text="i18n.baseText('settings.ai.allowSendingSchema.description')"
			/>
			<N8nCheckbox
				v-model="allowSendingActualData"
				:label="i18n.baseText('settings.ai.allowSendingActualData.label')"
				:tooltip-text="i18n.baseText('settings.ai.allowSendingActualData.description')"
				@change="onAllowSendingActualDataChange"
			/>
			<N8nNotice v-if="!allowSendingActualData" type="warning" :closable="false">
				{{ i18n.baseText('settings.ai.efficiencyNotice') }}
			</N8nNotice>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--md);
}
</style>
