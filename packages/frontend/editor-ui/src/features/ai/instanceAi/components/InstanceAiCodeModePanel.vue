<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { CODE_MODE_CSS, CODE_MODE_HTML, CODE_MODE_PREVIEW_DOCUMENT } from '../codeMode/codeMode';

const emit = defineEmits<{ close: [] }>();

const i18n = useI18n();
const view = ref<'preview' | 'code'>('preview');
const activeFile = ref<'index.html' | 'styles.css'>('index.html');
const promoteOpen = ref(false);
const published = ref(false);

const fileSource = computed(() =>
	activeFile.value === 'index.html' ? CODE_MODE_HTML : CODE_MODE_CSS,
);

const files = [
	{ id: 'index.html' as const, label: 'index.html' },
	{ id: 'styles.css' as const, label: 'styles.css' },
];

function showFile(file: 'index.html' | 'styles.css') {
	activeFile.value = file;
	view.value = 'code';
}

function keepInChat() {
	promoteOpen.value = false;
	published.value = false;
}

function publishDraft() {
	published.value = true;
	promoteOpen.value = false;
}
</script>

<template>
	<aside :class="$style.panel" data-test-id="instance-ai-code-mode">
		<header :class="$style.header">
			<div :class="$style.titleRow">
				<N8nText tag="h2" size="medium" bold>{{
					i18n.baseText('instanceAi.codeMode.title')
				}}</N8nText>
				<span :class="$style.chip">{{ i18n.baseText('instanceAi.codeMode.worktree') }}</span>
				<span :class="$style.chip">{{ i18n.baseText('instanceAi.codeMode.draft') }}</span>
			</div>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('instanceAi.codeMode.close')"
				data-test-id="instance-ai-code-mode-close"
				@click="emit('close')"
			/>
		</header>

		<div :class="$style.toolbar" role="tablist">
			<button
				type="button"
				role="tab"
				:aria-selected="view === 'preview'"
				:class="[$style.tab, view === 'preview' && $style.tabActive]"
				data-test-id="instance-ai-code-mode-preview"
				@click="view = 'preview'"
			>
				{{ i18n.baseText('instanceAi.codeMode.preview') }}
			</button>
			<button
				type="button"
				role="tab"
				:aria-selected="view === 'code'"
				:class="[$style.tab, view === 'code' && $style.tabActive]"
				data-test-id="instance-ai-code-mode-code"
				@click="view = 'code'"
			>
				{{ i18n.baseText('instanceAi.codeMode.code') }}
			</button>
		</div>

		<div :class="$style.body">
			<iframe
				v-if="view === 'preview'"
				:class="$style.preview"
				sandbox=""
				:title="i18n.baseText('instanceAi.codeMode.previewTitle')"
				:srcdoc="CODE_MODE_PREVIEW_DOCUMENT"
				data-test-id="instance-ai-code-mode-frame"
			/>
			<div v-else :class="$style.codeLayout">
				<div :class="$style.files" role="list">
					<button
						v-for="file in files"
						:key="file.id"
						type="button"
						role="listitem"
						:class="[$style.file, activeFile === file.id && $style.fileActive]"
						@click="showFile(file.id)"
					>
						{{ file.label }}
					</button>
				</div>
				<pre :class="$style.source" data-test-id="instance-ai-code-mode-source">{{
					fileSource
				}}</pre>
			</div>
		</div>

		<footer :class="$style.footer">
			<N8nText v-if="published" size="small">{{
				i18n.baseText('instanceAi.codeMode.published')
			}}</N8nText>
			<template v-else-if="promoteOpen">
				<N8nText size="small">{{ i18n.baseText('instanceAi.codeMode.promoteBody') }}</N8nText>
				<div :class="$style.actions">
					<N8nButton size="small" variant="outline" @click="keepInChat">
						{{ i18n.baseText('instanceAi.codeMode.keep') }}
					</N8nButton>
					<N8nButton
						size="small"
						data-test-id="instance-ai-code-mode-publish"
						@click="publishDraft"
					>
						{{ i18n.baseText('instanceAi.codeMode.publish') }}
					</N8nButton>
				</div>
			</template>
			<div v-else :class="$style.actions">
				<N8nButton size="small" variant="outline" @click="keepInChat">
					{{ i18n.baseText('instanceAi.codeMode.keep') }}
				</N8nButton>
				<N8nButton
					size="small"
					data-test-id="instance-ai-code-mode-promote"
					@click="promoteOpen = true"
				>
					{{ i18n.baseText('instanceAi.codeMode.promote') }}
				</N8nButton>
			</div>
		</footer>
	</aside>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-width: 0;
	background: var(--color--background--light-2);
	border-left: var(--border);
}

.header,
.toolbar,
.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	flex-shrink: 0;
}

.header {
	justify-content: space-between;
	border-bottom: var(--border);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.chip {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.toolbar {
	border-bottom: var(--border);
}

.tab {
	border: none;
	background: transparent;
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--sm);
	cursor: pointer;
}

.tabActive {
	background: var(--color--foreground--tint-2);
	color: var(--color--text);
}

.body {
	flex: 1;
	min-height: 0;
	display: flex;
}

.preview {
	flex: 1;
	width: 100%;
	height: 100%;
	border: none;
	background: var(--color--background--light-3);
}

.codeLayout {
	display: flex;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.files {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: var(--spacing--4xl);
	padding: var(--spacing--xs);
	border-right: var(--border);
	flex-shrink: 0;
}

.file {
	text-align: left;
	border: none;
	background: transparent;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--sm);
	cursor: pointer;
	color: var(--color--text);
}

.fileActive {
	background: var(--color--foreground--tint-2);
}

.source {
	flex: 1;
	margin: 0;
	padding: var(--spacing--sm);
	overflow: auto;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	white-space: pre-wrap;
}

.footer {
	border-top: var(--border);
	justify-content: space-between;
	flex-wrap: wrap;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}
</style>
