<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nButton, N8nText } from '@n8n/design-system';
import {
	ContactAdminModal,
	describeTypeRestriction,
	getNodeTypeRestrictionKind,
	useRestrictionContact,
	type TypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';

import NodeIcon from '@/app/components/NodeIcon.vue';
import type { INodeUi } from '@/Interface';
import { nodeViewEventBus } from '@/app/event-bus';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';

const props = defineProps<{
	node: INodeUi;
	restriction: TypeRestriction;
	isTrigger: boolean;
	/** A read-only canvas cannot replace nodes, so the card offers only the contact action. */
	isReadOnly?: boolean;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const { copy: contactCopy } = useRestrictionContact(() => props.restriction);

const isContactAdminOpen = ref(false);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion),
);
const nodeTypeName = computed(() => nodeType.value?.displayName ?? props.node.type);
const description = computed(() =>
	describeTypeRestriction('replaceToSave', nodeTypeName.value, props.restriction),
);
const highlightNodeIds = computed(() => [props.node.id]);

const contactKind = computed(() => getNodeTypeRestrictionKind(props.node.type, props.restriction));
const contactTypeName = computed(() =>
	contactKind.value === 'credential'
		? (credentialsStore.getCredentialTypeByName(props.restriction.name)?.displayName ??
			props.restriction.name)
		: nodeTypeName.value,
);

function onReplaceNode() {
	nodeViewEventBus.emit('replaceNode', props.node.id);
}
</script>

<template>
	<SetupCard
		v-model:expanded="expanded"
		:is-complete="false"
		:title="node.name"
		:is-trigger="isTrigger"
		:highlight-node-ids="highlightNodeIds"
		pin-header-extra
		card-test-id="restricted-node-setup-card"
	>
		<template #icon>
			<NodeIcon :node-type="nodeType" :size="16" disabled />
		</template>

		<template #header-extra>
			<N8nBadge leading-icon="lock" data-test-id="setup-card-restricted-badge">
				{{ i18n.baseText('node.restricted') }}
			</N8nBadge>
		</template>

		<template #card-description>
			<N8nText
				size="medium"
				color="text-base"
				class="pl-xs pr-xs"
				data-test-id="setup-card-restricted-description"
			>
				{{ description }}
			</N8nText>
		</template>

		<template #footer-actions>
			<div :class="$style.actions">
				<N8nButton
					variant="ghost"
					size="small"
					data-test-id="setup-card-contact-admin"
					@click="isContactAdminOpen = true"
				>
					{{ i18n.baseText(contactCopy.action) }}
				</N8nButton>
				<N8nButton
					v-if="!isReadOnly"
					variant="solid"
					size="small"
					data-test-id="setup-card-replace-node"
					@click="onReplaceNode"
				>
					{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.replaceNode') }}
				</N8nButton>
			</div>
			<ContactAdminModal
				v-model:open="isContactAdminOpen"
				:kind="contactKind"
				:type-name="contactTypeName"
				:audience="contactCopy.audience"
			/>
		</template>
	</SetupCard>
</template>

<style module lang="scss">
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
