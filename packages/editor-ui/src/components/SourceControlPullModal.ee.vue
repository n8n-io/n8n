<script lang="ts" setup>
import Modal from './Modal.vue';
import { SOURCE_CONTROL_PULL_MODAL_KEY, VIEWS } from '@/constants';
import type { EventBus } from 'n8n-design-system/utils';
import {
	type SourceControlAggregatedFile,
	type SourceControlledFileType,
	SOURCE_CONTROL_FILE_TYPE,
} from '@/types/sourceControl.types';
import { useI18n } from '@/composables/useI18n';
import { useLoadingService } from '@/composables/useLoadingService';
import { useToast } from '@/composables/useToast';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { computed, nextTick } from 'vue';
import { sourceControlEventBus } from '@/event-bus/source-control';
import { orderBy, groupBy } from 'lodash-es';
import { N8nBadge, N8nText, N8nLink, N8nButton } from 'n8n-design-system';
import { RouterLink } from 'vue-router';
import { getStatusText, getStatusTheme, getPullPriorityByStatus } from '@/utils/sourceControlUtils';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

const props = defineProps<{
	data: { eventBus: EventBus; status: SourceControlAggregatedFile[] };
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
	Partial<Record<SourceControlledFileType, SourceControlAggregatedFile[]>>
>(() => groupBy(sortedFiles.value, 'type'));

type ItemsList = Array<
	| { type: 'render-title'; title: string; id: SourceControlledFileType }
	| SourceControlAggregatedFile
>;

const ITEM_TITLES: Record<Exclude<SourceControlledFileType, 'file'>, string> = {
	[SOURCE_CONTROL_FILE_TYPE.WORKFLOW]: 'Workflows',
	[SOURCE_CONTROL_FILE_TYPE.CREDENTIAL]: 'Credentials',
	[SOURCE_CONTROL_FILE_TYPE.VARIABLES]: 'Variables',
	[SOURCE_CONTROL_FILE_TYPE.TAGS]: 'Tags',
} as const;

const files = computed<ItemsList>(() =>
	[
		SOURCE_CONTROL_FILE_TYPE.WORKFLOW,
		SOURCE_CONTROL_FILE_TYPE.CREDENTIAL,
		SOURCE_CONTROL_FILE_TYPE.VARIABLES,
		SOURCE_CONTROL_FILE_TYPE.TAGS,
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
		await sourceControlStore.pullWorkfolder(true);

		const hasVariablesOrCredentials =
			groupedFilesByType.value.credential?.length || groupedFilesByType.value.variables?.length;

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
			<N8nText tag="div" class="mb-xs">
				These resources will be updated or deleted, and any local changes to them will be lost. To
				keep the local version, push it before pulling.
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
						<div v-if="item.type === 'render-title'" :class="$style.listHeader">
							<N8nText bold>{{ item.title }}</N8nText>
						</div>
						<DynamicScrollerItem
							v-else
							:item="item"
							:active="active"
							:size-dependencies="[item.name]"
							:data-index="index"
						>
							<div :class="$style.listItem">
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
				<N8nButton type="primary" @click="pullWorkfolder">
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
