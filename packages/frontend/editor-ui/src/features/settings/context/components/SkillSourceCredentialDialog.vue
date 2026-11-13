<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
	isGitHubSkillSourceCredentialType,
	type SkillSourceCredentialOption,
	type SkillSourceListItem,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInputLabel,
	N8nSelect2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { getResourcePermissions } from '@n8n/permissions';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useSkillsStore } from '../skills.store';

const props = defineProps<{ source: SkillSourceListItem }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const i18n = useI18n();
const { showError } = useToast();
const skills = useSkillsStore();
const ui = useUIStore();
const projects = useProjectsStore();
const options = ref<SkillSourceCredentialOption[]>([]);
const selected = ref('');
const loading = ref(false);
const saving = ref(false);
const credentialModalOpen = computed(() => ui.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY]);
const project = computed(() =>
	props.source.projectId && props.source.projectId !== projects.personalProject?.id
		? projects.myProjects.find(({ id }) => id === props.source.projectId)
		: projects.personalProject,
);
const canCreate = computed(
	() => !!project.value && !!getResourcePermissions(project.value.scopes).credential.create,
);
const items = computed(() => [
	...options.value.map(({ id, name }) => ({ value: id, label: name })),
	...(canCreate.value
		? [
				{
					value: 'new:githubApi',
					label: i18n.baseText('settings.context.skills.connect.credential.new'),
				},
				{
					value: 'new:githubAppApi',
					label: i18n.baseText('settings.context.skills.connect.credential.newApp'),
				},
				{
					value: 'new:githubOAuth2Api',
					label: i18n.baseText('settings.context.skills.connect.credential.newOAuth2'),
				},
			]
		: []),
]);

let loadVersion = 0;
let mounted = true;
onBeforeUnmount(() => {
	mounted = false;
	loadVersion += 1;
});
async function load(credentialId?: string) {
	const version = ++loadVersion;
	loading.value = true;
	try {
		const credentials = await skills.fetchReplacementCredentials(props.source.id);
		if (version !== loadVersion) return;
		options.value = credentials;
		if (credentialId && credentials.some(({ id }) => id === credentialId))
			selected.value = credentialId;
	} catch (error) {
		if (version === loadVersion)
			showError(error, i18n.baseText('settings.context.skills.connect.credential.error.load'));
	} finally {
		if (version === loadVersion) loading.value = false;
	}
}

watch(
	() => props.source.id,
	() => {
		selected.value = '';
		options.value = [];
		void load();
	},
	{ immediate: true },
);

function select(value: string) {
	if (!value.startsWith('new:')) {
		selected.value = value;
		return;
	}
	const type = value.slice(4);
	if (!canCreate.value || !project.value || !isGitHubSkillSourceCredentialType(type)) return;
	const sourceId = props.source.id;
	ui.openNewCredential(type, false, false, project.value.id, undefined, undefined, undefined, {
		hideAskAssistant: true,
		appendToBody: true,
		closeOnSave: true,
		onCredentialCreated: ({ id }) => {
			if (mounted && props.source.id === sourceId) void load(id);
		},
	});
}

async function save() {
	if (!selected.value || saving.value) return;
	saving.value = true;
	try {
		await skills.replaceSourceCredential(props.source.id, selected.value);
		emit('saved');
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.sources.credential.error'));
	} finally {
		saving.value = false;
	}
}

function close(open: boolean) {
	if (!open && !saving.value && !credentialModalOpen.value) emit('close');
}
</script>

<template>
	<N8nDialog
		:open="true"
		:header="i18n.baseText('settings.context.skills.sources.replaceCredential')"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		data-test-id="skill-source-credential-dialog"
		@update:open="close"
		@interact-outside="
			(event: Event) => {
				if (credentialModalOpen) event.preventDefault();
			}
		"
	>
		<N8nDialogBody :class="$style.body">
			<N8nText>{{ source.label }}</N8nText>
			<N8nInputLabel
				:label="i18n.baseText('settings.context.skills.connect.credential.label')"
				input-name="skill-source-replacement"
			>
				<N8nSelect2
					id="skill-source-replacement"
					:aria-label="i18n.baseText('settings.context.skills.connect.credential.label')"
					:model-value="selected"
					:items="items"
					:disabled="loading || saving"
					data-test-id="skill-source-replacement-credential"
					@update:model-value="select(String($event ?? ''))"
				/>
			</N8nInputLabel>
			<N8nText size="small" color="text-light">{{
				i18n.baseText('settings.context.skills.sources.credential.hint')
			}}</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="saving"
				@click="close(false)"
			/>
			<N8nButton
				:label="i18n.baseText('generic.save')"
				:disabled="!selected || loading"
				:loading="saving"
				data-test-id="skill-source-credential-save"
				data-attr="skill-source-credential-save"
				@click="save"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
