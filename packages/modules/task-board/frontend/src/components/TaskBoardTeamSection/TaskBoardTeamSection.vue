<script setup lang="ts">
import {
	N8nButton,
	N8nCallout,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { toRef } from 'vue';

import AgentDialog from './components/AgentDialog/AgentDialog.vue';
import TeamAgentRow from './components/TeamAgentRow/TeamAgentRow.vue';
import TeamPersonRow from './components/TeamPersonRow/TeamPersonRow.vue';
import { useTaskBoardTeam } from './useTaskBoardTeam';

/** The project whose team shows. On `/home/tasks` this is the personal project. */
const props = defineProps<{ projectId: string | undefined }>();
const i18n = useI18n();

const team = useTaskBoardTeam(toRef(props, 'projectId'));
const { dialogOpen } = team;
</script>

<template>
	<section :class="$style.section" data-test-id="task-board-team">
		<div :class="$style.header">
			<div :class="$style.intro">
				<N8nHeading tag="h3" size="medium">{{ i18n.baseText('taskBoard.team.title') }}</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('taskBoard.team.description') }}
				</N8nText>
			</div>
			<N8nButton
				v-if="team.agentsEnabled.value && team.agents.value.length > 0"
				variant="outline"
				:label="i18n.baseText('taskBoard.team.addAgent')"
				:disabled="!team.canAddAgent.value"
				data-test-id="task-board-team-add-agent"
				data-attr="task-board-team-add-agent"
				@click="team.openAddDialog"
			>
				<template #icon><N8nIcon icon="plus" /></template>
			</N8nButton>
		</div>

		<N8nCallout v-if="!team.agentsEnabled.value" theme="info" slim>
			{{ i18n.baseText('taskBoard.team.agentsDisabled') }}
		</N8nCallout>
		<template v-else>
			<N8nText tag="h4" bold size="small" color="text-base">
				{{ i18n.baseText('taskBoard.assignee.agents') }}
			</N8nText>
			<N8nLoading
				v-if="team.loadingAgents.value && team.agents.value.length === 0"
				:rows="2"
				variant="p"
			/>
			<N8nEmptyState
				v-else-if="team.agents.value.length === 0"
				:icon="{ type: 'icon', value: 'bot' }"
				:heading="i18n.baseText('taskBoard.team.empty.heading')"
				:description="i18n.baseText('taskBoard.team.empty.description')"
				:button-text="i18n.baseText('taskBoard.team.addAgent')"
				:button-disabled="!team.canAddAgent.value"
				data-test-id="task-board-team-empty"
				@click:button="team.openAddDialog"
			/>
			<div v-else :class="$style.list" data-test-id="task-board-team-agents">
				<TeamAgentRow
					v-for="agent in team.agents.value"
					:key="agent.id"
					:agent="agent"
					:editor-route="team.agentEditorRoute(agent.id)"
					:can-edit="team.canEditAgent.value"
					:publishing="team.publishingId.value === agent.id"
					@edit="team.openEditDialog(agent)"
					@publish="team.publish(agent)"
				/>
			</div>
		</template>

		<template v-if="team.people.value.length > 0">
			<N8nText tag="h4" bold size="small" color="text-base">
				{{ i18n.baseText('taskBoard.assignee.people') }}
			</N8nText>
			<div :class="$style.list" data-test-id="task-board-team-people">
				<TeamPersonRow v-for="person in team.people.value" :key="person.id" :person="person" />
			</div>
		</template>

		<AgentDialog
			v-model:open="dialogOpen"
			:project-id="projectId"
			:agent-id="team.editingAgentId.value"
			:initial-values="team.editingValues.value"
			:saving="team.saving.value"
			@submit="team.submitDialog"
		/>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.list {
	display: grid;
	/* A readable minimum row width. The spacing scale has no token this wide. */
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 32rem), 1fr));
	gap: var(--spacing--xs);
}
</style>
