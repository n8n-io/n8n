<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIconButton, N8nPopover } from '@n8n/design-system';

// Click-triggered card pointing users to the AI Assistant; open state is local
// so the trigger, X, action, and outside-click all close it.
const emit = defineEmits<{ action: [] }>();

const i18n = useI18n();
const isOpen = ref(false);

function onAction() {
	isOpen.value = false;
	emit('action');
}
</script>

<template>
	<N8nPopover
		:open="isOpen"
		:show-arrow="true"
		:enable-scrolling="false"
		:suppress-auto-focus="true"
		side="left"
		align="center"
		:side-offset="8"
		content-class="instance-ai-canvas-action-popover"
		@update:open="isOpen = $event"
	>
		<template #trigger>
			<slot v-bind="{ isOpen }" />
		</template>
		<template #content>
			<div class="instance-ai-canvas-action-popover__header">
				<span class="instance-ai-canvas-action-popover__title">{{
					i18n.baseText('instanceAi.canvasActionPopover.title')
				}}</span>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="small"
					class="instance-ai-canvas-action-popover__close"
					:aria-label="i18n.baseText('generic.close')"
					data-test-id="instance-ai-canvas-action-popover-close"
					@click="isOpen = false"
				/>
			</div>
			<p class="instance-ai-canvas-action-popover__body">
				{{ i18n.baseText('instanceAi.canvasActionPopover.body') }}
			</p>
			<N8nButton
				class="instance-ai-canvas-action-popover__button"
				:label="i18n.baseText('instanceAi.canvasActionPopover.action')"
				data-test-id="instance-ai-canvas-action-popover-button"
				@click="onAction"
			/>
		</template>
	</N8nPopover>
</template>

<style lang="scss">
.instance-ai-canvas-action-popover {
	width: 280px;
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	background: var(--color--neutral-black);
	color: var(--color--neutral-100);

	// Arrow is the direct-child svg rendered by PopoverArrow; tint it to match
	// the dark card (scrolling is disabled so the card content has no svg here).
	> svg {
		fill: var(--color--neutral-black);
		stroke: var(--color--neutral-black);
	}

	&__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--spacing--2xs);
	}

	&__title {
		font-size: var(--font-size--md);
		font-weight: var(--font-weight--bold);
		line-height: var(--line-height--md);
	}

	&__close {
		--button--color: var(--color--neutral-100);
		margin: calc(-1 * var(--spacing--3xs)) calc(-1 * var(--spacing--3xs)) 0 0;
	}

	&__body {
		margin: 0;
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
		color: var(--color--neutral-300);
	}

	&__button {
		margin-top: var(--spacing--2xs);
		width: 100%;
	}
}
</style>
