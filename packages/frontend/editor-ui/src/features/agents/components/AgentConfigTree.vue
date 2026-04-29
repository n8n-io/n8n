<script setup lang="ts">
/**
 * Right column of the agent builder: a curated list of editable sections.
 * Selection is a dot-path — `tools`, `skills.<id>`, or a synthetic section key
 * — which the parent uses to pick the editor's slice.
 */
import { computed } from 'vue';
import type { ComponentProps } from 'vue-component-type-helpers';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import type { AgentJsonConfig } from '../types';
import {
	AGENT_SECTION_KEY,
	ADVANCED_SECTION_KEY,
	CONFIG_JSON_SECTION_KEY,
	EVALS_SECTION_KEY,
	EXECUTIONS_SECTION_KEY,
} from '../constants';

type IconProp = ComponentProps<typeof N8nIcon>['icon'];

const props = defineProps<{
	config: AgentJsonConfig | null;
	selectedKey: string | null;
	connectedTriggers?: string[];
	evaluationsCount?: number;
}>();

const emit = defineEmits<{ select: [key: string] }>();

const i18n = useI18n();

interface SectionDescriptor {
	key: string;
	label: string;
	icon: IconProp;
	/** When true, render a visual divider rendered *before* this row. */
	dividerBefore?: boolean;
	/** Optional count shown as a pill next to the label. */
	count?: number;
	/** When true, the row is non-interactive and renders a status pill. */
	disabled?: boolean;
	/** Optional status pill label (e.g. "Coming soon"). */
	pill?: string;
}

const sections = computed<SectionDescriptor[]>(() => {
	const cfg = props.config;
	if (!cfg) return [];
	const out: SectionDescriptor[] = [];
	const toolRefs = Array.isArray(cfg.tools) ? cfg.tools : [];
	const skillRefs = Array.isArray(cfg.skills) ? cfg.skills : [];
	const skillCount = new Set(skillRefs.map((ref) => ref.id).filter(Boolean)).size;

	// Primary config rows: Agent (bundles name/model/credential/instructions)
	// and Memory sit at the top as peers.
	out.push({
		key: AGENT_SECTION_KEY,
		label: i18n.baseText('agents.builder.sections.agent'),
		icon: 'bot',
	});
	out.push({
		key: ADVANCED_SECTION_KEY,
		label: i18n.baseText('agents.builder.sections.advanced'),
		icon: 'settings',
	});
	out.push({
		key: 'memory',
		label: i18n.baseText('agents.builder.sections.memory'),
		icon: 'database',
	});

	// Triggers, Tools & Skills. Lists live in their own tabs.
	out.push({
		key: 'triggers',
		label: i18n.baseText('agents.builder.sections.triggers'),
		icon: 'zap',
		count: props.connectedTriggers?.length ?? 0,
	});
	out.push({
		key: 'tools',
		label: i18n.baseText('agents.builder.sections.tools'),
		icon: 'wrench',
		count: toolRefs.length,
	});
	out.push({
		key: 'skills',
		label: i18n.baseText('agents.builder.sections.skills'),
		icon: 'sparkles',
		count: skillCount,
	});
	out.push({
		key: EVALS_SECTION_KEY,
		label: i18n.baseText('agents.builder.sections.evaluations'),
		icon: 'check',
		disabled: true,
		pill: i18n.baseText('agents.builder.sections.evaluations.comingSoon'),
	});

	// Divider + Executions row sits below the config primitives. The count is
	// intentionally omitted — it would only reflect the locally-loaded page
	// (e.g. "20" until "Load more" is clicked), which misrepresents the total.
	out.push({
		key: EXECUTIONS_SECTION_KEY,
		label: i18n.baseText('agents.builder.sections.executions'),
		icon: 'clock',
		dividerBefore: true,
	});

	return out;
});

function isSelected(sectionKey: string): boolean {
	return (
		props.selectedKey === sectionKey || props.selectedKey?.startsWith(`${sectionKey}.`) === true
	);
}

function onSectionClick(section: SectionDescriptor) {
	if (section.disabled) return;
	emit('select', section.key);
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
					isSelected(section.key) && $style.selected,
					section.disabled && $style.disabled,
				]"
				:aria-pressed="isSelected(section.key)"
				:aria-disabled="section.disabled"
				:data-key="section.key"
				data-testid="agent-config-tree-item"
				type="button"
				@click="onSectionClick(section)"
			>
				<N8nIcon :icon="section.icon" :size="18" />
				<N8nText tag="span" size="medium" :class="$style.sectionLabel">{{ section.label }}</N8nText>
				<N8nBadge
					v-if="typeof section.count === 'number'"
					theme="default"
					size="xsmall"
					:show-border="false"
					:class="$style.countPill"
					data-testid="agent-config-tree-count"
					>{{ section.count }}</N8nBadge
				>
				<N8nBadge v-if="section.pill" theme="primary" size="xsmall" :class="$style.statusPill">{{
					section.pill
				}}</N8nBadge>
			</button>
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
				<N8nText tag="span" size="medium">{{
					i18n.baseText('agents.builder.sections.configJson')
				}}</N8nText>
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
}

.selected {
	background: var(--color--background--light-3);
}

.disabled {
	cursor: not-allowed;
	color: var(--color--text--tint-2);

	&:hover {
		background: transparent;
	}
}

.statusPill {
	flex-shrink: 0;
}
</style>
