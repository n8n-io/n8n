<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { WorkflowSetupSection } from '../workflowSetup.types';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import WorkflowSetupSectionBody from './WorkflowSetupSectionBody.vue';

const props = defineProps<{
	section: WorkflowSetupSection;
}>();

const ctx = useWorkflowSetupContext();
const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();

const credentialType = computed(() => props.section.credentialType);

const isComplete = computed(() => ctx.isSectionComplete(props.section));
const isSkipped = computed(() => ctx.isSectionSkipped(props.section));

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.section.node.type, props.section.node.typeVersion),
);

const isCredentialOnlySection = computed(
	() => !!credentialType.value && props.section.parameterNames.length === 0,
);

const displayName = computed(() => {
	const credentialTypeName = credentialType.value;
	if (!isCredentialOnlySection.value || !credentialTypeName) return props.section.node.name;
	const raw =
		credentialsStore.getCredentialTypeByName(credentialTypeName)?.displayName ?? credentialTypeName;
	const appName = getAppNameFromCredType(raw);
	return i18n.baseText('instanceAi.credential.setupTitle', { interpolate: { name: appName } });
});
</script>

<template>
	<div :class="$style.card" data-test-id="instance-ai-workflow-setup-card">
		<header :class="$style.header">
			<CredentialIcon
				v-if="isCredentialOnlySection"
				:credential-type-name="credentialType ?? null"
				:size="16"
			/>
			<NodeIcon v-else :node-type="nodeType" :size="16" />
			<N8nText :class="$style.title" size="medium" color="text-dark" bold>
				{{ displayName }}
			</N8nText>
			<N8nText
				v-if="isComplete"
				data-test-id="instance-ai-workflow-setup-card-check"
				:class="$style.statusLabel"
				size="medium"
				color="success"
			>
				<N8nIcon icon="check" size="large" />
				{{ i18n.baseText('generic.complete') }}
			</N8nText>
			<N8nText
				v-else-if="isSkipped"
				data-test-id="instance-ai-workflow-setup-card-skipped"
				:class="$style.statusLabel"
				size="medium"
				color="text-light"
			>
				<N8nIcon icon="arrow-right" size="large" />
				{{ i18n.baseText('instanceAi.workflowSetup.cardSkipped') }}
			</N8nText>
		</header>

		<div :class="$style.bodyWrapper">
			<WorkflowSetupSectionBody :section="section" />
		</div>

		<slot name="footer" />
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm);
}

.title {
	flex: 1;
}

.statusLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.bodyWrapper {
	padding: 0 var(--spacing--sm);
}
</style>
