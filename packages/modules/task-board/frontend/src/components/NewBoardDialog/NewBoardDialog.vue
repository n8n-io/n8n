<script setup lang="ts">
import type { TaskBoardTemplateKey } from '@n8n/api-types';
import {
	N8nButton,
	N8nCard,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { TASK_BOARD_TEMPLATES } from '../../task-board.constants';
import type { CreateTaskBoardPayload } from '../../task-board.types';

const props = defineProps<{ creating: boolean }>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ submit: [payload: CreateTaskBoardPayload] }>();
const i18n = useI18n();

const templateKey = ref<TaskBoardTemplateKey>(TASK_BOARD_TEMPLATES[0].key);
const name = ref('');
const canSubmit = computed(() => name.value.trim().length > 0 && !props.creating);

watch(open, (isOpen) => {
	if (!isOpen) return;
	templateKey.value = TASK_BOARD_TEMPLATES[0].key;
	name.value = i18n.baseText(`taskBoard.template.${templateKey.value}.name`);
});

function onSubmit() {
	if (!canSubmit.value) return;
	emit('submit', { templateKey: templateKey.value, name: name.value.trim() });
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="large"
		:header="i18n.baseText('taskBoard.create.title')"
		data-test-id="task-board-new-dialog"
	>
		<N8nDialogBody :class="$style.body">
			<N8nText size="small" color="text-base">
				{{ i18n.baseText('taskBoard.create.intro') }}
			</N8nText>
			<div
				role="radiogroup"
				:aria-label="i18n.baseText('taskBoard.create.templates')"
				:class="$style.templates"
			>
				<N8nCard
					v-for="template in TASK_BOARD_TEMPLATES"
					:key="template.key"
					role="radio"
					tabindex="0"
					hoverable
					:aria-checked="templateKey === template.key"
					:class="[$style.template, { [$style.selected]: templateKey === template.key }]"
					data-test-id="task-board-template"
					@click="templateKey = template.key"
					@keydown.enter.prevent="templateKey = template.key"
					@keydown.space.prevent="templateKey = template.key"
				>
					<template #prepend>
						<N8nIcon :icon="template.icon" size="xlarge" />
					</template>
					<template #header>
						<N8nText bold>{{ i18n.baseText(`taskBoard.template.${template.key}.name`) }}</N8nText>
					</template>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText(`taskBoard.template.${template.key}.description`) }}
					</N8nText>
				</N8nCard>
			</div>
			<N8nInputLabel
				:label="i18n.baseText('taskBoard.create.name')"
				input-name="task-board-name"
				required
				size="small"
				color="text-dark"
			>
				<N8nInput
					id="task-board-name"
					v-model="name"
					:maxlength="128"
					:disabled="creating"
					data-test-id="task-board-name"
					@keydown.enter.prevent="onSubmit"
				/>
			</N8nInputLabel>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="creating"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('taskBoard.create.submit')"
				:loading="creating"
				:disabled="!canSubmit"
				data-test-id="task-board-new-submit"
				@click="onSubmit"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.templates {
	display: grid;
	/* A readable minimum card width. The spacing scale has no token this wide. */
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
	gap: var(--spacing--xs);
}

.template {
	cursor: pointer;
	align-items: flex-start;
	gap: var(--spacing--xs);

	&:focus-visible {
		border-color: var(--focus--border-color);
	}
}

.selected {
	border-color: var(--color--primary);
	background-color: var(--background--active);
}
</style>
