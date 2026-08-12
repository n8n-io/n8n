<script setup lang="ts">
import {
	N8nActionDropdown,
	N8nButton,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';

import UiValueField from './UiValueField.vue';
import { ACTION_KINDS, createStep, replyKeyFor } from '../../core/actions';
import type { UiActionKind } from '../../core/actions';
import { pageLabel } from '../../core/pages';
import {
	ROUTE_PROP_TYPE,
	type UiActionStep,
	type UiHttpMethod,
	type UiNavigateStep,
	type UiNotifyStep,
	type UiPageInfo,
	type UiProperty,
	type UiScope,
	type UiSetStep,
	type UiWebhookStep,
} from '../../core/types';
import { targetKey } from '../composables/useWebhookTargets';
import type { WebhookTarget } from '../composables/useWebhookTargets';

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
	/**
	 * What the selected node renders with, so a step's expressions preview and
	 * complete against the same values the canvas shows.
	 */
	scope: UiScope;
	/** What each call has answered in the canvas so far, by its reply key. */
	responses: Record<string, unknown>;
	/** Endpoints to offer, already labelled — one per method a path serves. */
	targets: WebhookTarget[];
	/** Pages a navigate step can go to. Empty in a single-page app. */
	pages: UiPageInfo[];
	disabled?: boolean;
	/** How an endpoint that is not among `targets` should read. */
	labelFor: (url: string, method?: UiHttpMethod) => string;
	/** Opens the cross-workflow picker. Resolves with an endpoint, or nothing if dismissed. */
	browse: () => Promise<WebhookTarget | undefined>;
	/** Adds a Webhook and Respond pair to this workflow. Resolves with the new endpoint. */
	create: () => Promise<WebhookTarget | undefined>;
	/**
	 * Both take the steps that follow as well as the step itself: what a reply is
	 * worth is decided by the `set` steps after it, and a preview that skipped
	 * them would put nothing on the canvas.
	 */
	run: (step: UiWebhookStep, following: UiActionStep[]) => void;
	history: (step: UiWebhookStep, following: UiActionStep[]) => void;
	/** What the last run/history click returned, if anything. Not tied to a particular step. */
	previewStatus?: string;
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

/**
 * The dropdown's value is method-and-URL rather than the URL alone: one path of
 * an API Router is several endpoints, and `GET /orders` and `POST /orders` are
 * not interchangeable.
 */
function keyOf(step: UiWebhookStep): string {
	return step.url ? targetKey(step.url, step.method) : '';
}

/** The step's own endpoint stays in the list even when it lives in another workflow. */
function optionsFor(step: UiWebhookStep): WebhookTarget[] {
	const key = keyOf(step);
	if (!key || props.targets.some((target) => targetKey(target.url, target.method) === key)) {
		return props.targets;
	}

	return [
		...props.targets,
		{
			label: props.labelFor(step.url, step.method),
			url: step.url,
			method: step.method ?? 'POST',
		},
	];
}

function point(index: number, target: WebhookTarget | undefined) {
	if (!target) return;

	// A reply nothing can name is a reply nothing can use, so a step gets a key
	// the moment it has something to call — named after what it calls.
	const step = props.steps[index];
	const key =
		step?.kind === 'webhook' && step.key ? step.key : replyKeyFor(target.url, replyKeys(index));

	patch(index, { url: target.url, method: target.method, key });
}

/** The keys the other calls in this chain already answer to. */
function replyKeys(exceptIndex: number): string[] {
	return props.steps
		.filter((step, i): step is UiWebhookStep => i !== exceptIndex && step.kind === 'webhook')
		.map((step) => step.key)
		.filter((key): key is string => Boolean(key));
}

async function onPick(index: number, step: UiWebhookStep, value: string | undefined) {
	if (value === BROWSE) {
		point(index, await props.browse());
		return;
	}

	if (!value) {
		patch(index, { url: '' });
		return;
	}

	point(
		index,
		optionsFor(step).find((target) => targetKey(target.url, target.method) === value),
	);
}

async function onCreate(index: number) {
	point(index, await props.create());
}

/**
 * Empty means "send all of state", so an empty box is unset rather than
 * configured — including the bare `=` the editor leaves behind when the last
 * character is deleted.
 */
function patchRequest(index: number, value: unknown) {
	const body = typeof value === 'string' ? value : '';
	patch(index, { request: body && body !== '=' ? body : undefined });
}

/**
 * A `set` step writes any JSON, and `{}` — emptying a form — is the one authors
 * reach for most, so text that reads as an object or a list is stored as one.
 * Anything else, expressions included, is the string it looks like.
 */
function patchSetValue(index: number, value: unknown) {
	if (typeof value === 'string' && /^\s*[{[]/.test(value)) {
		try {
			patch(index, { value: JSON.parse(value) });
			return;
		} catch {
			// Half-typed JSON. Keeping the text is what lets it be finished.
		}
	}

	patch(index, { value });
}

/**
 * The steps a reply reaches: everything after this one, up to the next call,
 * which answers a different question and brings its own `$response`.
 */
function following(index: number): UiActionStep[] {
	const rest = props.steps.slice(index + 1);
	const next = rest.findIndex((step) => step.kind === 'webhook');

	return next === -1 ? rest : rest.slice(0, next);
}

/**
 * The step fields that hold a value rather than a choice, described the way a
 * component's props are, so they get the same labelled expression editor —
 * toggle, autocomplete and preview included.
 */
const REQUEST_FIELD: UiProperty = {
	displayName: 'Body',
	name: 'request',
	type: 'string',
	default: '',
	placeholder: '{{ $state.form }}',
	description:
		'What this call sends, as an expression: {{ $state.form }} sends that part of app state, {{ { name: $state.form.name } }} sends a shape of its own. Empty sends all of app state.',
};

const SET_VALUE_FIELD: UiProperty = {
	displayName: 'To',
	name: 'value',
	type: 'string',
	default: '',
	placeholder: 'a value, or an expression',
	description:
		'A literal, or an expression. $response is what the call before this step answered and $responses.<name> is any call in this chain, so ={{ $response.rows }} keeps part of the latest reply.',
};

const MESSAGE_FIELD: UiProperty = {
	displayName: 'Says',
	name: 'message',
	type: 'string',
	default: '',
	placeholder: 'Saved',
	description: 'Shown to whoever clicked. Can be an expression.',
};

/**
 * What a step's expressions see: the node's own scope, plus the replies of
 * every call before it in the chain. Previewing a call fills those in with what
 * it really returned, which is what makes `$responses.orders.` complete with
 * the keys the workflow actually answers with.
 */
function scopeFor(index: number): UiScope {
	const before = props.steps
		.slice(0, index)
		.filter((step): step is UiWebhookStep => step.kind === 'webhook');

	if (before.length === 0) return props.scope;

	const byKey: Record<string, unknown> = {};
	for (const call of before) if (call.key) byKey[call.key] = props.responses[call.key] ?? {};

	const latest = before[before.length - 1].key;

	return {
		...props.scope,
		$responses: byKey,
		$response: (latest ? props.responses[latest] : undefined) ?? {},
	};
}

/**
 * Not a real property, just enough of one for `UiValueField` to render this
 * step's destination through: a `route` field, the same widget the
 * property-level "Go to page" field uses. No label, since the step's own
 * kind picker above already says what this row is.
 */
const toDescriptor: UiProperty = {
	displayName: '',
	name: 'to',
	type: ROUTE_PROP_TYPE,
	default: '',
};
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

			<!-- Webhook: the endpoint this step calls, and what it sends it. -->
			<div v-if="step.kind === 'webhook'" :class="$style.row">
				<N8nSelect
					:class="$style.grow"
					:model-value="keyOf(step as UiWebhookStep)"
					:disabled="disabled"
					size="small"
					filterable
					clearable
					placeholder="Pick an endpoint"
					@update:model-value="void onPick(index, step as UiWebhookStep, $event)"
				>
					<N8nOption
						v-for="target in optionsFor(step as UiWebhookStep)"
						:key="targetKey(target.url, target.method)"
						:label="target.label"
						:value="targetKey(target.url, target.method)"
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
						@click="run(step as UiWebhookStep, following(index))"
					/>
				</N8nTooltip>

				<N8nTooltip content="Preview what this step returned when it last ran">
					<N8nIconButton
						variant="ghost"
						size="small"
						icon="history"
						aria-label="Load the last execution"
						:disabled="disabled || !(step as UiWebhookStep).url"
						@click="history(step as UiWebhookStep, following(index))"
					/>
				</N8nTooltip>
			</div>

			<!--
				What it sends, and what its reply is called. Where the reply goes is
				not asked here: a `set` step after this one decides what to keep, which
				is also how a chain that calls twice keeps both answers apart.
			-->
			<template v-if="step.kind === 'webhook'">
				<!-- A GET carries no body, so it has nothing to send. -->
				<div v-if="(step as UiWebhookStep).method !== 'GET'" :class="$style.field">
					<UiValueField
						:descriptor="REQUEST_FIELD"
						:model-value="(step as UiWebhookStep).request ?? ''"
						:scope="scopeFor(index)"
						:disabled="disabled"
						always-expression
						@update="patchRequest(index, $event)"
					/>
				</div>

				<div :class="$style.field">
					<N8nInputLabel
						label="Reply name"
						tooltip-text="What later steps call this reply: $responses.orders, and $response while it is the most recent"
						show-tooltip
						:bold="false"
						size="small"
						color="text-dark"
					>
						<N8nInput
							:model-value="(step as UiWebhookStep).key ?? ''"
							:disabled="disabled"
							size="small"
							placeholder="orders"
							@update:model-value="patch(index, { key: $event || undefined })"
						/>
					</N8nInputLabel>
				</div>

				<!-- What the run/history buttons above just returned, if anything. -->
				<N8nText v-if="previewStatus" size="small" color="text-light" :class="$style.preview">
					{{ previewStatus }}
				</N8nText>
			</template>

			<!--
				Notify: the client's own message. The envelope's `toast` is the
				workflow saying something; this is the app saying it, and it can read
				state the workflow never sees.
			-->
			<template v-else-if="step.kind === 'notify'">
				<div :class="$style.field">
					<UiValueField
						:descriptor="MESSAGE_FIELD"
						:model-value="(step as UiNotifyStep).message"
						:scope="scopeFor(index)"
						:disabled="disabled"
						@update="patch(index, { message: $event })"
					/>
				</div>

				<div :class="$style.field">
					<N8nInputLabel label="Style" :bold="false" size="small" color="text-dark">
						<N8nSelect
							:model-value="(step as UiNotifyStep).type ?? 'success'"
							:disabled="disabled"
							size="small"
							@update:model-value="patch(index, { type: $event })"
						>
							<N8nOption label="Success" value="success" />
							<N8nOption label="Info" value="info" />
							<N8nOption label="Error" value="error" />
						</N8nSelect>
					</N8nInputLabel>
				</div>
			</template>

			<!-- Set: the app writing its own state, from a literal or an expression. -->
			<template v-else-if="step.kind === 'set'">
				<div :class="$style.field">
					<N8nInputLabel
						label="Sets"
						tooltip-text="The part of app state to write, as a dotted path"
						show-tooltip
						:bold="false"
						size="small"
						color="text-dark"
					>
						<N8nInput
							:model-value="(step as UiSetStep).path"
							:disabled="disabled"
							size="small"
							placeholder="orders"
							@update:model-value="patch(index, { path: $event })"
						/>
					</N8nInputLabel>
				</div>

				<div :class="$style.field">
					<UiValueField
						:descriptor="SET_VALUE_FIELD"
						:model-value="(step as UiSetStep).value"
						:scope="scopeFor(index)"
						:disabled="disabled"
						@update="patchSetValue(index, $event)"
					/>
				</div>
			</template>

			<!-- Navigate: a page of this app, or an expression producing a path. -->
			<div v-else :class="$style.row">
				<UiValueField
					:class="$style.grow"
					:descriptor="toDescriptor"
					:model-value="(step as UiNavigateStep).to"
					:scope="scopeFor(index)"
					:disabled="disabled"
					@update="patch(index, { to: String($event ?? '') })"
				>
					<template #fixed="{ value, disabled: isDisabled, update }">
						<N8nSelect
							:model-value="value"
							:disabled="isDisabled"
							size="small"
							filterable
							allow-create
							default-first-option
							clearable
							:placeholder="pages.length ? 'Pick a page' : 'This app has no pages yet'"
							@update:model-value="update($event ?? '')"
						>
							<N8nOption
								v-for="page in pages"
								:key="page.id"
								:label="pageLabel(page)"
								:value="page.path"
							/>
						</N8nSelect>
					</template>
				</UiValueField>
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

// Every detail of every step kind is a labelled field of its own, so a box
// holding `form` says which end of the exchange it is.
.field {
	padding: 0 var(--spacing--5xs);
}

.grow {
	flex: 1;
	min-width: 0;
}

.narrow {
	width: 96px;
	flex-shrink: 0;
}

.preview {
	display: block;
	margin-top: var(--spacing--5xs);
}
</style>
