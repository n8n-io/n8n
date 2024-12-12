<script lang="ts" setup>
import Modal from './Modal.vue';
import { SOURCE_CONTROL_PULL_MODAL_KEY } from '@/constants';
import type { EventBus } from 'n8n-design-system/utils';
import type { SourceControlAggregatedFile } from '@/types/sourceControl.types';
import { useI18n } from '@/composables/useI18n';
import { useLoadingService } from '@/composables/useLoadingService';
import { useToast } from '@/composables/useToast';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { computed, nextTick, ref } from 'vue';
import { sourceControlEventBus } from '@/event-bus/source-control';

const props = defineProps<{
	data: { eventBus: EventBus; status: SourceControlAggregatedFile[] };
}>();

const incompleteFileTypes = ['variables', 'credential'];

const loadingService = useLoadingService();
const uiStore = useUIStore();
const toast = useToast();
const i18n = useI18n();
const sourceControlStore = useSourceControlStore();

const files = ref<SourceControlAggregatedFile[]>(props.data.status || []);

const workflowFiles = computed(() => {
	return files.value.filter((file) => file.type === 'workflow' || file.conflict);
});

const modifiedWorkflowFiles = computed(() => {
	return workflowFiles.value.filter((file) => file.status === 'modified' || file.conflict);
});

function close() {
	uiStore.closeModal(SOURCE_CONTROL_PULL_MODAL_KEY);
}

async function pullWorkfolder() {
	loadingService.startLoading(i18n.baseText('settings.sourceControl.loading.pull'));
	close();

	try {
		await sourceControlStore.pullWorkfolder(true);

		const hasVariablesOrCredentials = files.value.some((file) => {
			return incompleteFileTypes.includes(file.type) && file.status === 'created';
		});

		toast.showMessage({
			title: i18n.baseText('settings.sourceControl.pull.success.title'),
			type: 'success',
		});

		if (hasVariablesOrCredentials) {
			void nextTick(() => {
				toast.showMessage({
					message: i18n.baseText('settings.sourceControl.pull.oneLastStep.description'),
					title: i18n.baseText('settings.sourceControl.pull.oneLastStep.title'),
					type: 'info',
					duration: 0,
					showClose: true,
					offset: 0,
				});
			});
		}
		sourceControlEventBus.emit('pull');
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
		:event-bus="data.eventBus"
		:name="SOURCE_CONTROL_PULL_MODAL_KEY"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-text>
					{{ i18n.baseText('settings.sourceControl.modals.pull.description') }}
					<n8n-link :to="i18n.baseText('settings.sourceControl.docs.using.pushPull.url')">
						{{ i18n.baseText('settings.sourceControl.modals.pull.description.learnMore') }}
					</n8n-link>
				</n8n-text>

				<div v-if="modifiedWorkflowFiles.length > 0" class="mt-l">
					<ul :class="$style.filesList">
						<li v-for="file in modifiedWorkflowFiles" :key="file.id">
							<n8n-link
								v-if="file.type === 'workflow'"
								:class="$style.fileLink"
								new-window
								:to="`/home/workflow/${file.id}`"
							>
								Workflow: {{ file.name }} (will be {{ file.status }})
								<n8n-icon icon="external-link-alt" />
							</n8n-link>

							<n8n-link
								v-else-if="file.type === 'credential'"
								:class="$style.fileLink"
								new-window
								:to="`/home/credentials/${file.id}`"
							>
								Credential: {{ file.name }} (will be {{ file.status }})
								<n8n-icon icon="external-link-alt" />
							</n8n-link>

							<n8n-link
								v-else-if="file.type === 'variables'"
								:class="$style.fileLink"
								new-window
								:to="'/variables'"
							>
								Variable: {{ file.name }} (will be {{ file.status }})
								<n8n-icon icon="external-link-alt" />
							</n8n-link>

							<n8n-link
								v-else-if="file.type === 'tags'"
								:class="$style.fileLink"
								new-window
								:to="`/home/workflows?tags=${file.id}`"
							>
								Tag: {{ file.name }} (will be {{ file.status }})
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
