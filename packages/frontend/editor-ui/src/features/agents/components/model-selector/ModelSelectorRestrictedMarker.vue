<script setup lang="ts">
import type { CredentialTypeAvailabilityScope } from '@n8n/api-types';
import { RestrictedNodePopover } from '@n8n/frontend-module-type-availability-policies';
import { computed, useTemplateRef } from 'vue';

defineProps<{
	name: string;
	scope?: CredentialTypeAvailabilityScope;
}>();

const emit = defineEmits<{ contactAdmin: [] }>();

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
			:scope="scope"
			:anchor="row"
			@contact-admin="emit('contactAdmin')"
		/>
	</span>
</template>

<style lang="scss" module>
.root {
	display: contents;
}
</style>
