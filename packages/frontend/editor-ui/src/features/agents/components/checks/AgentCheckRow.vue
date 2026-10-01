<script setup lang="ts">
/**
 * One check in the Checks list, styled like the Sessions list: an agent head
 * (waiting while it runs), the short name with a coloured status line, the kind
 * as a plain column, the example count when there are two or more, and the last
 * run. Open, one bordered panel holds the rule, the example (a picker only with
 * two or more), the thread with the verdict under the reply, and the actions.
 */
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nIconButton, N8nInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentCheck, AgentCheckExample } from '../../utils/agentChecks.utils';
import AgentCheckThread from './AgentCheckThread.vue';
import AgentReaction from './AgentReaction.vue';

const props = defineProps<{
	check: AgentCheck;
	open: boolean;
	running?: boolean;
	disabled?: boolean;
	canRun?: boolean;
}>();

const emit = defineEmits<{
	toggle: [];
	run: [check: AgentCheck];
	fix: [check: AgentCheck, example: AgentCheckExample];
	fine: [example: AgentCheckExample];
	editRule: [check: AgentCheck, rule: string];
	addExample: [check: AgentCheck, input: string];
}>();

const i18n = useI18n();
const pickerOpen = ref(false);
const editingRule = ref(false);
const ruleDraft = ref('');
const addingExample = ref(false);
const exampleDraft = ref('');

const startRuleEdit = () => {
	ruleDraft.value = props.check.rule;
	editingRule.value = true;
};
const saveRule = () => {
	const next = ruleDraft.value.trim();
	if (next && next !== props.check.rule) emit('editRule', props.check, next);
	editingRule.value = false;
};
const saveExample = () => {
	const next = exampleDraft.value.trim();
	if (!next) return;
	emit('addExample', props.check, next);
	exampleDraft.value = '';
	addingExample.value = false;
	pickerOpen.value = false;
};

// The first example that needs work opens first; otherwise the first one.
const selected = ref(0);
watch(
	() => props.check.key,
	() => {
		const firstBad = props.check.examples.findIndex((ex) => ex.state === 'needs_work');
		selected.value = Math.max(0, firstBad);
	},
	{ immediate: true },
);

const example = computed(
	() => props.check.examples[Math.min(selected.value, props.check.examples.length - 1)],
);

const reactionOf = (ex: AgentCheckExample) =>
	ex.state === 'running'
		? 'waiting'
		: ex.state === 'not_run'
			? 'idle'
			: ex.state === 'needs_work'
				? 'needs_work'
				: ex.state === 'failed'
					? 'failed'
					: 'pass';

const unrun = computed(() => props.check.examples.every((ex) => ex.state === 'not_run'));

const head = computed(() => {
	if (props.running) return 'waiting';
	if (props.check.needsWork > 0) return 'needs_work';
	if (unrun.value) return 'idle';
	return 'pass';
});

const status = computed((): { tone: 'bad' | 'good' | 'muted'; text: string } => {
	const total = props.check.examples.length;
	if (props.running) {
		return { tone: 'muted', text: i18n.baseText('agents.builder.agentChecks.status.running') };
	}
	if (unrun.value) {
		return { tone: 'muted', text: i18n.baseText('agents.builder.agentChecks.status.notRun') };
	}
	if (props.check.needsWork > 0) {
		if (total > 1) {
			return {
				tone: 'bad',
				text: i18n.baseText('agents.builder.agentChecks.status.someNeedWork', {
					interpolate: { count: String(props.check.needsWork), total: String(total) },
				}),
			};
		}
		return {
			tone: 'bad',
			text:
				props.check.change === 'broke'
					? i18n.baseText('agents.builder.agentChecks.status.broke')
					: i18n.baseText('agents.builder.agentChecks.status.needsWork'),
		};
	}
	return {
		tone: 'good',
		text:
			props.check.change === 'fixed'
				? i18n.baseText('agents.builder.agentChecks.status.fixed')
				: i18n.baseText('agents.builder.agentChecks.status.passes'),
	};
});

const kind = computed(() => props.check.examples.find((ex) => ex.kind)?.kind ?? '');

const lastRun = computed(() => {
	if (props.running || !props.check.lastRunAt) return '';
	const ms = Date.now() - Date.parse(props.check.lastRunAt);
	if (Number.isNaN(ms)) return '';
	const minutes = Math.round(ms / 60_000);
	if (minutes < 1) return i18n.baseText('agents.builder.agentChecks.lastRun.justNow');
	if (minutes < 60) {
		return i18n.baseText('agents.builder.agentChecks.lastRun.minutes', {
			interpolate: { count: String(minutes) },
		});
	}
	return new Date(props.check.lastRunAt).toLocaleDateString();
});

const stateLabel = (ex: AgentCheckExample) =>
	ex.state === 'needs_work'
		? i18n.baseText('agents.builder.agentChecks.reaction.needsWork')
		: ex.state === 'pass'
			? i18n.baseText('agents.builder.agentChecks.examples.passes')
			: ex.state === 'running'
				? i18n.baseText('agents.builder.agentChecks.reaction.running')
				: i18n.baseText('agents.builder.agentChecks.reaction.notRun');

const pick = (index: number) => {
	selected.value = index;
	pickerOpen.value = false;
};
</script>

<template>
	<div :class="[$style.row, { [$style.open]: open }]" data-testid="agent-check-row">
		<button
			type="button"
			:class="$style.head"
			:aria-expanded="open"
			data-testid="agent-check-row-toggle"
			@click="emit('toggle')"
		>
			<AgentReaction :kind="head" size="xs" />
			<span :class="$style.title">
				<b :class="$style.name">{{ check.name }}</b>
				<small :class="[$style.status, $style[status.tone]]" data-testid="agent-check-status">{{
					status.text
				}}</small>
			</span>
			<span :class="$style.kind">{{ kind }}</span>
			<span :class="$style.muted">{{
				check.examples.length > 1
					? i18n.baseText('agents.builder.agentChecks.row.examples', {
							interpolate: { count: String(check.examples.length) },
						})
					: ''
			}}</span>
			<span :class="$style.muted">{{ lastRun }}</span>
			<N8nIcon :icon="open ? 'chevron-up' : 'chevron-down'" size="small" :class="$style.chev" />
		</button>

		<div v-if="open && example" :class="$style.panel" data-testid="agent-check-row-body">
			<div :class="[$style.ruleLine, { [$style.ruleEditing]: editingRule }]">
				<span :class="$style.ruleLabel">{{
					i18n.baseText('agents.builder.agentChecks.rule')
				}}</span>
				<div v-if="editingRule" :class="$style.ruleEdit" @keydown.esc.stop="editingRule = false">
					<N8nInput
						v-model="ruleDraft"
						type="textarea"
						:autosize="{ minRows: 2, maxRows: 6 }"
						data-testid="agent-check-rule-input"
						@keydown.meta.enter="saveRule"
						@keydown.ctrl.enter="saveRule"
					/>
					<div :class="$style.actions">
						<N8nButton
							variant="solid"
							size="small"
							data-testid="agent-check-rule-save"
							@click="saveRule"
						>
							{{ i18n.baseText('agents.builder.agentChecks.saveRule') }}
						</N8nButton>
						<N8nButton variant="ghost" size="small" @click="editingRule = false">
							{{ i18n.baseText('agents.builder.agentChecks.cancel') }}
						</N8nButton>
					</div>
				</div>
				<template v-else>
					<p :class="$style.rule">{{ check.rule }}</p>
					<N8nIconButton
						icon="pencil"
						variant="outline"
						size="small"
						type="button"
						:disabled="disabled"
						:aria-label="i18n.baseText('agents.builder.agentChecks.editRule')"
						data-testid="agent-check-edit-rule"
						@click="startRuleEdit"
					/>
				</template>
			</div>

			<div :class="$style.example">
				<div v-if="check.examples.length > 1 || addingExample" :class="$style.pickerWrap">
					<button
						type="button"
						:class="$style.picker"
						:aria-expanded="pickerOpen"
						data-testid="agent-check-example-picker"
						@click="pickerOpen = !pickerOpen"
					>
						<AgentReaction :kind="reactionOf(example)" size="xs" />
						<b>{{
							i18n.baseText('agents.builder.agentChecks.examples.position', {
								interpolate: { index: String(selected + 1), total: String(check.examples.length) },
							})
						}}</b>
						<span :class="$style.pickerText">{{ example.input }}</span>
						<N8nIcon icon="chevron-down" size="small" />
					</button>
					<div v-if="pickerOpen" :class="$style.menu" role="listbox">
						<button
							v-for="(ex, index) in check.examples"
							:key="ex.rowId"
							type="button"
							role="option"
							:aria-selected="index === selected"
							:class="[$style.option, { [$style.optionOn]: index === selected }]"
							@click="pick(index)"
						>
							<AgentReaction :kind="reactionOf(ex)" size="xs" />
							<span :class="$style.pickerText">{{ ex.input }}</span>
							<span :class="$style.optionState">{{ stateLabel(ex) }}</span>
						</button>
					</div>
				</div>
				<div v-if="addingExample" :class="$style.addRow">
					<N8nInput
						v-model="exampleDraft"
						size="small"
						autofocus
						:placeholder="i18n.baseText('agents.builder.agentChecks.addExample.placeholder')"
						data-testid="agent-check-add-example-input"
						@keydown.enter="saveExample"
						@keydown.esc.stop="addingExample = false"
					/>
				</div>
				<AgentCheckThread :example="example" verdict :class="$style.thread" />
			</div>

			<div :class="$style.actions">
				<template v-if="example.state === 'needs_work'">
					<N8nButton
						variant="solid"
						size="small"
						:disabled="disabled"
						data-testid="agent-check-fix"
						@click="emit('fix', check, example)"
					>
						{{ i18n.baseText('agents.builder.agentChecks.fix') }}
					</N8nButton>
					<N8nButton
						variant="ghost"
						size="small"
						:disabled="disabled"
						data-testid="agent-check-fine"
						@click="emit('fine', example)"
					>
						{{ i18n.baseText('agents.builder.agentChecks.fine') }}
					</N8nButton>
				</template>
				<N8nButton
					v-else
					variant="outline"
					size="small"
					:disabled="!canRun || running"
					:loading="running"
					data-testid="agent-check-run"
					@click="emit('run', check)"
				>
					{{ i18n.baseText('agents.builder.agentChecks.runCheck') }}
				</N8nButton>
				<span :class="$style.spacer" />
				<N8nButton
					variant="ghost"
					size="small"
					:disabled="disabled"
					data-testid="agent-check-add-example"
					@click="addingExample = true"
				>
					{{ i18n.baseText('agents.builder.agentChecks.addExample') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.row + .row {
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
}

.head {
	display: grid;
	grid-template-columns: 20px minmax(0, 1fr) 140px 84px 76px 14px;
	gap: var(--spacing--xs);
	align-items: center;
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 0;
	background: none;
	font: inherit;
	font-size: var(--font-size--sm);
	color: var(--text-color);
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: -2px;
	}
}

.title {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.name {
	overflow: hidden;
	font-weight: var(--font-weight--medium);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.status {
	font-size: var(--font-size--2xs);
}

.bad {
	color: var(--text-color--danger);
}

.good {
	color: var(--text-color--success);
}

.muted {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.kind {
	overflow: hidden;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chev {
	color: var(--text-color--subtler);
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0 var(--spacing--xs) var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.ruleLine {
	display: grid;
	grid-template-areas:
		'label button'
		'text button';
	grid-template-columns: minmax(0, 1fr) auto;
	column-gap: var(--spacing--xs);
	row-gap: var(--spacing--5xs);
	align-items: start;

	> button {
		grid-area: button;
		align-self: center;
	}
}

.ruleEditing {
	grid-template-areas:
		'label'
		'text';
	grid-template-columns: 1fr;
}

.ruleLabel {
	grid-area: label;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.rule {
	grid-area: text;
	min-width: 0;
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.ruleEdit {
	grid-area: text;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.example {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

// The practice surface sits on white inside the grey panel.
.thread {
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	background-color: var(--background--surface);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.spacer {
	flex: 1;
}

.pickerWrap {
	position: relative;
}

.picker {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	height: var(--height--md);
	padding: 0 var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);
	font: inherit;
	font-size: var(--font-size--sm);
	color: var(--text-color);
	cursor: pointer;
}

.pickerText {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	color: var(--text-color--subtle);
	text-align: left;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.menu {
	position: absolute;
	top: calc(100% + var(--spacing--4xs));
	right: 0;
	left: 0;
	z-index: 9;
	display: grid;
	padding: var(--spacing--4xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	box-shadow: var(--shadow--md);
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius--2xs);
	background: none;
	font: inherit;
	font-size: var(--font-size--sm);
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}
}

.optionOn {
	background: var(--background--hover);
}

.optionState {
	flex-shrink: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.addRow {
	display: flex;
}
</style>
