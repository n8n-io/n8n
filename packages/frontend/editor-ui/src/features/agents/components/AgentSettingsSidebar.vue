<script setup lang="ts">
import { ref, watch } from 'vue';
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const locale = useI18n();
import type { AgentSchema } from '../types';
import AgentOverviewPanel from './AgentOverviewPanel.vue';
import AgentToolsPanel from './AgentToolsPanel.vue';
import AgentMemoryPanel from './AgentMemoryPanel.vue';
import AgentCodeEditor from './AgentCodeEditor.vue';

const props = defineProps<{
	schema: AgentSchema | null;
	code: string;
	updatedAt: string;
}>();

const emit = defineEmits<{
	'update:schema': [changes: Partial<AgentSchema>];
	'update:code': [code: string];
	save: [];
	cancel: [];
}>();

// Dirty state tracking
const originalSchemaJson = ref('');
const isDirty = ref(false);

watch(
	() => props.schema,
	(s) => {
		if (s) {
			originalSchemaJson.value = JSON.stringify(s);
			isDirty.value = false;
		}
	},
	{ immediate: true },
);

function onSchemaUpdate(changes: Partial<AgentSchema>) {
	emit('update:schema', changes);
	// Check dirty state after the parent applies the change
	setTimeout(() => {
		if (props.schema) {
			isDirty.value = JSON.stringify(props.schema) !== originalSchemaJson.value;
		}
	}, 0);
}

function onSave() {
	emit('save');
	if (props.schema) {
		originalSchemaJson.value = JSON.stringify(props.schema);
	}
	isDirty.value = false;
}

function onCancel() {
	emit('cancel');
	isDirty.value = false;
}

// Collapsible section state
const expandedSections = ref<Record<string, boolean>>({
	model: true,
	triggers: false,
	tools: false,
	advanced: false,
	code: false,
});

function toggleSection(section: string) {
	expandedSections.value[section] = !expandedSections.value[section];
}
</script>

<template>
	<aside :class="$style.sidebar">
		<div :class="$style.header">
			<N8nText tag="span" bold size="large">{{ locale.baseText('agents.settings.title') }}</N8nText>
			<div :class="$style.headerActions">
				<N8nButton
					type="secondary"
					size="small"
					:label="locale.baseText('agents.settings.cancel')"
					:disabled="!isDirty"
					@click="onCancel"
				/>
				<N8nButton
					type="primary"
					size="small"
					:label="locale.baseText('agents.settings.save')"
					:disabled="!isDirty"
					@click="onSave"
				/>
			</div>
		</div>

		<N8nCallout v-if="isDirty" theme="warning" :class="$style.unsavedBanner">
			{{ locale.baseText('agents.settings.unsavedChanges') }}
		</N8nCallout>

		<div :class="$style.body">
			<!-- Model & Instructions (always visible) -->
			<div :class="$style.section">
				<AgentOverviewPanel :schema="schema" @update:schema="onSchemaUpdate" />
			</div>

			<!-- Triggers -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('triggers')">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.triggers')
					}}</N8nText>
					<span :class="$style.chevron">{{ expandedSections.triggers ? '−' : '+' }}</span>
				</button>
				<div v-if="expandedSections.triggers" :class="$style.sectionContent">
					<N8nText size="small" color="text-light">
						{{ locale.baseText('agents.settings.triggers.placeholder') }}
					</N8nText>
				</div>
			</div>

			<!-- Tools -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('tools')">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.tools')
					}}</N8nText>
					<span :class="$style.chevron">{{ expandedSections.tools ? '−' : '+' }}</span>
				</button>
				<div v-if="expandedSections.tools" :class="$style.sectionContent">
					<AgentToolsPanel :schema="schema" @update:schema="onSchemaUpdate" />
				</div>
			</div>

			<!-- Advanced -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('advanced')">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.advanced')
					}}</N8nText>
					<span :class="$style.chevron">{{ expandedSections.advanced ? '−' : '+' }}</span>
				</button>
				<div v-if="expandedSections.advanced" :class="$style.sectionContent">
					<AgentMemoryPanel :schema="schema" @update:schema="onSchemaUpdate" />
				</div>
			</div>

			<!-- Code (collapsed by default) -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('code')">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.code')
					}}</N8nText>
					<span :class="$style.chevron">{{ expandedSections.code ? '−' : '+' }}</span>
				</button>
				<div v-if="expandedSections.code" :class="$style.codeSection">
					<AgentCodeEditor :model-value="code" @update:model-value="emit('update:code', $event)" />
				</div>
			</div>
		</div>
	</aside>
</template>

<style module>
.sidebar {
	width: 340px;
	min-width: 340px;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--background);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	flex-shrink: 0;
}

.headerActions {
	display: flex;
	gap: var(--spacing--4xs);
}

.unsavedBanner {
	margin: var(--spacing--2xs) var(--spacing--sm) 0;
	flex-shrink: 0;
}

.body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--xs) 0;
}

.section {
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	background: none;
	border: none;
	cursor: pointer;
	text-align: left;
}

.sectionHeader:hover {
	background-color: var(--color--foreground--tint-2);
}

.chevron {
	font-size: var(--font-size--md);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
}

.sectionContent {
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.codeSection {
	height: 400px;
	min-height: 300px;
}
</style>
