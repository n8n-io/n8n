<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useDropZone } from '@vueuse/core';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { AgentSkillImportError, useAgentSkillImport } from '../composables/useAgentSkillImport';
import type { AgentSkill } from '../types';

const busy = defineModel<boolean>('busy', { default: false });
defineProps<{
	/** Shows "Import from GitHub". Only the settings page can import from GitHub. */
	showGitHubImport?: boolean;
}>();
const emit = defineEmits<{
	uploaded: [skill: AgentSkill];
	'add-manually': [];
	'import-github': [];
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
		<N8nText color="text-base" :class="$style.intro">
			{{ i18n.baseText('agents.builder.skills.import.intro') }}
		</N8nText>
		<div
			ref="dropZone"
			:class="[$style.dropZone, isOverDropZone && !busy && $style.dragOver]"
			data-testid="agent-skill-drop-zone"
		>
			<div :class="[$style.cards, showGitHubImport && $style.twoCards]">
				<section :class="$style.card">
					<span :class="$style.cardIcon" aria-hidden="true">
						<N8nIcon icon="folder-open" :size="16" />
					</span>
					<h2 :class="$style.cardTitle">
						{{ i18n.baseText('agents.builder.skills.import.title') }}
					</h2>
					<N8nText size="small" color="text-base" :class="$style.cardDescription">
						{{ i18n.baseText('agents.builder.skills.import.description') }}
					</N8nText>
					<button
						type="button"
						:class="$style.linkButton"
						:disabled="busy"
						data-testid="agent-skill-upload-skill-md"
						@click="skillFileInput?.click()"
					>
						{{ i18n.baseText('agents.builder.skills.import.skillFile') }}
					</button>
					<N8nButton
						variant="solid"
						:class="$style.cardButton"
						:loading="busy"
						:disabled="busy"
						data-testid="agent-skill-upload-folder"
						@click="skillFolderInput?.click()"
					>
						{{ i18n.baseText('agents.builder.skills.import.folder') }}
					</N8nButton>
				</section>
				<section v-if="showGitHubImport" :class="$style.card">
					<span :class="$style.cardIcon" aria-hidden="true">
						<N8nIcon icon="github" :size="16" />
					</span>
					<h2 :class="$style.cardTitle">
						{{ i18n.baseText('settings.context.skills.github.actions.import') }}
					</h2>
					<N8nText size="small" color="text-base" :class="$style.cardDescription">
						{{ i18n.baseText('agents.builder.skills.import.githubDescription') }}
					</N8nText>
					<N8nButton
						variant="outline"
						:class="$style.cardButton"
						:disabled="busy"
						data-testid="agent-skill-import-github"
						@click="emit('import-github')"
					>
						{{ i18n.baseText('settings.context.skills.github.actions.import') }}
					</N8nButton>
				</section>
			</div>
			<N8nText v-if="fileError" size="small" color="danger" role="alert">
				{{ fileError }}
			</N8nText>
		</div>
		<div :class="$style.divider" aria-hidden="true">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.skills.import.or') }}
			</N8nText>
		</div>
		<N8nButton
			variant="ghost"
			icon="pencil-alt"
			:disabled="busy"
			data-testid="agent-skill-add-manually"
			@click="emit('add-manually')"
		>
			{{ i18n.baseText('agents.builder.skills.import.addManually') }}
		</N8nButton>
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
	gap: var(--spacing--md);
	padding: var(--spacing--lg) var(--spacing--xl);
	min-width: 0;
}

.intro {
	align-self: stretch;
}

.dropZone {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--md);
	border: calc(var(--border-width) * 2) dashed var(--border-color);
	border-radius: var(--radius--lg);
}

.dragOver {
	border-color: var(--color--primary);
	background: var(--color--orange-alpha-100);
}

.cards {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--spacing--md);
}

.twoCards {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.cardIcon {
	display: grid;
	place-items: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	margin-bottom: var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
}

.cardTitle {
	margin: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
}

.cardDescription {
	margin-bottom: var(--spacing--2xs);
	line-height: var(--line-height--xl);
}

/* At the bottom of each card, so the buttons line up across both cards. */
.cardButton {
	width: 100%;
	margin-top: auto;
}

.linkButton {
	margin-bottom: var(--spacing--xs);
	appearance: none;
	border: 0;
	background: transparent;
	padding: 0;
	font: inherit;
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	text-decoration: underline;
	cursor: pointer;

	&:hover:not(:disabled) {
		color: var(--text-color);
	}

	&:disabled {
		cursor: not-allowed;
	}
}

.divider {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	width: 100%;

	&::before,
	&::after {
		content: '';
		flex: 1;
		border-top: var(--border);
	}
}

@media (max-width: 480px) {
	.upload {
		padding: var(--spacing--md);
	}

	.twoCards {
		grid-template-columns: 1fr;
	}
}
</style>
