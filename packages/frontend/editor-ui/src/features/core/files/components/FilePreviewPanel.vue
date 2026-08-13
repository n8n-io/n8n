<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, watch } from 'vue';
import { N8nButton, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { ViewableMimeTypes } from '@n8n/api-types';
import { fileTypeFromMimeType } from 'n8n-workflow';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useUIStore } from '@/app/stores/ui.store';
import BinaryContentViewer from '@/features/ndv/runData/components/BinaryContentViewer.vue';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useFilesStore } from '@/features/core/files/files.store';
import type { ProjectFile } from '@/features/core/files/files.types';
import { REPLACE_FILE_MODAL_KEY } from '@/features/core/files/constants';
import ReplaceFileModal from '@/features/core/files/components/ReplaceFileModal.vue';
import { getMimeFamilyIcon, getShortMimeLabel } from '@/features/core/files/utils/mimeUtils';
import { formatBytes } from '@/app/utils/typesUtils';
import { useDependencies } from '@/app/composables/useDependencies';

type Props = {
	file: ProjectFile;
	canUpdate?: boolean;
	isReadOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	canUpdate: false,
	isReadOnly: false,
});

const emit = defineEmits<{
	close: [];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const toast = useToast();
const clipboard = useClipboard();
const uiStore = useUIStore();
const filesStore = useFilesStore();
const { getTotalCount } = useDependencies();

const isViewable = computed(() => ViewableMimeTypes.includes(props.file.mimeType));

const viewUrl = computed(() => filesStore.getViewUrl(props.file));

const fileType = computed(() => fileTypeFromMimeType(props.file.mimeType));

const usedByCount = computed(() => getTotalCount(props.file.id));

const replaceModalKey = computed(() => `${REPLACE_FILE_MODAL_KEY}-preview-${props.file.id}`);

const canReplace = computed(
	() => props.canUpdate && !props.isReadOnly && filesStore.quotaStatus !== 'error',
);

watch(
	() => props.file.id,
	() => {
		telemetry.track('User previewed project file', { viewable: isViewable.value });
	},
	{ immediate: true },
);

const onDownload = () => {
	filesStore.downloadFile(props.file);
};

const onReplace = () => {
	uiStore.openModal(replaceModalKey.value);
};

const onUseInWorkflow = () => {
	void clipboard.copy(props.file.name);
	toast.showMessage({
		title: i18n.baseText('files.preview.useInWorkflow.copied.title'),
		message: i18n.baseText('files.preview.useInWorkflow.copied.message'),
		type: 'success',
	});
};
</script>

<template>
	<div :class="$style.panel" data-test-id="file-preview-panel" @click.stop>
		<div :class="$style.header">
			<N8nText tag="h2" bold :class="$style.title">{{ props.file.name }}</N8nText>
			<N8nIconButton
				icon="x"
				variant="ghost"
				:aria-label="i18n.baseText('generic.close')"
				data-test-id="file-preview-close"
				@click="emit('close')"
			/>
		</div>
		<div :class="$style.body">
			<div v-if="isViewable" :class="$style.viewer">
				<BinaryContentViewer
					:key="props.file.id"
					:source-url="viewUrl"
					:file-type="fileType"
					:mime-type="props.file.mimeType"
				/>
			</div>
			<div v-else :class="$style.unsupported" data-test-id="file-preview-unsupported">
				<N8nIcon :icon="getMimeFamilyIcon(props.file.mimeType)" size="xlarge" />
				<N8nText color="text-light">{{ i18n.baseText('files.preview.unsupported') }}</N8nText>
			</div>
			<dl :class="$style.metadata">
				<dt>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('files.preview.size')
					}}</N8nText>
				</dt>
				<dd>
					<N8nText size="small">{{ formatBytes(props.file.sizeBytes) }}</N8nText>
				</dd>
				<dt>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('files.preview.type')
					}}</N8nText>
				</dt>
				<dd>
					<N8nText size="small">{{ getShortMimeLabel(props.file.mimeType) }}</N8nText>
				</dd>
				<dt>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('files.preview.lastUpdated')
					}}</N8nText>
				</dt>
				<dd>
					<N8nText size="small"><TimeAgo :date="String(props.file.updatedAt)" /></N8nText>
				</dd>
				<dt>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('files.preview.created')
					}}</N8nText>
				</dt>
				<dd>
					<N8nText size="small"><TimeAgo :date="String(props.file.createdAt)" /></N8nText>
				</dd>
				<dt>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('files.preview.usedBy')
					}}</N8nText>
				</dt>
				<dd>
					<N8nText size="small">{{
						i18n.baseText('files.usedBy.count', {
							adjustToNumber: usedByCount,
							interpolate: { count: String(usedByCount) },
						})
					}}</N8nText>
				</dd>
			</dl>
		</div>
		<div :class="$style.footer">
			<N8nButton
				variant="subtle"
				:label="i18n.baseText('files.actions.download')"
				data-test-id="file-preview-download"
				@click="onDownload"
			/>
			<N8nButton
				v-if="props.canUpdate"
				variant="subtle"
				:disabled="!canReplace"
				:label="i18n.baseText('files.actions.replace')"
				data-test-id="file-preview-replace"
				@click="onReplace"
			/>
			<N8nButton
				:label="i18n.baseText('files.preview.useInWorkflow')"
				data-test-id="file-preview-use-in-workflow"
				@click="onUseInWorkflow"
			/>
		</div>
		<ReplaceFileModal
			:modal-name="replaceModalKey"
			:file="props.file"
			@close="() => uiStore.closeModal(replaceModalKey)"
		/>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 20;
	display: flex;
	flex-direction: column;
	width: 420px;
	max-width: 90%;
	background-color: var(--color--background--light-2);
	border-left: var(--border);
	box-shadow: var(--shadow--card-hover);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--sm);
}

.viewer {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
	max-height: 50vh;
	overflow: auto;
	margin-bottom: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.unsupported {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	min-height: 200px;
	margin-bottom: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	color: var(--color--text--tint-1);
}

.metadata {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: var(--spacing--3xs) var(--spacing--sm);
	margin: 0;

	dt,
	dd {
		margin: 0;
	}
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}
</style>
