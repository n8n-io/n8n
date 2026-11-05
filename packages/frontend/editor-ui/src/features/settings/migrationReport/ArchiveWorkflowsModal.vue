<script lang="ts" setup>
import TimeAgo from '@/app/components/TimeAgo.vue';
import { ARCHIVE_WORKFLOWS_MODAL_KEY } from '@/app/constants';
import type { BreakingChangeRuleDetailWorkflow } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { useUIStore } from '@/app/stores/ui.store';
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import type { ArchiveWorkflowsModalMode } from './constants';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data: {
		mode: ArchiveWorkflowsModalMode;
		workflows: BreakingChangeRuleDetailWorkflow[];
		// Gets `confirm` with the mode and the workflows. The report does the work.
		eventBus: EventBus;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[ARCHIVE_WORKFLOWS_MODAL_KEY]?.open === true);

const isPrompt = computed(() => props.data.mode === 'prompt');
const published = computed(() => props.data.workflows.filter((workflow) => workflow.active));

const title = computed(() => {
	if (isPrompt.value) {
		return i18n.baseText('settings.migrationReport.detail.wontFix.archive.prompt.title', {
			interpolate: { name: props.data.workflows[0]?.name ?? '' },
		});
	}
	const count = props.data.workflows.length;
	return i18n.baseText('settings.migrationReport.detail.wontFix.archive.confirm.title', {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
});

const publishedNote = computed(() => {
	if (published.value.length === 0) return '';
	if (props.data.workflows.length === 1) {
		return i18n.baseText('settings.migrationReport.detail.wontFix.archive.published');
	}
	const count = published.value.length;
	return i18n.baseText('settings.migrationReport.detail.wontFix.archive.confirm.published', {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
});

function close() {
	uiStore.closeModal(ARCHIVE_WORKFLOWS_MODAL_KEY);
}

function confirm() {
	props.data.eventBus.emit('confirm', { mode: props.data.mode, workflows: props.data.workflows });
	close();
}
</script>

<template>
	<N8nDialog :open="modalOpen" @update:open="(open: boolean) => !open && close()">
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.content" :data-test-id="`${ARCHIVE_WORKFLOWS_MODAL_KEY}-modal`">
				<N8nText v-if="isPrompt" color="text-dark">
					{{ i18n.baseText('settings.migrationReport.detail.wontFix.archive.prompt.description') }}
				</N8nText>
				<N8nText v-if="publishedNote" color="text-dark">{{ publishedNote }}</N8nText>
				<!-- The user should see which running workflows a bulk archive stops. -->
				<ul v-if="!isPrompt" :class="$style.list" data-test-id="archive-workflows-modal-list">
					<li v-for="workflow in published" :key="workflow.id" :class="$style.row">
						<N8nText color="text-dark" :class="$style.name">{{ workflow.name }}</N8nText>
						<N8nText size="small" color="text-light">
							<I18nT
								v-if="workflow.lastExecutedAt"
								keypath="settings.migrationReport.detail.table.lastRun"
								tag="span"
								scope="global"
							>
								<template #time>
									<TimeAgo :date="workflow.lastExecutedAt.toString()" />
								</template>
							</I18nT>
							<template v-else>
								{{ i18n.baseText('settings.migrationReport.detail.table.neverRun') }}
							</template>
						</N8nText>
					</li>
				</ul>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.actions">
				<N8nButton
					variant="outline"
					:label="
						isPrompt
							? i18n.baseText('settings.migrationReport.detail.wontFix.archive.prompt.keep')
							: i18n.baseText('generic.cancel')
					"
					data-test-id="archive-workflows-modal-cancel-button"
					@click="close"
				/>
				<N8nButton
					:label="
						isPrompt
							? i18n.baseText('settings.migrationReport.detail.wontFix.archive.prompt.archive')
							: i18n.baseText('settings.migrationReport.detail.bulk.wontFixAndArchive')
					"
					data-test-id="archive-workflows-modal-confirm-button"
					@click="confirm"
				/>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

// A bulk action can cover many workflows. The list scrolls so the buttons stay in view.
.list {
	max-height: calc(5 * var(--spacing--2xl));
	overflow-y: auto;
	border: var(--border);
	border-radius: var(--radius);
}

.row {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
