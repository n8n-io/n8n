<script setup lang="ts">
// Prototype: one section of the node diff, such as the parameters. It shows the changed fields.
// A toggle in the header shows the unchanged fields too. A section with no change starts folded.
import { computed, ref, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import NodeCodeField from './NodeCodeField.vue';
import NodeParameterField from './NodeParameterField.vue';
import NodeTextField from './NodeTextField.vue';
import type { NodeFieldSection } from './nodeFieldDiff';

const props = defineProps<{
	section: NodeFieldSection;
}>();

const i18n = useI18n();

const changedCount = computed(() => props.section.fields.filter((field) => field.changed).length);
const unchangedCount = computed(() => props.section.fields.length - changedCount.value);

const open = ref(changedCount.value > 0);
const showAll = ref(false);

watch(
	() => props.section,
	() => {
		open.value = changedCount.value > 0;
		showAll.value = false;
	},
);

const shownFields = computed(() =>
	props.section.fields.filter((field) => showAll.value || field.changed),
);

/** The toggle also opens a folded section, so the fields it shows are in view. */
function toggleUnchanged() {
	if (!open.value) {
		open.value = true;
		showAll.value = true;
		return;
	}
	showAll.value = !showAll.value;
}

const TITLES = {
	parameters: 'workflowDiff.fields.section.parameters',
	credentials: 'workflowDiff.fields.section.credentials',
	settings: 'workflowDiff.fields.section.settings',
} as const;
</script>

<template>
	<section :class="$style.section" data-test-id="node-field-diff-section">
		<div :class="$style.header">
			<button type="button" :class="$style.toggle" :aria-expanded="open" @click="open = !open">
				<N8nIcon :icon="open ? 'chevron-down' : 'chevron-right'" size="small" color="text-light" />
				<N8nText size="small" bold>{{ i18n.baseText(TITLES[section.id]) }}</N8nText>
				<N8nText v-if="changedCount === 0" size="xsmall" color="text-light">
					{{ i18n.baseText('workflowDiff.noChanges') }}
				</N8nText>
			</button>
			<button
				v-if="unchangedCount > 0 && changedCount > 0"
				type="button"
				:class="$style.toggleUnchanged"
				:aria-expanded="open && showAll"
				@click="toggleUnchanged"
			>
				<N8nIcon icon="chevrons-up-down" size="xsmall" />
				{{
					showAll && open
						? i18n.baseText('workflowDiff.fields.hideUnchanged')
						: i18n.baseText('workflowDiff.fields.showUnchanged', {
								interpolate: { count: unchangedCount },
								adjustToNumber: unchangedCount,
							})
				}}
			</button>
		</div>

		<div v-if="open" :class="$style.body">
			<template v-for="field in changedCount === 0 ? section.fields : shownFields" :key="field.key">
				<NodeCodeField
					v-if="field.kind === 'code'"
					:field-key="field.key"
					:label="field.label"
					:before="field.before"
					:after="field.after"
					:language="field.language"
				/>
				<NodeTextField
					v-else-if="field.kind === 'text'"
					:field-key="field.key"
					:label="field.label"
					:expression="field.expression"
					:before="field.before"
					:after="field.after"
				/>
				<NodeParameterField v-else :field="field" />
			</template>
		</div>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
}

.toggle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	padding: var(--spacing--4xs) 0;
	border: 0;
	background: transparent;
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}

/* No box: only a gutter on the left, for the + and − signs and the bars. */
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0 var(--spacing--xs) var(--spacing--lg);
}

.toggleUnchanged {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--text-color--subtler);
	font: inherit;
	font-size: var(--font-size--2xs);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}
</style>
