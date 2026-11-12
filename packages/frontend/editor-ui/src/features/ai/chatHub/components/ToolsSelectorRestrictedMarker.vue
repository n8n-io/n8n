<script setup lang="ts">
import {
	RestrictedNodePopover,
	type ContactAudience,
	type TypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';
import { computed, useTemplateRef } from 'vue';

defineProps<{
	nodeTypeName: string;
	restriction: TypeRestriction;
}>();

const emit = defineEmits<{ contactAdmin: [audience: ContactAudience] }>();

const rootRef = useTemplateRef<HTMLElement>('rootRef');
// The popover opens on hover of the whole menu row, which the dropdown slot does not hand over.
const row = computed(() => rootRef.value?.closest<HTMLElement>('[role="menuitem"]') ?? undefined);
</script>

<template>
	<!-- A click on the lock must not toggle the tool. -->
	<span ref="rootRef" :class="$style.root" @click.stop>
		<RestrictedNodePopover
			side="right"
			marker-size="xsmall"
			:node-type-name="nodeTypeName"
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
