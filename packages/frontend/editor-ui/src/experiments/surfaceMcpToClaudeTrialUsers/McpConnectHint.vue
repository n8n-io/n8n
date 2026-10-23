<script setup lang="ts">
import { N8nButton, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { onKeyStroke } from '@vueuse/core';
import { computed } from 'vue';
import { useMcpDiscoveryStore } from './mcpDiscovery.store';

const dismissed = defineModel<boolean>('dismissed', { default: false });
const discovery = useMcpDiscoveryStore();
const i18n = useI18n();
const toast = useToast();
const visible = computed(
	() =>
		discovery.isTreatment &&
		!discovery.coachmarkDismissed &&
		!discovery.state.hasConnectedClaude &&
		!discovery.state.hasUsedMcp,
);
onKeyStroke('Escape', () => {
	dismissed.value = true;
});
function dismiss() {
	if (!discovery.isTreatment) return;
	dismissed.value = true;
	void discovery
		.dismissCoachmark()
		.catch((error) => toast.showError(error, i18n.baseText('generic.error')));
}
</script>

<template>
	<N8nPopover
		v-if="discovery.isTreatment"
		:open="visible && !dismissed"
		side="bottom"
		align="end"
		show-arrow
		:content-class="$style.connectHintPopover"
		:enable-scrolling="false"
		suppress-auto-focus
		width="calc(var(--spacing--5xl) + var(--spacing--3xl))"
		@update:open="dismissed = !$event || dismissed"
	>
		<template #trigger
			><span @click="dismiss"><slot /></span
		></template>
		<template #content>
			<div :class="$style.connectHint" data-test-id="mcp-connect-hint">
				<p>{{ i18n.baseText('settings.mcp.yourClient.tooltip') }}</p>
				<N8nButton
					size="small"
					variant="outline"
					:label="i18n.baseText('settings.mcp.yourClient.dismissHint')"
					@click="dismiss"
				/>
			</div>
		</template>
	</N8nPopover>
	<span v-else><slot /></span>
</template>

<style lang="scss" module>
.connectHintPopover {
	--background--surface: var(--color--neutral-black);
	--border-color: var(--color--neutral-black);
	color: var(--color--neutral-100);

	button {
		background: var(--color--neutral-100);
		border-color: var(--color--neutral-100);
		color: var(--color--neutral-black);
	}

	button:hover {
		background: var(--color--neutral-200);
		border-color: var(--color--neutral-200);
	}
}

.connectHint {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);

	p {
		margin: 0;
	}
}
</style>
