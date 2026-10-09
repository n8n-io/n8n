<script setup lang="ts">
import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ContactInstanceAdminModal from './ContactInstanceAdminModal.vue';
import { describeAgentToolRestriction } from '../composables/useNodeTypeRestriction';

const { nodeTypeName, scope } = defineProps<{
	nodeTypeName: string;
	scope?: NodeTypeAvailabilityScope;
}>();

const i18n = useI18n();

const isContactAdminOpen = ref(false);

const description = computed(() => describeAgentToolRestriction(nodeTypeName, scope));
</script>

<template>
	<div>
		<N8nCallout theme="warning" data-test-id="restricted-tool-callout">
			{{ description }}
			<template #trailingContent>
				<N8nButton
					variant="ghost"
					size="small"
					data-test-id="restricted-tool-contact-admin"
					@click="isContactAdminOpen = true"
				>
					{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.contactAdmin') }}
				</N8nButton>
			</template>
		</N8nCallout>
		<ContactInstanceAdminModal v-model:open="isContactAdminOpen" :node-type-name="nodeTypeName" />
	</div>
</template>
