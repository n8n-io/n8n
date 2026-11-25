<script lang="ts" setup>
import type { IconName } from '../N8nIcon/icons';
import N8nIcon from '../N8nIcon/Icon.vue';

/** An inline reference to a resource inside chat text, such as an @-mention of a workflow. */
export interface N8nChatTokenProps {
	/** The name of the resource. Long names are cut with an ellipsis. */
	label: string;
	/** The icon of the resource kind. */
	icon?: IconName;
	/** Shows the selected state, for example when the token is selected in an editor. */
	selected?: boolean;
}

defineOptions({ name: 'N8nChatToken' });
withDefaults(defineProps<N8nChatTokenProps>(), {
	icon: undefined,
	selected: false,
});
</script>

<template>
	<span
		:class="[$style.token, { [$style.selected]: selected }]"
		:title="`@${label}`"
		data-test-id="chat-token"
	>
		<N8nIcon v-if="icon" :icon="icon" size="small" :class="$style.icon" />
		<span :class="$style.label">{{ label }}</span>
	</span>
</template>

<style lang="scss" module>
.token {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 100%;
	padding: 0 var(--spacing--3xs);
	vertical-align: baseline;
	color: var(--tag--color--text);
	background-color: var(--tag--color--background);
	border: var(--border);
	border-color: var(--tag--border-color);
	border-radius: var(--tag--radius);
	/* The token reads as part of the sentence, so it takes the size of the text around it. */
	font-size: inherit;
	line-height: var(--line-height--sm);
	white-space: nowrap;
	user-select: all;
}

.selected {
	border-color: var(--focus--border-color);
}

.icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.label {
	/* The chip takes its baseline from this item, not the icon, so the label sits on the line of the text around it. */
	align-self: baseline;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
