<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/**
 * Shown at the start of a chat when the user picks Live but Live cannot use the draft yet.
 * Live always runs the published agent.
 */
const props = withDefaults(
	defineProps<{
		reason: 'unpublished' | 'changed';
		/** True while the caller publishes. */
		busy?: boolean;
		/** False without publish permission. Hides the publish action. */
		canPublish?: boolean;
	}>(),
	{ busy: false, canPublish: true },
);

const emit = defineEmits<{
	publish: [];
	'use-live-version': [];
}>();

const i18n = useI18n();

function onPublish() {
	if (props.busy) return;
	emit('publish');
}

function onUseLiveVersion() {
	if (props.busy) return;
	emit('use-live-version');
}
</script>

<template>
	<div :class="$style.gate" data-testid="agent-chat-live-gate" :data-reason="props.reason">
		<N8nText tag="p" size="small" color="text-base" :class="$style.text">
			{{
				props.reason === 'unpublished'
					? i18n.baseText('agents.testRun.mode.gate.unpublished.description')
					: i18n.baseText('agents.testRun.mode.gate.changed.description')
			}}
		</N8nText>
		<div :class="$style.actions">
			<N8nButton
				v-if="props.canPublish"
				variant="outline"
				size="small"
				icon="zap"
				:loading="props.busy"
				:label="
					props.reason === 'unpublished'
						? i18n.baseText('agents.testRun.mode.gate.unpublished.publish')
						: i18n.baseText('agents.testRun.mode.gate.changed.republish')
				"
				data-testid="agent-chat-live-gate-publish"
				@click="onPublish"
			/>
			<N8nButton
				v-if="props.reason === 'changed'"
				variant="ghost"
				size="small"
				:disabled="props.busy"
				:label="i18n.baseText('agents.testRun.mode.gate.changed.useLiveVersion')"
				data-testid="agent-chat-live-gate-use-live-version"
				@click="onUseLiveVersion"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.gate {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	max-width: 100%;
	text-align: center;
}

.text {
	margin: 0;
	max-width: 28rem;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--2xs);
}
</style>
