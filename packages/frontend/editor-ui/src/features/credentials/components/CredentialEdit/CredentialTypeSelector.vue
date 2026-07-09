<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';

const props = defineProps<{
	// `true` = end-user (private) credential, `false` = fixed (static) credential.
	// Mirrors the `isResolvable` flag the rest of the modal uses.
	modelValue: boolean;
	// Explainer shown in the help tooltip next to the "Credential type" label.
	infoTip?: string;
}>();

// Controlled component: the parent owns the value and may veto a change (confirm
// dialog), so we only emit the intent and let the prop drive the rendered state.
const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const i18n = useI18n();

function select(value: boolean): void {
	if (value === props.modelValue) return;
	emit('update:modelValue', value);
}
</script>

<template>
	<div :class="$style.container" data-test-id="credential-type-selector">
		<div :class="$style.header">
			<N8nText size="medium" :bold="true">
				{{ i18n.baseText('credentialEdit.credentialConfig.credentialType.title') }}
			</N8nText>
			<N8nTooltip v-if="infoTip" placement="top">
				<template #content>
					<div>{{ infoTip }}</div>
				</template>
				<N8nIcon icon="circle-help" size="small" color="text-light" />
			</N8nTooltip>
		</div>
		<div
			role="radiogroup"
			:aria-label="i18n.baseText('credentialEdit.credentialConfig.credentialType.title')"
			:class="$style.cards"
		>
			<button
				type="button"
				role="radio"
				:aria-checked="!modelValue"
				data-test-id="credential-type-card-fixed"
				:class="[$style.card, !modelValue ? $style.cardSelected : $style.cardIdle]"
				@click="select(false)"
			>
				<span :class="$style.cardTop">
					<span :class="$style.cardLabel">
						<N8nIcon icon="key-round" size="small" />
						<N8nText size="medium" :bold="true">
							{{ i18n.baseText('credentialEdit.credentialConfig.credentialType.fixed.title') }}
						</N8nText>
					</span>
					<span
						:class="[$style.radioOuter, !modelValue && $style.radioOuterOn]"
						aria-hidden="true"
					/>
				</span>
				<N8nText size="xsmall" color="text-light" :class="$style.subtitle">
					{{ i18n.baseText('credentialEdit.credentialConfig.credentialType.fixed.subtitle') }}
				</N8nText>
			</button>

			<button
				type="button"
				role="radio"
				:aria-checked="modelValue"
				data-test-id="credential-type-card-end-user"
				:class="[$style.card, modelValue ? $style.cardSelected : $style.cardIdle]"
				@click="select(true)"
			>
				<span :class="$style.cardTop">
					<span :class="$style.cardLabel">
						<N8nIcon icon="user-round" size="small" />
						<N8nText size="medium" :bold="true">
							{{ i18n.baseText('credentialEdit.credentialConfig.credentialType.endUser.title') }}
						</N8nText>
					</span>
					<span
						:class="[$style.radioOuter, modelValue && $style.radioOuterOn]"
						aria-hidden="true"
					/>
				</span>
				<N8nText size="xsmall" color="text-light" :class="$style.subtitle">
					{{ i18n.baseText('credentialEdit.credentialConfig.credentialType.endUser.subtitle') }}
				</N8nText>
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	// Matches the label-to-input gap of medium N8nInputLabel fields in the modal.
	gap: var(--spacing--2xs);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.cards {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: stretch;
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	flex: 1 1 0;
	min-width: 0;
	text-align: left;
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	cursor: pointer;
	background: transparent;
	font: inherit;
	transition:
		background-color 0.15s ease,
		border-color 0.15s ease;

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.cardSelected {
	border-color: var(--color--primary);
	background-color: color-mix(in srgb, var(--color--primary) 6%, transparent);
}

.cardIdle {
	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.cardTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.cardLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.subtitle {
	display: block;
}

.radioOuter {
	position: relative;
	flex-shrink: 0;
	box-sizing: border-box;
	width: 1rem;
	height: 1rem;
	border-radius: 50%;
	border: var(--border-width) var(--border-style) var(--color--text--tint-2);
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
}

.radioOuterOn {
	border-color: var(--color--primary);

	&::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background-color: var(--color--primary);
		transform: translate(-50%, -50%);
	}
}
</style>
