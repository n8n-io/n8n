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

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data: {
		// The workflows that the user just marked as won't fix.
		workflows: BreakingChangeRuleDetailWorkflow[];
		// Gets `archive` with the workflows when the user confirms. The report archives them.
		eventBus: EventBus;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[ARCHIVE_WORKFLOWS_MODAL_KEY]?.open === true);

const count = computed(() => props.data.workflows.length);
const plural = (key: Parameters<typeof i18n.baseText>[0]) =>
	i18n.baseText(key, {
		adjustToNumber: count.value,
		interpolate: { count: String(count.value) },
	});

function close() {
	uiStore.closeModal(ARCHIVE_WORKFLOWS_MODAL_KEY);
}

function archive() {
	props.data.eventBus.emit('archive', { workflows: props.data.workflows });
	close();
}
</script>

<template>
	<N8nDialog :open="modalOpen" @update:open="(open: boolean) => !open && close()">
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ plural('settings.migrationReport.detail.wontFix.archive.modal.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.content" :data-test-id="`${ARCHIVE_WORKFLOWS_MODAL_KEY}-modal`">
				<N8nText color="text-dark">
					{{ plural('settings.migrationReport.detail.wontFix.archive.modal.description') }}
				</N8nText>
				<ul :class="$style.list" data-test-id="archive-workflows-modal-list">
					<li v-for="workflow in data.workflows" :key="workflow.id" :class="$style.row">
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
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('settings.migrationReport.detail.wontFix.archive.modal.footer') }}
				</N8nText>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.actions">
				<N8nButton
					variant="outline"
					:label="plural('settings.migrationReport.detail.wontFix.archive.modal.keep')"
					data-test-id="archive-workflows-modal-keep-button"
					@click="close"
				/>
				<N8nButton
					:label="plural('settings.migrationReport.detail.wontFix.archive.modal.archive')"
					data-test-id="archive-workflows-modal-archive-button"
					@click="archive"
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

// A bulk won't fix can cover many workflows. The list scrolls so the buttons stay in view.
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
