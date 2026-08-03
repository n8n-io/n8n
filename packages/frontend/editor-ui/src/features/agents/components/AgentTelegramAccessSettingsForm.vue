<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { N8nCallout, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	AgentTelegramAllowedUserSchema,
	type AgentTelegramIntegrationSettings,
} from '@n8n/api-types';
import { isExpression } from 'n8n-workflow';

import AgentExpressionInput from './AgentExpressionInput.vue';
import {
	DEFAULT_TELEGRAM_PUBLIC_SETTINGS,
	normalizeTelegramUsers,
	type TelegramSettingsValidationError,
} from '../utils/telegramAccessSettings';

const props = withDefaults(
	defineProps<{
		disabled?: boolean;
		/**
		 * Saved settings — pass `undefined` for fresh setup so the form defaults
		 * to private; for connected legacy integrations pass
		 * `DEFAULT_TELEGRAM_PUBLIC_SETTINGS` so the form starts public.
		 */
		savedSettings?: AgentTelegramIntegrationSettings;
	}>(),
	{ disabled: false, savedSettings: undefined },
);

const i18n = useI18n();

const accessMode = ref<AgentTelegramIntegrationSettings['accessMode']>(
	props.savedSettings?.accessMode ?? 'private',
);
const entries = ref<string[]>(props.savedSettings?.allowedUsers.slice() ?? []);
const inputText = ref('');
const inputRef = ref<HTMLInputElement>();
const expressionInputRef = ref<InstanceType<typeof AgentExpressionInput>>();

watch(
	() => props.savedSettings,
	(saved) => {
		if (!saved) return;
		accessMode.value = saved.accessMode;
		entries.value = saved.allowedUsers.slice();
		inputText.value = '';
	},
);

function focusInput() {
	if (isExpression(inputText.value)) expressionInputRef.value?.focus();
	else inputRef.value?.focus();
}

function updateInputText(value: string) {
	const expressionModeChanged = isExpression(value) !== isExpression(inputText.value);
	inputText.value = value;
	if (expressionModeChanged) void nextTick(focusInput);
}

function onInput(event: Event) {
	if (event.target instanceof HTMLInputElement) updateInputText(event.target.value);
}

function finalizeInput(value = inputText.value) {
	const tokens = normalizeTelegramUsers([value]);
	if (tokens.length === 0) return;

	entries.value = [...new Set([...entries.value, ...tokens])];
	inputText.value = '';
}

function removeEntry(index: number) {
	entries.value = entries.value.filter((_, i) => i !== index);
	void nextTick(focusInput);
}

function onKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) return;
	const separator = event.key === ',' || event.key === ' ' || event.key === 'Enter';
	if (separator && (!isExpression(inputText.value) || event.key === 'Enter')) {
		event.preventDefault();
		finalizeInput();
	}
	if (event.key === 'Backspace' && inputText.value === '' && entries.value.length > 0) {
		entries.value = entries.value.slice(0, -1);
	}
}

function onPaste(event: ClipboardEvent) {
	event.preventDefault();
	updateInputText(inputText.value + (event.clipboardData?.getData('text') ?? ''));
	finalizeInput();
}

function isValidEntry(entry: string) {
	return AgentTelegramAllowedUserSchema.safeParse(entry).success;
}

const currentSettings = computed<AgentTelegramIntegrationSettings>(() => ({
	accessMode: accessMode.value,
	allowedUsers: [...new Set(entries.value.filter(Boolean))],
}));

const invalidEntries = computed<string[]>(() =>
	entries.value.filter((entry) => !isValidEntry(entry)),
);

const validationError = computed<TelegramSettingsValidationError | null>(() => {
	if (currentSettings.value.accessMode === 'public') return null;
	if (invalidEntries.value.length > 0) return 'invalid';
	if (entries.value.length === 0) return 'required';
	return null;
});

const validationErrorText = computed<string>(() => {
	if (validationError.value === 'invalid') {
		return i18n.baseText('agents.builder.addTrigger.telegram.validation.invalid');
	}
	if (validationError.value === 'required') {
		return i18n.baseText('agents.builder.addTrigger.telegram.validation.required');
	}
	return '';
});

const isDirty = computed<boolean>(() => {
	const saved = props.savedSettings ?? DEFAULT_TELEGRAM_PUBLIC_SETTINGS;
	const current = currentSettings.value;
	if (current.accessMode !== saved.accessMode) return true;
	if (current.allowedUsers.length !== saved.allowedUsers.length) return true;
	return current.allowedUsers.some((entry, i) => entry !== saved.allowedUsers[i]);
});

defineExpose({ currentSettings, validationError, isDirty });
</script>

<template>
	<div :class="$style.form">
		<div :class="$style.field">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.builder.addTrigger.telegram.accessMode.label') }}
			</N8nText>
			<N8nSelect
				v-model="accessMode"
				size="medium"
				:disabled="disabled"
				data-testid="telegram-access-mode"
			>
				<N8nOption
					value="private"
					:label="i18n.baseText('agents.builder.addTrigger.telegram.accessMode.private')"
				/>
				<N8nOption
					value="public"
					:label="i18n.baseText('agents.builder.addTrigger.telegram.accessMode.public')"
				/>
			</N8nSelect>
		</div>

		<div v-if="accessMode === 'private'" :class="$style.field">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.builder.addTrigger.telegram.users.label') }}
			</N8nText>
			<div
				:class="[$style.tagInput, { [$style.tagInputDisabled]: disabled }]"
				data-testid="telegram-user-ids"
				@click="focusInput"
			>
				<span
					v-for="(entry, idx) in entries"
					:key="entry + idx"
					:class="[$style.badge, { [$style.badgeInvalid]: !isValidEntry(entry) }]"
				>
					{{ entry }}
					<button
						v-if="!disabled"
						:class="$style.badgeRemove"
						type="button"
						:aria-label="'Remove ' + entry"
						@click.stop="removeEntry(idx)"
					>
						<N8nIcon icon="x" size="small" />
					</button>
				</span>
				<AgentExpressionInput
					v-if="isExpression(inputText)"
					ref="expressionInputRef"
					:model-value="inputText"
					:disabled="disabled"
					:rows="1"
					:class="$style.tagExpressionInput"
					path="agent.telegram.allowedUsers"
					embedded
					submit-on-enter
					@update:model-value="updateInputText"
					@keydown="onKeydown"
					@blur="finalizeInput()"
					@submit="finalizeInput"
				/>
				<input
					v-else
					id="telegram-user-ids-input"
					ref="inputRef"
					:value="inputText"
					:class="$style.tagInputField"
					:disabled="disabled"
					:placeholder="
						entries.length === 0
							? i18n.baseText('agents.builder.addTrigger.telegram.users.placeholder')
							: ''
					"
					@input="onInput"
					@keydown="onKeydown"
					@paste="onPaste"
					@blur="finalizeInput()"
				/>
			</div>
			<N8nText
				v-if="validationError"
				:class="$style.error"
				size="small"
				data-testid="telegram-user-ids-error"
			>
				{{ validationErrorText }}
			</N8nText>
		</div>

		<N8nCallout
			v-else
			:class="$style.warning"
			theme="warning"
			slim
			data-testid="telegram-public-warning"
		>
			{{ i18n.baseText('agents.builder.addTrigger.telegram.public.warning') }}
		</N8nCallout>
	</div>
</template>

<style module lang="scss">
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.warning {
	align-items: flex-start;
}

.error {
	color: var(--text-color--danger);
}

.tagInput {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--input--color--background, var(--color--foreground--tint-2));
	cursor: text;
	min-height: 36px;

	&:focus-within {
		border-color: var(--color--primary);
	}
}

.tagInputDisabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.tagInputField,
.tagExpressionInput {
	flex: 1;
	min-width: 80px;
}

.tagInputField {
	border: none;
	outline: none;
	background: transparent;
	font-size: var(--font-size--2xs);
	color: var(--text-color);
	padding: var(--spacing--4xs) 0;

	&::placeholder {
		color: var(--text-color--subtler);
	}
}

.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	height: var(--tag--height);
	padding: var(--tag--padding);
	line-height: var(--tag--line-height);
	color: var(--tag--color--text);
	background-color: var(--tag--color--background);
	border: 1px solid var(--tag--border-color);
	border-radius: var(--tag--radius);
	font-size: var(--tag--font-size);
	white-space: nowrap;
}

.badgeInvalid {
	border-color: var(--color--danger);
	color: var(--color--danger);
}

.badgeRemove {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: none;
	background: transparent;
	cursor: pointer;
	color: inherit;
	opacity: 0.6;
	line-height: 1;

	&:hover {
		opacity: 1;
	}
}
</style>
