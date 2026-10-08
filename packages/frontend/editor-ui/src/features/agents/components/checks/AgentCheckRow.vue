<script setup lang="ts">
/**
 * One check in the Checks list, styled like the Sessions list: an agent head
 * (waiting while it runs), the short name with a coloured status line, the kind
 * as a plain column, the example count when there are two or more, and the last
 * run. Open, the row reads top to bottom in labelled sections: the rule, the
 * conversation (paged with two or more examples, the verdict under the reply)
 * and, when it needs work, the suggested fix; then one decision and a menu.
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
	/** The toolbar's Apply all is the primary action, so this row's Apply is outline. */
	secondaryApply?: boolean;
}>();

const emit = defineEmits<{
	toggle: [];
	run: [check: AgentCheck];
	fix: [check: AgentCheck, example: AgentCheckExample];
	fine: [example: AgentCheckExample];
	editRule: [check: AgentCheck, rule: string, recheck: boolean];
	addExample: [check: AgentCheck, input: string];
	remove: [check: AgentCheck];
}>();

const i18n = useI18n();
const editingRule = ref(false);
const ruleDraft = ref('');
const addingExample = ref(false);
const exampleDraft = ref('');

// "Not right" on a passing reply opens the check to say what should have happened;
// saving it then checks the example again against the new words.
const recheckAfterSave = ref(false);
const startRuleEdit = (recheck = false) => {
	ruleDraft.value = props.check.rule;
	recheckAfterSave.value = recheck;
	editingRule.value = true;
};
const saveRule = () => {
	const next = ruleDraft.value.trim();
	if (next && next !== props.check.rule)
		emit('editRule', props.check, next, recheckAfterSave.value);
	editingRule.value = false;
	recheckAfterSave.value = false;
};
const saveExample = () => {
	const next = exampleDraft.value.trim();
	if (!next) return;
	emit('addExample', props.check, next);
	exampleDraft.value = '';
	addingExample.value = false;
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

const pick = (index: number) => {
	selected.value = Math.max(0, Math.min(index, props.check.examples.length - 1));
};
</script>

<template>
	<div
		:class="[$style.row, { [$style.open]: open }]"
		:data-open="open || undefined"
		data-testid="agent-check-row"
	>
		<button
			type="button"
			:class="$style.head"
			:aria-expanded="open"
			data-testid="agent-check-row-toggle"
			@click="emit('toggle')"
		>
			<AgentReaction :kind="head" size="md" />
			<span :class="$style.title">
				<b :class="$style.name">{{ check.name }}</b>
				<small :class="[$style.status, $style[status.tone]]" data-testid="agent-check-status">{{
					status.text
				}}</small>
			</span>
			<span :class="$style.kind">{{ kind }}</span>
			<span :class="[$style.muted, $style.count]">{{
				check.examples.length > 1
					? i18n.baseText('agents.builder.agentChecks.row.examples', {
							interpolate: { count: String(check.examples.length) },
						})
					: ''
			}}</span>
			<span :class="[$style.muted, $style.when]">{{ lastRun }}</span>
			<N8nIcon :icon="open ? 'chevron-up' : 'chevron-down'" size="small" :class="$style.chev" />
		</button>

		<!-- Open: labelled sections in reading order (rule, conversation, fix), then the actions. -->
		<div v-if="open && example" :class="$style.body" data-testid="agent-check-row-body">
			<section :class="$style.section">
				<div :class="$style.sectionHead">
					<span :class="$style.label">{{ i18n.baseText('agents.builder.agentChecks.rule') }}</span>
					<N8nIconButton
						v-if="!editingRule"
						icon="pencil"
						variant="ghost"
						size="small"
						:disabled="disabled"
						:aria-label="i18n.baseText('agents.builder.agentChecks.editRule')"
						:title="i18n.baseText('agents.builder.agentChecks.editRule')"
						:class="[$style.inline, $style.end]"
						data-testid="agent-check-edit-rule"
						@click="startRuleEdit()"
					/>
					<N8nIconButton
						v-if="!editingRule"
						icon="trash-2"
						variant="ghost"
						size="small"
						:disabled="disabled"
						:aria-label="i18n.baseText('agents.builder.agentChecks.delete.button')"
						:title="i18n.baseText('agents.builder.agentChecks.delete.button')"
						:class="$style.inline"
						data-testid="agent-check-delete"
						@click="emit('remove', check)"
					/>
				</div>
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
							{{
								recheckAfterSave
									? i18n.baseText('agents.builder.agentChecks.onboarding.saveRecheck')
									: i18n.baseText('agents.builder.agentChecks.saveRule')
							}}
						</N8nButton>
						<N8nButton variant="ghost" size="small" @click="editingRule = false">
							{{ i18n.baseText('agents.builder.agentChecks.cancel') }}
						</N8nButton>
					</div>
				</div>
				<p v-else :class="$style.text">{{ check.rule }}</p>
			</section>

			<section :class="$style.section">
				<div :class="$style.sectionHead">
					<span :class="$style.label">{{
						i18n.baseText('agents.builder.agentChecks.conversation')
					}}</span>
					<span :class="[$style.pager, $style.end]">
						<template v-if="check.examples.length > 1">
							<N8nIconButton
								icon="chevron-left"
								variant="ghost"
								size="small"
								:disabled="selected === 0"
								:aria-label="i18n.baseText('agents.builder.agentChecks.examples.previous')"
								data-testid="agent-check-example-prev"
								@click="pick(selected - 1)"
							/>
							<span :class="$style.pagerText">{{
								i18n.baseText('agents.builder.agentChecks.examples.position', {
									interpolate: {
										index: String(selected + 1),
										total: String(check.examples.length),
									},
								})
							}}</span>
							<N8nIconButton
								icon="chevron-right"
								variant="ghost"
								size="small"
								:disabled="selected >= check.examples.length - 1"
								:aria-label="i18n.baseText('agents.builder.agentChecks.examples.next')"
								data-testid="agent-check-example-next"
								@click="pick(selected + 1)"
							/>
						</template>
						<N8nIconButton
							icon="plus"
							variant="ghost"
							size="small"
							:disabled="disabled"
							:aria-label="i18n.baseText('agents.builder.agentChecks.addExample')"
							:title="i18n.baseText('agents.builder.agentChecks.addExample')"
							:class="$style.inline"
							data-testid="agent-check-add-example"
							@click="addingExample = true"
						/>
					</span>
				</div>
				<AgentCheckThread
					:example="example"
					verdict
					:flaggable="!disabled"
					@flag="startRuleEdit(true)"
				/>
			</section>

			<!-- The change and the decision about it, together in one box. -->
			<section v-if="example.state === 'needs_work'" :class="$style.proposal">
				<span :class="$style.label">{{
					i18n.baseText('agents.builder.agentChecks.onboarding.suggestedFix')
				}}</span>
				<p :class="$style.text">
					{{
						example.suggestedFix || i18n.baseText('agents.builder.agentChecks.onboarding.noFixText')
					}}
				</p>
				<div :class="$style.actions">
					<N8nButton
						:variant="secondaryApply ? 'outline' : 'solid'"
						size="small"
						:disabled="disabled"
						data-testid="agent-check-fix"
						@click="emit('fix', check, example)"
					>
						{{ i18n.baseText('agents.builder.agentChecks.onboarding.applyFix') }}
					</N8nButton>
					<N8nButton
						variant="ghost"
						size="small"
						:disabled="disabled"
						data-testid="agent-check-fine"
						@click="emit('fine', example)"
					>
						{{ i18n.baseText('agents.builder.agentChecks.onboarding.thatsFine') }}
					</N8nButton>
				</div>
			</section>

			<div v-if="addingExample" :class="$style.section">
				<span :class="$style.label">{{
					i18n.baseText('agents.builder.agentChecks.addExample')
				}}</span>
				<N8nInput
					v-model="exampleDraft"
					autofocus
					:placeholder="i18n.baseText('agents.builder.agentChecks.addExample.placeholder')"
					data-testid="agent-check-add-example-input"
					@keydown.enter="saveExample"
					@keydown.esc.stop="addingExample = false"
				/>
			</div>

			<div v-if="example.state !== 'needs_work'" :class="$style.actions">
				<N8nButton
					variant="outline"
					size="small"
					:disabled="!canRun || running"
					:loading="running"
					data-testid="agent-check-run"
					@click="emit('run', check)"
				>
					{{ i18n.baseText('agents.builder.agentChecks.runCheck') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.row + .row {
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
}

// Only the open row sits on white, so it lifts off the list without a tint.
.open {
	background: var(--background--surface);
}

.head {
	display: grid;
	grid-template-columns: 30px minmax(0, 1fr) 140px 84px 76px 14px;
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

// The Checks tab is a container: beside a docked preview or the builder thread it can
// get narrow, so the row drops its side columns, least useful first.
@container checks (max-width: 640px) {
	.head {
		grid-template-columns: 30px minmax(0, 1fr) auto 14px;
	}

	.kind,
	.count {
		display: none;
	}
}

@container checks (max-width: 460px) {
	.head {
		grid-template-columns: 30px minmax(0, 1fr) 14px;
		padding: var(--spacing--xs);
	}

	.when {
		display: none;
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
	// The link token is the purple that stays readable in dark mode.
	color: var(--link--color--secondary);
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

// The open row continues the row itself: no inner box, just labelled sections, held
// together by a rail that drops from the head.
.body {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--2xs) var(--spacing--sm) var(--spacing--sm)
		calc(30px + var(--spacing--sm) + var(--spacing--xs));
}

.body::before {
	content: '';
	position: absolute;
	top: 0;
	bottom: var(--spacing--sm);
	// Under the centre of the 30px head in the row above.
	inset-inline-start: calc(var(--spacing--sm) + 15px);
	border-inline-start: var(--border-width) var(--border-style) var(--border-color);
}

// A label sits right on its content; the space goes between sections instead.
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.sectionHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

// Controls on a label line don't make it taller.
.inline {
	margin-block: calc(-1 * var(--spacing--4xs));
}

.label {
	color: var(--text-color);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
}

.text {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	overflow-wrap: anywhere;
}

.proposal {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius--lg);
	background: var(--background--subtle);

	.actions {
		margin-top: var(--spacing--2xs);
	}
}

.end {
	margin-inline-start: auto;
}

.pager {
	display: inline-flex;
	margin-inline-start: auto;
	margin-block: calc(-1 * var(--spacing--4xs));
	align-items: center;
	gap: var(--spacing--4xs);
}

.pagerText {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;
}

.ruleEdit {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

// Narrow: the open row drops the indent under the head so its sections keep their width.
@container checks (max-width: 460px) {
	.body {
		padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs)
			calc(var(--spacing--xs) + 30px + var(--spacing--xs));
	}

	.body::before {
		inset-inline-start: calc(var(--spacing--xs) + 15px);
	}
}
</style>
