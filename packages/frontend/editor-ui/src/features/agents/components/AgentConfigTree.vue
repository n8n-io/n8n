<script setup lang="ts">
/**
 * Middle column of the agent builder: a list of top-level sections derived
 * from `Object.keys(config)`. Sections that carry an array of items (today
 * only `tools`) render as collapsible folders with one row per entry.
 * Selection is a dot-path — `model`, `tools`, or `tools.0` — which the
 * parent feeds into AgentSectionEditor to pick the editor's slice.
 */
import { computed, ref, watch } from 'vue';
import type { ComponentProps } from 'vue-component-type-helpers';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { AgentJsonConfig } from '../types';
import { AGENT_SECTION_KEY, CONFIG_JSON_SECTION_KEY, EXECUTIONS_SECTION_KEY } from '../constants';

type IconProp = ComponentProps<typeof N8nIcon>['icon'];

const props = defineProps<{
	config: AgentJsonConfig | null;
	selectedKey: string | null;
	connectedTriggers?: string[];
	executionsCount?: number;
}>();

const emit = defineEmits<{ select: [key: string] }>();

const i18n = useI18n();

interface SectionDescriptor {
	key: string;
	label: string;
	icon: IconProp;
	children?: ChildDescriptor[];
	/** When true, render a visual divider rendered *before* this row. */
	dividerBefore?: boolean;
	/** Optional count shown as a pill next to the label. */
	count?: number;
}

interface ChildDescriptor {
	key: string;
	label: string;
	icon?: IconProp;
	badge?: string;
}

const KNOWN_SECTIONS: Record<string, { i18nKey: BaseTextKey; icon: IconProp }> = {
	model: { i18nKey: 'agents.builder.sections.model', icon: 'brain' },
	instructions: { i18nKey: 'agents.builder.sections.instructions', icon: 'file-text' },
	triggers: { i18nKey: 'agents.builder.sections.triggers', icon: 'zap' },
	tools: { i18nKey: 'agents.builder.sections.tools', icon: 'wrench' },
	memory: { i18nKey: 'agents.builder.sections.memory', icon: 'database' },
	guardrails: { i18nKey: 'agents.builder.sections.guardrails', icon: 'shield' },
};

// Keys that are collapsed under the synthetic "Agent" section — they should
// not also render as top-level rows.
const AGENT_KEYS = new Set(['name', 'model', 'credential', 'instructions']);

function humanize(key: string): string {
	const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

const sections = computed<SectionDescriptor[]>(() => {
	const cfg = props.config;
	if (!cfg) return [];
	const out: SectionDescriptor[] = [];

	// Primary config rows: Agent (bundles name/model/credential/instructions)
	// and Memory sit at the top as peers.
	out.push({
		key: AGENT_SECTION_KEY,
		label: i18n.baseText('agents.builder.sections.agent'),
		icon: 'bot',
	});
	out.push({
		key: 'memory',
		label: i18n.baseText('agents.builder.sections.memory'),
		icon: 'database',
	});

	// Triggers & Tools. Lists live in their own tabs.
	out.push({
		key: 'triggers',
		label: i18n.baseText(KNOWN_SECTIONS.triggers.i18nKey),
		icon: KNOWN_SECTIONS.triggers.icon,
		count: props.connectedTriggers?.length ?? 0,
	});
	out.push({
		key: 'tools',
		label: i18n.baseText(KNOWN_SECTIONS.tools.i18nKey),
		icon: KNOWN_SECTIONS.tools.icon,
		count: Array.isArray(cfg.tools) ? cfg.tools.length : 0,
	});

	// Divider + Executions row sits below the config primitives.
	out.push({
		key: EXECUTIONS_SECTION_KEY,
		label: 'Executions',
		icon: 'clock',
		dividerBefore: true,
		count: props.executionsCount,
	});

	// Any remaining top-level keys render as flat rows.
	for (const key of Object.keys(cfg)) {
		if (AGENT_KEYS.has(key) || key === 'tools' || key === 'memory' || key === 'triggers') continue;
		const known = KNOWN_SECTIONS[key];
		out.push({
			key,
			label: known ? i18n.baseText(known.i18nKey) : humanize(key),
			icon: (known?.icon ?? 'file') as IconProp,
		});
	}

	return out;
});

const expanded = ref<Record<string, boolean>>({});

function isExpanded(key: string): boolean {
	return expanded.value[key] ?? false;
}

function toggleExpanded(key: string) {
	expanded.value = { ...expanded.value, [key]: !isExpanded(key) };
}

// Auto-expand a folder whose child is currently selected (e.g. after reloading
// with a selection in URL state, or when the parent programmatically selects).
watch(
	() => props.selectedKey,
	(key) => {
		if (!key) return;
		const dot = key.indexOf('.');
		if (dot <= 0) return;
		const parent = key.slice(0, dot);
		if (!isExpanded(parent)) expanded.value = { ...expanded.value, [parent]: true };
	},
	{ immediate: true },
);

function onSectionClick(section: SectionDescriptor) {
	if (section.children) {
		toggleExpanded(section.key);
		// Only the Tools folder surfaces a proper list panel; the Configuration
		// group is a UI-only grouping with no corresponding content.
		if (section.key === 'tools') emit('select', section.key);
		return;
	}
	emit('select', section.key);
}

function onChildClick(childKey: string) {
	emit('select', childKey);
}
</script>

<template>
	<div
		:class="$style.tree"
		:aria-label="i18n.baseText('agents.builder.tree.ariaLabel')"
		role="list"
		data-testid="agent-config-tree"
	>
		<div v-if="sections.length === 0" data-testid="agent-config-tree-empty" :class="$style.empty">
			<N8nText size="small" color="text-light">{{
				i18n.baseText('agents.builder.tree.empty')
			}}</N8nText>
		</div>
		<template v-for="section in sections" :key="section.key">
			<hr v-if="section.dividerBefore" :class="$style.sectionDivider" />
			<button
				:class="[
					$style.item,
					selectedKey === section.key && $style.selected,
					section.children && $style.folder,
				]"
				:aria-pressed="selectedKey === section.key"
				:aria-expanded="section.children ? isExpanded(section.key) : undefined"
				:data-key="section.key"
				data-testid="agent-config-tree-item"
				type="button"
				@click="onSectionClick(section)"
			>
				<N8nIcon :icon="section.icon" :size="18" />
				<N8nText tag="span" size="medium" :class="$style.sectionLabel">{{ section.label }}</N8nText>
				<span
					v-if="typeof section.count === 'number'"
					:class="$style.countPill"
					data-testid="agent-config-tree-count"
					>{{ section.count }}</span
				>
				<N8nIcon v-if="section.children" :class="$style.caret" icon="chevron-down" :size="14" />
			</button>
			<div v-if="section.children && isExpanded(section.key)" :class="$style.children">
				<div
					v-if="section.children.length === 0"
					:class="$style.childEmpty"
					data-testid="agent-config-tree-child-empty"
				>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('agents.builder.tree.foldersEmpty')
					}}</N8nText>
				</div>
				<button
					v-for="child in section.children"
					:key="child.key"
					:class="[$style.item, $style.childItem, selectedKey === child.key && $style.selected]"
					:aria-pressed="selectedKey === child.key"
					:data-key="child.key"
					data-testid="agent-config-tree-child"
					type="button"
					@click="onChildClick(child.key)"
				>
					<N8nIcon :icon="child.icon ?? 'file'" :size="16" />
					<N8nText tag="span" size="medium" :class="$style.childLabel">{{ child.label }}</N8nText>
					<span v-if="child.badge" :class="$style.badge">{{ child.badge }}</span>
				</button>
			</div>
		</template>
		<div :class="$style.pinnedWrap">
			<button
				:class="[
					$style.item,
					$style.pinnedBottom,
					selectedKey === CONFIG_JSON_SECTION_KEY && $style.selected,
				]"
				:aria-pressed="selectedKey === CONFIG_JSON_SECTION_KEY"
				:data-key="CONFIG_JSON_SECTION_KEY"
				data-testid="agent-config-tree-item"
				type="button"
				@click="emit('select', CONFIG_JSON_SECTION_KEY)"
			>
				<N8nIcon icon="json" :size="18" />
				<N8nText tag="span" size="medium">config.json</N8nText>
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.tree {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--2xs);
	min-height: 100%;
}

.pinnedWrap {
	margin: auto calc(-1 * var(--spacing--2xs)) calc(-1 * var(--spacing--xs));
	padding: var(--spacing--4xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.pinnedBottom {
	border-radius: var(--radius);
	color: var(--color--text--tint-1);

	&:hover {
		background: transparent;
		color: var(--color--text);
	}

	&:focus,
	&:focus-visible {
		outline: none;
	}

	/* Override `.selected` so the pinned row never renders the button-like
	   highlight used by regular tree items. */
	&.selected {
		background: transparent;
		border-color: transparent;
		color: var(--color--text);
	}
}

.empty {
	padding: var(--spacing--sm);
	text-align: center;
}

.sectionDivider {
	border: none;
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	margin: var(--spacing--2xs) 0;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: transparent;
	border: none;
	border-radius: var(--radius--lg);
	cursor: pointer;
	text-align: left;
	color: var(--color--text);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);

	&:hover {
		background: var(--color--background--light-2);
	}
}

.sectionLabel {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.countPill {
	flex-shrink: 0;
	min-width: 20px;
	padding: 0 var(--spacing--4xs);
	background: var(--color--background--light-3);
	border-radius: 999px;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: 18px;
	text-align: center;
}

.caret {
	flex-shrink: 0;
	color: var(--color--text--tint-2);
	transition: transform 120ms ease;
}

.folder[aria-expanded='false'] .caret {
	transform: rotate(-90deg);
}

.children {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding-left: var(--spacing--md);
	/* Show ~5 child rows before the folder becomes its own scroll area. */
	max-height: 200px;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--color--foreground--shade-1) transparent;

	&::-webkit-scrollbar {
		width: 6px;
	}

	&::-webkit-scrollbar-track {
		background: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background: var(--color--foreground--shade-1);
		border-radius: 999px;
	}
}

.childItem {
	padding-left: var(--spacing--xs);
}

.childLabel {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.badge {
	flex-shrink: 0;
	padding: 0 var(--spacing--4xs);
	background: var(--color--background--light-3);
	border: var(--border);
	border-color: var(--color--foreground--tint-1);
	border-radius: var(--radius--sm);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	line-height: 1.4;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.childEmpty {
	padding: var(--spacing--3xs) var(--spacing--2xs);
}

.selected {
	background: var(--color--background--light-3);
}
</style>
