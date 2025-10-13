<script setup lang="ts">
import TimeAgo from '../TimeAgo.vue';
import { useI18n } from '@n8n/i18n';
import type { ICredentialsDecryptedResponse, ICredentialsResponse } from '@/Interface';
import { ElCol, ElRow } from 'element-plus';
import { N8nText } from '@n8n/design-system';
type Props = {
	currentCredential: ICredentialsResponse | ICredentialsDecryptedResponse | null;
};

defineProps<Props>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container">
		<ElRow v-if="currentCredential">
			<ElCol :span="8" :class="$style.label">
				<N8nText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.created') }}
				</N8nText>
			</ElCol>
			<ElCol :span="16" :class="$style.valueLabel">
				<N8nText :compact="true"
					><TimeAgo :date="currentCredential.createdAt" :capitalize="true"
				/></N8nText>
			</ElCol>
		</ElRow>
		<ElRow v-if="currentCredential">
			<ElCol :span="8" :class="$style.label">
				<N8nText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.lastModified') }}
				</N8nText>
			</ElCol>
			<ElCol :span="16" :class="$style.valueLabel">
				<N8nText :compact="true"
					><TimeAgo :date="currentCredential.updatedAt" :capitalize="true"
				/></N8nText>
			</ElCol>
		</ElRow>
		<ElRow v-if="currentCredential">
			<ElCol :span="8" :class="$style.label">
				<N8nText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.id') }}
				</N8nText>
			</ElCol>
			<ElCol :span="16" :class="$style.valueLabel">
				<N8nText :compact="true">{{ currentCredential.id }}</N8nText>
			</ElCol>
		</ElRow>
	</div>
</template>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing--lg);
	}
}

.label {
	font-weight: var(--font-weight--bold);
	max-width: 230px;
}

.accessLabel {
	composes: label;
	margin-top: var(--spacing--5xs);
}

.valueLabel {
	font-weight: var(--font-weight--regular);
}
</style>
