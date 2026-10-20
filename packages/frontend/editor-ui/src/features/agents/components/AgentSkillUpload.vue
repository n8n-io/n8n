<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useDropZone } from '@vueuse/core';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { AgentSkillImportError, useAgentSkillImport } from '../composables/useAgentSkillImport';
import type { AgentSkill } from '../types';

const busy = defineModel<boolean>('busy', { default: false });
const emit = defineEmits<{
	uploaded: [skill: AgentSkill];
	'add-manually': [];
	'import:skill': [
		payload: {
			source: 'skill_file' | 'folder';
			status: 'success' | 'error';
			referenceCount?: number;
			error?: string;
		},
	];
}>();

const i18n = useI18n();
const { importSkillFiles, importSkillEntries } = useAgentSkillImport();
const skillFileInput = useTemplateRef<HTMLInputElement>('skillFileInput');
const skillFolderInput = useTemplateRef<HTMLInputElement>('skillFolderInput');
const dropZone = useTemplateRef<HTMLElement>('dropZone');
const fileError = ref('');
const { isOverDropZone } = useDropZone(dropZone, onDrop);

async function importSkill(loadSkill: () => Promise<AgentSkill>, source: 'skill_file' | 'folder') {
	if (busy.value) return;
	busy.value = true;
	fileError.value = '';

	try {
		const skill = await loadSkill();
		emit('import:skill', {
			source,
			status: 'success',
			referenceCount: skill.references?.length ?? 0,
		});
		emit('uploaded', skill);
	} catch (error) {
		fileError.value =
			error instanceof AgentSkillImportError
				? i18n.baseText(error.i18nKey)
				: i18n.baseText('agents.builder.skills.import.invalidFolder');
		emit('import:skill', {
			source,
			status: 'error',
			error: error instanceof AgentSkillImportError ? error.i18nKey : 'unknown',
		});
	} finally {
		busy.value = false;
	}
}

function onFilesSelected(event: Event, source: 'skill_file' | 'folder') {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;
	const files = Array.from(input.files ?? []);
	if (files.length > 0) void importSkill(async () => await importSkillFiles(files), source);
	input.value = '';
}

function onDrop(files: File[] | null, event: DragEvent) {
	const entries = Array.from(event.dataTransfer?.items ?? [])
		.map((item) => item.webkitGetAsEntry?.())
		.filter((entry) => entry !== null && entry !== undefined);
	const source = entries.some((entry) => entry.isDirectory) ? 'folder' : 'skill_file';
	void importSkill(async () => {
		if (entries.length > 0) return await importSkillEntries(entries);
		return await importSkillFiles(files ?? []);
	}, source);
}
</script>

<template>
	<div :class="$style.upload" :aria-busy="busy" data-testid="agent-skill-upload">
		<div
			ref="dropZone"
			:class="[$style.dropZone, isOverDropZone && !busy && $style.dragOver]"
			data-testid="agent-skill-drop-zone"
		>
			<N8nIcon icon="book-open" :size="32" color="text-light" aria-hidden="true" />
			<h2 :class="$style.title">{{ i18n.baseText('agents.builder.skills.import.title') }}</h2>
			<N8nText size="small" color="text-base" :class="$style.description">
				{{ i18n.baseText('agents.builder.skills.import.description') }}
			</N8nText>
			<div :class="$style.actions">
				<N8nButton
					variant="solid"
					:loading="busy"
					:disabled="busy"
					data-testid="agent-skill-upload-folder"
					@click="skillFolderInput?.click()"
				>
					{{ i18n.baseText('agents.builder.skills.import.folder') }}
				</N8nButton>
				<N8nButton
					variant="outline"
					:disabled="busy"
					data-testid="agent-skill-upload-skill-md"
					@click="skillFileInput?.click()"
				>
					{{ i18n.baseText('agents.builder.skills.import.skillFile') }}
				</N8nButton>
			</div>
			<N8nText v-if="fileError" size="small" color="danger" role="alert">
				{{ fileError }}
			</N8nText>
		</div>
		<div :class="$style.manual">
			<N8nText size="small" color="text-base">
				{{ i18n.baseText('agents.builder.skills.import.manualPrompt') }}
				<button
					type="button"
					:class="$style.manualButton"
					:disabled="busy"
					data-testid="agent-skill-add-manually"
					@click="emit('add-manually')"
				>
					{{ i18n.baseText('agents.builder.skills.import.addManually') }}
				</button>
			</N8nText>
		</div>
		<input
			ref="skillFileInput"
			type="file"
			accept=".md,text/markdown"
			hidden
			tabindex="-1"
			:disabled="busy"
			data-testid="agent-skill-skill-md-file-input"
			@change="onFilesSelected($event, 'skill_file')"
		/>
		<input
			ref="skillFolderInput"
			type="file"
			webkitdirectory
			multiple
			hidden
			tabindex="-1"
			:disabled="busy"
			data-testid="agent-skill-folder-file-input"
			@change="onFilesSelected($event, 'folder')"
		/>
	</div>
</template>

<style module>
.upload {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--md);
	padding: var(--spacing--xl);
	min-width: 0;
}

.dropZone {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--3xl) var(--spacing--xl);
	border: calc(var(--border-width) * 2) dashed var(--border-color);
	border-radius: var(--radius--lg);
	text-align: center;
}

.dragOver {
	border-color: var(--color--primary);
	background: var(--color--orange-alpha-100);
}

.title {
	margin: 0;
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--regular);
}

.description {
	/* Use a text measure to keep the upload instructions readable. */
	max-width: 45ch;
	line-height: var(--line-height--xl);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}

.manual {
	text-align: center;
}

.manualButton {
	appearance: none;
	border: 0;
	background: transparent;
	padding: 0;
	font: inherit;
	color: inherit;
	text-decoration: underline;
	cursor: pointer;

	&:hover:not(:disabled) {
		color: var(--text-color);
	}

	&:disabled {
		cursor: not-allowed;
	}
}

@media (max-width: 480px) {
	.upload {
		padding: var(--spacing--md);
	}

	.dropZone {
		padding: var(--spacing--xl) var(--spacing--sm);
	}
}
</style>
