<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from '@/app/components/Modal.vue';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { N8nButton, N8nCheckbox, N8nInput, N8nSwitch, N8nText } from '@n8n/design-system';
import type { PromotableResourceStatus } from '@n8n/api-types';
import { usePromotionChanges } from '../composables/usePromotionChanges';

interface Props {
	modalName: string;
	data: {
		projectId: string;
	};
}

const props = defineProps<Props>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const modalBus = createEventBus();

const createBranch = ref(false);
const isPromoting = ref(false);

const {
	changes,
	filteredChanges,
	isLoading,
	error,
	searchQuery,
	selectedIds,
	selectedCount,
	allSelected,
	someSelected,
	fetchChanges,
	toggleSelected,
	toggleSelectAll,
	promote,
} = usePromotionChanges(props.data.projectId);

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

async function onPromote() {
	isPromoting.value = true;
	try {
		await promote(createBranch.value);
		toast.showMessage({
			title: i18n.baseText('promotions.modal.promoteSuccess'),
			type: 'success',
		});
		uiStore.closeModal(props.modalName);
	} catch (e) {
		toast.showError(
			e instanceof Error ? e : new Error(String(e)),
			i18n.baseText('promotions.modal.promoteError'),
		);
	} finally {
		isPromoting.value = false;
	}
}

function onClose() {
	uiStore.closeModal(props.modalName);
}

async function onRefresh() {
	await fetchChanges();
}

onMounted(async () => {
	await fetchChanges();
});
</script>

<template>
	<Modal
		:name="modalName"
		:title="i18n.baseText('promotions.modal.title')"
		:event-bus="modalBus"
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
						data-test-id="promotion-select-all"
						@update:model-value="toggleSelectAll"
					/>
					<N8nInput
						v-model="searchQuery"
						:placeholder="i18n.baseText('promotions.modal.search.placeholder')"
						size="small"
						clearable
						data-test-id="promotion-search"
						:class="$style.searchInput"
					/>
					<N8nButton
						variant="subtle"
						size="small"
						icon="refresh-cw"
						data-test-id="promotion-refresh"
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
							@click="onRefresh"
						>
							{{ i18n.baseText('promotions.modal.retry') }}
						</N8nButton>
					</div>
				</template>

				<template v-else-if="changes.length === 0">
					<div :class="$style.empty">
						<N8nText size="medium" bold>
							{{ i18n.baseText('promotions.modal.empty') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('promotions.modal.empty.description') }}
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
									index === 0 && $style.rowFirst,
									index === filteredChanges.length - 1 && $style.rowLast,
								]"
								data-test-id="promotion-change-row"
								@click="toggleSelected(change.id)"
							>
								<N8nCheckbox
									:model-value="isSelected(change.id)"
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
										<N8nText size="small" color="text-light">
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
					<N8nSwitch
						v-model="createBranch"
						:label="i18n.baseText('promotions.modal.createBranch')"
						size="small"
						data-test-id="promotion-create-branch"
					/>
				</div>
				<div :class="$style.footerRight">
					<N8nButton variant="subtle" @click="onClose">
						{{ i18n.baseText('promotions.modal.close') }}
					</N8nButton>
					<N8nButton
						:disabled="selectedCount === 0 || isLoading || !!error || isPromoting"
						:loading="isPromoting"
						data-test-id="promotion-submit"
						@click="onPromote"
					>
						{{ getPromoteButtonLabel() }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
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
