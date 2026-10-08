<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ResponseError } from '@n8n/rest-api-client';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants/modals';
import Modal from '@/app/components/Modal.vue';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { N8nButton, N8nCheckbox, N8nInput, N8nText } from '@n8n/design-system';
import {
	PROMOTION_BRANCH_PREFIX,
	type PromotableResourceStatus,
	type PromotionDirection,
} from '@n8n/api-types';
import { usePromotionChanges } from '../composables/usePromotionChanges';
import { promotionEventBus } from '../promotions.eventBus';
import { applyPromotion } from '../promotionsSettings.api';
import { getPromoteErrorMessage } from '../promoteErrorMessage';
import PromotionBindingsFlow from './PromotionBindingsFlow.vue';
import type { AppliedResult, BlockedApplyResult } from '../promotions.types';

interface Props {
	modalName: string;
	data: {
		projectId: string;
		direction: PromotionDirection;
		/** The instance connection and its Apply config. Only the `apply` direction needs it. */
		apply?: { connectionId: string; configId: string; branchName: string };
	};
}

const props = defineProps<Props>();
const projectsStore = useProjectsStore();

const i18n = useI18n();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const rootStore = useRootStore();
const message = useMessage();
const toast = useToast();
const modalBus = createEventBus();

const { direction } = props.data;
const isIncoming = direction === 'apply';
const isApplying = ref(false);
const blockedResult = shallowRef<BlockedApplyResult>();

const {
	changes,
	commitSha,
	filteredChanges,
	isLoading,
	isSubmitting,
	error,
	searchQuery,
	lastRefreshedAt,
	selectedIds,
	selectedCount,
	allSelected,
	someSelected,
	fetchChanges,
	submitSelection,
	toggleSelected,
	toggleSelectAll,
} = usePromotionChanges(props.data.projectId, direction);

const title = i18n.baseText(
	isIncoming ? 'promotions.modal.incoming.title' : 'promotions.modal.title',
);
const emptyTitle = i18n.baseText(
	isIncoming ? 'promotions.modal.incoming.empty' : 'promotions.modal.empty',
);
const emptyDescription = i18n.baseText(
	isIncoming ? 'promotions.modal.incoming.empty.description' : 'promotions.modal.empty.description',
);

// No visible rows despite a loaded, non-empty change set means the search excluded everything.
const hasNoSearchResults = computed(
	() =>
		!isLoading.value &&
		!error.value &&
		changes.value.length > 0 &&
		filteredChanges.value.length === 0,
);

function getStatusLabel(status: PromotableResourceStatus): string {
	return i18n.baseText(`promotions.modal.status.${status}`);
}

function getDependencyLabel(count: number): string {
	if (count === 0) return i18n.baseText('promotions.modal.noDependencies');
	if (count === 1) return i18n.baseText('promotions.modal.dependency');
	return i18n.baseText('promotions.modal.dependencies', { interpolate: { count: String(count) } });
}

function resolveUserName(userId: string | null): string | null {
	if (!userId) return null;
	const user = usersStore.usersById[userId];
	if (!user) return null;
	return [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
}

function getChangedByLabel(userId: string | null): string {
	const name = resolveUserName(userId);
	if (!name) return '';
	return i18n.baseText('promotions.modal.changedBy', { interpolate: { name } });
}

function getPromoteButtonLabel(): string {
	if (selectedCount.value === 1) {
		return i18n.baseText('promotions.modal.promoteSingle');
	}
	return i18n.baseText('promotions.modal.promote', {
		interpolate: { count: String(selectedCount.value) },
	});
}

function isSelected(id: string): boolean {
	return selectedIds.value.has(id);
}

const isPromoteDisabled = computed(
	() =>
		isSubmitting.value ||
		isLoading.value ||
		!!error.value ||
		changes.value.length === 0 ||
		selectedCount.value === 0,
);

function beforeClose() {
	if (isSubmitting.value) return false;
	return true;
}

function onClose() {
	if (beforeClose() === false) return;
	uiStore.closeModal(props.modalName);
}

function getPromoteSuccessMessage(branchName: string): string {
	if (branchName.startsWith(PROMOTION_BRANCH_PREFIX)) {
		return i18n.baseText('promotions.modal.toast.success.messageNewBranch');
	}
	return i18n.baseText('promotions.modal.toast.success.message', {
		interpolate: { branch: branchName },
	});
}

async function onPromote() {
	if (isPromoteDisabled.value) return;

	try {
		const result = await submitSelection();
		if (!result) return;

		promotionEventBus.emit('promoted', { projectId: props.data.projectId });
		toast.showMessage({
			title: i18n.baseText('promotions.modal.toast.success.title'),
			message: getPromoteSuccessMessage(result.git.branchName),
			type: 'success',
		});
		onClose();
	} catch (promoteError) {
		const title = i18n.baseText('promotions.modal.promoteError');
		const promoteFailureMessage = getPromoteErrorMessage(promoteError, changes.value, i18n);
		if (promoteFailureMessage) {
			toast.showMessage(
				{ title, message: promoteFailureMessage, type: 'error', duration: 0 },
				false,
			);
		} else {
			toast.showError(promoteError, title);
		}
	}
}

async function onRefresh() {
	await fetchChanges();
}

// The open views refresh once the outcome for this project is known, so none of them
// asks for a project the package removed.
async function announceApplied() {
	const { projectId } = props.data;
	try {
		const project = await projectsStore.fetchProject(projectId);
		promotionEventBus.emit('applied', { projectId, project });
	} catch (error) {
		if (error instanceof ResponseError && error.httpStatusCode === 404) {
			toast.showMessage({
				title: i18n.baseText('promotions.applied.projectRemoved'),
				type: 'info',
			});
			promotionEventBus.emit('projectRemoved', { projectId });
			return;
		}
		// The apply went through, so the views still refresh. Only the header keeps its name.
		promotionEventBus.emit('applied', { projectId });
	}
}

async function onApplied(result: AppliedResult) {
	const { workflows } = result.counts;
	const notPublished = workflows.publishing.failed + workflows.publishing.blocked;
	const summary = i18n.baseText('promotions.modal.incoming.applied.message', {
		interpolate: {
			created: String(workflows.created),
			updated: String(workflows.updated),
			archived: String(workflows.archived),
			deleted: String(workflows.deleted),
		},
	});
	// A workflow can be imported and still fail to publish, so success alone would mislead.
	toast.showMessage({
		title: i18n.baseText('promotions.modal.incoming.applied.title'),
		message: notPublished
			? `${summary} ${i18n.baseText('promotions.modal.incoming.applied.notPublished', {
					interpolate: { count: String(notPublished) },
				})}`
			: summary,
		type: notPublished ? 'warning' : 'success',
	});
	// Close before the project lookup, so the stale change list does not show again.
	onClose();
	await announceApplied();
}

async function onSourceChanged() {
	blockedResult.value = undefined;
	await fetchChanges();
	toast.showMessage({
		title: i18n.baseText('promotions.modal.incoming.paused.title'),
		message: i18n.baseText('promotions.modal.incoming.paused.source-changed'),
		type: 'warning',
	});
}

/** Applies the whole branch. The selection is kept for the selective apply that follows. */
async function onApplyAll() {
	const { apply } = props.data;
	if (!apply) return;
	const confirmed = await message.confirm(
		i18n.baseText('promotions.modal.incoming.confirm.message'),
		i18n.baseText('promotions.modal.incoming.confirm.title'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('promotions.modal.incoming.confirm.confirmButtonText'),
			cancelButtonText: i18n.baseText('promotions.modal.close'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;
	isApplying.value = true;
	try {
		// Pin the reviewed commit: a branch that moved since the preview is reported, not applied.
		const expectedSource = commitSha.value
			? { configId: apply.configId, branchName: apply.branchName, commitSha: commitSha.value }
			: undefined;
		const result = await applyPromotion(
			rootStore.publicApiContext,
			apply.connectionId,
			expectedSource && { expectedSource },
		);
		if (result.status === 'applied') {
			await onApplied(result);
			return;
		}
		if (result.status === 'blocked') {
			blockedResult.value = result;
			return;
		}
		// A changed source needs a fresh review.
		toast.showMessage({
			title: i18n.baseText('promotions.modal.incoming.paused.title'),
			message: i18n.baseText('promotions.modal.incoming.paused.source-changed'),
			type: 'warning',
		});
	} catch (applyError) {
		toast.showError(applyError, i18n.baseText('promotions.modal.incoming.applyError'));
	} finally {
		isApplying.value = false;
	}
	// The modal stays open after a paused or failed apply, so the list must show what is left.
	await fetchChanges();
}

onMounted(async () => {
	await fetchChanges();
});
</script>

<template>
	<Modal
		v-if="!blockedResult"
		:before-close="() => !isApplying && !isSubmitting"
		:name="modalName"
		:title="title"
		:event-bus="modalBus"
		:show-close="!isApplying && !isSubmitting"
		:close-on-click-modal="!isApplying && !isSubmitting"
		:close-on-press-escape="!isApplying && !isSubmitting"
		width="640px"
		height="80vh"
		max-height="680px"
		custom-class="promotion-modal"
	>
		<template #content>
			<div :class="$style.content">
				<div :class="$style.toolbar">
					<N8nCheckbox
						:model-value="allSelected"
						:indeterminate="someSelected"
						:disabled="isSubmitting"
						data-test-id="promotion-select-all"
						@update:model-value="toggleSelectAll"
					/>
					<N8nInput
						v-model="searchQuery"
						:placeholder="i18n.baseText('promotions.modal.search.placeholder')"
						size="small"
						clearable
						:disabled="isSubmitting"
						data-test-id="promotion-search"
						:class="$style.searchInput"
					/>
					<N8nText
						v-if="lastRefreshedAt"
						size="small"
						color="text-light"
						:class="$style.lastRefreshed"
						data-test-id="promotion-last-refreshed"
					>
						{{ i18n.baseText('promotions.modal.lastRefreshed') }}
						<TimeAgo :date="lastRefreshedAt" live />
					</N8nText>
					<N8nButton
						variant="subtle"
						size="small"
						icon="refresh-cw"
						data-test-id="promotion-refresh"
						:disabled="isLoading || isSubmitting"
						@click="onRefresh"
					>
						{{ i18n.baseText('promotions.modal.refresh') }}
					</N8nButton>
				</div>

				<div v-if="isLoading" :class="$style.loading">
					<N8nText color="text-light">{{ i18n.baseText('generic.loading') }}</N8nText>
				</div>

				<template v-else-if="error">
					<div :class="$style.empty" data-test-id="promotion-error">
						<N8nText size="medium" bold>
							{{ i18n.baseText('promotions.modal.error') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('promotions.modal.error.description') }}
						</N8nText>
						<N8nButton
							variant="subtle"
							size="small"
							data-test-id="promotion-retry"
							:disabled="isSubmitting"
							@click="onRefresh"
						>
							{{ i18n.baseText('promotions.modal.retry') }}
						</N8nButton>
					</div>
				</template>

				<template v-else-if="changes.length === 0">
					<div :class="$style.empty">
						<N8nText size="medium" bold>
							{{ emptyTitle }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ emptyDescription }}
						</N8nText>
					</div>
				</template>

				<template v-else-if="hasNoSearchResults">
					<div :class="$style.empty" data-test-id="promotion-no-results">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('promotions.modal.noResults') }}
						</N8nText>
					</div>
				</template>

				<template v-else>
					<div :class="$style.listContainer">
						<div :class="$style.list">
							<div
								v-for="(change, index) in filteredChanges"
								:key="change.id"
								:class="[
									$style.row,
									isSelected(change.id) && $style.rowSelected,
									isSubmitting && $style.rowDisabled,
									index === 0 && $style.rowFirst,
									index === filteredChanges.length - 1 && $style.rowLast,
								]"
								data-test-id="promotion-change-row"
								@click="toggleSelected(change.id)"
							>
								<N8nCheckbox
									:model-value="isSelected(change.id)"
									:disabled="isSubmitting"
									@update:model-value="toggleSelected(change.id)"
									@click.stop
								/>

								<div :class="$style.rowContent">
									<div :class="$style.rowHeader">
										<N8nText size="medium" bold>{{ change.name }}</N8nText>
										<span
											:class="[
												$style.statusLabel,
												change.status === 'archived' && $style.statusArchived,
												change.status === 'deleted' && $style.statusDeleted,
											]"
											data-test-id="promotion-change-status"
										>
											{{ getStatusLabel(change.status) }}
										</span>
									</div>
									<div :class="$style.rowMeta">
										<N8nText
											v-if="getChangedByLabel(change.updatedBy)"
											size="small"
											color="text-light"
										>
											{{ getChangedByLabel(change.updatedBy) }}
										</N8nText>
										<N8nText
											v-if="getChangedByLabel(change.updatedBy)"
											size="small"
											color="text-light"
											>·</N8nText
										>
										<N8nText v-if="change.updatedAt" size="small" color="text-light">
											<TimeAgo :date="change.updatedAt" />
										</N8nText>
										<template v-if="change.dependencyCount > 0">
											<N8nText size="small" color="text-light">·</N8nText>
											<N8nText size="small" bold>
												{{ getDependencyLabel(change.dependencyCount) }}
											</N8nText>
										</template>
									</div>
								</div>
							</div>
						</div>
					</div>
				</template>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<div :class="$style.footerLeft">
					<N8nText v-if="selectedCount > 0" size="small" color="text-light">
						{{
							i18n.baseText('promotions.modal.incoming.selected', {
								interpolate: { count: String(selectedCount) },
							})
						}}
					</N8nText>
				</div>
				<div :class="$style.footerRight">
					<N8nButton variant="subtle" :disabled="isSubmitting" @click="onClose">
						{{ i18n.baseText('promotions.modal.close') }}
					</N8nButton>
					<N8nButton
						v-if="isIncoming"
						:loading="isApplying"
						:disabled="isLoading || !!error"
						data-test-id="promotion-apply-all"
						@click="onApplyAll"
					>
						{{ i18n.baseText('promotions.modal.incoming.applyAll') }}
					</N8nButton>
					<N8nButton
						v-else
						data-test-id="promotion-submit"
						:disabled="isPromoteDisabled"
						:loading="isSubmitting"
						@click="onPromote"
					>
						{{ getPromoteButtonLabel() }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
	<PromotionBindingsFlow
		v-else
		:open="true"
		:blocked-result="blockedResult"
		@update:open="
			(open) => {
				if (!open) blockedResult = undefined;
			}
		"
		@applied="onApplied"
		@source-changed="onSourceChanged"
	/>
</template>

<style lang="scss">
.promotion-modal {
	.el-dialog__body {
		padding-inline: 0;
		padding: 0;
	}

	.modal-content {
		padding-inline: 0;
		margin-inline: 0;
	}

	.modal-content ~ div {
		margin-top: 0;
		border-top: var(--border);
		padding: var(--spacing--sm) var(--spacing--md);
	}
}
</style>

<style lang="scss" module>
:global(body) {
	--color--bg-promotion-row-selected: var(--color--orange-100);
}
:global(body[data-theme='dark']) {
	--color--bg-promotion-row-selected: var(--color--orange-900);
}
@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) {
		--color--bg-promotion-row-selected: var(--color--orange-900);
	}
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	height: 100%;
}

.toolbar {
	display: flex;
	gap: var(--spacing--xs);
	align-items: center;
	flex-shrink: 0;
	position: relative;
	z-index: 1;
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--sm) var(--spacing--xl);
}

.searchInput {
	flex: 1;
	margin-inline: calc(var(--input--padding) * -1) 0 0;
}

.lastRefreshed {
	flex-shrink: 0;
	white-space: nowrap;
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	flex: 1;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	flex: 1;
}

.listContainer {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
	background-color: var(--background--subtle);
	padding: var(--spacing--sm);
}

.list {
	display: flex;
	flex-direction: column;
	border: 1px solid var(--border-color);
	border-radius: var(--radius--3xs);
	overflow: hidden;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: var(--background--surface);
	border-bottom: 1px solid var(--border-color);
	cursor: pointer;
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background-color: var(--background--subtle);
	}

	&:last-child {
		border-bottom: none;
	}
}

.rowFirst {
	border-radius: var(--radius--3xs) var(--radius--3xs) 0 0;
}

.rowLast {
	border-radius: 0 0 var(--radius--3xs) var(--radius--3xs);
}

.rowSelected {
	background-color: var(--color--bg-promotion-row-selected);
}

.rowContent {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.rowHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.statusLabel {
	font-size: var(--font-size--2xs);
	color: var(--text-color);
}

.statusArchived {
	color: var(--text-color--warning);
}

.statusDeleted {
	color: var(--text-color--danger);
}

.rowMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.footerLeft {
	display: flex;
	align-items: center;
}

.footerRight {
	display: flex;
	gap: var(--spacing--xs);
}
</style>
