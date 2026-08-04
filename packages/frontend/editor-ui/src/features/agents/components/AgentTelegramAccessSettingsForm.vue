<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { N8nCallout, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentTelegramIntegrationSettings } from '@n8n/api-types';

import {
	DEFAULT_TELEGRAM_PUBLIC_SETTINGS,
	VALID_TELEGRAM_ENTRY_RE,
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

watch(
	() => props.savedSettings,
	(saved) => {
		if (!saved) return;
		accessMode.value = saved.accessMode;
		entries.value = saved.allowedUsers.slice();
		inputText.value = '';
	},
);

function finalizeInput() {
	const raw = inputText.value.trim();
	if (!raw) return;

	const tokens = raw.split(/[\s,]+/).filter(Boolean);
	const unique = new Set(entries.value);
	for (const token of tokens) {
		unique.add(token);
	}
	entries.value = [...unique];
	inputText.value = '';
}

function removeEntry(index: number) {
	entries.value = entries.value.filter((_, i) => i !== index);
	void nextTick(() => inputRef.value?.focus());
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === ',' || e.key === ' ' || e.key === 'Enter') {
		e.preventDefault();
		finalizeInput();
	}
	if (e.key === 'Backspace' && inputText.value === '' && entries.value.length > 0) {
		entries.value = entries.value.slice(0, -1);
	}
}

function onPaste(e: ClipboardEvent) {
	e.preventDefault();
	const pasted = e.clipboardData?.getData('text') ?? '';
	inputText.value += pasted;
	finalizeInput();
}

function onContainerClick() {
	inputRef.value?.focus();
}

const currentSettings = computed<AgentTelegramIntegrationSettings>(() => ({
	accessMode: accessMode.value,
	allowedUsers: [...new Set(entries.value.filter(Boolean))],
}));

const invalidEntries = computed<string[]>(() =>
	entries.value.filter((entry) => !VALID_TELEGRAM_ENTRY_RE.test(entry)),
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
				@click="onContainerClick"
			>
				<span
					v-for="(entry, idx) in entries"
					:key="entry + idx"
					:class="[$style.badge, { [$style.badgeInvalid]: !VALID_TELEGRAM_ENTRY_RE.test(entry) }]"
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
				<input
					ref="inputRef"
					v-model="inputText"
					:class="$style.tagInputField"
					:disabled="disabled"
					:placeholder="
						entries.length === 0
							? i18n.baseText('agents.builder.addTrigger.telegram.users.placeholder')
							: ''
					"
					@keydown="onKeydown"
					@paste="onPaste"
					@blur="finalizeInput"
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
	color: var(--color--danger);
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

.tagInputField {
	flex: 1;
	min-width: 80px;
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
