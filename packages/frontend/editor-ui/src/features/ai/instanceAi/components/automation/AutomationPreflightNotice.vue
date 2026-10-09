<script setup lang="ts">
/**
 * What the linked instance needs before the automation goes there. Names come from the check of
 * that instance, so they render as text only. The link opens in a new tab without an opener.
 */
import { computed } from 'vue';
import { N8nButton, N8nExternalLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { automationGate, type AutomationCheck } from './automationTargets';

const props = defineProps<{
	check: AutomationCheck;
	/** The name of the linked instance. */
	place: string;
	/** Opens the credentials of the linked instance. */
	setUpUrl?: string;
	disabled?: boolean;
	/**
	 * Offers "Keep it on this computer" also while credentials there need set-up. The card sets it
	 * when it has no "Change" menu, so that the user can still turn the automation on now.
	 */
	offersKeepHere?: boolean;
}>();

const emit = defineEmits<{ recheck: []; keepHere: [] }>();

const i18n = useI18n();

const gate = computed(() => automationGate(props.check));
const state = computed(() => (typeof props.check === 'string' ? undefined : props.check));
const interpolate = computed(() => ({ place: props.place }));

const cannotMoveText = computed(() => {
	const found = state.value;
	if (!found || found.canMove) return undefined;
	if (found.subWorkflowCalls.length > 0) {
		return i18n.baseText('instanceAi.automation.preflight.subWorkflows', {
			interpolate: interpolate.value,
		});
	}
	return i18n.baseText('instanceAi.automation.preflight.nodeTypes', {
		interpolate: { ...interpolate.value, types: found.missingNodeTypes.join(', ') },
	});
});

// Shown next to the credentials that need set-up, so that the user sees every name at once.
const showsUnchecked = computed(
	() => state.value?.canMove === true && gate.value.unchecked.length > 0,
);

const names = (list: string[]) => list.join(', ');
</script>

<template>
	<div :class="$style.notice" aria-live="polite" data-test-id="automation-proposal-preflight">
		<N8nText v-if="check === 'checking'" tag="p" size="small" color="text-base">
			{{ i18n.baseText('instanceAi.automation.preflight.checking', { interpolate }) }}
		</N8nText>

		<div v-else-if="check === 'failed'" :class="$style.row">
			<N8nText tag="p" size="small" color="text-base">
				{{ i18n.baseText('instanceAi.automation.preflight.failed', { interpolate }) }}
			</N8nText>
			<N8nButton
				variant="ghost"
				size="small"
				:disabled="disabled"
				data-test-id="automation-proposal-preflight-retry"
				@click="emit('recheck')"
			>
				{{ i18n.baseText('instanceAi.automation.preflight.retry') }}
			</N8nButton>
		</div>

		<div v-else-if="cannotMoveText" :class="$style.row">
			<N8nText
				tag="p"
				size="small"
				color="warning"
				data-test-id="automation-proposal-preflight-blocked"
			>
				{{ cannotMoveText }}
			</N8nText>
			<N8nButton
				variant="outline"
				size="small"
				:disabled="disabled"
				data-test-id="automation-proposal-preflight-keep-here"
				@click="emit('keepHere')"
			>
				{{ i18n.baseText('instanceAi.automation.preflight.keepHere') }}
			</N8nButton>
		</div>

		<template v-else-if="gate.needsSetUp.length > 0">
			<N8nText
				tag="p"
				size="small"
				color="text-dark"
				data-test-id="automation-proposal-preflight-set-up"
			>
				{{
					i18n.baseText('instanceAi.automation.preflight.needsSetUp', {
						interpolate: { ...interpolate, names: names(gate.needsSetUp) },
					})
				}}
			</N8nText>
			<N8nText tag="p" size="small" color="text-base">
				{{ i18n.baseText('instanceAi.automation.preflight.helper') }}
			</N8nText>
			<div :class="$style.row">
				<N8nExternalLink
					v-if="setUpUrl"
					:href="setUpUrl"
					size="small"
					:class="$style.link"
					:aria-label="i18n.baseText('instanceAi.automation.preflight.setUpLabel', { interpolate })"
					data-test-id="automation-proposal-preflight-set-up-link"
				>
					{{ i18n.baseText('instanceAi.automation.preflight.setUp', { interpolate }) }}
				</N8nExternalLink>
				<N8nButton
					variant="ghost"
					size="small"
					:disabled="disabled"
					data-test-id="automation-proposal-preflight-recheck"
					@click="emit('recheck')"
				>
					{{ i18n.baseText('instanceAi.automation.preflight.checkAgain') }}
				</N8nButton>
				<N8nButton
					v-if="offersKeepHere"
					variant="ghost"
					size="small"
					:disabled="disabled"
					data-test-id="automation-proposal-preflight-set-up-keep-here"
					@click="emit('keepHere')"
				>
					{{ i18n.baseText('instanceAi.automation.preflight.keepHere') }}
				</N8nButton>
			</div>
		</template>

		<N8nText
			v-if="showsUnchecked"
			tag="p"
			size="small"
			color="text-base"
			data-test-id="automation-proposal-preflight-unchecked"
		>
			{{
				i18n.baseText('instanceAi.automation.preflight.unchecked', {
					interpolate: { ...interpolate, names: names(gate.unchecked) },
				})
			}}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus' as focus;

.notice {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	overflow-wrap: anywhere;

	p {
		margin: 0;
	}
}

.row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
}

.link {
	margin-left: calc(-1 * var(--spacing--2xs));

	@include focus.focus-visible-ring;
}
</style>
