<script lang="ts" setup>
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, ref, useId, useSlots, useTemplateRef, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nCodeBlock from '../N8nCodeBlock';
import N8nIcon, { type IconName } from '../N8nIcon';
import { N8nKeyboardShortcut } from '../N8nKeyboardShortcut';
import N8nText from '../N8nText';

export interface ApprovalOption {
	/** Stable identifier emitted on click. */
	key: string;
	/** Leading icon — typically `check` for allow rows, `ban` for deny. */
	icon: IconName;
	/** Primary (bold-eligible) label text. */
	label: string;
	/** Optional muted text rendered after the label. */
	suffix?: string;
	/** Mark this row as the destructive choice — picks up the red highlight. */
	destructive?: boolean;
	/** Show the trailing arrow indicator on the highlighted row. Defaults to `true`. */
	withArrow?: boolean;
	/** `data-test-id` for the row button. */
	testId?: string;
}

export interface ApprovalCardLabels {
	/** Label for a session approval. */
	alwaysAllow: string;
	/** Text that describes the session scope. */
	alwaysAllowSuffix: string;
	/** Label for a single-use approval. */
	allowOnce: string;
	/** Label for the deny action. */
	deny: string;
	/** Label for a saved approval. */
	allowed: string;
	/** Label for a saved denial. */
	denied: string;
	/** Accessible name for the arguments region. Defaults to the title. */
	args?: string;
}

interface ApprovalCardProps {
	/** Heading that describes the action. */
	title: string;
	/** Optional supporting details shown below the header. */
	description?: string;
	/** Hide the formatted arguments when the card first renders. Defaults to false. */
	defaultCollapsed?: boolean;
	/** Tool arguments shown below the description. */
	args?: unknown;
	/** Accessible name for the details region. Defaults to the title. */
	descriptionLabel?: string;
	/** Custom decisions. Defaults to the standard allow and deny choices. */
	options?: readonly ApprovalOption[];
	/** Translated text for the card. */
	labels?: ApprovalCardLabels;
	/** Add the session choice to the standard decisions. */
	supportsSessionApproval?: boolean;
	/** Mark the standard single-use choice as destructive. */
	destructive?: boolean;
	/** Show a saved decision instead of the available choices. */
	decision?: 'allowed' | 'denied';
	/** Prevent mouse and keyboard decisions while the card is inactive. */
	disabled?: boolean;
	/** Focus the choices when the card mounts. Disable this in scrolling lists. */
	autoFocus?: boolean;
	/** Show number shortcuts and enable their key events. */
	useKeyShortcuts?: boolean;
}

defineOptions({ name: 'N8nApprovalCard' });
const props = withDefaults(defineProps<ApprovalCardProps>(), {
	defaultCollapsed: false,
	autoFocus: true,
	useKeyShortcuts: true,
});
const emit = defineEmits<{ select: [key: string] }>();
const { t } = useI18n();
const slots = useSlots();

const formattedArgs = computed(() => {
	try {
		return JSON.stringify(props.args, null, 2);
	} catch {
		return undefined;
	}
});

const labels = computed<ApprovalCardLabels>(
	() =>
		props.labels ?? {
			alwaysAllow: t('approvalCard.alwaysAllow'),
			alwaysAllowSuffix: t('approvalCard.alwaysAllowSuffix'),
			allowOnce: t('approvalCard.allowOnce'),
			deny: t('approvalCard.deny'),
			allowed: t('approvalCard.allowed'),
			denied: t('approvalCard.denied'),
		},
);

const options = computed<readonly ApprovalOption[]>(() => {
	if (props.options) return props.options;
	const choices: ApprovalOption[] = [];
	if (props.supportsSessionApproval) {
		choices.push({
			key: 'always-allow',
			icon: 'check-check',
			label: labels.value.alwaysAllow,
			suffix: labels.value.alwaysAllowSuffix,
		});
	}
	choices.push(
		{
			key: 'allow-once',
			icon: 'check',
			label: labels.value.allowOnce,
			destructive: props.destructive,
		},
		{ key: 'deny', icon: 'ban', label: labels.value.deny },
	);
	return choices;
});

/** Multiple approvals can be shown at once. */
const id = useId();
const containerRef = useTemplateRef<HTMLElement>('list');
const highlightedIndex = ref(0);

watch(
	() => options.value.length,
	(length) => {
		if (highlightedIndex.value >= length) highlightedIndex.value = Math.max(0, length - 1);
	},
);

watch(
	containerRef,
	() => {
		if (props.autoFocus && !props.disabled) {
			focusOption(highlightedIndex.value);
		}
	},
	{ flush: 'post' },
);

function focusOption(index: number) {
	if (props.disabled) return;
	containerRef.value
		?.querySelectorAll<HTMLButtonElement>('button')
		[index]?.focus({ preventScroll: true });
}

function selectOption(key: string) {
	if (props.disabled) return;
	emit('select', key);
}

function focusChoices(event: MouseEvent) {
	if (props.disabled || !(event.target instanceof Element)) return;
	if (event.target.closest('a, button, input, select, textarea, [tabindex], [role="button"]'))
		return;
	focusOption(highlightedIndex.value);
}

function onKeydown(event: KeyboardEvent) {
	if (props.disabled || options.value.length === 0) return;
	const enableKeyNumbers =
		props.useKeyShortcuts &&
		/^[0-9]$/.test(event.key) &&
		!event.altKey &&
		!event.ctrlKey &&
		!event.metaKey;

	/** Use number keys for the first ten choices. */
	if (enableKeyNumbers) {
		const index = event.key === '0' ? 9 : Number(event.key) - 1;
		const option = options.value[index];
		if (option) {
			event.preventDefault();
			focusOption(index);
			selectOption(option.key);
		}
		return;
	}

	if (event.key === 'ArrowDown') {
		event.preventDefault();
		focusOption(Math.min(options.value.length - 1, highlightedIndex.value + 1));
		return;
	}
	if (event.key === 'ArrowUp') {
		event.preventDefault();
		focusOption(Math.max(0, highlightedIndex.value - 1));
		return;
	}
}
</script>

<template>
	<CollapsibleRoot
		v-slot="{ open }"
		as="article"
		:default-open="!defaultCollapsed"
		:class="[$style.card, disabled && $style.disabled]"
		@click="focusChoices"
	>
		<div :class="$style.header">
			<span :class="$style.iconContainer">
				<span :class="$style.statusDot" aria-hidden="true" />
			</span>
			<span :id="`${id}-status`" :class="$style.srOnly">
				{{ decision ? labels[decision] : t('approvalCard.awaitingApproval') }}
			</span>
			<CollapsibleTrigger
				v-if="description || slots.description || formattedArgs"
				:class="$style.trigger"
				:aria-controls="`${id}-details`"
			>
				<span :id="`${id}-title`">
					<slot name="title"
						><N8nText step="sm">{{ title }}</N8nText></slot
					>
				</span>
				<N8nIcon :icon="open ? 'chevron-down' : 'chevron-right'" color="text-light" :size="12" />
			</CollapsibleTrigger>
			<div v-else :id="`${id}-title`" :class="$style.title">
				<slot name="title"
					><N8nText step="sm">{{ title }}</N8nText></slot
				>
			</div>
		</div>
		<CollapsibleContent as-child>
			<div
				v-if="description || slots.description || formattedArgs"
				:id="`${id}-details`"
				:class="$style.body"
			>
				<div
					v-if="description || slots.description"
					role="region"
					tabindex="0"
					:aria-label="descriptionLabel ?? title"
				>
					<slot name="description"
						><N8nText step="sm">{{ description }}</N8nText></slot
					>
				</div>
				<N8nCodeBlock
					v-if="formattedArgs"
					:code="formattedArgs"
					language="json"
					:aria-label="labels.args ?? title"
					data-test-id="approval-card-args"
				/>
			</div>
		</CollapsibleContent>
		<div :class="$style.footer">
			<div v-if="decision" :class="$style.resolved">
				<N8nIcon
					:icon="decision === 'allowed' ? 'circle-check' : 'circle-x'"
					size="small"
					:color="decision === 'allowed' ? 'success' : 'danger'"
				/>
				<N8nText size="small">
					{{ labels[decision] }}
				</N8nText>
			</div>
			<div
				v-else
				ref="list"
				:class="$style.list"
				role="toolbar"
				aria-orientation="vertical"
				:aria-disabled="disabled"
				:aria-labelledby="`${id}-status ${id}-title`"
				@keydown="onKeydown"
			>
				<button
					v-for="(option, idx) in options"
					:id="`${id}-${option.key}`"
					:key="option.key"
					type="button"
					:aria-disabled="disabled"
					:disabled="disabled"
					:tabindex="!disabled && highlightedIndex === idx ? 0 : -1"
					:class="[
						$style.row,
						highlightedIndex === idx && $style.highlighted,
						option.destructive && $style.rowDestructive,
					]"
					:data-test-id="option.testId ?? `approval-card-${option.key}`"
					@click="selectOption(option.key)"
					@focus="highlightedIndex = idx"
					@mouseenter="highlightedIndex = idx"
				>
					<N8nIcon :class="$style.leadingIcon" :icon="option.icon" size="large" />
					<span :class="$style.label">
						<N8nText step="sm" bold :class="$style.labelStrong">{{ option.label }}</N8nText>
						<N8nText v-if="option.suffix" step="sm" color="text-light">{{ option.suffix }}</N8nText>
					</span>
					<N8nIcon
						v-if="highlightedIndex === idx && option.withArrow !== false"
						:class="$style.trailingIcon"
						icon="arrow-right"
					/>
					<N8nKeyboardShortcut
						v-else-if="useKeyShortcuts && idx < 10"
						:class="$style.trailingIcon"
						:keys="[String((idx + 1) % 10)]"
						aria-hidden="true"
					/>
				</button>
			</div>
		</div>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.card {
	width: 100%;
	min-width: 0;
	border-radius: var(--radius--md);
	background-color: var(--background--surface);
	border: var(--border);
	background-clip: padding-box;
	box-shadow: var(--shadow--xs);
}
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm);
	gap: var(--spacing--3xs);
	border-bottom: var(--border);
	border-color: var(--border-color--subtle);
}
.srOnly {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-inline-end: auto;
	padding: 0;
	border: none;
	background: none;
	color: inherit;
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.title {
	margin-inline-end: auto;
}
.iconContainer {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	flex-shrink: 0;
	border-radius: var(--radius);
}

.statusDot {
	width: var(--height--5xs);
	height: var(--height--5xs);
	border-radius: 50%;
	background-color: var(--color--purple-700);
	transform: translateY(1px);
	@include motion.pulse;
}

.disabled {
	opacity: 0.75;
}

.resolved {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
}

.list {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	outline: none;
	list-style: none;
}

.footer {
	display: flex;
	flex-direction: column;
	gap: 1px;
	padding: 0 var(--spacing--sm);
	padding-block: var(--spacing--xs);
}

.row {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: auto;
	height: var(--height--lg);
	padding: var(--spacing--2xs);
	margin-inline: calc(var(--spacing--3xs) * -1);
	border: none;
	border-radius: var(--radius);
	background: none;
	cursor: pointer;
	text-align: left;
	font-size: var(--font-size--sm);
	color: var(--text-color);

	&[aria-disabled='true'] {
		cursor: default;
		pointer-events: none;
	}
}

/** Keep the highlight on the active action. */

.trailingIcon {
	margin-inline-start: auto;
}

.highlighted {
	background-color: var(--background--hover);
	outline: none;
}

/** Mark the destructive action when it is active. */
.rowDestructive.highlighted {
	background-color: light-dark(var(--color--red-100), var(--callout--color--background--danger));
	color: light-dark(var(--color--red-800), var(--color--red-250));

	.leadingIcon {
		color: light-dark(var(--color--red-800), var(--color--red-250));
	}
}

.leadingIcon {
	flex-shrink: 0;
}

.label {
	flex: 1;
	display: flex;
	flex-wrap: wrap;
	min-width: 0;
	align-items: baseline;
	gap: var(--spacing--3xs);
}
</style>
