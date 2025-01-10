<script lang="ts" setup>
import Modal from './Modal.vue';
import { SOURCE_CONTROL_PULL_MODAL_KEY, VIEWS } from '@/constants';
import type { EventBus } from 'n8n-design-system/utils';
import {
	type SourceControlAggregatedFile,
	type SourceControlledFileType,
} from '@/types/sourceControl.types';
import { useI18n } from '@/composables/useI18n';
import { useLoadingService } from '@/composables/useLoadingService';
import { useToast } from '@/composables/useToast';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { computed, nextTick } from 'vue';
import { sourceControlEventBus } from '@/event-bus/source-control';
import { orderBy, groupBy } from 'lodash-es';
import { N8nBadge, N8nText } from 'n8n-design-system';
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

const groupedChangesByType = computed<
	Partial<Record<SourceControlledFileType, SourceControlAggregatedFile[]>>
>(() => groupBy(sortedFiles.value, 'type'));

type HeaderItem = { type: 'render-title'; title: string; id: string };
type ItemsList = Array<HeaderItem | SourceControlAggregatedFile>;
const files = computed<ItemsList>(() => {
	const { workflow, credential, tags, variables } = groupedChangesByType.value;

	const output: ItemsList = [];

	if (workflow) {
		output.push({
			type: 'render-title',
			title: 'Workflows',
			id: 'workflow',
		});
		output.push(...workflow);
	}

	if (credential) {
		output.push({
			type: 'render-title',
			title: 'Credentials',
			id: 'credential',
		});
		output.push(...credential);
	}

	if (variables) {
		output.push({
			type: 'render-title',
			title: 'Variables',
			id: 'variable',
		});
		output.push(...variables);
	}

	if (tags) {
		output.push({
			type: 'render-title',
			title: 'Tags',
			id: 'tag',
		});
		output.push(...tags);
	}

	return output;
});

function close() {
	uiStore.closeModal(SOURCE_CONTROL_PULL_MODAL_KEY);
}

async function pullWorkfolder() {
	loadingService.startLoading(i18n.baseText('settings.sourceControl.loading.pull'));
	close();

	try {
		await sourceControlStore.pullWorkfolder(true);

		const hasVariablesOrCredentials =
			groupedChangesByType.value.credential?.length || groupedChangesByType.value.variables?.length;

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
				keep the local version, push it before pulling. <br /><RouterLink>More info</RouterLink>
			</N8nText>
			<div :class="$style.container">
				<DynamicScroller
					ref="scroller"
					:items="files"
					:min-item-size="30"
					class="full-height scroller"
					style="max-height: 440px"
				>
					<template #default="{ item, index, active }">
						<DynamicScrollerItem
							:item="item"
							:active="active"
							:size-dependencies="[item.name]"
							:data-index="index"
						>
							<div v-if="item.type === 'render-title'" :class="$style.listHeader">
								<N8nText bold>{{ item.title }}</N8nText>
							</div>
							<div v-else :class="$style.listItem">
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

.listHeader {
	padding-top: 16px;
	padding-bottom: 12px;
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
