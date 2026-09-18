<script setup lang="ts">
import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ContactInstanceAdminModal from './ContactInstanceAdminModal.vue';

const {
	nodeTypeName,
	scope,
	showReplace = true,
} = defineProps<{
	nodeTypeName: string;
	scope?: NodeTypeAvailabilityScope;
	showReplace?: boolean;
}>();

const emit = defineEmits<{ replaceNode: [] }>();

const DESCRIPTION_KEY: Record<NodeTypeAvailabilityScope, BaseTextKey> = {
	instance: 'typeAvailabilityPolicies.restrictedNode.description.instance',
	project: 'typeAvailabilityPolicies.restrictedNode.description.project',
};

const i18n = useI18n();
const isContactAdminOpen = ref(false);

const description = computed(() =>
	i18n.baseText(
		scope ? DESCRIPTION_KEY[scope] : 'typeAvailabilityPolicies.restrictedNode.description.generic',
		{ interpolate: { nodeType: nodeTypeName } },
	),
);
</script>

<template>
	<div :class="$style.panel" data-test-id="node-restricted-panel">
		<N8nIcon icon="lock" :class="$style.icon" />
		<N8nText size="large" color="text-dark" bold :class="$style.title">
			{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.title') }}
		</N8nText>
		<N8nText :class="$style.description">{{ description }}</N8nText>
		<div :class="$style.actions">
			<N8nButton
				variant="solid"
				size="small"
				icon="mail"
				data-test-id="node-restricted-contact-admin"
				@click="isContactAdminOpen = true"
			>
				{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.contactAdmin') }}
			</N8nButton>
			<N8nButton
				v-if="showReplace"
				variant="subtle"
				size="small"
				icon="arrow-left-right"
				data-test-id="node-restricted-replace"
				@click="emit('replaceNode')"
			>
				{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.replaceNode') }}
			</N8nButton>
		</div>
		<ContactInstanceAdminModal v-model:open="isContactAdminOpen" :node-type-name="nodeTypeName" />
	</div>
</template>

<style lang="scss" module>
.panel {
	height: 75%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xs);
	text-align: center;
	line-height: var(--line-height--md);
}

.icon {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--2xl);
}

.title {
	margin-top: var(--spacing--sm);
	margin-bottom: var(--spacing--xs);
}

.description {
	margin-bottom: var(--spacing--2xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
