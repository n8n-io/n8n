<script setup lang="ts">
import { N8nButton, N8nIcon, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	unrefElement,
	useActiveElement,
	useElementHover,
	useEventListener,
	type MaybeElement,
} from '@vueuse/core';
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue';

import { useExclusiveOpen } from '../composables/useExclusiveOpen';
import { useRestrictionContact, type OptionalVerdict } from '../composables/useNodeTypeRestriction';
import {
	RESTRICTED_TYPE_COPY,
	SCOPE_LABEL_KEY,
	type ContactAudience,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';
import ContactAdminModal from './ContactAdminModal.vue';

const props = withDefaults(
	defineProps<{
		nodeTypeName: string;
		restriction?: OptionalVerdict;
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
		restriction: undefined,
		anchor: undefined,
		active: false,
		side: 'left',
		align: 'center',
		sideOffset: 24,
		markerSize: 'small',
	},
);

/** A parent that listens owns the contact-admin dialog, so it can live outside a menu that closes. */
const emit = defineEmits<{ contactAdmin: [audience: ContactAudience] }>();
const parentHandlesContactAdmin = Boolean(getCurrentInstance()?.vnode.props?.onContactAdmin);

/** Leaving waits this long before closing, so the pointer can cross the gap to the popover. */
const HOVER_GRACE_MS = 200;

const i18n = useI18n();

const anchorElement = computed(() => unrefElement(props.anchor) ?? undefined);
const markerRef = ref<HTMLElement | null>(null);
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
const hasIntent = computed(
	() =>
		anchorHovered.value ||
		contentHovered.value ||
		anchorFocused.value ||
		contentFocused.value ||
		props.active,
);
/**
 * A dismissed card stays closed until the pointer and the focus leave, so it cannot open again at once.
 * A new pointer entry or a press on the lock also opens it, because a focused lock keeps the intent.
 */
const isDismissed = ref(false);
watch(hasIntent, (intent) => {
	if (!intent) isDismissed.value = false;
});
const wantsOpen = computed(
	() => !isContactAdminOpen.value && !isDismissed.value && hasIntent.value,
);
const { open, claim } = useExclusiveOpen(wantsOpen);

// The leave grace keeps wantsOpen true when the pointer comes back fast, so each entry claims the card.
function reopen() {
	isDismissed.value = false;
	claim();
}
useEventListener(anchorElement, 'mouseenter', reopen, { passive: true });

const { copy: contactCopy } = useRestrictionContact(() => props.restriction);
const scopeKey = computed<BaseTextKey>(() => {
	const scope = props.restriction?.scope;
	return scope ? SCOPE_LABEL_KEY[scope] : RESTRICTED_TYPE_COPY[props.kind].title;
});

function dismiss() {
	if (hasIntent.value) isDismissed.value = true;
}

function requestContactAdmin() {
	// The dialog gives the focus back to the element that had it when it opened. The button closes with the card.
	if (contentFocused.value) markerRef.value?.focus();
	// The card closes before the dialog opens. An active row would otherwise show it again when the dialog closes.
	dismiss();
	if (parentHandlesContactAdmin) emit('contactAdmin', contactCopy.value.audience);
	else isContactAdminOpen.value = true;
}

function onMarkerKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		event.stopPropagation();
		isDismissed.value = false;
		void nextTick(() => contentRef.value?.querySelector<HTMLElement>('button')?.focus());
	} else if (event.key === 'Escape' && open.value) {
		event.stopPropagation();
		dismiss();
	}
}

function onContentKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.stopPropagation();
		dismiss();
		markerRef.value?.focus();
	} else if (event.key === 'Tab') {
		// The card is teleported to the end of the page. Tab continues from the lock, Shift+Tab stops on it.
		markerRef.value?.focus();
		if (event.shiftKey) event.preventDefault();
	}
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
			:hide-when-detached="true"
			:content-class="$style.card"
			width="254px"
			z-index="var(--floating-ui--z)"
		>
			<template #trigger>
				<span
					ref="markerRef"
					:class="$style.marker"
					tabindex="0"
					role="img"
					:aria-label="i18n.baseText(RESTRICTED_TYPE_COPY[kind].title)"
					@keydown="onMarkerKeydown"
					@pointerdown="reopen"
				>
					<N8nIcon icon="lock" :size="markerSize" data-test-id="node-restricted-icon" />
				</span>
			</template>
			<template #content>
				<!-- A menu around the anchor dismisses on any pointer-down it sees outside itself; keep ours from reaching it.
				     A press also keeps the focus. Otherwise a select around the anchor closes on the press and moves the card away before the click. -->
				<div
					ref="contentRef"
					:class="$style.popover"
					data-test-id="node-restricted-popover"
					@pointerdown.stop
					@mousedown.prevent
					@keydown="onContentKeydown"
				>
					<N8nText tag="p" size="large" color="text-dark">{{ nodeTypeName }}</N8nText>
					<N8nText tag="p" size="small" color="text-light">{{ i18n.baseText(scopeKey) }}</N8nText>
					<N8nText tag="p" size="small" color="text-base" :class="$style.description">
						{{ i18n.baseText(contactCopy.popoverDescription[kind]) }}
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
			:audience="contactCopy.audience"
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
