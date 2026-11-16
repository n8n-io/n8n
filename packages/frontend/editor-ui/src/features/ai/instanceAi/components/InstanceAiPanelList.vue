<script setup lang="ts">
import { N8nAnimatedCollapsibleContent, N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
/**
 * Uses reka-ui primitives directly: N8nCollapsiblePanel puts the chevron before the title,
 * has no count badge, no static (non-collapsible) mode and no uncontrolled default state.
 */
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { useId } from 'vue';

const props = withDefaults(
	defineProps<{
		title: string;
		defaultOpen?: boolean;
		/** If false, the heading is static text and the list is always open */
		collapsible?: boolean;
		/** Number of rows. Shows as a badge on the trigger while the section is closed. */
		count?: number;
	}>(),
	{ defaultOpen: true, collapsible: true },
);

defineSlots<{
	/** List rows. Each child must be an `<li>`, for example `InstanceAiPanelListItem`. */
	default?: () => unknown;
	/** Shown in place of the list. Provide it only when the list has no rows. */
	empty?: () => unknown;
}>();

const open = defineModel<boolean>('open', { default: undefined });
const headingId = useId();
</script>

<template>
	<section :class="$style.section" :aria-labelledby="headingId">
		<CollapsibleRoot
			:open="props.collapsible ? open : true"
			:default-open="props.defaultOpen"
			@update:open="open = $event"
		>
			<template #default="{ open: isOpen }">
				<div v-if="!props.collapsible" :class="$style.heading">
					<N8nText :id="headingId" bold color="text-light">
						{{ props.title }}
					</N8nText>
				</div>
				<CollapsibleTrigger v-else :class="[$style.heading, $style.trigger]">
					<N8nText :id="headingId" bold color="text-light">
						{{ props.title }}
					</N8nText>
					<Transition :enter-active-class="$style.badgeEnter">
						<N8nBadge
							v-if="!isOpen && props.count !== undefined"
							variant="filled"
							size="xxsmall"
							data-test-id="instance-ai-panel-list-count"
						>
							{{ props.count }}
						</N8nBadge>
					</Transition>
					<N8nIcon :icon="isOpen ? 'chevron-up' : 'chevron-down'" :size="10" color="text-light" />
				</CollapsibleTrigger>
				<N8nAnimatedCollapsibleContent>
					<div v-if="$slots.empty" :class="$style.empty">
						<slot name="empty" />
					</div>
					<ul v-else :class="$style.list">
						<slot />
					</ul>
				</N8nAnimatedCollapsibleContent>
			</template>
		</CollapsibleRoot>
	</section>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.section {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) var(--spacing--2xs);
}

.heading {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: fit-content;
	height: var(--height--md);
	padding: 0 var(--spacing--2xs);
	user-select: none;
}

.trigger {
	appearance: unset;
	border: 0;
	outline: 0;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}
}

.title {
	flex: 1;
	min-width: 0;
}

.list {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) 0;
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}

/* Fade only: no slide and no blur, so the trigger does not move */
.badgeEnter {
	--animation--fade-in--translate: 0;
	--animation--fade-in--blur: 0;
	@include motion.fade-in;
}
</style>
