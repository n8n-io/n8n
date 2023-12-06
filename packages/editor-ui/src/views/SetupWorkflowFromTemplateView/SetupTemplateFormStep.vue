<script setup lang="ts">
import type { PropType } from 'vue';
import { computed } from 'vue';
import N8nHeading from 'n8n-design-system/components/N8nHeading';
import NodeIcon from '@/components/NodeIcon.vue';
import CredentialPicker from '@/components/CredentialPicker/CredentialPicker.vue';
import IconSuccess from './IconSuccess.vue';
import { getAppNameFromNodeName } from '@/utils/nodeTypesUtils';
import { formatList } from '@/utils/formatters/listFormatter';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { CredentialUsages } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import { useSetupTemplateStore } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import type { IWorkflowTemplateNode } from '@/Interface';
import { useI18n } from '@/composables/useI18n';

// Props
const props = defineProps({
	order: {
		type: Number,
		required: true,
	},
	credentials: {
		type: Object as PropType<CredentialUsages>,
		required: true,
	},
});

// Stores
const setupTemplateStore = useSetupTemplateStore();
const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();

//#region Computed

const node = computed(() => props.credentials.usedBy[0]);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion),
);

const appName = computed(() =>
	nodeType.value ? getAppNameFromNodeName(nodeType.value.displayName) : node.value.type,
);

const nodeNames = computed(() => {
	const formatNodeName = (nodeToFormat: IWorkflowTemplateNode) => `<b>${nodeToFormat.name}</b>`;
	return formatList(props.credentials.usedBy, {
		formatFn: formatNodeName,
		i18n,
	});
});

const selectedCredentialId = computed(
	() => setupTemplateStore.selectedCredentialIdByKey[props.credentials.key],
);

//#endregion Computed

//#region Methods

const onCredentialSelected = (credentialId: string) => {
	setupTemplateStore.setSelectedCredentialId(props.credentials.key, credentialId);
};

const onCredentialDeselected = () => {
	setupTemplateStore.unsetSelectedCredential(props.credentials.key);
};

//#endregion Methods
</script>

<template>
	<li :class="$style.container" data-test-id="setup-credentials-form-step">
		<n8n-heading tag="h2" size="large">
			<div v-if="nodeType" :class="$style.heading" data-test-id="credential-step-heading">
				<span :class="$style.headingOrder">{{ order }}.</span>
				<span :class="$style.headingIcon"><NodeIcon :node-type="nodeType" /></span>
				{{ appName }}
			</div>
		</n8n-heading>

		<p :class="$style.description" data-test-id="credential-step-description">
			<i18n-t
				tag="span"
				keypath="templateSetup.credential.description"
				:plural="credentials.usedBy.length"
				scope="global"
			>
				<span v-html="nodeNames" />
			</i18n-t>
		</p>

		<div :class="$style.credentials">
			<CredentialPicker
				:class="$style.credentialPicker"
				:app-name="appName"
				:credentialType="props.credentials.credentialType"
				:selectedCredentialId="selectedCredentialId"
				@credential-selected="onCredentialSelected"
				@credential-deselected="onCredentialDeselected"
			/>

			<IconSuccess
				:class="{
					[$style.credentialOk]: true,
					[$style.invisible]: !selectedCredentialId,
				}"
			/>
		</div>
	</li>
</template>

<style lang="scss" module>
.container {
	list-style: none;
}

.heading {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing-2xs);
}

.headingOrder {
	font-weight: var(--font-weight-bold);
	margin-right: var(--spacing-xs);
}

.headingIcon {
	margin-right: var(--spacing-2xs);
}

.description {
	margin-bottom: var(--spacing-l);
	font-size: var(--font-size-s);
	color: var(--color-text-base);
}

.credentials {
	max-width: 400px;
	display: flex;
	align-items: center;
}

.credentialPicker {
	flex: 1;
}

.credentialOk {
	margin-left: var(--spacing-2xs);
	font-size: 24px;
}

.invisible {
	visibility: hidden;
}
</style>
