<script setup lang="ts">
import {
	RestrictedNodePopover,
	type ContactAudience,
	type RestrictedTypeKind,
	type TypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';
import { computed, useTemplateRef } from 'vue';

const props = withDefaults(
	defineProps<{
		name: string;
		restriction: TypeRestriction;
		/** `node` when the nodes that use the type are restricted, so the contact goes to their admin. */
		kind?: RestrictedTypeKind;
		scopeLabel?: string;
		description?: string;
		/** `row` opens the popover on hover of the select option around it, `field` on the marker itself. */
		placement?: 'row' | 'field';
	}>(),
	{ kind: 'credential', scopeLabel: undefined, description: undefined, placement: 'row' },
);

const emit = defineEmits<{ contactAdmin: [audience: ContactAudience] }>();

const rootRef = useTemplateRef<HTMLElement>('rootRef');
// The popover opens on hover of the whole option row, which the option slot does not hand over.
const anchor = computed(() =>
	props.placement === 'field'
		? (rootRef.value ?? undefined)
		: (rootRef.value?.closest<HTMLElement>('.el-select-dropdown__item') ?? undefined),
);
</script>

<template>
	<span ref="rootRef" :class="placement === 'field' ? $style.field : $style.root">
		<RestrictedNodePopover
			:kind="kind"
			side="right"
			:marker-size="placement === 'field' ? 'small' : 'xsmall'"
			:node-type-name="name"
			:restriction="restriction"
			:scope-label="scopeLabel"
			:description="description"
			:anchor="anchor"
			@contact-admin="(audience) => emit('contactAdmin', audience)"
		/>
	</span>
</template>

<style lang="scss" module>
.root {
	display: contents;
}

.field {
	display: inline-flex;
	padding-left: var(--spacing--4xs);
}
</style>
