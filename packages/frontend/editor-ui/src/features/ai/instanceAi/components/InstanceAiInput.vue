<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{
	isStreaming: boolean;
}>();

const emit = defineEmits<{
	submit: [message: string];
	stop: [];
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const inputText = ref('');

const canSubmit = computed(() => inputText.value.trim().length > 0 && !props.isStreaming);

const placeholder = computed(() => {
	if (store.amendContext) {
		return i18n.baseText('instanceAi.input.amendPlaceholder', {
			interpolate: { role: store.amendContext.role },
		});
	}
	if (store.contextualSuggestion) {
		return store.contextualSuggestion;
	}
	return i18n.baseText('instanceAi.input.placeholder');
});

function handleSubmit() {
	const text = inputText.value.trim();
	if (!text || props.isStreaming) return;
	emit('submit', text);
	inputText.value = '';
}

function handleStop() {
	emit('stop');
}

function handleTabAutocomplete() {
	if (!inputText.value && store.contextualSuggestion) {
		inputText.value = store.contextualSuggestion;
	}
}
</script>

<template>
	<ChatInputBase
		v-model="inputText"
		:placeholder="placeholder"
		:is-streaming="props.isStreaming"
		:can-submit="canSubmit"
		@submit="handleSubmit"
		@stop="handleStop"
		@tab="handleTabAutocomplete"
	>
		<template #footer-start>
			<N8nTooltip
				:content="i18n.baseText('instanceAi.input.researchToggle.tooltip')"
				placement="top"
				:show-after="300"
			>
				<button
					:class="[$style.researchToggle, { [$style.active]: store.researchMode }]"
					data-test-id="instance-ai-research-toggle"
					@click="store.toggleResearchMode()"
				>
					<svg
						:class="$style.researchIcon"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
					>
						<path
							d="M6.5 1a5.5 5.5 0 0 1 4.383 8.823l3.897 3.897a.75.75 0 0 1-1.06 1.06l-3.897-3.897A5.5 5.5 0 1 1 6.5 1Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
						/>
					</svg>
					{{ i18n.baseText('instanceAi.input.researchToggle') }}
				</button>
			</N8nTooltip>
		</template>
	</ChatInputBase>
</template>

<style module lang="scss">
.researchToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: transparent;
	color: var(--color--text--tint-2);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	transition:
		background 0.15s,
		color 0.15s,
		border-color 0.15s;
	user-select: none;

	&:hover {
		color: var(--color--text);
		border-color: var(--color--foreground--shade-1);
	}

	&.active {
		background: var(--color--primary);
		color: #fff;
		border-color: var(--color--primary);

		&:hover {
			background: var(--color--primary--shade-1);
			border-color: var(--color--primary--shade-1);
		}
	}
}

.researchIcon {
	width: 12px;
	height: 12px;
	flex-shrink: 0;
}
</style>
