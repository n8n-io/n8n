<script lang="ts" setup>
import Modal from './Modal.vue';
import { CREDENTIAL_EDIT_MODAL_KEY, VERSION_CONTROL_PUSH_MODAL_KEY } from '@/constants';
import { onMounted, ref } from 'vue';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import type { VersionControlAggregatedFile, VersionControlStatus } from '@/Interface';
import { useI18n, useToast } from '@/composables';
import { useVersionControlStore } from '@/stores/versionControl.store';
import { aggregateVersionControlFiles } from '@/utils';
import { useUIStore } from '@/stores';
import { useRoute } from 'vue-router/composables';

const props = defineProps({
	data: {
		type: Object as PropType<{ eventBus: EventBus }>,
		default: () => ({}),
	},
});

const uiStore = useUIStore();
const toast = useToast();
const { i18n } = useI18n();
const versionControlStore = useVersionControlStore();
const route = useRoute();

const files = ref<VersionControlAggregatedFile[]>([]);
const commitMessage = ref('');
const loading = ref(true);
const context = ref<'workflow' | 'workflows' | 'credentials' | string>('');

onMounted(async () => {
	context.value = getContext();

	try {
		const status = await versionControlStore.getStatus();
		files.value = aggregateVersionControlFiles({
			...status,
			staged: getStagedFilesByContext(status),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	} finally {
		loading.value = false;
	}
});

function getContext() {
	if (route.fullPath.startsWith('/workflows')) {
		return 'workflows';
	} else if (
		route.fullPath.startsWith('/credentials') ||
		uiStore.modals[CREDENTIAL_EDIT_MODAL_KEY].open
	) {
		return 'credentials';
	} else if (route.fullPath.startsWith('/workflow/')) {
		return 'workflow';
	}

	return '';
}

function getStagedFilesByContext(status: VersionControlStatus): string[] {
	if (context.value === 'workflows') {
		return status.files
			.filter((file) => file.path.startsWith('workflows'))
			.map((file) => file.path);
	} else if (context.value === 'credentials') {
		return status.files
			.filter((file) => file.path.startsWith('credentials'))
			.map((file) => file.path);
	} else if (context.value === 'workflow') {
		const workflowId = route.params.name as string;
		return status.files
			.filter((file) => file.path === `workflows/${workflowId}.json`)
			.map((file) => file.path);
	}

	return [];
}

function setStagedStatus(file: VersionControlAggregatedFile) {
	const fileIndex = files.value.findIndex((f) => f.path === file.path);

	files.value = [
		...files.value.slice(0, fileIndex),
		{
			...file,
			staged: !file.staged,
		},
		...files.value.slice(fileIndex + 1),
	];
}

function close() {
	uiStore.closeModal(VERSION_CONTROL_PUSH_MODAL_KEY);
}

async function commitAndPush() {
	const fileNames = files.value.filter((file) => file.staged).map((file) => file.path);

	loading.value = true;
	try {
		await versionControlStore.pushWorkfolder({
			commitMessage: commitMessage.value,
			fileNames,
		});

		// @TODO Show success message

		close();
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<Modal
		width="812px"
		:title="i18n.baseText('settings.versionControl.modals.push.title')"
		:eventBus="data.eventBus"
		:name="VERSION_CONTROL_PUSH_MODAL_KEY"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-text>
					{{ i18n.baseText('settings.versionControl.modals.push.description') }}
					<span v-if="context">
						{{ i18n.baseText(`settings.versionControl.modals.push.description.${context}`) }}
					</span>
					<n8n-link
						:href="i18n.baseText('settings.versionControl.modals.push.description.learnMore.url')"
					>
						{{ i18n.baseText('settings.versionControl.modals.push.description.learnMore') }}
					</n8n-link>
				</n8n-text>

				<div v-if="files.length > 0">
					<n8n-text bold tag="p" class="mt-l mb-2xs">
						{{ i18n.baseText('settings.versionControl.modals.push.filesToCommit') }}
					</n8n-text>
					<n8n-card
						v-for="file in files"
						:key="file.path"
						:class="$style.listItem"
						@click="setStagedStatus(file, !file.staged)"
					>
						<div :class="$style.listItemBody">
							<n8n-checkbox
								:value="file.staged"
								:class="$style.listItemCheckbox"
								@input="setStagedStatus(file, $event)"
							/>
							<n8n-text bold>
								{{ file.path }}
							</n8n-text>
							<n8n-badge :class="$style.listItemStatus">
								{{ file.status }}
							</n8n-badge>
						</div>
					</n8n-card>
				</div>

				<n8n-text bold tag="p" class="mt-l mb-2xs">
					{{ i18n.baseText('settings.versionControl.modals.push.commitMessage') }}
				</n8n-text>
				<n8n-input
					type="text"
					v-model="commitMessage"
					:placeholder="
						i18n.baseText('settings.versionControl.modals.push.commitMessage.placeholder')
					"
				/>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<n8n-button type="tertiary" class="mr-2xs" :disabled="loading" @click="close">
					{{ i18n.baseText('settings.versionControl.modals.push.buttons.cancel') }}
				</n8n-button>
				<n8n-button type="primary" :loading="loading" @click="commitAndPush">
					{{ i18n.baseText('settings.versionControl.modals.push.buttons.save') }}
				</n8n-button>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container > * {
	overflow-wrap: break-word;
}

.actionButtons {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}

.listItem {
	margin-top: var(--spacing-2xs);
	margin-bottom: var(--spacing-2xs);
	cursor: pointer;
	transition: border 0.3s ease;
	padding: var(--spacing-xs);

	&:hover {
		border-color: var(--color-foreground-dark);
	}

	&:first-child {
		margin-top: 0;
	}

	&:last-child {
		margin-bottom: 0;
	}

	.listItemBody {
		display: flex;
		flex-direction: row;
		align-items: center;

		.listItemCheckbox {
			display: inline-flex !important;
			margin-bottom: 0 !important;
			margin-right: var(--spacing-2xs);
		}

		.listItemStatus {
			margin-left: var(--spacing-2xs);
		}
	}
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}
</style>
