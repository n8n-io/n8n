<script setup lang="ts">
import { N8nButton, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useStubAgentSessionStore } from '../stubAgentSession.store';

const store = useStubAgentSessionStore();
const i18n = useI18n();
</script>

<template>
	<aside :class="$style.controls" :aria-label="i18n.baseText('agentSessions.timeline.mocks.title')">
		<N8nButton variant="outline" :aria-pressed="store.active" @click="store.active = !store.active">
			{{ i18n.baseText('agentSessions.timeline.mocks.title') }}
		</N8nButton>
		<template v-if="store.active">
			<N8nSelect
				v-model="store.scenario"
				:aria-label="i18n.baseText('agentSessions.timeline.mocks.scenario.label')"
			>
				<N8nOption
					v-for="scenario in store.scenarios"
					:key="scenario"
					:value="scenario"
					:label="i18n.baseText(`agentSessions.timeline.mocks.scenario.${scenario}`)"
				/>
			</N8nSelect>
			<N8nButton
				v-for="kind in store.executionKinds"
				:key="kind"
				variant="subtle"
				:aria-pressed="store.enabledKinds.includes(kind)"
				@click="store.toggleKind(kind)"
			>
				{{
					i18n.baseText('agentSessions.timeline.mocks.execution', { interpolate: { status: kind } })
				}}
			</N8nButton>
			<N8nButton
				variant="outline"
				:aria-pressed="store.showJobs"
				@click="store.showJobs = !store.showJobs"
			>
				{{ i18n.baseText('agentSessions.timeline.mocks.jobs') }}
			</N8nButton>
			<N8nButton variant="outline" :disabled="!store.showJobs" @click="store.cycleJobs">
				{{ i18n.baseText('agentSessions.timeline.mocks.cycleJobs') }}
			</N8nButton>
		</template>
	</aside>
</template>

<style module lang="scss">
.controls {
	position: fixed;
	inset-inline-end: var(--spacing--sm);
	inset-block-end: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs);
	max-height: calc(100% - var(--spacing--xl));
	max-width: calc(100% - var(--spacing--xl));
	overflow: auto;
	background: var(--background--surface);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--md);
	z-index: 1;
}
</style>
