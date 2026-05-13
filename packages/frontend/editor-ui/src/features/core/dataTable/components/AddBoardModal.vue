<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import type { BoardAllowedStatus } from '@n8n/api-types';
import { getDefaultBoardStatusColor } from '@n8n/api-types';
import { computed, onMounted, ref } from 'vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useRoute, useRouter } from 'vue-router';
import { BOARD_DETAILS, PROJECT_BOARDS } from '@/features/core/dataTable/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';

import {
	N8nButton,
	N8nColorPicker,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
} from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';

type Props = {
	modalName: string;
};

const props = defineProps<Props>();

const dataTableStore = useDataTableStore();
const uiStore = useUIStore();

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const boardName = ref('');
const allowedStatuses = ref<BoardAllowedStatus[]>([]);
const statusInput = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const statusInputRef = ref<HTMLInputElement | null>(null);
const isLoading = ref(false);

const isCreateDisabled = computed(
	() => !boardName.value.trim() || allowedStatuses.value.length === 0,
);

onMounted(() => {
	setTimeout(() => {
		inputRef.value?.focus();
		inputRef.value?.select();
	}, 0);
});

const reset = () => {
	boardName.value = '';
	allowedStatuses.value = [];
	statusInput.value = '';
};

const addStatus = () => {
	const status = statusInput.value.trim();
	if (!status || allowedStatuses.value.some((existingStatus) => existingStatus.name === status)) {
		statusInput.value = '';
		return;
	}

	allowedStatuses.value = [
		...allowedStatuses.value,
		{
			name: status,
			color: getDefaultBoardStatusColor(allowedStatuses.value.length),
		},
	];
	statusInput.value = '';
};

const updateStatusColor = (index: number, color: string | null) => {
	if (!color) {
		return;
	}

	allowedStatuses.value = allowedStatuses.value.map((existingStatus, currentIndex) =>
		currentIndex === index ? { ...existingStatus, color } : existingStatus,
	);
};

const removeStatus = (index: number) => {
	allowedStatuses.value = allowedStatuses.value.filter((_, currentIndex) => currentIndex !== index);
};

const onStatusInputKeydown = (event: KeyboardEvent) => {
	if (event.key === 'Backspace' && statusInput.value === '' && allowedStatuses.value.length > 0) {
		allowedStatuses.value = allowedStatuses.value.slice(0, -1);
	}
};

const focusStatusInput = () => {
	statusInputRef.value?.focus();
};

const onSubmit = async () => {
	if (isCreateDisabled.value || isLoading.value) {
		return;
	}

	isLoading.value = true;
	try {
		const newBoard = await dataTableStore.createDataTable(
			boardName.value.trim(),
			route.params.projectId as string,
			undefined,
			undefined,
			true,
			{
				kind: 'board',
				metadata: {
					allowedStatuses: allowedStatuses.value,
				},
			},
		);

		telemetry.track('User created board', {
			data_table_id: newBoard.id,
			data_table_project_id: newBoard.project?.id,
		});

		reset();
		uiStore.closeModal(props.modalName);
		void router.push({
			name: BOARD_DETAILS,
			params: {
				projectId: newBoard.project?.id ?? (route.params.projectId as string),
				id: newBoard.id,
			},
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('board.add.error'));
	} finally {
		isLoading.value = false;
	}
};

const redirectToBoards = () => {
	void router.replace({ name: PROJECT_BOARDS });
};
</script>

<template>
	<Modal :name="props.modalName" :center="true" width="540px" :before-close="redirectToBoards">
		<template #header>
			<div :class="$style.header">
				<h2>{{ i18n.baseText('board.add.title') }}</h2>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nInputLabel
					:label="i18n.baseText('board.add.input.name.label')"
					:required="true"
					input-name="boardName"
				>
					<N8nInput
						ref="inputRef"
						v-model="boardName"
						type="text"
						:placeholder="i18n.baseText('board.add.input.name.placeholder')"
						data-test-id="board-name-input"
						name="boardName"
						@keydown.enter="onSubmit"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('board.add.input.allowedStatuses.label')"
					:required="true"
					input-name="allowedStatuses"
				>
					<div :class="$style.statusField" @click="focusStatusInput">
						<span
							v-for="(status, index) in allowedStatuses"
							:key="`${status.name}-${index}`"
							:class="$style.statusTag"
						>
							<N8nColorPicker
								:model-value="status.color"
								size="small"
								:show-input="false"
								data-test-id="board-allowed-status-color-picker"
								@update:model-value="updateStatusColor(index, $event)"
							/>
							<span>{{ status.name }}</span>
							<N8nIconButton
								icon="x"
								size="small"
								variant="ghost"
								type="button"
								:aria-label="i18n.baseText('generic.delete')"
								data-test-id="board-allowed-status-remove-button"
								@click.stop="removeStatus(index)"
							/>
						</span>
						<input
							ref="statusInputRef"
							v-model="statusInput"
							:class="$style.statusInput"
							:placeholder="i18n.baseText('board.add.input.allowedStatuses.placeholder')"
							data-test-id="board-allowed-statuses-input"
							name="allowedStatuses"
							@keydown.enter.prevent="addStatus"
							@keydown="onStatusInputKeydown"
						/>
					</div>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					size="large"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="cancel-add-board-button"
					@click="redirectToBoards"
				/>
				<N8nButton
					:loading="isLoading"
					size="large"
					:disabled="isCreateDisabled"
					:label="i18n.baseText('generic.create')"
					data-test-id="confirm-add-board-button"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.header {
	margin-bottom: var(--spacing--xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.statusField {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	min-height: var(--height--lg);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-radius: var(--radius--2xs);
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	box-shadow: inset 0 0 0 1px var(--border-color);

	&:focus-within {
		box-shadow: inset 0 0 0 1px var(--focus--border-color);
	}
}

.statusTag {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: var(--tag--height);
	padding: var(--tag--padding);
	line-height: var(--tag--line-height);
	color: var(--tag--color--text);
	background-color: var(--tag--color--background);
	border: 1px solid var(--tag--border-color);
	border-radius: var(--tag--radius);
	font-size: var(--tag--font-size);
}

.statusInput {
	flex: 1;
	min-width: var(--spacing--xl);
	border: none;
	background: transparent;
	padding: 0;
	font-size: var(--font-size--sm);
	color: var(--color--text);
	outline: none;

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	margin-top: var(--spacing--lg);
}
</style>
