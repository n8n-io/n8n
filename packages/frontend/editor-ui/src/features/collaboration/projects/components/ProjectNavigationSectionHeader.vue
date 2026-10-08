<script lang="ts" setup>
import { N8nIcon, N8nText } from '@n8n/design-system';

const props = defineProps<{
	title: string;
	/**
	 * Simple mode puts the section in the Workspace. The title is then a level-3 heading below
	 * the Workspace heading, starts one step in, and has AA contrast.
	 */
	inWorkspace: boolean;
	chevronSize: 'xsmall' | 'small';
}>();

const collapsed = defineModel<boolean>('collapsed', { required: true });
</script>

<template>
	<!-- The heading holds the toggle, so heading navigation also reaches the toggle. -->
	<div
		role="heading"
		:aria-level="props.inWorkspace ? 3 : 2"
		:class="{ [$style.inWorkspace]: props.inWorkspace }"
	>
		<button
			type="button"
			:class="$style.sectionHeader"
			:aria-expanded="!collapsed"
			@click="collapsed = !collapsed"
		>
			<N8nText
				size="small"
				bold
				:color="props.inWorkspace ? 'text-base' : 'text-light'"
				:class="$style.title"
			>
				{{ props.title }}
			</N8nText>
			<N8nIcon
				icon="chevron-down"
				:size="props.chevronSize"
				:class="[$style.chevron, collapsed ? $style.chevronCollapsed : '']"
			/>
		</button>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: calc(100% - var(--spacing--3xs) * 2);
	box-sizing: border-box;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	margin: var(--spacing--4xs) var(--spacing--3xs) 0;
	background: none;
	border: none;
	border-radius: var(--spacing--4xs);
	cursor: pointer;
	color: inherit;

	&:hover {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);

		.chevron {
			color: var(--color--text--shade-1);
		}
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.chevron {
	color: var(--color--text--tint-1);
	transition: transform 0.15s ease;
	flex-shrink: 0;
}

.chevronCollapsed {
	transform: rotate(-90deg);
}

// One step in from the Workspace title, so that the section reads as part of the Workspace.
.inWorkspace {
	.sectionHeader {
		width: calc(100% - var(--spacing--3xs) * 2 - var(--spacing--xs));
		margin-inline-start: calc(var(--spacing--3xs) + var(--spacing--xs));
	}

	// `--text-color--subtle` is below AA on the hover background, so the title takes the
	// full text colour there, as in AssistantSectionHeader.
	.sectionHeader:hover .title {
		color: var(--text-color);
	}
}
</style>
