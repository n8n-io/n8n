<script setup lang="ts">
import { ref } from 'vue';
import {
	skillSourceDeleteBlockSchema,
	type SkillSourceDeleteBlock,
	type SkillSourceListItem,
} from '@n8n/api-types';
import { N8nButton, N8nDialog, N8nDialogBody, N8nDialogFooter, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';

import { useSkillsStore } from '../skills.store';

const props = defineProps<{ source: SkillSourceListItem }>();
const emit = defineEmits<{ close: []; deleted: [] }>();
const i18n = useI18n();
const skillsStore = useSkillsStore();
const { showError, showMessage } = useToast();
/** The action that runs, so that only its button shows progress. */
const pending = ref<'delete' | 'keep'>();
const block = ref<SkillSourceDeleteBlock>();

async function deleteSource(keepSkills = false) {
	if (pending.value || !props.source.canDelete) return;
	pending.value = keepSkills ? 'keep' : 'delete';
	try {
		if (keepSkills) await skillsStore.deleteSource(props.source.id, { keepSkills: true });
		else await skillsStore.deleteSource(props.source.id);
		showMessage({
			title: i18n.baseText(
				keepSkills
					? 'settings.context.skills.sources.delete.keep.success'
					: 'settings.context.skills.sources.delete.success',
			),
			type: 'success',
		});
		emit('deleted');
	} catch (error) {
		const parsed = skillSourceDeleteBlockSchema.safeParse(
			error instanceof ResponseError && error.httpStatusCode === 409 ? error.meta : undefined,
		);
		if (parsed.success) block.value = parsed.data;
		else showError(error, i18n.baseText('settings.context.skills.sources.delete.error'));
	} finally {
		pending.value = undefined;
	}
}
</script>

<template>
	<N8nDialog
		open
		:header="
			i18n.baseText(
				block
					? 'settings.context.skills.sources.delete.blocked.title'
					: 'settings.context.skills.sources.delete.title',
			)
		"
		data-test-id="skill-source-delete-dialog"
		@update:open="!$event && !pending && emit('close')"
	>
		<N8nDialogBody aria-live="polite" :class="$style.message">
			<template v-if="block">
				<N8nText tag="p">
					{{ i18n.baseText('settings.context.skills.sources.delete.blocked.message') }}
				</N8nText>
				<ul v-if="block.agents.length">
					<li v-for="agent in block.agents" :key="agent.agentId">
						{{ agent.agentName }} · {{ agent.projectName }}
					</li>
				</ul>
				<N8nText v-if="block.hiddenAgents" tag="p">
					{{
						i18n.baseText('settings.context.skills.agents.hidden', {
							interpolate: { count: block.hiddenAgents },
							adjustToNumber: block.hiddenAgents,
						})
					}}
				</N8nText>
			</template>
			<N8nText v-else tag="p">
				{{
					i18n.baseText('settings.context.skills.sources.delete.message', {
						interpolate: { source: source.label, count: source.skillCount },
						adjustToNumber: source.skillCount,
					})
				}}
			</N8nText>
			<N8nText v-if="source.skillCount" tag="p">
				{{ i18n.baseText('settings.context.skills.sources.delete.keep.message') }}
			</N8nText>
			<N8nText v-if="source.skillCount" tag="p">
				{{
					i18n.baseText('settings.context.skills.stopSyncing.confirm.keep', {
						adjustToNumber: source.skillCount,
					})
				}}
			</N8nText>
			<N8nText v-if="source.skillCount" tag="p">
				{{ i18n.baseText('settings.context.skills.stopSyncing.confirm.updates') }}
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="outline" :disabled="!!pending" @click="emit('close')">
				{{ i18n.baseText(block ? 'generic.close' : 'generic.cancel') }}
			</N8nButton>
			<N8nButton
				v-if="source.skillCount"
				variant="outline"
				:loading="pending === 'keep'"
				:disabled="!!pending || !source.canDelete"
				@click="deleteSource(true)"
			>
				{{ i18n.baseText('settings.context.skills.stopSyncing.action') }}
			</N8nButton>
			<N8nButton
				v-if="!block"
				variant="destructive"
				:loading="pending === 'delete'"
				:disabled="!!pending || !source.canDelete"
				@click="deleteSource()"
			>
				{{
					i18n.baseText(
						source.skillCount
							? 'settings.context.skills.sources.delete.skills'
							: 'settings.context.skills.sources.delete.action',
					)
				}}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module>
.message {
	gap: var(--spacing--sm);
}
</style>
