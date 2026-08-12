<script setup lang="ts">
import {
	N8nActionDropdown,
	N8nButton,
	N8nIconButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { ACTION_KINDS, createStep } from '../../core/actions';
import { pageLabel } from '../../core/pages';
import type { UiActionKind } from '../../core/actions';
import type {
	UiActionStep,
	UiNavigateStep,
	UiNotifyStep,
	UiPageInfo,
	UiSetStep,
	UiWebhookStep,
} from '../../core/types';

/**
 * One action prop, edited as the chain of steps it is.
 *
 * The same editor serves every action prop on every component, which is the
 * point: what a button does on click, what a table does on mount and what a
 * page does on enter are the same kind of thing, and used to be three copies of
 * a URL field.
 *
 * It owns the list and nothing else. Everything needing the workflow being
 * edited (making a trigger, running one, reaching into another workflow) comes
 * in as a callback, so this file knows nothing about n8n's stores.
 */
defineOptions({ name: 'UiActionEditor' });

const props = defineProps<{
	steps: UiActionStep[];
	/** Webhook triggers to offer, already labelled. */
	targets: Array<{ label: string; url: string }>;
	/** Pages a navigate step can go to. Empty in a single-page app. */
	pages: UiPageInfo[];
	disabled?: boolean;
	/** How a URL that is not among `targets` should read. */
	labelFor: (url: string) => string;
	/** Opens the cross-workflow picker. Resolves with a URL, or nothing if dismissed. */
	browse: () => Promise<string | undefined>;
	/** Adds a Webhook and Respond pair to this workflow. Resolves with the new URL. */
	create: () => Promise<string | undefined>;
	/** Both take the whole step: a preview that ignored its binding would not be one. */
	run: (step: UiWebhookStep) => void;
	history: (step: UiWebhookStep) => void;
}>();

const emit = defineEmits<{ update: [steps: UiActionStep[]] }>();

/** Not a URL: choosing it opens the picker rather than setting anything. */
const BROWSE = '__browse__';

function patch(index: number, changes: Record<string, unknown>) {
	emit(
		'update',
		props.steps.map((step, i) => (i === index ? ({ ...step, ...changes } as UiActionStep) : step)),
	);
}

/**
 * Changing a step's kind replaces it rather than keeping what fits. The fields
 * have nothing in common, and a half-carried-over step would look configured
 * when it is not.
 */
function setKind(index: number, kind: UiActionKind) {
	if (props.steps[index]?.kind === kind) return;

	const next = [...props.steps];
	next[index] = createStep(kind);
	emit('update', next);
}

function move(index: number, delta: number) {
	const target = index + delta;
	if (target < 0 || target >= props.steps.length) return;

	const next = [...props.steps];
	const [step] = next.splice(index, 1);
	next.splice(target, 0, step);
	emit('update', next);
}

function remove(index: number) {
	emit(
		'update',
		props.steps.filter((_, i) => i !== index),
	);
}

function append(kind: UiActionKind) {
	emit('update', [...props.steps, createStep(kind)]);
}

const addItems = ACTION_KINDS.map((kind) => ({
	id: kind.kind,
	label: kind.short,
	icon: kind.icon,
}));

/** The step's own trigger stays in the list even when it lives in another workflow. */
function optionsFor(url: string): Array<{ label: string; url: string }> {
	if (!url || props.targets.some((target) => target.url === url)) return props.targets;
	return [...props.targets, { label: props.labelFor(url), url }];
}

async function onPick(index: number, value: string | undefined) {
	if (value === BROWSE) {
		const url = await props.browse();
		if (url) patch(index, { url });
		return;
	}

	patch(index, { url: value ?? '' });
}

async function onCreate(index: number) {
	const url = await props.create();
	if (url) patch(index, { url });
}

/** Empty means "unset", which is what both defaults are; storing `''` would only read as configured. */
function patchPath(index: number, field: 'request' | 'response', value: string) {
	patch(index, { [field]: value || undefined });
}

/**
 * `response` also takes a map of several state paths, which is a document-level
 * thing rather than something worth a second control in here. The field shows
 * the simple form and steps aside for the other.
 */
function responsePath(step: UiWebhookStep): string {
	return typeof step.response === 'string' ? step.response : '';
}

function isMapped(step: UiWebhookStep): boolean {
	return step.response !== undefined && typeof step.response !== 'string';
}
</script>

<template>
	<div :class="$style.editor">
		<div v-for="(step, index) in steps" :key="index" :class="$style.step">
			<div :class="$style.stepHead">
				<span :class="$style.stepNumber">{{ index + 1 }}</span>

				<N8nSelect
					:class="$style.grow"
					:model-value="step.kind"
					:disabled="disabled"
					size="small"
					@update:model-value="setKind(index, $event)"
				>
					<N8nOption
						v-for="kind in ACTION_KINDS"
						:key="kind.kind"
						:label="kind.label"
						:value="kind.kind"
					/>
				</N8nSelect>

				<N8nIconButton
					variant="ghost"
					size="xsmall"
					icon="chevron-up"
					aria-label="Move this step earlier"
					:disabled="disabled || index === 0"
					@click="move(index, -1)"
				/>
				<N8nIconButton
					variant="ghost"
					size="xsmall"
					icon="chevron-down"
					aria-label="Move this step later"
					:disabled="disabled || index === steps.length - 1"
					@click="move(index, 1)"
				/>
				<N8nIconButton
					variant="ghost"
					size="xsmall"
					icon="trash-2"
					aria-label="Remove this step"
					:disabled="disabled"
					@click="remove(index)"
				/>
			</div>

			<!-- Webhook: the trigger this step posts the app's state to. -->
			<div v-if="step.kind === 'webhook'" :class="$style.row">
				<N8nSelect
					:class="$style.grow"
					:model-value="(step as UiWebhookStep).url"
					:disabled="disabled"
					size="small"
					filterable
					clearable
					placeholder="Pick a webhook trigger"
					@update:model-value="void onPick(index, $event)"
				>
					<N8nOption
						v-for="target in optionsFor((step as UiWebhookStep).url)"
						:key="target.url"
						:label="target.label"
						:value="target.url"
					/>
					<N8nOption :value="BROWSE" label="From another workflow…" :disabled="disabled" />
				</N8nSelect>

				<N8nTooltip content="Add a Webhook trigger and Respond node for this step">
					<N8nIconButton
						variant="ghost"
						size="small"
						icon="plus"
						aria-label="Add a webhook trigger"
						:disabled="disabled"
						@click="void onCreate(index)"
					/>
				</N8nTooltip>

				<N8nTooltip content="Run this step now and preview what it returns">
					<N8nIconButton
						variant="ghost"
						size="small"
						icon="play"
						aria-label="Run this step now"
						:disabled="disabled || !(step as UiWebhookStep).url"
						@click="run(step as UiWebhookStep)"
					/>
				</N8nTooltip>

				<N8nTooltip content="Preview what this step returned when it last ran">
					<N8nIconButton
						variant="ghost"
						size="small"
						icon="history"
						aria-label="Load the last execution"
						:disabled="disabled || !(step as UiWebhookStep).url"
						@click="history(step as UiWebhookStep)"
					/>
				</N8nTooltip>
			</div>

			<!--
				Both ends of the exchange, so the workflow needs to know nothing about
				this app: which part of state it is sent, and where its reply is put.
			-->
			<div v-if="step.kind === 'webhook'" :class="$style.row">
				<N8nTooltip content="State to send as the request body. Empty sends all of it.">
					<N8nInput
						:class="$style.grow"
						:model-value="(step as UiWebhookStep).request ?? ''"
						:disabled="disabled"
						size="small"
						placeholder="Sends: all state"
						@update:model-value="patchPath(index, 'request', $event)"
					/>
				</N8nTooltip>

				<N8nTooltip
					:content="
						isMapped(step as UiWebhookStep)
							? 'This step maps several state paths; edit it in the document'
							: 'Where to put the reply. Empty discards it.'
					"
				>
					<N8nInput
						:class="$style.grow"
						:model-value="responsePath(step as UiWebhookStep)"
						:disabled="disabled || isMapped(step as UiWebhookStep)"
						size="small"
						:placeholder="isMapped(step as UiWebhookStep) ? 'Mapped' : 'Writes to: nothing'"
						@update:model-value="patchPath(index, 'response', $event)"
					/>
				</N8nTooltip>
			</div>

			<!--
				Notify: the client's own message. The envelope's `toast` is the
				workflow saying something; this is the app saying it, and it can read
				state the workflow never sees.
			-->
			<div v-else-if="step.kind === 'notify'" :class="$style.row">
				<N8nInput
					:class="$style.grow"
					:model-value="(step as UiNotifyStep).message"
					:disabled="disabled"
					size="small"
					placeholder="Saved"
					@update:model-value="patch(index, { message: $event })"
				/>

				<N8nSelect
					:class="$style.narrow"
					:model-value="(step as UiNotifyStep).type ?? 'success'"
					:disabled="disabled"
					size="small"
					@update:model-value="patch(index, { type: $event })"
				>
					<N8nOption label="Success" value="success" />
					<N8nOption label="Info" value="info" />
					<N8nOption label="Error" value="error" />
				</N8nSelect>
			</div>

			<!-- Set: the app writing its own state, with no workflow involved. -->
			<div v-else-if="step.kind === 'set'" :class="$style.row">
				<N8nInput
					:class="$style.grow"
					:model-value="(step as UiSetStep).path"
					:disabled="disabled"
					size="small"
					placeholder="form.name"
					@update:model-value="patch(index, { path: $event })"
				/>

				<N8nInput
					:class="$style.grow"
					:model-value="String((step as UiSetStep).value ?? '')"
					:disabled="disabled"
					size="small"
					placeholder="Value or expression"
					@update:model-value="patch(index, { value: $event })"
				/>
			</div>

			<!-- Navigate: a page of this app, or an expression producing a path. -->
			<div v-else :class="$style.row">
				<N8nSelect
					:class="$style.grow"
					:model-value="(step as UiNavigateStep).to"
					:disabled="disabled"
					size="small"
					filterable
					allow-create
					default-first-option
					:placeholder="pages.length ? 'Pick a page' : 'This app has no pages yet'"
					@update:model-value="patch(index, { to: $event })"
				>
					<N8nOption
						v-for="page in pages"
						:key="page.id"
						:label="pageLabel(page)"
						:value="page.path"
					/>
				</N8nSelect>
			</div>
		</div>

		<N8nText v-if="steps.length === 0" size="small" color="text-light">
			Nothing happens yet.
		</N8nText>

		<N8nActionDropdown
			:items="addItems"
			placement="bottom-start"
			:disabled="disabled"
			@select="append"
		>
			<template #activator>
				<N8nButton variant="ghost" size="mini" icon="plus" :disabled="disabled">
					Add step
				</N8nButton>
			</template>
		</N8nActionDropdown>
	</div>
</template>

<style lang="scss" module>
.editor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

// Steps are boxed and numbered because their order is what they mean: a notify
// before its webhook says something that has not happened yet.
.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.stepHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.stepNumber {
	flex-shrink: 0;
	min-width: 14px;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	font-variant-numeric: tabular-nums;
	text-align: center;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.grow {
	flex: 1;
	min-width: 0;
}

.narrow {
	width: 96px;
	flex-shrink: 0;
}
</style>
