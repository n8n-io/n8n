<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nDialog, N8nButton, N8nText, N8nIcon } from '@n8n/design-system';
import { useAIAssistantStore } from '@/stores/aiAssistant.store';
import { useToast } from '@/composables/useToast';

const emit = defineEmits<{
	close: [];
}>();

const aiAssistantStore = useAIAssistantStore();
const toast = useToast();

const versionHistory = computed(() => aiAssistantStore.versionHistory);
const confirmRevertVersionId = ref<string | null>(null);

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

	if (diffInMinutes < 1) return 'Just now';
	if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
	if (diffInMinutes < 1440) {
		const hours = Math.floor(diffInMinutes / 60);
		return `${hours} hour${hours > 1 ? 's' : ''} ago`;
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const dateOnly = new Date(date);
	dateOnly.setHours(0, 0, 0, 0);

	if (dateOnly.getTime() === today.getTime()) {
		return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
	}

	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	if (dateOnly.getTime() === yesterday.getTime()) {
		return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
	}

	return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getNodeCountChange(version: typeof versionHistory.value[0]): string {
	const snapshot = version.workflowSnapshot;
	const nodeCount = snapshot.nodes?.length || 0;
	return `${nodeCount} nodes`;
}

function handleRevert(versionId: string) {
	confirmRevertVersionId.value = versionId;
}

function confirmRevert() {
	if (!confirmRevertVersionId.value) return;

	aiAssistantStore.revertToVersion(confirmRevertVersionId.value);
	toast.showMessage({
		title: 'Version Restored',
		message: 'Workflow reverted to previous version',
		type: 'success',
	});

	confirmRevertVersionId.value = null;
	emit('close');
}

function cancelRevert() {
	confirmRevertVersionId.value = null;
}
</script>

<template>
	<N8nDialog
		:model-value="true"
		:title="'AI Assistant Version History'"
		width="600px"
		@update:model-value="emit('close')"
	>
		<template #content>
			<div :class="$style.container">
				<div v-if="versionHistory.length === 0" :class="$style.emptyState">
					<N8nText color="text-light" size="medium">
						No version history yet. Make changes using the AI Assistant to see them here.
					</N8nText>
				</div>

				<div v-else :class="$style.versionList">
					<div
						v-for="version in versionHistory.slice().reverse()"
						:key="version.id"
						:class="$style.versionEntry"
					>
						<div :class="$style.versionIcon">
							<N8nIcon icon="history" size="medium" />
						</div>

						<div :class="$style.versionContent">
							<div :class="$style.versionHeader">
								<N8nText :class="$style.description" bold size="medium">
									{{ version.description }}
								</N8nText>
							</div>

							<div :class="$style.versionMeta">
								<N8nText color="text-light" size="small">
									{{ formatTimestamp(version.timestamp) }}
								</N8nText>
								<span :class="$style.separator">•</span>
								<N8nText color="text-light" size="small">
									{{ getNodeCountChange(version) }}
								</N8nText>
							</div>
						</div>

						<div :class="$style.versionActions">
							<N8nButton
								type="secondary"
								size="small"
								@click="handleRevert(version.id)"
							>
								Revert
							</N8nButton>
						</div>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<N8nButton type="tertiary" @click="emit('close')">Close</N8nButton>
		</template>
	</N8nDialog>

	<!-- Confirmation Dialog -->
	<N8nDialog
		v-if="confirmRevertVersionId"
		:model-value="true"
		:title="'Confirm Revert'"
		width="400px"
		@update:model-value="cancelRevert"
	>
		<template #content>
			<N8nText size="medium">
				Revert to this version? Current workflow will be replaced.
			</N8nText>
		</template>

		<template #footer>
			<N8nButton type="tertiary" @click="cancelRevert">Cancel</N8nButton>
			<N8nButton type="primary" @click="confirmRevert">Revert</N8nButton>
		</template>
	</N8nDialog>
</template>

<style module lang="scss">
.container {
	max-height: 500px;
	overflow-y: auto;
}

.emptyState {
	padding: var(--spacing-xl);
	text-align: center;
}

.versionList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.versionEntry {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing-s);
	padding: var(--spacing-s);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-light);

	&:hover {
		background-color: var(--color-background-base);
	}
}

.versionIcon {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-base);
	color: var(--color-text-dark);
}

.versionContent {
	flex: 1;
	min-width: 0;
}

.versionHeader {
	margin-bottom: var(--spacing-2xs);
}

.description {
	font-size: 13px;
}

.versionMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	font-size: 12px;
}

.separator {
	color: var(--color-text-light);
}

.versionActions {
	flex-shrink: 0;
}
</style>
