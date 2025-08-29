<script setup lang="ts">
import { computed } from 'vue';
import N8nHeading from '@n8n/design-system/components/N8nHeading';
import NodeIcon from '@/components/NodeIcon.vue';
import CredentialPicker from '@/components/CredentialPicker/CredentialPicker.vue';
import IconSuccess from './IconSuccess.vue';
import { getAppNameFromNodeName } from '@/utils/nodeTypesUtils';
import { formatList } from '@/utils/formatters/listFormatter';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type {
	BaseNode,
	CredentialUsages,
} from '@/views/SetupWorkflowFromTemplateView/useCredentialSetupState';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import type { TemplateCredentialKey } from '@/utils/templates/templateTransforms';
import { I18nT } from 'vue-i18n';

// Props
const props = withDefaults(
	defineProps<{
		order: number;
		credentials: CredentialUsages;
		selectedCredentialId: string | null;
	}>(),
	{
		selectedCredentialId: null,
	},
);

const emit = defineEmits<{
	credentialSelected: [event: { credentialUsageKey: TemplateCredentialKey; credentialId: string }];
	credentialDeselected: [event: { credentialUsageKey: TemplateCredentialKey }];
}>();

// Stores
const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();
const telemetry = useTelemetry();

//#region Computed

const node = computed(() => props.credentials.usedBy[0]);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion),
);

const appName = computed(() =>
	nodeType.value ? getAppNameFromNodeName(nodeType.value.displayName) : node.value.type,
);

const nodeNames = computed(() => {
	const formatNodeName = (nodeToFormat: BaseNode) => `<b>${nodeToFormat.name}</b>`;
	return formatList(props.credentials.usedBy, {
		formatFn: formatNodeName,
		i18n,
	});
});

//#endregion Computed

//#region Methods

const onCredentialModalOpened = () => {
	telemetry.track('User opened Credential modal', {
		source: 'cred_setup',
		credentialType: props.credentials.credentialType,
		new_credential: !props.selectedCredentialId,
	});
};

//#endregion Methods
</script>

<template>
	<li :class="$style.container" data-test-id="setup-credentials-form-step">
		<N8nHeading tag="h2" size="large">
			<div v-if="nodeType" :class="$style.heading" data-test-id="credential-step-heading">
				<span :class="$style.headingOrder">{{ order }}.</span>
				<span :class="$style.headingIcon"><NodeIcon :node-type="nodeType" /></span>
				{{ appName }}
			</div>
		</N8nHeading>

		<p :class="$style.description" data-test-id="credential-step-description">
			<I18nT
				tag="span"
				keypath="templateSetup.credential.description"
				:plural="credentials.usedBy.length"
				scope="global"
			>
				<span v-n8n-html="nodeNames" />
			</I18nT>
		</p>

		<div :class="$style.credentials">
			<CredentialPicker
				:class="$style.credentialPicker"
				:app-name="appName"
				:credential-type="props.credentials.credentialType"
				:selected-credential-id="selectedCredentialId"
				@credential-selected="
					emit('credentialSelected', {
						credentialUsageKey: $props.credentials.key,
						credentialId: $event,
					})
				"
				@credential-deselected="
					emit('credentialDeselected', { credentialUsageKey: $props.credentials.key })
				"
				@credential-modal-opened="onCredentialModalOpened"
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
