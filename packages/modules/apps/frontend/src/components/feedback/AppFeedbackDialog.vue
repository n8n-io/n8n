<script setup lang="ts">
import {
	APP_FEEDBACK_MAX_LENGTH,
	appFeedbackCategorySchema,
	type AppFeedbackCategory,
	type AppResponse,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nSegmentControl,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import { sendAppFeedback } from '../../apps.api';

const CATEGORIES: Record<AppFeedbackCategory, { label: BaseTextKey; placeholder: BaseTextKey }> = {
	bug: {
		label: 'apps.feedback.category.bug',
		placeholder: 'apps.feedback.placeholder.bug',
	},
	idea: {
		label: 'apps.feedback.category.idea',
		placeholder: 'apps.feedback.placeholder.idea',
	},
	other: {
		label: 'apps.feedback.category.other',
		placeholder: 'apps.feedback.placeholder.other',
	},
};

const props = defineProps<{ app: AppResponse }>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const category = ref<AppFeedbackCategory>('bug');
const feedback = ref('');
const busy = ref(false);
const sendError = ref<string | null>(null);

const categoryOptions = computed(() =>
	appFeedbackCategorySchema.options.map((value) => ({
		value,
		label: i18n.baseText(CATEGORIES[value].label),
	})),
);
const canSend = computed(() => feedback.value.trim().length > 0 && !busy.value);

function reset() {
	category.value = 'bug';
	feedback.value = '';
	sendError.value = null;
}

async function send() {
	busy.value = true;
	sendError.value = null;
	try {
		await sendAppFeedback(rootStore.restApiContext, props.app.projectId, props.app.id, {
			category: category.value,
			feedback: feedback.value.trim(),
		});
		// The draft is kept when the dialog closes without a send, so clear it only here.
		reset();
		open.value = false;
		toast.showMessage({ type: 'success', title: i18n.baseText('apps.feedback.sent') });
	} catch (error) {
		sendError.value =
			error instanceof Error && error.message
				? error.message
				: i18n.baseText('apps.feedback.error');
	} finally {
		busy.value = false;
	}
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="medium"
		:header="i18n.baseText('apps.feedback.title')"
		data-test-id="app-feedback-dialog"
	>
		<N8nDialogBody :class="$style.body">
			<N8nSegmentControl
				v-model="category"
				:options="categoryOptions"
				:disabled="busy"
				:class="$style.categories"
				data-test-id="app-feedback-category"
			/>
			<N8nInput
				v-model="feedback"
				type="textarea"
				:rows="6"
				:maxlength="APP_FEEDBACK_MAX_LENGTH"
				:placeholder="i18n.baseText(CATEGORIES[category].placeholder)"
				:aria-label="i18n.baseText('apps.feedback.inputLabel')"
				:disabled="busy"
				data-test-id="app-feedback-input"
			/>
			<N8nCallout theme="secondary" data-test-id="app-feedback-notice">
				{{ i18n.baseText('apps.feedback.notice') }}
			</N8nCallout>
			<N8nCallout v-if="sendError" theme="danger" data-test-id="app-feedback-error">
				{{ sendError }}
			</N8nCallout>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="busy"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				icon="send"
				:label="i18n.baseText('apps.feedback.send')"
				:loading="busy"
				:disabled="!canSend"
				data-test-id="app-feedback-send"
				data-attr="app-feedback-send"
				@click="send"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.categories {
	align-self: flex-start;
}
</style>
