<script setup lang="ts">
import type { CredentialTypeAvailability } from '@n8n/api-types';
import {
	RestrictedNodePopover,
	type ContactAudience,
} from '@n8n/frontend-module-type-availability-policies';
import { computed, useTemplateRef } from 'vue';

defineProps<{
	name: string;
	restriction?: CredentialTypeAvailability;
}>();

const emit = defineEmits<{ contactAdmin: [audience: ContactAudience] }>();

const rootRef = useTemplateRef<HTMLElement>('rootRef');
// The popover opens on hover of the whole menu row, which the dropdown slot does not hand over.
const row = computed(() => rootRef.value?.closest<HTMLElement>('[role="menuitem"]') ?? undefined);
</script>

<template>
	<span ref="rootRef" :class="$style.root">
		<RestrictedNodePopover
			kind="credential"
			side="right"
			marker-size="xsmall"
			:node-type-name="name"
			:restriction="restriction"
			:anchor="row"
			@contact-admin="(audience) => emit('contactAdmin', audience)"
		/>
	</span>
</template>

<style lang="scss" module>
.root {
	display: contents;
}
</style>
