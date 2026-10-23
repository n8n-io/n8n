<script lang="ts" setup>
import { computed, ref, useId, useTemplateRef, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
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
	/** Use the full card or collapsible inline layout. */
	variant?: 'full' | 'inline';
	/** Heading that describes the action. */
	title: string;
	/** Action details shown in a scrollable text region. */
	description?: string;
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
	variant: 'full',
	autoFocus: true,
	useKeyShortcuts: true,
});
const emit = defineEmits<{ select: [key: string] }>();
const { t } = useI18n();

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

// Multiple approvals can be shown at once.
const id = useId();
const containerRef = useTemplateRef<HTMLElement>('list');
const highlightedIndex = ref(0);
const expanded = ref(false);

const inlineOptions = computed(() => [
	...options.value.filter((option) => option.key === 'deny'),
	...options.value.filter((option) => option.key !== 'deny'),
]);

watch(
	() => options.value.length,
	(length) => {
		if (highlightedIndex.value >= length) highlightedIndex.value = Math.max(0, length - 1);
	},
);

watch(
	containerRef,
	(listbox) => {
		if (props.autoFocus && !props.disabled) {
			const target = props.variant === 'inline' ? listbox?.querySelector('button') : listbox;
			target?.focus({ preventScroll: true });
		}
	},
	{ flush: 'post' },
);

function selectOption(key: string) {
	if (props.disabled) return;
	if (props.variant === 'full') containerRef.value?.focus({ preventScroll: true });
	emit('select', key);
}

function focusListbox(event: MouseEvent) {
	if (props.variant === 'inline' || props.disabled || !(event.target instanceof Element)) return;
	if (event.target.closest('a, button, input, select, textarea, [tabindex], [role="button"]'))
		return;
	containerRef.value?.focus({ preventScroll: true });
}

function onKeydown(event: KeyboardEvent) {
	if (props.disabled || options.value.length === 0) return;
	const enableKeyNumbers =
		props.useKeyShortcuts &&
		/^[0-9]$/.test(event.key) &&
		!event.altKey &&
		!event.ctrlKey &&
		!event.metaKey;

	// Allows for using 0-9 as keyboard shorcuts
	if (enableKeyNumbers) {
		const index = event.key === '0' ? 9 : Number(event.key) - 1;
		const option = options.value[index];
		if (option) {
			event.preventDefault();
			highlightedIndex.value = index;
			selectOption(option.key);
		}
		return;
	}

	if (event.key === 'ArrowDown') {
		event.preventDefault();
		highlightedIndex.value = Math.min(options.value.length - 1, highlightedIndex.value + 1);
		return;
	}
	if (event.key === 'ArrowUp') {
		event.preventDefault();
		highlightedIndex.value = Math.max(0, highlightedIndex.value - 1);
		return;
	}
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		const option = options.value[highlightedIndex.value];
		if (option) selectOption(option.key);
	}
}
</script>

<template>
	<article
		:class="[$style.card, variant === 'inline' && $style.inline, disabled && $style.disabled]"
		@click="focusListbox"
	>
		<div :class="$style.header">
			<span :class="$style.iconContainer">
				<span :class="$style.statusDot" aria-hidden="true" />
			</span>
			<N8nText
				:id="`${id}-title`"
				step="sm"
				bold
				:class="variant === 'inline' ? $style.srOnly : $style.title"
				>{{ title }}</N8nText
			>
			<button
				v-if="variant === 'inline'"
				type="button"
				:class="$style.trigger"
				:aria-expanded="expanded"
				:aria-controls="`${id}-details`"
				@click="expanded = !expanded"
			>
				<span
					><slot name="description">{{ description ?? title }}</slot></span
				>
				<N8nIcon :icon="expanded ? 'chevron-down' : 'chevron-right'" size="small" />
			</button>
			<slot name="header-label" />
		</div>
		<div v-show="variant === 'full' || expanded" :id="`${id}-details`" :class="$style.body">
			<slot v-if="variant === 'full'" name="description">
				<N8nText v-if="description" step="sm">
					{{ description }}
				</N8nText>
			</slot>
			<N8nCodeBlock
				v-if="formattedArgs"
				:code="formattedArgs"
				language="json"
				:aria-label="labels.args ?? title"
				data-test-id="approval-card-args"
			/>
		</div>
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
			<div v-else-if="variant === 'inline'" ref="list" :class="$style.inlineOptions">
				<N8nButton
					v-for="option in inlineOptions"
					:key="option.key"
					:disabled="disabled"
					:variant="option.key === 'deny' ? 'ghost' : option.destructive ? 'destructive' : 'solid'"
					:icon="option.icon"
					:data-test-id="option.testId ?? `approval-card-${option.key}`"
					@click="selectOption(option.key)"
				>
					{{ option.label }}<template v-if="option.suffix"> {{ option.suffix }}</template>
				</N8nButton>
			</div>
			<ul
				v-else
				ref="list"
				:class="$style.list"
				role="listbox"
				:tabindex="disabled ? -1 : 0"
				:aria-disabled="disabled"
				:aria-labelledby="`${id}-title`"
				:aria-activedescendant="
					options[highlightedIndex] ? `${id}-${options[highlightedIndex].key}` : undefined
				"
				@keydown="onKeydown"
			>
				<li
					v-for="(option, idx) in options"
					:id="`${id}-${option.key}`"
					:key="option.key"
					role="button"
					:aria-disabled="disabled"
					:aria-pressed="highlightedIndex === idx"
					:class="[
						$style.row,
						highlightedIndex === idx && $style.highlighted,
						option.destructive && $style.rowDestructive,
					]"
					:data-test-id="option.testId ?? `approval-card-${option.key}`"
					@click="selectOption(option.key)"
					@mouseenter="highlightedIndex = idx"
				>
					<N8nIcon :class="$style.leadingIcon" :icon="option.icon" size="large" />
					<span :class="$style.label">
						<N8nText step="sm" bold :class="$style.labelStrong">{{ option.label }}</N8nText>
						<N8nText v-if="option.suffix" step="sm" color="text-light">{{ option.suffix }}</N8nText>
					</span>
					<N8nIcon
						v-if="highlightedIndex === idx"
						:class="$style.trailingIcon"
						icon="arrow-right"
					/>
					<N8nKeyboardShortcut
						v-else-if="useKeyShortcuts && idx < 10"
						:class="$style.trailingIcon"
						:keys="[String((idx + 1) % 10)]"
						aria-hidden="true"
					/>
				</li>
			</ul>
		</div>
	</article>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.card {
	width: 100%;
	min-width: 0;
	border-radius: var(--radius--md);
	background-color: var(--background--surface);
	border: 1px solid var(--border-color);
	background-clip: padding-box;
	box-shadow: var(--shadow--xs);
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
	flex: 1;
	min-width: 0;
	gap: var(--spacing--xs);
	padding: 0;
	border: none;
	background: none;
	color: inherit;
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.inlineOptions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.inline {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;

	.header {
		flex: 1;
		min-width: 0;
		border-bottom: none;
	}

	.footer {
		flex-shrink: 0;
		align-items: flex-end;
		padding: var(--spacing--sm);
	}

	.body {
		order: 1;
		flex-basis: 100%;
		min-width: 0;
	}
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
	gap: var(--spacing--2xs);
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
	padding-block-end: var(--spacing--xs);
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

// Highlight: applied when the row is the current selection (keyboard or
// mouse). Unifies the visual for hover and arrow-key states so the user
// always sees one — and only one — active row.

.trailingIcon {
	margin-inline-start: auto;
}

.highlighted {
	background-color: var(--background--hover);
}

// Destructive variant only changes the highlight colour, so the cost of
// confirming becomes obvious the moment the user lands on the row.
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
