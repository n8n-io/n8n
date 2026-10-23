<script setup lang="ts">
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ContactAdminModal from './ContactAdminModal.vue';
import {
	describeAgentToolRestriction,
	useRestrictionContact,
	type OptionalVerdict,
} from '../composables/useNodeTypeRestriction';

const { nodeTypeName, restriction } = defineProps<{
	nodeTypeName: string;
	restriction?: OptionalVerdict;
}>();

const i18n = useI18n();

const isContactAdminOpen = ref(false);

const { copy: contactCopy } = useRestrictionContact(() => restriction);
const description = computed(() => describeAgentToolRestriction(nodeTypeName, restriction));
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
					{{ i18n.baseText(contactCopy.action) }}
				</N8nButton>
			</template>
		</N8nCallout>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:node-type-name="nodeTypeName"
			:audience="contactCopy.audience"
		/>
	</div>
</template>
