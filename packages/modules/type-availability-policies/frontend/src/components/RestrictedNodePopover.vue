<script setup lang="ts">
import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { unrefElement, useActiveElement, useElementHover, type MaybeElement } from '@vueuse/core';
import { computed, getCurrentInstance, ref, watch } from 'vue';

import { useExclusiveOpen } from '../composables/useExclusiveOpen';
import { getRestrictionContact, isOptInRestriction } from '../composables/useNodeTypeRestriction';
import {
	CONTACT_ADMIN_COPY,
	OPT_IN_POPOVER_DESCRIPTION,
	RESTRICTED_TYPE_COPY,
	SCOPE_LABEL_KEY,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';
import ContactAdminModal from './ContactAdminModal.vue';

const props = withDefaults(
	defineProps<{
		nodeTypeName: string;
		scope?: NodeTypeAvailabilityScope;
		optInAvailable?: boolean;
		kind?: RestrictedTypeKind;
		/** The list row the popover explains. It opens beside this element, not beside the lock. */
		anchor?: MaybeElement;
		/** Keyboard-active without DOM focus, such as a virtual list selection. */
		active?: boolean;
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
		markerSize?: 'small' | 'xsmall';
	}>(),
	{
		kind: 'node',
		scope: undefined,
		optInAvailable: false,
		anchor: undefined,
		active: false,
		side: 'left',
		align: 'center',
		sideOffset: 24,
		markerSize: 'small',
	},
);

/** A parent that listens owns the contact-admin dialog, so it can live outside a menu that closes. */
const emit = defineEmits<{ contactAdmin: [] }>();
const parentHandlesContactAdmin = Boolean(getCurrentInstance()?.vnode.props?.onContactAdmin);

/** Leaving waits this long before closing, so the pointer can cross the gap to the popover. */
const HOVER_GRACE_MS = 200;

const i18n = useI18n();

const anchorElement = computed(() => unrefElement(props.anchor) ?? undefined);
const contentRef = ref<HTMLElement | null>(null);
const anchorHovered = useElementHover(anchorElement, { delayLeave: HOVER_GRACE_MS });
const contentHovered = useElementHover(contentRef, { delayLeave: HOVER_GRACE_MS });
watch(contentRef, (content) => {
	if (!content) contentHovered.value = false;
});
const isContactAdminOpen = ref(false);
const activeElement = useActiveElement();
const anchorFocused = computed(() =>
	Boolean(anchorElement.value?.contains(activeElement.value ?? null)),
);
const contentFocused = computed(() =>
	Boolean(contentRef.value?.contains(activeElement.value ?? null)),
);
const wantsOpen = computed(
	() =>
		!isContactAdminOpen.value &&
		(anchorHovered.value ||
			contentHovered.value ||
			anchorFocused.value ||
			contentFocused.value ||
			props.active),
);
const open = useExclusiveOpen(wantsOpen);

const verdict = computed(() => ({ scope: props.scope, optInAvailable: props.optInAvailable }));
const audience = computed(() => getRestrictionContact(verdict.value));
const contactCopy = computed(() => CONTACT_ADMIN_COPY[audience.value]);
const scopeKey = computed<BaseTextKey>(
	() => (props.scope && SCOPE_LABEL_KEY[props.scope]) ?? RESTRICTED_TYPE_COPY[props.kind].title,
);
const descriptionKey = computed<BaseTextKey>(() =>
	isOptInRestriction(verdict.value, audience.value)
		? OPT_IN_POPOVER_DESCRIPTION[props.kind]
		: contactCopy.value.popoverDescription[props.kind],
);

function requestContactAdmin() {
	if (parentHandlesContactAdmin) emit('contactAdmin');
	else isContactAdminOpen.value = true;
}
</script>

<template>
	<span :class="$style.root">
		<!-- The tool pickers render this inside a modal. -->
		<N8nPopover
			:open="open"
			:side="side"
			:align="align"
			:side-offset="sideOffset"
			:reference="anchorElement"
			:suppress-auto-focus="true"
			:content-class="$style.card"
			width="254px"
			z-index="var(--floating-ui--z)"
		>
			<template #trigger>
				<span
					:class="$style.marker"
					tabindex="0"
					role="img"
					:aria-label="i18n.baseText('typeAvailabilityPolicies.restrictedNode.title')"
				>
					<N8nIcon icon="lock" :size="markerSize" data-test-id="node-restricted-icon" />
				</span>
			</template>
			<template #content>
				<!-- A menu around the anchor dismisses on any pointer-down it sees outside itself; keep ours from reaching it. -->
				<div
					ref="contentRef"
					:class="$style.popover"
					data-test-id="node-restricted-popover"
					@pointerdown.stop
				>
					<N8nText tag="p" size="large" color="text-dark">{{ nodeTypeName }}</N8nText>
					<N8nText tag="p" size="small" color="text-light">{{ i18n.baseText(scopeKey) }}</N8nText>
					<N8nText tag="p" size="small" color="text-base" :class="$style.description">
						{{ i18n.baseText(descriptionKey) }}
					</N8nText>
					<N8nButton
						variant="outline"
						size="small"
						:class="$style.action"
						data-test-id="node-restricted-contact-admin"
						@click="requestContactAdmin"
					>
						{{ i18n.baseText(contactCopy.action) }}
						<N8nIcon icon="arrow-up-right" size="xsmall" />
					</N8nButton>
				</div>
			</template>
		</N8nPopover>
		<!-- A sibling of the popover: its content unmounts on close and must not take the dialog with it. -->
		<ContactAdminModal
			v-if="!parentHandlesContactAdmin"
			v-model:open="isContactAdminOpen"
			:node-type-name="nodeTypeName"
			:kind="kind"
			:audience="audience"
		/>
	</span>
</template>

<style lang="scss" module>
// Two teleported children and one visible trigger: the wrapper must not affect the slot's layout.
.root {
	display: contents;
}

.marker {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--3xs);
	color: var(--color--text--tint-1);

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
	}
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
