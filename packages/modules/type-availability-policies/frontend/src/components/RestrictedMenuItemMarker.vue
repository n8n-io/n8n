<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';

import RestrictedNodePopover from './RestrictedNodePopover.vue';
import type { OptionalVerdict } from '../composables/useNodeTypeRestriction';
import type { ContactAudience, RestrictedTypeKind } from '../type-availability-policies.constants';

withDefaults(
	defineProps<{
		nodeTypeName: string;
		restriction?: OptionalVerdict;
		kind?: RestrictedTypeKind;
	}>(),
	{ restriction: undefined, kind: 'node' },
);

/** The menu closes when the action is pressed, so the caller owns the contact-admin dialog. */
const emit = defineEmits<{ contactAdmin: [audience: ContactAudience] }>();

const rootRef = useTemplateRef<HTMLElement>('rootRef');
// The popover opens on hover of the whole menu row, which a dropdown slot does not hand over.
const row = computed(() => rootRef.value?.closest<HTMLElement>('[role="menuitem"]') ?? undefined);
</script>

<template>
	<!-- A click on the lock opens the explanation. It must not also select the row. -->
	<span ref="rootRef" :class="$style.root" @click.stop>
		<RestrictedNodePopover
			side="right"
			marker-size="xsmall"
			:kind="kind"
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
