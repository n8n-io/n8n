<script setup lang="ts">
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useI18n } from '@n8n/i18n';
import type {
	CredentialUsage,
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
} from '../../credentials.types';
import { computed } from 'vue';
import CredentialWorkflowUsageList from '../CredentialWorkflowUsageList.vue';
import { ElCol, ElRow } from 'element-plus';
import { N8nButton, N8nLoading, N8nText } from '@n8n/design-system';
type Props = {
	currentCredential: ICredentialsResponse | ICredentialsDecryptedResponse | null;
	credentialUsage?: CredentialUsage | null;
	credentialUsageLoading?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	credentialUsage: null,
	credentialUsageLoading: false,
});

const emit = defineEmits<{
	refreshUsage: [];
}>();

const i18n = useI18n();

const hasUsage = computed(() => (props.credentialUsage?.usageCount ?? 0) > 0);
const usageSummary = computed(() => {
	const count = props.credentialUsage?.usageCount ?? 0;
	if (!count) {
		return i18n.baseText('credentialUsage.summary.empty');
	}

	return i18n.baseText('credentialUsage.summary', {
		adjustToNumber: count,
		count,
	});
});
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
		<section :class="$style.usageSection">
			<div :class="$style.usageHeader">
				<N8nText tag="h3" size="small" bold>
					{{ i18n.baseText('credentialUsage.sectionLabel') }}
				</N8nText>
				<N8nButton
					size="small"
					theme="tertiary"
					type="tertiary"
					:disabled="!currentCredential"
					:loading="credentialUsageLoading"
					@click="emit('refreshUsage')"
				>
					{{ i18n.baseText('credentialUsage.refresh') }}
				</N8nButton>
			</div>
			<div v-if="credentialUsageLoading" :class="$style.usageLoading">
				<N8nLoading :text="i18n.baseText('credentialUsage.loading')" size="small" />
			</div>
			<div v-else>
				<N8nText :class="$style.usageSummary" size="small">
					{{ usageSummary }}
				</N8nText>
				<CredentialWorkflowUsageList
					v-if="hasUsage"
					:workflows="credentialUsage?.workflows ?? []"
				/>
			</div>
		</section>
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

.usageSection {
	margin-top: var(--spacing--xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.usageHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.usageSummary {
	margin-bottom: 0;
}

.usageLoading {
	display: flex;
	align-items: center;
}
</style>
