<script setup lang="ts">
/**
 * Read-only evaluations list. Evaluations are declared in the agent's TS
 * source via `.eval(new Eval(...))` — not in the JSON config — so this
 * panel is populated from `AgentSchema.evaluations` returned by a runtime
 * inspection endpoint.
 *
 * TODO: wire this to a backend endpoint that returns `AgentSchema`. Until
 * then `schema` is always `null` and the panel renders the empty state.
 */
import { computed } from 'vue';
import { N8nCard, N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentSchema } from '../types';

const props = withDefaults(defineProps<{ schema?: AgentSchema | null }>(), {
	schema: null,
});

const i18n = useI18n();
const evals = computed(() => props.schema?.evaluations ?? []);
</script>

<template>
	<div :class="$style.panel" data-testid="agent-evals-panel">
		<template v-if="evals.length > 0">
			<N8nCard v-for="evalItem in evals" :key="evalItem.name" :class="$style.evalCard">
				<div :class="$style.evalHeader">
					<N8nText :bold="true" size="small">{{ evalItem.name }}</N8nText>
					<span
						:class="[
							$style.typeBadge,
							evalItem.type === 'check' ? $style.badgeCheck : $style.badgeJudge,
						]"
					>
						<N8nText size="xsmall" :bold="true">{{
							evalItem.type === 'check'
								? i18n.baseText('agents.builder.evaluations.type.check')
								: i18n.baseText('agents.builder.evaluations.type.judge')
						}}</N8nText>
					</span>
				</div>

				<div v-if="evalItem.hasCredential" :class="$style.credentialRow">
					<N8nIcon icon="lock" size="xsmall" :class="$style.keyIcon" />
					<N8nText size="xsmall" color="text-light">
						{{
							evalItem.credentialName ??
							i18n.baseText('agents.builder.evaluations.credentialConfigured')
						}}
					</N8nText>
				</div>

				<N8nText v-if="evalItem.description" size="small" color="text-light">
					{{ evalItem.description }}
				</N8nText>
			</N8nCard>
		</template>

		<div v-else :class="$style.dashedCard">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.evaluations.emptyPrefix') }}
				<code :class="$style.code">.eval(new Eval()...)</code>
			</N8nText>
		</div>
	</div>
</template>

<style module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.evalCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.evalHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.typeBadge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
}

.badgeCheck {
	background-color: var(--color--orange-100);
	color: var(--background--brand--active);
}

.badgeJudge {
	background-color: var(--color--purple-100);
	color: var(--color--purple-700);
}

.credentialRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtler);
}

.keyIcon {
	flex-shrink: 0;
}

.dashedCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius);
}

.code {
	font-family: var(--font-family--monospace, 'SF Mono', monospace);
	font-size: var(--font-size--2xs);
	background-color: var(--background--active);
	padding: 0 var(--spacing--5xs);
	border-radius: var(--radius--sm);
}
</style>
