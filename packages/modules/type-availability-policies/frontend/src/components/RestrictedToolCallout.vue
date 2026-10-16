<script setup lang="ts">
import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ContactAdminModal from './ContactAdminModal.vue';
import {
	describeAgentToolRestriction,
	getRestrictionContact,
} from '../composables/useNodeTypeRestriction';
import { CONTACT_ADMIN_COPY } from '../type-availability-policies.constants';

const {
	nodeTypeName,
	scope,
	optInAvailable = false,
} = defineProps<{
	nodeTypeName: string;
	scope?: NodeTypeAvailabilityScope;
	optInAvailable?: boolean;
}>();

const i18n = useI18n();

const isContactAdminOpen = ref(false);

const verdict = computed(() => ({ scope, optInAvailable }));
const audience = computed(() => getRestrictionContact(verdict.value));
const description = computed(() => describeAgentToolRestriction(nodeTypeName, verdict.value));
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
					{{ i18n.baseText(CONTACT_ADMIN_COPY[audience].action) }}
				</N8nButton>
			</template>
		</N8nCallout>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:node-type-name="nodeTypeName"
			:audience="audience"
		/>
	</div>
</template>
