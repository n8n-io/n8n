<script lang="ts" setup>
import { useLoadingService } from '@/composables/useLoadingService';
import { useToast } from '@/composables/useToast';
import { SOURCE_CONTROL_PULL_MODAL_KEY, VIEWS, WORKFLOW_DIFF_MODAL_KEY } from '@/constants';
import { sourceControlEventBus } from '@/event-bus/source-control';
import EnvFeatureFlag from '@/features/env-feature-flag/EnvFeatureFlag.vue';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import {
	getPullPriorityByStatus,
	getStatusText,
	getStatusTheme,
	notifyUserAboutPullWorkFolderOutcome,
} from '@/utils/sourceControlUtils';
import { type SourceControlledFile, SOURCE_CONTROL_FILE_TYPE } from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import groupBy from 'lodash/groupBy';
import orderBy from 'lodash/orderBy';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import Modal from './Modal.vue';

type SourceControlledFileType = SourceControlledFile['type'];

const props = defineProps<{
	data: { eventBus: EventBus; status: SourceControlledFile[] };
}>();

const loadingService = useLoadingService();
const uiStore = useUIStore();
const toast = useToast();
const i18n = useI18n();
const sourceControlStore = useSourceControlStore();

const sortedFiles = computed(() =>
	orderBy(
		props.data.status,
		[({ status }) => getPullPriorityByStatus(status), ({ name }) => name.toLowerCase()],
		['desc', 'asc'],
	),
);

const groupedFilesByType = computed<
	Partial<Record<SourceControlledFileType, SourceControlledFile[]>>
>(() => groupBy(sortedFiles.value, 'type'));

type ItemsList = Array<
	{ type: 'render-title'; title: string; id: SourceControlledFileType } | SourceControlledFile
>;

const ITEM_TITLES: Record<Exclude<SourceControlledFileType, 'file'>, string> = {
	[SOURCE_CONTROL_FILE_TYPE.workflow]: 'Workflows',
	[SOURCE_CONTROL_FILE_TYPE.credential]: 'Credentials',
	[SOURCE_CONTROL_FILE_TYPE.variables]: 'Variables',
	[SOURCE_CONTROL_FILE_TYPE.tags]: 'Tags',
	[SOURCE_CONTROL_FILE_TYPE.folders]: 'Folders',
} as const;

const files = computed<ItemsList>(() =>
	[
		SOURCE_CONTROL_FILE_TYPE.workflow,
		SOURCE_CONTROL_FILE_TYPE.credential,
		SOURCE_CONTROL_FILE_TYPE.variables,
		SOURCE_CONTROL_FILE_TYPE.tags,
		SOURCE_CONTROL_FILE_TYPE.folders,
	].reduce<ItemsList>((acc, fileType) => {
		if (!groupedFilesByType.value[fileType]) {
			return acc;
		}

		acc.push({
			type: 'render-title',
			title: ITEM_TITLES[fileType],
			id: fileType,
		});

		acc.push(...groupedFilesByType.value[fileType]);
		return acc;
	}, []),
);

function close() {
	uiStore.closeModal(SOURCE_CONTROL_PULL_MODAL_KEY);
}

async function pullWorkfolder() {
	loadingService.startLoading(i18n.baseText('settings.sourceControl.loading.pull'));
	close();

	try {
		const status = await sourceControlStore.pullWorkfolder(true);

		await notifyUserAboutPullWorkFolderOutcome(status, toast);

		sourceControlEventBus.emit('pull');
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		loadingService.stopLoading();
	}
}

const workflowDiffEventBus = createEventBus();

function openDiffModal(id: string) {
	uiStore.openModalWithData({
		name: WORKFLOW_DIFF_MODAL_KEY,
		data: { eventBus: workflowDiffEventBus, workflowId: id, direction: 'pull' },
	});
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
			<N8nText tag="div" class="mb-xs">
				{{ i18n.baseText('settings.sourceControl.modals.pull.description') }}
				<br />
				<N8nLink :to="i18n.baseText('settings.sourceControl.docs.using.pushPull.url')">
					{{ i18n.baseText('settings.sourceControl.modals.push.description.learnMore') }}
				</N8nLink>
			</N8nText>
			<div :class="$style.container">
				<DynamicScroller
					ref="scroller"
					:items="files"
					:min-item-size="47"
					class="full-height scroller"
					style="max-height: 440px"
				>
					<template #default="{ item, index, active }">
						<div
							v-if="item.type === 'render-title'"
							:class="$style.listHeader"
							data-test-id="pull-modal-item-header"
						>
							<N8nText bold>{{ item.title }}</N8nText>
						</div>
						<DynamicScrollerItem
							v-else
							:item="item"
							:active="active"
							:size-dependencies="[item.name]"
							:data-index="index"
						>
							<div :class="$style.listItem" data-test-id="pull-modal-item">
								<RouterLink
									v-if="item.type === 'credential'"
									target="_blank"
									:to="{ name: VIEWS.CREDENTIALS, params: { credentialId: item.id } }"
								>
									<N8nText>{{ item.name }}</N8nText>
								</RouterLink>
								<RouterLink
									v-else-if="item.type === 'workflow'"
									target="_blank"
									:to="{ name: VIEWS.WORKFLOW, params: { name: item.id } }"
								>
									<N8nText>{{ item.name }}</N8nText>
								</RouterLink>
								<N8nText v-else>{{ item.name }}</N8nText>
								<N8nBadge :theme="getStatusTheme(item.status)" :class="$style.listBadge">
									{{ getStatusText(item.status) }}
								</N8nBadge>
								<EnvFeatureFlag name="SOURCE_CONTROL_WORKFLOW_DIFF">
									<N8nIconButton
										v-if="item.type === SOURCE_CONTROL_FILE_TYPE.workflow"
										icon="git-branch"
										type="secondary"
										@click="openDiffModal(item.id)"
									/>
								</EnvFeatureFlag>
							</div>
						</DynamicScrollerItem>
					</template>
				</DynamicScroller>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="tertiary" class="mr-2xs" @click="close">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.cancel') }}
				</N8nButton>
				<N8nButton type="primary" data-test-id="force-pull" @click="pullWorkfolder">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.save') }}
				</N8nButton>
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

.listHeader {
	padding-top: 16px;
	padding-bottom: 12px;
	height: 47px;
}

.listBadge {
	margin-left: auto;
	align-self: flex-start;
	margin-top: 2px;
}

.listItem {
	display: flex;
	padding-bottom: 10px;
	&::before {
		display: block;
		content: '';
		width: 5px;
		height: 5px;
		background-color: var(--color-foreground-xdark);
		border-radius: 100%;
		margin: 7px 8px 6px 2px;
		flex-shrink: 0;
	}
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}
</style>
