<script setup lang="ts">
import { computed } from 'vue';
import { N8nCard, N8nText, N8nIcon } from '@n8n/design-system';
import type { AgentSchema } from '../types';

const props = defineProps<{ schema: AgentSchema | null }>();

const evals = computed(() => props.schema?.evaluations ?? []);
</script>

<template>
	<div :class="$style.panel">
		<N8nText tag="h3" bold>Evaluations</N8nText>
		<N8nText size="small" color="text-light">
			{{ evals.length }} evaluation{{ evals.length === 1 ? '' : 's' }} configured in code
		</N8nText>

		<!-- Eval cards -->
		<template v-if="evals.length > 0">
			<N8nCard v-for="evalItem in evals" :key="evalItem.name" :class="$style.evalCard">
				<div :class="$style.evalHeader">
					<N8nText bold size="small">{{ evalItem.name }}</N8nText>
					<span
						:class="[
							$style.typeBadge,
							evalItem.type === 'check' ? $style.badgeCheck : $style.badgeJudge,
						]"
					>
						<N8nText size="xsmall" bold>{{
							evalItem.type === 'check' ? 'Check' : 'Judge'
						}}</N8nText>
					</span>
				</div>

				<div v-if="evalItem.hasCredential" :class="$style.credentialRow">
					<N8nIcon icon="key" size="xsmall" :class="$style.keyIcon" />
					<N8nText size="xsmall" color="text-light">
						{{ evalItem.credentialName ?? 'Credential configured' }}
					</N8nText>
				</div>

				<N8nText v-if="evalItem.description" size="small" color="text-light">
					{{ evalItem.description }}
				</N8nText>
			</N8nCard>
		</template>

		<!-- Empty state -->
		<div v-else :class="$style.dashedCard">
			<N8nText size="small" color="text-light">
				No evaluations configured — add evaluations in code using
				<code :class="$style.code">.eval(new Eval()...)</code>
			</N8nText>
		</div>

		<!-- Future runner placeholder -->
		<div :class="$style.dashedCard">
			<N8nText bold size="small">Evaluation Runner</N8nText>
			<N8nText size="small" color="text-light">
				Run evaluations against datasets and view results — coming soon
			</N8nText>
		</div>
	</div>
</template>

<style module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
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
	background-color: var(--color--primary--tint-3);
	color: var(--color--primary--shade-1);
}

.badgeJudge {
	background-color: var(--color--secondary--tint-2);
	color: var(--color--secondary--shade-1);
}

.credentialRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--text--tint-2);
}

.keyIcon {
	flex-shrink: 0;
}

.dashedCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border-width) dashed var(--color--foreground);
	border-radius: var(--radius);
}

.code {
	font-family: var(--font-family--monospace, 'SF Mono', monospace);
	font-size: var(--font-size--2xs);
	background-color: var(--color--background--shade-1);
	padding: 0 var(--spacing--5xs);
	border-radius: var(--radius--sm);
}
</style>
