<script setup lang="ts">
import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ContactAdminModal from './ContactAdminModal.vue';
import {
	describeNodeTypeRestriction,
	getRestrictionContact,
} from '../composables/useNodeTypeRestriction';
import { CONTACT_ADMIN_COPY } from '../type-availability-policies.constants';

const {
	nodeTypeName,
	scope,
	optInAvailable = false,
	showReplace = true,
} = defineProps<{
	nodeTypeName: string;
	scope?: NodeTypeAvailabilityScope;
	optInAvailable?: boolean;
	showReplace?: boolean;
}>();

const emit = defineEmits<{ replaceNode: [] }>();

const i18n = useI18n();

const isContactAdminOpen = ref(false);

const verdict = computed(() => ({ scope, optInAvailable }));
const audience = computed(() => getRestrictionContact(verdict.value));
const description = computed(() =>
	describeNodeTypeRestriction(nodeTypeName, verdict.value, showReplace ? 'replace' : 'contact'),
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
				{{ i18n.baseText(CONTACT_ADMIN_COPY[audience].action) }}
			</N8nButton>
			<N8nButton
				v-if="showReplace"
				variant="outline"
				size="small"
				icon="arrow-left-right"
				data-test-id="node-restricted-replace"
				@click="emit('replaceNode')"
			>
				{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.replaceNode') }}
			</N8nButton>
		</div>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:node-type-name="nodeTypeName"
			:audience="audience"
		/>
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
