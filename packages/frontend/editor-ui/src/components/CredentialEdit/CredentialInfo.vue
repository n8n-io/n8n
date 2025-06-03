<script setup lang="ts">
import TimeAgo from '../TimeAgo.vue';
import { useI18n } from '@n8n/i18n';
import type { ICredentialsDecryptedResponse, ICredentialsResponse } from '@/Interface';
import { N8nText } from '@n8n/design-system';

type Props = {
	currentCredential: ICredentialsResponse | ICredentialsDecryptedResponse | null;
};

defineProps<Props>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container">
		<el-row v-if="currentCredential">
			<el-col :span="8" :class="$style.label">
				<N8nText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.created') }}
				</N8nText>
			</el-col>
			<el-col :span="16" :class="$style.valueLabel">
				<N8nText :compact="true"
					><TimeAgo :date="currentCredential.createdAt" :capitalize="true"
				/></N8nText>
			</el-col>
		</el-row>
		<el-row v-if="currentCredential">
			<el-col :span="8" :class="$style.label">
				<N8nText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.lastModified') }}
				</N8nText>
			</el-col>
			<el-col :span="16" :class="$style.valueLabel">
				<N8nText :compact="true"
					><TimeAgo :date="currentCredential.updatedAt" :capitalize="true"
				/></N8nText>
			</el-col>
		</el-row>
		<el-row v-if="currentCredential">
			<el-col :span="8" :class="$style.label">
				<N8nText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.id') }}
				</N8nText>
			</el-col>
			<el-col :span="16" :class="$style.valueLabel">
				<N8nText :compact="true">{{ currentCredential.id }}</N8nText>
			</el-col>
		</el-row>
	</div>
</template>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-l);
	}
}

.label {
	font-weight: var(--font-weight-bold);
	max-width: 230px;
}

.accessLabel {
	composes: label;
	margin-top: var(--spacing-5xs);
}

.valueLabel {
	font-weight: var(--font-weight-regular);
}
</style>
