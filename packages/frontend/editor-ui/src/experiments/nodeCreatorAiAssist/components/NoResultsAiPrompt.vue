<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { N8nButton, N8nInput, N8nLink, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { REQUEST_NODE_FORM_URL } from '@/app/constants';

const props = defineProps<{
	searchTerm?: string;
}>();

const emit = defineEmits<{
	submitToAi: [prompt: string];
}>();

const i18n = useI18n();
const textareaRef = ref<InstanceType<typeof N8nInput> | null>(null);

const prompt = ref(
	props.searchTerm
		? `Create an HTTP request to integrate with ${props.searchTerm} API that `
		: 'Create an HTTP request that ',
);

function onSubmit() {
	if (prompt.value.trim()) {
		emit('submitToAi', prompt.value);
	}
}

onMounted(() => {
	void nextTick(() => {
		const input = textareaRef.value?.$el?.querySelector('textarea');
		if (input) {
			input.focus();
			input.setSelectionRange(input.value.length, input.value.length);
		}
	});
});
</script>

<template>
	<div :class="$style.container" data-test-id="node-creator-ai-assist">
		<div :class="$style.content">
			<h2 :class="$style.headline">
				{{ i18n.baseText('nodeCreator.noResults.aiAssist.headline') }}
			</h2>

			<N8nInput
				ref="textareaRef"
				v-model="prompt"
				type="textarea"
				:class="$style.promptInput"
				:rows="4"
				@keydown.meta.enter="onSubmit"
				@keydown.ctrl.enter="onSubmit"
			/>

			<N8nButton
				:class="$style.submitButton"
				:label="i18n.baseText('nodeCreator.noResults.aiAssist.buildWithAi')"
				@click="onSubmit"
			/>
		</div>

		<div :class="$style.footer">
			<p :class="$style.footerText">
				{{ i18n.baseText('nodeCreator.noResults.aiAssist.preferOfficialNode') }}
			</p>
			<N8nLink :to="REQUEST_NODE_FORM_URL" size="small">
				{{ i18n.baseText('nodeCreator.noResults.aiAssist.requestItHere') }}
				<N8nIcon icon="external-link" size="xsmall" />
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: $node-creator-no-results-background-color;
	text-align: center;
	height: 100%;
	border-left: 1px solid $node-creator-border-color;
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg) var(--spacing--lg);
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
	padding-top: var(--spacing--2xl);
}

.headline {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
	margin: 0 0 var(--spacing--md) 0;
}

.promptInput {
	width: 100%;
	margin-bottom: var(--spacing--sm);
}

.submitButton {
	width: 100%;
}

.footer {
	display: none;

	@media (min-height: 550px) {
		display: block;
	}
}

.footerText {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	margin: 0 0 var(--spacing--4xs) 0;
}
</style>
