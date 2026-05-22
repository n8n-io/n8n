<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useI18n } from '@n8n/i18n';
import type { ICredentialsDecryptedResponse, ICredentialsResponse } from '../../credentials.types';
import { ElCol, ElRow } from 'element-plus';
import { N8nIcon, N8nLink, N8nSpinner, N8nText } from '@n8n/design-system';
import { useCredentialsStore } from '../../credentials.store';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import type { CredentialUsageWorkflow } from '../../credentials.api';

type Props = {
	currentCredential: ICredentialsResponse | ICredentialsDecryptedResponse | null;
};

const props = defineProps<Props>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const toast = useToast();

const workflows = ref<CredentialUsageWorkflow[]>([]);
const inaccessibleCount = ref(0);
const isLoadingWorkflows = ref(false);

async function loadWorkflows(credentialId: string) {
	isLoadingWorkflows.value = true;
	try {
		const response = await credentialsStore.getWorkflowsUsingCredential(credentialId);
		workflows.value = response.workflows;
		inaccessibleCount.value = response.inaccessibleCount;
	} catch (error) {
		toast.showError(error, i18n.baseText('credentialEdit.credentialInfo.usedIn.loadError'));
		workflows.value = [];
		inaccessibleCount.value = 0;
	} finally {
		isLoadingWorkflows.value = false;
	}
}

onMounted(() => {
	if (props.currentCredential?.id) {
		void loadWorkflows(props.currentCredential.id);
	}
});

watch(
	() => props.currentCredential?.id,
	(id) => {
		if (id) {
			void loadWorkflows(id);
		} else {
			workflows.value = [];
			inaccessibleCount.value = 0;
		}
	},
);
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
		<ElRow v-if="currentCredential" :class="$style.usedInSection">
			<ElCol :span="8" :class="$style.label">
				<N8nText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.usedIn') }}
				</N8nText>
			</ElCol>
			<ElCol :span="16" :class="$style.valueLabel">
				<div v-if="isLoadingWorkflows" :class="$style.loading">
					<N8nSpinner size="small" />
					<N8nText :compact="true" color="text-light">
						{{ i18n.baseText('credentialEdit.credentialInfo.usedIn.loading') }}
					</N8nText>
				</div>
				<template v-else>
					<N8nText
						v-if="workflows.length === 0 && inaccessibleCount === 0"
						:compact="true"
						color="text-light"
						data-test-id="credential-usage-empty"
					>
						{{ i18n.baseText('credentialEdit.credentialInfo.usedIn.empty') }}
					</N8nText>
					<ul
						v-else-if="workflows.length > 0"
						:class="$style.workflowList"
						data-test-id="credential-usage-list"
					>
						<li
							v-for="workflow in workflows"
							:key="workflow.id"
							:class="$style.workflowItem"
							data-test-id="credential-usage-item"
						>
							<N8nLink
								:to="{ name: VIEWS.WORKFLOW, params: { workflowId: workflow.id } }"
								:new-window="true"
								theme="primary"
							>
								<span :class="$style.workflowLinkContent">
									<span :class="$style.workflowName">{{ workflow.name }}</span>
									<N8nIcon icon="external-link" size="xsmall" />
								</span>
							</N8nLink>
						</li>
					</ul>
					<N8nText
						v-if="inaccessibleCount > 0"
						:compact="true"
						color="text-light"
						size="small"
						:class="$style.inaccessibleNote"
						data-test-id="credential-usage-inaccessible"
					>
						{{
							i18n.baseText('credentialEdit.credentialInfo.usedIn.inaccessible', {
								adjustToNumber: inaccessibleCount,
								interpolate: { count: String(inaccessibleCount) },
							})
						}}
					</N8nText>
				</template>
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

.usedInSection {
	align-items: flex-start;
}

.workflowList {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.workflowItem {
	display: flex;
}

.workflowLinkContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.workflowName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 360px;
}

.loading {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.inaccessibleNote {
	display: block;
	margin-top: var(--spacing--3xs);
}
</style>
