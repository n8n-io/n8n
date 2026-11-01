<script setup lang="ts">
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ContactAdminModal from './ContactAdminModal.vue';
import {
	describeTypeRestriction,
	useRestrictionContact,
	type OptionalVerdict,
	type RestrictedCalloutSurface,
} from '../composables/useNodeTypeRestriction';

const { surface, typeName, restriction } = defineProps<{
	surface: RestrictedCalloutSurface;
	typeName: string;
	restriction?: OptionalVerdict;
}>();

const i18n = useI18n();

const isContactAdminOpen = ref(false);

const { copy: contactCopy } = useRestrictionContact(() => restriction);
const description = computed(() => describeTypeRestriction(surface, typeName, restriction));
</script>

<template>
	<div>
		<N8nCallout theme="warning" :data-test-id="`restricted-${surface}-callout`">
			{{ description }}
			<template #trailingContent>
				<N8nButton
					variant="ghost"
					size="small"
					:data-test-id="`restricted-${surface}-contact-admin`"
					@click="isContactAdminOpen = true"
				>
					{{ i18n.baseText(contactCopy.action) }}
				</N8nButton>
			</template>
		</N8nCallout>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:kind="surface === 'credential' ? 'credential' : 'node'"
			:node-type-name="typeName"
			:audience="contactCopy.audience"
		/>
	</div>
</template>
