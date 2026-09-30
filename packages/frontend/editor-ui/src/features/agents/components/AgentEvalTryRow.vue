<script setup lang="ts">
/**
 * One eval case as a single row: a status avatar, the request text, and —
 * once it has run — a chevron that expands to the full input/output sample.
 * A case with no output yet has nothing to expand, so the chevron is hidden;
 * an idle (never-run) case says so in its place.
 */
import { computed, ref } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentAvatar, { type AgentAvatarKind } from './AgentAvatar.vue';
import EvalInitialSample from './EvalInitialSample.vue';

const props = defineProps<{
	status: AgentAvatarKind;
	input: string;
	output: string | null;
	/** Leading text before the input, e.g. "Your try" — omit for plain example rows. */
	label?: string;
	/** Base id for this row; its toggle and expanded sample suffix it with `-toggle` / `-placeholder`. */
	testId?: string;
}>();

const i18n = useI18n();

const expanded = ref(false);

const canExpand = computed(() => props.output !== null);
const showNotRun = computed(() => props.status === 'idle' && props.output === null);

function toggleExpanded() {
	if (!canExpand.value) return;
	expanded.value = !expanded.value;
}
</script>

<template>
	<div :class="$style.root" :data-test-id="testId">
		<div :class="$style.header">
			<AgentAvatar :kind="status" size="sm" />
			<N8nText v-if="label" color="text-light" size="small">{{ label }}</N8nText>
			<N8nText color="text-dark" :class="$style.inputText" size="small">{{ input }}</N8nText>
			<N8nText v-if="showNotRun" color="text-light" size="small">
				{{ i18n.baseText('instanceAi.testAgentPreview.avatar.notRun') }}
			</N8nText>
			<button
				v-else-if="canExpand"
				type="button"
				:class="$style.expandToggle"
				:data-test-id="testId && `${testId}-toggle`"
				@click="toggleExpanded"
			>
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="small" />
			</button>
		</div>
		<div
			v-if="expanded && canExpand"
			:class="$style.sample"
			:data-test-id="testId && `${testId}-placeholder`"
		>
			<EvalInitialSample :preview-input="input" :preview-output="output ?? ''" />
		</div>
	</div>
</template>

<style module lang="scss">
.root {
	border: var(--border);
	padding: var(--spacing--3xs);
	border-radius: var(--radius--lg);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.inputText {
	flex: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.expandToggle {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
	color: var(--text-color--subtler);
}

.sample {
	margin-top: var(--spacing--xs);
}
</style>
