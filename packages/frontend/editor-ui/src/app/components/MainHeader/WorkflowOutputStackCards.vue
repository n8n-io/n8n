<script setup lang="ts">
import { N8nDropdownMenu, N8nIcon } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';

import NodeIcon from '@/app/components/NodeIcon.vue';
import {
	OUTPUT_DESTINATIONS,
	type OutputDestination,
	type useWorkflowOutputStack,
	type WorkflowOutput,
} from '@/app/composables/useWorkflowOutputStack';
import { VIEWS } from '@/app/constants';
import { markLiterals, wordDiff } from '@/app/utils/wireframeWordDiff';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

// Wireframe: the cards of the stack. Used inside the header popover and as the
// run detail's own strip in the Executions tab.
const props = defineProps<{
	stack: ReturnType<typeof useWorkflowOutputStack>;
	/** The Executions tab already shows the run; no link back to it. */
	hideRunLink?: boolean;
}>();

const emit = defineEmits<{ navigate: [] }>();

const i18n = useI18n();
const router = useRouter();
const stack = props.stack;

const expanded = ref<string | null>(null);
const showHidden = ref(false);
const noting = ref<string | null>(null);
const note = ref('');
const lastRuleAt = ref<string | null>(null);
// Skipped this session: the card folds to a line until the next run.
const skipped = ref<Set<string>>(new Set());
// Diff baseline per node: 'approved' = last Looks right, or a specific run id; null = plain.
const baselineChoice = ref<Record<string, string | null>>({});

function stateOf(output: WorkflowOutput): 'idle' | 'needsEye' | 'ok' | 'flagged' {
	if (output.verdict?.vote === 'down') return 'flagged';
	if (output.verdict?.vote === 'up') return 'ok';
	if (stack.execution.value && output.sample !== null) return 'needsEye';
	return 'idle';
}

// "Sample ▾": where this output goes while you're testing. Stub — nothing is sent.
function destinationItems(output: WorkflowOutput): Array<DropdownMenuItemProps<OutputDestination>> {
	return OUTPUT_DESTINATIONS.map((id) => ({
		id,
		label: i18n.baseText(`workflows.stack.destination.${id}`),
		checked: output.destination === id,
	}));
}

// Hovering a card traces the output back: the sending node stays fully lit, the
// nodes that fed it dim a little, everything else dims a lot. Small bubbles above
// the feeding nodes show the exact bits they supplied.
let bubbleLayer: HTMLElement | null = null;
function clearHighlight() {
	for (const el of document.querySelectorAll<HTMLElement>('.vue-flow__node')) el.style.opacity = '';
	bubbleLayer?.remove();
	bubbleLayer = null;
}
function highlight(output: WorkflowOutput | null) {
	canvasEventBus.emit('nodes:select', { ids: output ? [output.nodeId] : [], panIntoView: false });
	clearHighlight();
	if (!output) return;
	const trace = stack.traceFor(output.nodeName);
	const feeding = new Map(trace.map((t) => [t.nodeId, t]));
	for (const el of document.querySelectorAll<HTMLElement>('.vue-flow__node')) {
		const id = el.dataset.id ?? '';
		el.style.opacity = id === output.nodeId ? '1' : feeding.has(id) ? '0.8' : '0.2';
	}
	const layer = document.createElement('div');
	layer.className = 'wireframe-trace-layer';
	const addBubble = (nodeId: string, texts: string[], className: string, lift = 8) => {
		const nodeEl = document.querySelector<HTMLElement>(`.vue-flow__node[data-id="${nodeId}"]`);
		if (!nodeEl || texts.length === 0) return;
		const rect = nodeEl.getBoundingClientRect();
		const bubble = document.createElement('div');
		bubble.className = `wireframe-trace-bubble ${className}`;
		bubble.style.left = `${rect.left + rect.width / 2}px`;
		bubble.style.top = `${rect.top - lift}px`;
		for (const text of texts) {
			const chip = document.createElement('span');
			chip.textContent = text;
			bubble.append(chip);
		}
		layer.append(bubble);
	};
	const clip = (text: string, max: number) =>
		text.length > max ? `${text.slice(0, max - 1)}…` : text;
	for (const [id, t] of feeding)
		addBubble(
			id,
			t.bits.slice(0, 3).map((b) => clip(b, 28)),
			'is-source',
		);
	// The output itself, so the whole story reads left to right on the canvas.
	// Sits one row above the source bits so neighbouring bubbles don't collide.
	if (output.sample)
		addBubble(output.nodeId, [clip(output.sample.replace(/\s+/g, ' '), 60)], 'is-output', 44);
	document.body.append(layer);
	bubbleLayer = layer;
}
onBeforeUnmount(clearHighlight);

function toggle(nodeName: string) {
	expanded.value = expanded.value === nodeName ? null : nodeName;
	noting.value = null;
	note.value = '';
}

function startReview() {
	expanded.value = stack.needsEye.value[0]?.nodeName ?? null;
}

function advanceFrom(nodeName: string) {
	const rest = stack.needsEye.value.filter(
		(o) => o.nodeName !== nodeName && !skipped.value.has(o.nodeName),
	);
	expanded.value = rest[0]?.nodeName ?? null;
	noting.value = null;
	note.value = '';
}

function skip(nodeName: string) {
	skipped.value = new Set([...skipped.value, nodeName]);
	advanceFrom(nodeName);
}

function unskip(nodeName: string) {
	const next = new Set(skipped.value);
	next.delete(nodeName);
	skipped.value = next;
}

function neverPreview(nodeName: string) {
	unskip(nodeName);
	stack.setHidden(nodeName, true);
}

// Made-up values (typed into the workflow) read purple; real data stays plain.
function sampleRuns(text: string) {
	// A literal that *is* the whole message would paint everything; mark the values inside it instead.
	return markLiterals(
		text,
		stack.literals.value.filter((l) => l !== text.trim()),
	);
}

function baselines(output: WorkflowOutput) {
	return stack.baselinesFor(output.nodeName);
}

function activeBaseline(output: WorkflowOutput) {
	const list = baselines(output);
	if (list.length === 0) return null;
	const choice = baselineChoice.value[output.nodeName];
	if (choice === null) return null;
	if (choice === undefined || choice === 'approved') return list[0];
	return list.find((b) => b.executionId === choice) ?? list[0];
}

function diffParts(output: WorkflowOutput) {
	const base = activeBaseline(output);
	if (!base || output.sample === null || base.sample === output.sample) return null;
	return wordDiff(base.sample, output.sample);
}

function baselineItems(output: WorkflowOutput): Array<DropdownMenuItemProps<string>> {
	const choice = baselineChoice.value[output.nodeName] ?? 'approved';
	return [
		{
			id: 'approved',
			label: i18n.baseText('workflows.stack.diff.approved'),
			checked: choice === 'approved',
		},
		...baselines(output).map((b) => ({
			id: b.executionId,
			label: i18n.baseText('workflows.stack.diff.run', {
				interpolate: { id: b.executionId, when: new Date(b.at).toLocaleString() },
			}),
			checked: choice === b.executionId,
		})),
		{
			id: '__plain',
			label: i18n.baseText('workflows.stack.diff.plain'),
			checked: choice === null,
			divided: true,
		},
	];
}

function chooseBaseline(output: WorkflowOutput, id: string) {
	baselineChoice.value = {
		...baselineChoice.value,
		[output.nodeName]: id === '__plain' ? null : id,
	};
}

function looksRight(output: WorkflowOutput) {
	stack.setVerdict(output.nodeName, 'up');
	advanceFrom(output.nodeName);
}

function notRight(output: WorkflowOutput) {
	stack.setVerdict(output.nodeName, 'down', note.value);
	lastRuleAt.value = note.value.trim() ? new Date().toISOString() : null;
	advanceFrom(output.nodeName);
}

function undoRule() {
	stack.undoLastRule();
	lastRuleAt.value = null;
}

function seeWholeRun() {
	const id = stack.executionId.value;
	if (!id) return;
	emit('navigate');
	void router.push({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { workflowId: stack.workflowId.value, executionId: id },
	});
}

const lastRule = computed(() => stack.rules.value[stack.rules.value.length - 1] ?? null);

defineExpose({ startReview });
</script>

<template>
	<div :class="$style.wrap">
		<div
			v-if="lastRuleAt && lastRule"
			:class="$style.ruleBanner"
			data-testid="workflow-stack-rule-banner"
		>
			<N8nIcon icon="flask-conical" :size="14" />
			<span :class="$style.ruleText">
				{{ i18n.baseText('agents.builder.review.ruleAdded') }} <q>{{ lastRule.text }}</q>
			</span>
			<button type="button" :class="$style.textButton" @click="undoRule">
				{{ i18n.baseText('agents.builder.review.undo') }}
			</button>
		</div>

		<ul :class="$style.cards">
			<li
				v-for="output in showHidden ? stack.all.value : stack.visible.value"
				:key="output.nodeName"
				:class="[
					$style.card,
					{ [$style.expanded]: expanded === output.nodeName, [$style.dimmed]: output.hidden },
				]"
				data-testid="workflow-stack-card"
				:data-node="output.nodeName"
				:data-state="stateOf(output)"
				@mouseenter="highlight(output)"
				@mouseleave="highlight(null)"
			>
				<div
					v-if="skipped.has(output.nodeName)"
					:class="$style.skippedRow"
					data-testid="workflow-stack-skipped"
				>
					<span>{{ i18n.baseText('workflows.stack.skipped') }}</span>
					<span :class="$style.grow" />
					<button
						type="button"
						:class="$style.textButton"
						data-testid="workflow-stack-never"
						@click="neverPreview(output.nodeName)"
					>
						{{ i18n.baseText('workflows.stack.neverPreview') }}
					</button>
					<button type="button" :class="$style.textButton" @click="unskip(output.nodeName)">
						{{ i18n.baseText('agents.builder.review.undo') }}
					</button>
				</div>
				<template v-else>
					<div :class="$style.cardHead">
						<button type="button" :class="$style.cardToggle" @click="toggle(output.nodeName)">
							<span :class="[$style.dot, $style[`dot_${stateOf(output)}`]]" />
							<NodeIcon :node-type="output.nodeType" :size="16" />
							<span :class="$style.nodeName">{{ output.nodeName }}</span>
							<span v-if="output.from" :class="$style.meta">{{ output.from }}</span>
						</button>
						<span :class="$style.grow" />
						<button
							type="button"
							:class="[$style.pin, { [$style.pinActive]: output.pinned }]"
							:aria-label="
								i18n.baseText(output.pinned ? 'workflows.stack.unpin' : 'workflows.stack.pin')
							"
							:title="
								i18n.baseText(output.pinned ? 'workflows.stack.unpin' : 'workflows.stack.pin')
							"
							data-testid="workflow-stack-pin"
							@click="stack.togglePinned(output.nodeName)"
						>
							<N8nIcon icon="pin" :size="12" />
						</button>
						<span :class="[$style.state, $style[`state_${stateOf(output)}`]]">
							{{
								i18n.baseText(
									stateOf(output) === 'needsEye'
										? 'workflows.stack.state.unreviewed'
										: `agents.builder.checks.state.${stateOf(output)}`,
								)
							}}
						</span>
					</div>

					<div v-if="expanded === output.nodeName" :class="$style.cardBody">
						<div :class="$style.sampleWrap">
							<div
								v-if="output.sample !== null"
								:class="$style.sample"
								data-testid="workflow-stack-sample"
							>
								<template v-if="diffParts(output)">
									<span
										v-for="(part, i) in diffParts(output)"
										:key="i"
										:class="{
											[$style.added]: part.kind === 'added',
											[$style.removed]: part.kind === 'removed',
										}"
										>{{ part.text }}</span
									>
								</template>
								<template v-else>
									<span
										v-for="(run, i) in sampleRuns(output.sample)"
										:key="i"
										:class="{ [$style.madeUp]: run.madeUp }"
										>{{ run.text }}</span
									>
								</template>
							</div>
							<div v-else :class="$style.noSample">
								{{ i18n.baseText('workflows.stack.noSample') }}
							</div>
							<div :class="$style.overlays">
								<N8nDropdownMenu
									v-if="baselines(output).length > 0"
									:items="baselineItems(output)"
									placement="bottom-end"
									width="18rem"
									@select="chooseBaseline(output, $event)"
								>
									<template #trigger>
										<button
											type="button"
											:class="$style.overlayButton"
											data-testid="workflow-stack-baseline"
										>
											{{
												activeBaseline(output)
													? i18n.baseText('workflows.stack.diff.vs', {
															interpolate: {
																what:
																	(baselineChoice[output.nodeName] ?? 'approved') === 'approved'
																		? i18n.baseText('workflows.stack.diff.approved')
																		: i18n.baseText('workflows.stack.diff.runShort', {
																				interpolate: {
																					id: activeBaseline(output)?.executionId ?? '',
																				},
																			}),
															},
														})
													: i18n.baseText('workflows.stack.diff.plain')
											}}
											<N8nIcon icon="chevron-down" :size="11" />
										</button>
									</template>
								</N8nDropdownMenu>
								<N8nDropdownMenu
									:items="destinationItems(output)"
									placement="bottom-end"
									width="14rem"
									@select="stack.setDestination(output.nodeName, $event)"
								>
									<template #trigger>
										<button
											type="button"
											:class="$style.overlayButton"
											data-testid="workflow-stack-destination"
										>
											{{ i18n.baseText(`workflows.stack.destination.${output.destination}`) }}
											<N8nIcon icon="chevron-down" :size="11" />
										</button>
									</template>
								</N8nDropdownMenu>
							</div>
						</div>

						<div v-if="noting !== output.nodeName" :class="$style.actions">
							<button
								v-if="stack.executionId.value && !hideRunLink"
								type="button"
								:class="$style.button"
								data-testid="workflow-stack-trace"
								@click="seeWholeRun"
							>
								{{ i18n.baseText('workflows.stack.trace') }}
							</button>
							<span :class="$style.grow" />
							<button
								type="button"
								:class="$style.textButton"
								data-testid="workflow-stack-skip"
								@click="skip(output.nodeName)"
							>
								{{ i18n.baseText('agents.builder.review.skip') }}
							</button>
							<button
								type="button"
								:class="$style.button"
								data-testid="workflow-stack-right"
								@click="looksRight(output)"
							>
								{{ i18n.baseText('agents.builder.checks.state.ok') }}
							</button>
							<button
								type="button"
								:class="$style.button"
								data-testid="workflow-stack-wrong"
								@click="noting = output.nodeName"
							>
								{{ i18n.baseText('agents.builder.checks.state.flagged') }}
							</button>
						</div>
						<div v-else :class="$style.noteBlock">
							<textarea
								v-model="note"
								:class="$style.textarea"
								rows="2"
								:placeholder="i18n.baseText('workflows.stack.notePlaceholder')"
							/>
							<div :class="$style.actions">
								<span :class="$style.grow" />
								<button type="button" :class="$style.textButton" @click="noting = null">
									{{ i18n.baseText('agents.builder.checks.invite.cancel') }}
								</button>
								<button
									type="button"
									:class="[$style.button, $style.primary]"
									data-testid="workflow-stack-save"
									@click="notRight(output)"
								>
									{{ i18n.baseText('agents.builder.review.save') }}
								</button>
							</div>
						</div>
					</div>
				</template>
			</li>
			<li
				v-if="stack.visible.value.length === 0 && stack.hidden.value.length === 0"
				:class="$style.empty"
			>
				{{ i18n.baseText('workflows.stack.empty') }}
			</li>
		</ul>

		<button
			v-if="stack.hidden.value.length > 0"
			type="button"
			:class="$style.hiddenRow"
			data-testid="workflow-stack-hidden"
			@click="showHidden = !showHidden"
		>
			{{
				i18n.baseText(showHidden ? 'workflows.stack.hideHidden' : 'workflows.stack.moreHidden', {
					interpolate: { count: String(stack.hidden.value.length) },
				})
			}}
		</button>
	</div>
</template>

<style lang="scss" module>
.wrap {
	display: flex;
	flex-direction: column;
	font-family: var(--wireframe--font-family);
	letter-spacing: var(--wireframe--letter-spacing);
	font-size: var(--font-size--sm);
	color: var(--text-color);
}

.grow {
	flex: 1;
}

.ruleBanner {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin: var(--spacing--2xs) var(--spacing--xs) 0;
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--wireframe--border-width) dashed var(--color--warning);
	border-radius: var(--wireframe--radius);
	color: var(--color--warning);
}

.ruleText {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color);
}

.cards {
	list-style: none;
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.card {
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
}

.pin {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.4rem;
	height: 1.4rem;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--text-color--subtler);
	opacity: 0.5;
	cursor: pointer;

	&:hover {
		opacity: 1;
		color: var(--wireframe--ink);
	}
}

.pinActive {
	opacity: 1;
	color: var(--wireframe--ink);
	background: var(--wireframe--hover-fill);
}

.sampleWrap {
	position: relative;
}

.overlays {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	display: flex;
	gap: var(--spacing--4xs);
}

.overlayButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--3xs);
	height: 1.4rem;
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--text-color--subtler);
	font: inherit;
	font-size: var(--font-size--2xs);
	letter-spacing: inherit;
	white-space: nowrap;
	cursor: pointer;

	&:hover {
		color: var(--wireframe--ink);
		border-color: var(--wireframe--ink);
	}
}

.skippedRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.madeUp {
	color: var(--color--secondary, #7d4cdb);
}

.added {
	background: color-mix(in srgb, var(--color--success) 22%, transparent);
}

.removed {
	color: var(--text-color--subtler);
	text-decoration: line-through;
	background: color-mix(in srgb, var(--color--danger) 14%, transparent);
}

.dimmed {
	opacity: 0.55;
	border-style: dashed;
}

.cardHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs) var(--spacing--3xs) var(--spacing--2xs);
}

.cardToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: 0;
	border-radius: var(--wireframe--radius);
	background: transparent;
	font: inherit;
	letter-spacing: inherit;
	color: inherit;
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--wireframe--hover-fill);
	}
}

.nodeName {
	min-width: 0;
	font-weight: var(--wireframe--font-weight);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.meta {
	min-width: 0;
	color: var(--text-color--subtler);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.state {
	white-space: nowrap;
	color: var(--text-color--subtler);
}
.state_ok {
	color: var(--color--success);
}
.state_needsEye {
	color: var(--text-color--subtler);
}
.state_flagged {
	color: var(--color--danger);
}

.dot_needsEye {
	background: transparent;
	border-color: var(--border-color--strong);
}
.dot_ok {
	background: var(--color--success);
	border-color: var(--color--success);
}
.dot_flagged {
	background: var(--color--danger);
	border-color: var(--color--danger);
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}

.sample {
	font-weight: var(--wireframe--body-weight);
	padding: var(--spacing--2xs) var(--spacing--sm);
	padding-right: 12rem;
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--wireframe--hover-fill);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	max-height: 12rem;
	overflow: auto;
}

.noSample {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	border-radius: var(--wireframe--radius);
	color: var(--text-color--subtler);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
}

.button,
.textButton,
.cadence {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--wireframe--ink);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	letter-spacing: inherit;
	white-space: nowrap;
	cursor: pointer;

	&:hover {
		background: var(--wireframe--hover-fill);
	}

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
}

.cadence {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.textButton {
	border-color: transparent;
	color: var(--text-color--subtler);
}

.primary {
	background: var(--wireframe--ink);
	color: var(--background--surface);

	&:hover {
		background: var(--wireframe--ink);
	}
}

.noteBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.textarea {
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	letter-spacing: inherit;
	resize: vertical;
}

.hiddenRow {
	margin: 0 var(--spacing--xs) var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	border-radius: var(--wireframe--radius);
	background: transparent;
	color: var(--text-color--subtler);
	font: inherit;
	letter-spacing: inherit;
	cursor: pointer;
}

.empty {
	padding: var(--spacing--sm) var(--spacing--xs);
	color: var(--text-color--subtler);
}
</style>
