<script lang="ts" setup>
import Modal from './Modal.vue';
import { SOURCE_CONTROL_PULL_MODAL_KEY, VIEWS } from '@/constants';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import type { SourceControlAggregatedFile } from '@/Interface';
import { useI18n, useLoadingService, useToast } from '@/composables';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores';
import { useRoute, useRouter } from 'vue-router/composables';
import { computed, ref } from 'vue';

const props = defineProps({
	data: {
		type: Object as PropType<{ eventBus: EventBus; status: SourceControlAggregatedFile[] }>,
		default: () => ({}),
	},
});

const defaultStagedFileTypes = ['tags', 'variables', 'credential'];

const loadingService = useLoadingService();
const uiStore = useUIStore();
const toast = useToast();
const { i18n } = useI18n();
const sourceControlStore = useSourceControlStore();
const router = useRouter();
const route = useRoute();

const files = ref<SourceControlAggregatedFile[]>(props.data.status || []);

const workflowFiles = computed(() => {
	return files.value.filter((file) => file.type === 'workflow');
});

const modifiedWorkflowFiles = computed(() => {
	return workflowFiles.value.filter((file) => file.status === 'modified');
});

const deletedWorkflowFiles = computed(() => {
	return workflowFiles.value.filter((file) => file.status === 'deleted');
});

function close() {
	uiStore.closeModal(SOURCE_CONTROL_PULL_MODAL_KEY);
}

async function pullWorkfolder() {
	loadingService.startLoading(i18n.baseText('settings.sourceControl.loading.pull'));
	close();

	try {
		await sourceControlStore.pullWorkfolder(true);
		toast.showMessage({
			message: `${i18n.baseText('settings.sourceControl.pull.success.description')}${
				deletedWorkflowFiles.value.length > 0
					? `. ${i18n.baseText('settings.sourceControl.pull.success.description.deleted')}`
					: ''
			}`,
			title: i18n.baseText('settings.sourceControl.pull.success.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		loadingService.stopLoading();
	}
}
</script>

<template>
	<Modal
		width="500px"
		:title="i18n.baseText('settings.sourceControl.modals.pull.title')"
		:eventBus="data.eventBus"
		:name="SOURCE_CONTROL_PULL_MODAL_KEY"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-text>
					{{ i18n.baseText('settings.sourceControl.modals.pull.description') }}
				</n8n-text>

				<div v-if="modifiedWorkflowFiles.length > 0" class="mt-l">
					<n8n-text bold>
						{{ i18n.baseText('settings.sourceControl.modals.pull.workflowsWithChanges') }}
					</n8n-text>
					<ul :class="$style.filesList">
						<li v-for="file in modifiedWorkflowFiles" :key="file.id">
							<n8n-link
								:class="$style.fileLink"
								theme="text"
								new-window
								:to="`/workflow/${file.id}`"
							>
								{{ file.name }}
								<n8n-icon icon="external-link-alt" />
							</n8n-link>
						</li>
					</ul>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<n8n-button type="tertiary" class="mr-2xs" @click="close">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.cancel') }}
				</n8n-button>
				<n8n-button type="primary" @click="pullWorkfolder">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.save') }}
				</n8n-button>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container > * {
	overflow-wrap: break-word;
}

.filesList {
	list-style: inside;
	margin-top: var(--spacing-3xs);
	padding-left: var(--spacing-2xs);

	li {
		margin-top: var(--spacing-3xs);
	}
}

.fileLink {
	svg {
		display: none;
		margin-left: var(--spacing-4xs);
	}

	&:hover svg {
		display: inline-flex;
	}
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}
</style>
