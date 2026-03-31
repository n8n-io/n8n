<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import AttachmentPreview from './AttachmentPreview.vue';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import { useInstanceAiStore } from '../instanceAi.store';
import type { InstanceAiAttachment } from '@n8n/api-types';

const props = defineProps<{
	isStreaming: boolean;
}>();

const emit = defineEmits<{
	submit: [message: string, attachments?: InstanceAiAttachment[]];
	stop: [];
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const inputText = ref('');
const attachedFiles = ref<File[]>([]);
const chatInputRef = ref<InstanceType<typeof ChatInputBase> | null>(null);

defineExpose({
	focus: () => chatInputRef.value?.focus(),
});

const canSubmit = computed(
	() => (inputText.value.trim().length > 0 || attachedFiles.value.length > 0) && !props.isStreaming,
);

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

async function handleSubmit() {
	const text = inputText.value.trim();
	if ((!text && attachedFiles.value.length === 0) || props.isStreaming) return;

	let attachments: InstanceAiAttachment[] | undefined;
	if (attachedFiles.value.length > 0) {
		const binaryData = await Promise.all(attachedFiles.value.map(convertFileToBinaryData));
		attachments = binaryData.map((b) => ({
			data: b.data,
			mimeType: b.mimeType,
			fileName: b.fileName ?? 'unnamed',
		}));
	}

	emit('submit', text, attachments);
	inputText.value = '';
	attachedFiles.value = [];
}

function handleStop() {
	emit('stop');
}

function handleTabAutocomplete() {
	if (!inputText.value && store.contextualSuggestion) {
		inputText.value = store.contextualSuggestion;
	}
}

function handleFilesSelected(files: File[]) {
	attachedFiles.value.push(...files);
}

function handleFileRemove(file: File) {
	const idx = attachedFiles.value.indexOf(file);
	if (idx !== -1) {
		attachedFiles.value.splice(idx, 1);
	}
}
</script>

<template>
	<ChatInputBase
		ref="chatInputRef"
		v-model="inputText"
		:placeholder="placeholder"
		:is-streaming="props.isStreaming"
		:can-submit="canSubmit"
		show-voice
		show-attach
		@submit="handleSubmit"
		@stop="handleStop"
		@tab="handleTabAutocomplete"
		@files-selected="handleFilesSelected"
	>
		<template v-if="attachedFiles.length > 0" #attachments>
			<div :class="$style.attachments">
				<AttachmentPreview
					v-for="(file, index) in attachedFiles"
					:key="index"
					:file="file"
					:is-removable="true"
					@remove="handleFileRemove"
				/>
			</div>
		</template>
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
.attachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.researchToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: transparent;
	color: var(--color--text--tint-1);
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
		color: var(--button--color--text--primary);
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
