<script lang="ts" setup>
import Modal from './Modal.vue';
import { CREDENTIAL_EDIT_MODAL_KEY, VERSION_CONTROL_PUSH_MODAL_KEY } from '@/constants';
import { computed, onMounted, ref } from 'vue';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import type { VersionControlAggregatedFile } from '@/Interface';
import { useI18n, useLoadingService, useToast } from '@/composables';
import { useVersionControlStore } from '@/stores/versionControl.store';
import { useUIStore } from '@/stores';
import { useRoute } from 'vue-router/composables';

const props = defineProps({
	data: {
		type: Object as PropType<{ eventBus: EventBus; status: VersionControlAggregatedFile[] }>,
		default: () => ({}),
	},
});

const loadingService = useLoadingService();
const uiStore = useUIStore();
const toast = useToast();
const { i18n } = useI18n();
const versionControlStore = useVersionControlStore();
const route = useRoute();

const staged = ref<Record<string, boolean>>({});
const files = ref<VersionControlAggregatedFile[]>(props.data.status || []);

const commitMessage = ref('');
const loading = ref(true);
const context = ref<'workflow' | 'workflows' | 'credentials' | string>('');

const isSubmitDisabled = computed(() => {
	return !commitMessage.value || Object.values(staged.value).every((value) => !value);
});

onMounted(async () => {
	context.value = getContext();
	try {
		staged.value = getStagedFilesByContext(files.value);
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

function getStagedFilesByContext(files: VersionControlAggregatedFile[]): Record<string, boolean> {
	const stagedFiles: VersionControlAggregatedFile[] = [];
	if (context.value === 'workflows') {
		stagedFiles.push(...files.filter((file) => file.file.startsWith('workflows')));
	} else if (context.value === 'credentials') {
		stagedFiles.push(...files.filter((file) => file.file.startsWith('credentials')));
	} else if (context.value === 'workflow') {
		const workflowId = route.params.name as string;
		stagedFiles.push(...files.filter((file) => file.type === 'workflow' && file.id === workflowId));
	}

	return stagedFiles.reduce<Record<string, boolean>>((acc, file) => {
		acc[file.file] = true;
		return acc;
	}, {});
}

function setStagedStatus(file: VersionControlAggregatedFile, status: boolean) {
	staged.value = {
		...staged.value,
		[file.file]: status,
	};
}

function close() {
	uiStore.closeModal(VERSION_CONTROL_PUSH_MODAL_KEY);
}

async function commitAndPush() {
	const fileNames = files.value.filter((file) => staged.value[file.file]).map((file) => file.file);

	loadingService.startLoading(i18n.baseText('settings.versionControl.loading.push'));
	close();

	try {
		await versionControlStore.pushWorkfolder({
			commitMessage: commitMessage.value,
			fileNames,
		});

		toast.showToast({
			title: i18n.baseText('settings.versionControl.modals.push.success.title'),
			message: i18n.baseText('settings.versionControl.modals.push.success.description'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	} finally {
		loadingService.stopLoading();
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
						:key="file.file"
						:class="$style.listItem"
						@click="setStagedStatus(file, !staged[file.file])"
					>
						<div :class="$style.listItemBody">
							<n8n-checkbox
								:value="staged[file.file]"
								:class="$style.listItemCheckbox"
								@input="setStagedStatus(file, !staged[file.file])"
							/>
							<n8n-text bold>
								<span v-if="file.status === 'deleted'">
									<span v-if="file.type === 'workflow'"> Workflow </span>
									<span v-if="file.type === 'credential'"> Credential </span>
									Id: {{ file.id }}
								</span>
								<span v-else>
									{{ file.name }}
								</span>
							</n8n-text>
							<n8n-badge :class="$style.listItemStatus">
								{{ file.status }}
							</n8n-badge>
						</div>
					</n8n-card>

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
				<div v-else-if="!loading">
					<n8n-callout class="mt-l">
						{{ i18n.baseText('settings.versionControl.modals.push.everythingIsUpToDate') }}
					</n8n-callout>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<n8n-button type="tertiary" class="mr-2xs" @click="close">
					{{ i18n.baseText('settings.versionControl.modals.push.buttons.cancel') }}
				</n8n-button>
				<n8n-button type="primary" :disabled="isSubmitDisabled" @click="commitAndPush">
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
