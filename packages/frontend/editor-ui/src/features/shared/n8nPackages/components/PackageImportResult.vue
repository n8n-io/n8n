<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { ImportResultDto } from '@n8n/api-types';
import { N8nCallout, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

type ImportedAgent = ImportResultDto['agents'][number];
type PublishingOutcome = ImportedAgent['publishing'];

type ResultRow = {
	key: string;
	name: string;
	status: ImportedAgent['status'];
	publishing: PublishingOutcome;
	to?: RouteLocationRaw;
};

const props = defineProps<{
	result: ImportResultDto;
	agentRoute?: (agent: ImportedAgent) => RouteLocationRaw;
}>();

const emit = defineEmits<{ navigate: [] }>();

const i18n = useI18n();

const agentRows = computed<ResultRow[]>(() =>
	props.result.agents.map((agent) => ({
		key: agent.localId,
		name: agent.name,
		status: agent.status,
		publishing: agent.publishing,
		to: props.agentRoute?.(agent),
	})),
);

const workflowRows = computed<ResultRow[]>(() =>
	props.result.workflows.map((workflow) => ({
		key: workflow.localId,
		name: workflow.name,
		status: workflow.status,
		publishing: workflow.publishing,
	})),
);

const sections = computed(() =>
	[
		{ id: 'agents', title: i18n.baseText('packages.import.agents'), rows: agentRows.value },
		{
			id: 'workflows',
			title: i18n.baseText('packages.import.workflows'),
			rows: workflowRows.value,
		},
	].filter((section) => section.rows.length > 0),
);

// Stub and incomplete credentials both need input before the user can publish.
const credentialsNeedingSetup = computed(
	() => props.result.credentials.stubbed.length + props.result.credentials.incomplete.length,
);

function formatPublishing(outcome: PublishingOutcome): string {
	const state = i18n.baseText(`packages.import.publishing.${outcome.state}`);
	const reason = outcome.blockedReason ?? outcome.skippedPublishReason;
	if (reason) {
		return `${state}: ${i18n.baseText(`packages.import.publishing.reason.${reason}`)}`;
	}
	if (outcome.error) return `${state}: ${outcome.error}`;
	return state;
}
</script>

<template>
	<div :class="$style.result" data-testid="package-import-result">
		<N8nText :bold="true">{{ i18n.baseText('packages.import.imported') }}</N8nText>

		<section v-for="section in sections" :key="section.id" :class="$style.section">
			<N8nText size="small" :bold="true">{{ section.title }}</N8nText>
			<ul :class="$style.rows">
				<li
					v-for="row in section.rows"
					:key="row.key"
					:class="$style.row"
					:data-testid="`package-import-${section.id}-row`"
				>
					<N8nLink v-if="row.to" :to="row.to" size="small" @click="emit('navigate')">
						{{ row.name }}
					</N8nLink>
					<N8nText v-else size="small">{{ row.name }}</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText(`packages.import.status.${row.status}`) }}
					</N8nText>
					<N8nText size="small" color="text-light" data-testid="package-import-publishing">
						{{ formatPublishing(row.publishing) }}
					</N8nText>
				</li>
			</ul>
		</section>

		<N8nCallout
			v-if="credentialsNeedingSetup > 0"
			theme="warning"
			data-testid="package-import-credentials-warning"
		>
			{{
				i18n.baseText('packages.import.credentialsNeedSetup', {
					adjustToNumber: credentialsNeedingSetup,
					interpolate: { count: String(credentialsNeedingSetup) },
				})
			}}
		</N8nCallout>
	</div>
</template>

<style module lang="scss">
.result {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--spacing--2xs);
}
</style>
