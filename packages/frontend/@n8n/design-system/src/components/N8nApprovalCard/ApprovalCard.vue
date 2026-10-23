<script lang="ts" setup>
import { computed, onMounted, ref, useId, useTemplateRef, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nIcon, { type IconName } from '../N8nIcon';
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
	/** Heading size used by the host surface. */
	titleSize?: 'medium' | 'large';
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
}

defineOptions({ name: 'N8nApprovalCard' });
const props = withDefaults(defineProps<ApprovalCardProps>(), {
	titleSize: 'large',
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
const containerRef = useTemplateRef<HTMLElement>('container');
const highlightedIndex = ref(0);

watch(
	() => options.value.length,
	(length) => {
		if (highlightedIndex.value >= length) highlightedIndex.value = Math.max(0, length - 1);
	},
);

onMounted(() => {
	if (!props.disabled) containerRef.value?.focus();
});

function selectOption(key: string) {
	if (props.disabled) return;
	containerRef.value?.focus({ preventScroll: true });
	emit('select', key);
}

function onKeydown(event: KeyboardEvent) {
	if (props.disabled || options.value.length === 0) return;
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
	<div :class="[$style.card, disabled && $style.disabled]">
		<div :class="$style.body">
			<N8nText :id="`${id}-title`" :size="titleSize" bold>{{ title }}</N8nText>
			<slot name="description">
				<div
					v-if="description"
					:class="$style.description"
					role="region"
					:aria-label="descriptionLabel ?? title"
					tabindex="0"
				>
					{{ description }}
				</div>
			</slot>
			<div
				v-if="formattedArgs"
				:class="$style.description"
				role="region"
				:aria-label="labels.args ?? title"
				tabindex="0"
				data-test-id="approval-card-args"
			>
				{{ formattedArgs }}
			</div>
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
			<div
				v-else
				ref="container"
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
				<button
					v-for="(option, idx) in options"
					:id="`${id}-${option.key}`"
					:key="option.key"
					type="button"
					role="option"
					:disabled="disabled"
					:aria-selected="highlightedIndex === idx"
					:class="[
						$style.row,
						highlightedIndex === idx && $style.highlighted,
						option.destructive && $style.rowDestructive,
					]"
					:data-test-id="option.testId ?? `approval-card-${option.key}`"
					tabindex="-1"
					@click="selectOption(option.key)"
					@mouseenter="highlightedIndex = idx"
				>
					<N8nIcon :class="$style.leadingIcon" :icon="option.icon" size="large" />
					<span :class="$style.label">
						<span :class="$style.labelStrong">{{ option.label }}</span>
						<span v-if="option.suffix" :class="$style.labelMuted">{{ option.suffix }}</span>
					</span>
					<span v-if="option.withArrow !== false" :class="$style.trailingIndicator">
						<N8nIcon
							:class="$style.trailingIcon"
							icon="arrow-right"
							size="large"
							:stroke-width="2.5"
						/>
					</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	width: 100%;
	min-width: 0;
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--sm), var(--shadow--outline);
	font-size: var(--font-size--2xs);
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
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.description {
	max-height: var(--height--5xl);
	overflow-y: auto;
	padding: var(--spacing--2xs) 0;
	border-radius: var(--radius);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	white-space: pre-wrap;
	word-break: normal;
	overflow-wrap: anywhere;
}

.list {
	display: flex;
	flex-direction: column;
	outline: none;
}

.footer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm) var(--spacing--sm);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--height--lg);
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--3xs) var(--spacing--xs);
	border: none;
	border-radius: var(--radius--lg);
	background: none;
	cursor: pointer;
	text-align: left;
	font-size: var(--font-size--sm);
	color: var(--text-color);

	&:disabled {
		cursor: default;
		pointer-events: none;
	}
}

// Highlight: applied when the row is the current selection (keyboard or
// mouse). Unifies the visual for hover and arrow-key states so the user
// always sees one — and only one — active row.
.highlighted {
	background-color: light-dark(var(--color--neutral-100), var(--color--neutral-800));

	.trailingIndicator {
		visibility: visible;
	}
}

// Destructive variant only changes the highlight colour, so the cost of
// confirming becomes obvious the moment the user lands on the row.
.rowDestructive.highlighted {
	background-color: light-dark(var(--color--red-100), var(--callout--color--background--danger));
	color: light-dark(var(--color--red-800), var(--color--red-250));

	.leadingIcon {
		color: light-dark(var(--color--red-800), var(--color--red-250));
	}

	.trailingIndicator {
		color: var(--color--neutral-white);
		opacity: 1;
	}
}

.leadingIcon {
	flex-shrink: 0;
	color: var(--icon-color--strong);
}

.label {
	flex: 1;
	display: flex;
	flex-wrap: wrap;
	min-width: 0;
	align-items: baseline;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.labelStrong {
	font-weight: var(--font-weight--medium);
	overflow-wrap: anywhere;
}

.labelMuted {
	color: var(--text-color--subtle);
	font-weight: var(--font-weight--regular);
}

.trailingIndicator {
	margin-left: auto;
	visibility: hidden;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius--full);
	background-color: var(--color--primary);
	color: var(--color--neutral-white);
	flex-shrink: 0;
}

.trailingIcon {
	width: var(--spacing--sm);
	height: var(--spacing--sm);
}
</style>
