<script setup lang="ts">
import { computed, ref } from 'vue';
import type { NodeHint } from 'n8n-workflow';
import { N8nCallout, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

type HintTheme = NonNullable<NodeHint['type']>;

type HintEntry = {
	key: string;
	theme: HintTheme;
	hints: NodeHint[];
	repeatedCount?: number;
	/** Only set for grouped hints; `{count}` is interpolated on render */
	summary?: string;
};

const HINT_THEME_SEVERITY: Record<HintTheme, number> = {
	info: 0,
	warning: 1,
	danger: 2,
};

const props = defineProps<{
	hints: NodeHint[];
}>();

const i18n = useI18n();

const expandedKeys = ref(new Set<string>());

/**
 * Exact duplicates collapse at display time; grouped hints still need a visible summary.
 */
const entries = computed<HintEntry[]>(() => {
	const groups = new Map<string, HintEntry>();
	const hintEntries = new Map<string, HintEntry>();

	return props.hints.reduce<HintEntry[]>((acc, hint) => {
		const key = hintKey(hint);
		const existingDuplicate = hintEntries.get(key);

		if (existingDuplicate) {
			if (!existingDuplicate.summary) {
				existingDuplicate.repeatedCount = (existingDuplicate.repeatedCount ?? 1) + 1;
			}
			return acc;
		}

		const theme = hint.type ?? 'info';

		if (!hint.group || hint.group.summary.trim() === '') {
			const entry = { key: `hint:${key}`, theme, hints: [hint] };
			hintEntries.set(key, entry);
			acc.push(entry);
			return acc;
		}

		const existing = groups.get(hint.group.key);

		if (existing) {
			existing.theme = mostSevereTheme(existing.theme, theme);
			existing.hints.push(hint);
			hintEntries.set(key, existing);
			return acc;
		}

		const entry: HintEntry = {
			key: `group:${hint.group.key}`,
			theme,
			hints: [hint],
			summary: hint.group.summary,
		};

		groups.set(hint.group.key, entry);
		hintEntries.set(key, entry);
		acc.push(entry);

		return acc;
	}, []);
});

function hintKey(hint: NodeHint) {
	const group = hint.group
		? {
				key: hint.group.key,
				summary: hint.group.summary,
				label: hint.group.label ?? null,
			}
		: null;

	return JSON.stringify({
		message: hint.message,
		type: hint.type ?? null,
		location: hint.location ?? null,
		whenToDisplay: hint.whenToDisplay ?? null,
		displayCondition: hint.displayCondition ?? null,
		group,
	});
}

function isCollapsible(entry: HintEntry) {
	return entry.hints.length > 1 && !!entry.summary;
}

function mostSevereTheme(current: HintTheme, next: HintTheme) {
	return HINT_THEME_SEVERITY[next] > HINT_THEME_SEVERITY[current] ? next : current;
}

function summaryText(entry: HintEntry) {
	return entry.summary?.replaceAll('{count}', entry.hints.length.toString()) ?? '';
}

function repeatedText(entry: HintEntry) {
	return i18n.baseText('ndv.nodeHints.repeatedCount', {
		interpolate: { count: entry.repeatedCount ?? 0 },
	});
}

function hasLabels(entry: HintEntry) {
	return entry.hints.every((hint) => !!hint.group?.label);
}

function isExpanded(entry: HintEntry) {
	return expandedKeys.value.has(entry.key);
}

function toggle(entry: HintEntry) {
	const next = new Set(expandedKeys.value);

	if (next.has(entry.key)) {
		next.delete(entry.key);
	} else {
		next.add(entry.key);
	}

	expandedKeys.value = next;
}
</script>

<template>
	<div :class="$style.hints">
		<N8nCallout
			v-for="entry in entries"
			:key="entry.key"
			:theme="entry.theme"
			:class="isCollapsible(entry) && isExpanded(entry) ? $style.expandedHint : undefined"
			data-test-id="node-hint"
		>
			<template v-if="isCollapsible(entry)">
				<button
					type="button"
					:class="$style.summaryToggle"
					:aria-expanded="isExpanded(entry)"
					data-test-id="node-hint-toggle"
					@click="toggle(entry)"
				>
					<N8nText size="small" tag="span" data-test-id="node-hint-summary">
						{{ summaryText(entry) }}
					</N8nText>
					<N8nIcon :icon="isExpanded(entry) ? 'chevron-up' : 'chevron-down'" size="small" />
				</button>
				<ul
					v-if="isExpanded(entry)"
					:class="hasLabels(entry) ? $style.labels : $style.messages"
					data-test-id="node-hint-details"
				>
					<li v-for="hint in entry.hints" :key="hintKey(hint)" data-test-id="node-hint-message">
						<N8nText v-if="hint.group?.label" size="small">{{ hint.group.label }}</N8nText>
						<N8nText v-else v-n8n-html="hint.message" size="small" />
					</li>
				</ul>
			</template>
			<template v-else>
				<N8nText v-n8n-html="entry.hints[0].message" size="small" />
				<N8nText
					v-if="entry.repeatedCount && entry.repeatedCount > 1"
					:class="$style.repeatedCount"
					size="small"
					color="text-light"
					data-test-id="node-hint-repeated-count"
				>
					{{ repeatedText(entry) }}
				</N8nText>
			</template>
		</N8nCallout>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.hints {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.expandedHint {
	align-items: flex-start;

	> :first-child {
		align-items: flex-start;
	}
}

.summaryToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	border: none;
	border-radius: var(--radius--3xs);
	background: none;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.messages {
	margin: var(--spacing--2xs) 0 0;
	padding-left: var(--spacing--sm);
	list-style: disc;

	> li:not(:last-child) {
		margin-bottom: var(--spacing--3xs);
	}
}

.labels {
	display: flex;
	flex-wrap: wrap;
	column-gap: var(--spacing--3xs);
	margin: var(--spacing--2xs) 0 0;
	padding: 0;
	list-style: none;

	> li:not(:last-child)::after {
		content: ',';
	}
}

.repeatedCount {
	margin-left: var(--spacing--3xs);
}
</style>
