<script setup lang="ts">
import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { unrefElement, useElementHover, type MaybeElement } from '@vueuse/core';
import { computed, ref } from 'vue';

import { SCOPE_LABEL_KEY } from '../type-availability-policies.constants';
import ContactInstanceAdminModal from './ContactInstanceAdminModal.vue';

const props = defineProps<{
	nodeTypeName: string;
	scope?: NodeTypeAvailabilityScope;
	/** The list row the popover explains. It opens beside this element, not beside the lock. */
	anchor?: MaybeElement;
	/** The row is the keyboard-active item, which opens the popover like a hover does. */
	active?: boolean;
}>();

/** Leaving waits this long before closing, so the pointer can cross the gap to the popover. */
const HOVER_GRACE_MS = 200;

const i18n = useI18n();

const anchorElement = computed(() => unrefElement(props.anchor) ?? undefined);
const contentRef = ref<HTMLElement | null>(null);
const anchorHovered = useElementHover(anchorElement, { delayLeave: HOVER_GRACE_MS });
const contentHovered = useElementHover(contentRef, { delayLeave: HOVER_GRACE_MS });
const open = computed(() => anchorHovered.value || contentHovered.value || props.active);

const isContactAdminOpen = ref(false);

const scopeKey = computed<BaseTextKey>(
	() =>
		(props.scope && SCOPE_LABEL_KEY[props.scope]) ??
		'typeAvailabilityPolicies.restrictedNode.title',
);
</script>

<template>
	<span :class="$style.root">
		<N8nPopover
			:open="open"
			side="left"
			align="center"
			:side-offset="24"
			:reference="anchorElement"
			:suppress-auto-focus="true"
			:content-class="$style.card"
			width="254px"
		>
			<template #trigger>
				<N8nIcon
					icon="lock"
					size="small"
					:title="i18n.baseText('typeAvailabilityPolicies.restrictedNode.title')"
					data-test-id="node-restricted-icon"
				/>
			</template>
			<template #content>
				<div ref="contentRef" :class="$style.popover" data-test-id="node-restricted-popover">
					<N8nText tag="p" size="large" color="text-dark">{{ nodeTypeName }}</N8nText>
					<N8nText tag="p" size="small" color="text-light">{{ i18n.baseText(scopeKey) }}</N8nText>
					<N8nText tag="p" size="small" color="text-base" :class="$style.description">
						{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.popover.description') }}
					</N8nText>
					<N8nButton
						variant="outline"
						size="small"
						:class="$style.action"
						data-test-id="node-restricted-contact-admin"
						@click="isContactAdminOpen = true"
					>
						{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.contactAdmin') }}
						<N8nIcon icon="arrow-up-right" size="xsmall" />
					</N8nButton>
				</div>
			</template>
		</N8nPopover>
		<!-- A sibling of the popover: its content unmounts on close and must not take the dialog with it. -->
		<ContactInstanceAdminModal v-model:open="isContactAdminOpen" :node-type-name="nodeTypeName" />
	</span>
</template>

<style lang="scss" module>
// Two teleported children and one visible trigger: the wrapper must not affect the slot's layout.
.root {
	display: contents;
}

// The design system defaults popovers to --radius--xs (8px); the design uses the editor's 4px.
.card {
	border-radius: var(--radius);
}

.popover {
	padding: var(--spacing--xs);
	text-align: left;
}

.description {
	margin-top: var(--spacing--3xs);
}

.action {
	margin-top: var(--spacing--sm);
}
</style>
