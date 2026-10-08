<script setup lang="ts">
import { N8nButton, N8nDialog, N8nMarkdown, N8nText } from '@n8n/design-system';
import { computed, ref } from 'vue';

import { formatNumber } from '../format';
import type { Skill } from '../skills';

/** `target.path` opens one reference first; a null path opens the skill itself. Renders nothing without a target. */
const props = defineProps<{ target: { skill: Skill; path: string | null } | null }>();

const SKILL_FILE = 'SKILL.md';
const open = ref(false);
const selected = ref(SKILL_FILE);

const files = computed(() =>
	props.target
		? [
				{ path: SKILL_FILE, bytes: null, content: props.target.skill.content },
				...props.target.skill.references,
			]
		: [],
);
const current = computed(() => files.value.find((file) => file.path === selected.value));

function show() {
	selected.value = props.target?.path ?? SKILL_FILE;
	open.value = true;
}
</script>

<template>
	<div v-if="target" :class="$style.root">
		<N8nButton
			variant="subtle"
			size="small"
			icon="book-open"
			data-test-id="skill-open"
			@click="show"
		>
			{{ target.path ? 'View reference' : 'View skill' }}
		</N8nButton>
		<N8nDialog v-model:open="open" size="cover" :header="target.skill.id">
			<div :class="$style.layout" data-test-id="skill-dialog">
				<nav :class="$style.files" aria-label="Skill files">
					<button
						v-for="file in files"
						:key="file.path"
						type="button"
						:class="$style.file"
						:aria-current="file.path === selected ? 'true' : undefined"
						@click="selected = file.path"
					>
						<code :class="$style.path">{{ file.path }}</code>
						<N8nText
							v-if="file.content === null || file.bytes !== null"
							size="xsmall"
							color="text-light"
						>
							{{
								[
									file.bytes === null ? null : `${formatNumber(file.bytes)} B`,
									file.content === null ? 'not loaded' : null,
								]
									.filter(Boolean)
									.join(' · ')
							}}
						</N8nText>
					</button>
				</nav>
				<div :class="$style.content" data-test-id="skill-content">
					<N8nMarkdown v-if="current?.content" :content="current.content" />
					<N8nText v-else-if="selected === SKILL_FILE" color="text-light">
						The run-debug page has no tool result for this skill.
					</N8nText>
					<N8nText v-else color="text-light">
						The attempt did not load this file, so the run has no content for it.
					</N8nText>
				</div>
			</div>
		</N8nDialog>
	</div>
</template>

<style module>
.root {
	align-self: flex-start;
}

.layout {
	display: grid;
	grid-template-columns: minmax(var(--spacing--4xl), 22%) 1fr;
	gap: var(--spacing--sm);
	/* The cover dialog is the viewport minus its margin, header and padding. */
	height: calc(100dvh - var(--spacing--4xl));
}

.files {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	overflow-y: auto;
	padding-inline-end: var(--spacing--2xs);
	border-inline-end: var(--border);
}

.file {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius--sm);
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
}

.file[aria-current] {
	background-color: var(--background--active);
}

@media (hover: hover) {
	.file:hover {
		background-color: var(--background--hover);
	}
}

.path {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	word-break: break-all;
}

.content {
	overflow-y: auto;
	min-width: 0;
}
</style>
