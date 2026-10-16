<script lang="ts" setup>
import { onMounted, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AgentSkill, SkillCreateMethod, SkillDetail } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { N8nSettingsLayout } from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import AgentSkillEditor, {
	type AgentSkillConfirmFailure,
	type AgentSkillEditorData,
} from '@/features/agents/components/AgentSkillEditor.vue';
import { isSkillNameTakenError } from '@/features/agents/utils/agentSkill';

import { useSkillsStore } from '../skills.store';
import {
	SAVED_SKILL_STATE,
	type SavedSkillNotice,
	parseSkillScope,
	readSkillsListQuery,
	skillScopeValue,
	useSkillScopeDisplay,
	useSkillScopeOptions,
} from '../skills.utils';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const projectsStore = useProjectsStore();
const skillsStore = useSkillsStore();
const telemetry = useTelemetry();
const { showError, showMessage } = useToast();
const { scopeDisplay } = useSkillScopeDisplay();
const { scopeOptions } = useSkillScopeOptions();

const editorData = shallowRef<AgentSkillEditorData | null>(null);
let savedSkill: SavedSkillNotice | undefined;

async function goBackToList() {
	await router.push({
		name: VIEWS.SETTINGS_CONTEXT_SKILLS,
		query: readSkillsListQuery(history.state),
		...(savedSkill ? { state: { [SAVED_SKILL_STATE]: savedSkill } } : {}),
	});
}

/**
 * A refused save keeps the page open, so the user keeps what they typed. A taken name
 * shows on the name field, any other error in a toast.
 */
function saveFailed(error: unknown): AgentSkillConfirmFailure {
	if (isSkillNameTakenError(error)) {
		return { saved: false, nameError: i18n.baseText('settings.context.skills.error.nameTaken') };
	}
	showError(error, i18n.baseText('settings.context.skills.error.save'));
	return { saved: false };
}

async function onCreate(
	skill: AgentSkill,
	scopeValue: string,
	method?: SkillCreateMethod,
): Promise<AgentSkillConfirmFailure | undefined> {
	try {
		const { id } = await skillsStore.createSkill({
			...parseSkillScope(scopeValue),
			skill,
			...(method ? { method } : {}),
		});
		savedSkill = { id, created: true };
	} catch (error) {
		return saveFailed(error);
	}
	return undefined;
}

/** Saves the next version. There are no drafts: what the page shows is what gets saved. */
/** `newScope` is set when the user picked another scope: the save also moves the skill. */
async function onSave(
	id: string,
	skill: AgentSkill,
	baseSkillHash: string,
	newScope?: string,
): Promise<AgentSkillConfirmFailure | undefined> {
	let created: boolean;
	try {
		({ created } = await skillsStore.saveSkill(id, {
			name: skill.name,
			description: skill.description,
			instructions: skill.instructions,
			// An empty list clears the references, where an absent one would keep them.
			references: skill.references ?? [],
			baseSkillHash,
			...(newScope ? parseSkillScope(newScope) : {}),
		}));
	} catch (error) {
		return saveFailed(error);
	}
	// A move is a change even when the content stays the same. Only "Nothing to save"
	// gets a message: a real change shows in the table.
	if (created || newScope !== undefined) {
		savedSkill = { id, created: false };
	} else {
		showMessage({ title: i18n.baseText('settings.context.skills.save.noChanges'), type: 'info' });
	}
	return undefined;
}

/** Starts at the SKILL.md upload step, which also offers "Add manually". */
function createData(): AgentSkillEditorData | null {
	const options = scopeOptions.value;
	if (options.length === 0) return null;
	return {
		scopeOptions: options,
		initialScope: options[0].value,
		existingSkillNames: [],
		getDefaultName: async (scopeValue) =>
			await skillsStore.fetchNewSkillName({
				...parseSkillScope(scopeValue),
				name: i18n.baseText('agents.builder.skills.defaultName'),
			}),
		onConfirm: async ({ skill, scope, method }) =>
			await onCreate(skill, scope ?? options[0].value, method),
	};
}

/**
 * Why the scope of a saved skill cannot change, if it cannot. The backend refuses a move
 * while an agent uses the skill, and a move needs the delete permission where the skill is,
 * because it takes the skill out of that scope.
 */
function scopeLock(
	detail: Pick<SkillDetail, 'usedByAgents' | 'canDelete'>,
): Pick<AgentSkillEditorData, 'scopeLockedReason'> {
	if (detail.usedByAgents > 0) {
		return {
			scopeLockedReason: i18n.baseText('settings.context.skills.modal.scope.inUse', {
				interpolate: { count: detail.usedByAgents },
				adjustToNumber: detail.usedByAgents,
			}),
		};
	}
	if (!detail.canDelete) {
		return { scopeLockedReason: i18n.baseText('settings.context.skills.modal.scope.noDelete') };
	}
	return {};
}

function editData(detail: SkillDetail): AgentSkillEditorData {
	const currentValue = skillScopeValue(detail);
	// The current scope is listed even when the user could not create a skill there,
	// such as an agent skill, which is only made from inside its agent.
	const options = scopeOptions.value.some((option) => option.value === currentValue)
		? scopeOptions.value
		: [{ value: currentValue, ...scopeDisplay(detail) }, ...scopeOptions.value];
	return {
		skill: detail.skill,
		skillId: detail.id,
		readOnly: !detail.canEdit,
		scopeOptions: options,
		initialScope: currentValue,
		...scopeLock(detail),
		existingSkillNames: [],
		onConfirm: async ({ skill, scope }) =>
			await onSave(detail.id, skill, detail.skillHash, scope !== currentValue ? scope : undefined),
	};
}

async function loadEditData(skillId: string) {
	try {
		const detail = await skillsStore.fetchSkill(skillId);
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_OPENED_SKILL, {
			skill_id: detail.id,
			scope: detail.scope,
			...(detail.projectId ? { project_id: detail.projectId } : {}),
			read_only: !detail.canEdit,
		});
		editorData.value = editData(detail);
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.error.loadOne'));
		await goBackToList();
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.context.skills.title'));
	await projectsStore.getMyProjects().catch(() => undefined);
	const { skillId } = route.params;
	if (typeof skillId === 'string') {
		await loadEditData(skillId);
		return;
	}
	editorData.value = createData();
	if (!editorData.value) await goBackToList();
});
</script>

<template>
	<N8nSettingsLayout :class="$style.layout" full-width data-test-id="settings-skill-view">
		<AgentSkillEditor
			v-if="editorData"
			layout="page"
			:data="editorData"
			:exit-label="i18n.baseText('settings.context.skills.page.back')"
			@close="goBackToList"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.layout {
	padding: 0;
}
</style>
