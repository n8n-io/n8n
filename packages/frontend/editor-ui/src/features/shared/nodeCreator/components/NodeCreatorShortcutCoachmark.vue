<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nPopover } from '@n8n/design-system';

defineProps<{
	visible: boolean;
}>();

const emit = defineEmits<{
	dismiss: [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nPopover
		:open="visible"
		:show-arrow="true"
		:enable-scrolling="false"
		:suppress-auto-focus="true"
		side="left"
		align="center"
		:side-offset="8"
		:z-index="2200"
		content-class="node-creator-shortcut-coachmark"
	>
		<template #trigger>
			<slot />
		</template>
		<template #content>
			<div class="node-creator-shortcut-coachmark__header">
				<span class="node-creator-shortcut-coachmark__title">{{
					i18n.baseText('nodeCreator.shortcutCoachmark.title')
				}}</span>
			</div>
			<p class="node-creator-shortcut-coachmark__body">
				{{ i18n.baseText('nodeCreator.shortcutCoachmark.body') }}
			</p>
			<div class="node-creator-shortcut-coachmark__footer">
				<N8nButton
					size="small"
					:label="i18n.baseText('nodeCreator.shortcutCoachmark.gotIt')"
					class="node-creator-shortcut-coachmark__button"
					@click="emit('dismiss')"
				/>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss">
.node-creator-shortcut-coachmark {
	width: 250px;
	padding: var(--spacing--xs);
	background: var(--color--background--shade-2);
	color: var(--color--foreground--tint-2);

	svg {
		fill: var(--color--background--shade-2);
		stroke: var(--color--background--shade-2);
	}

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: var(--spacing--4xs);
	}

	&__title {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		line-height: 1.45;
	}

	&__body {
		font-size: var(--font-size--sm);
		line-height: var(--line-height--xl);
		margin: 0;
	}

	&__footer {
		padding-top: var(--spacing--2xs);
	}

	&__button {
		background-color: var(--color--primary);

		&:hover {
			background-color: var(--color--primary--shade-1);
		}
	}
}
</style>
