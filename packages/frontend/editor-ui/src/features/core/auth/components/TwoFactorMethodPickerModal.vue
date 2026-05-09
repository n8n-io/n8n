<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nNotice, N8nText } from '@n8n/design-system';

import Modal from '@/app/components/Modal.vue';
import { TWO_FACTOR_METHOD_PICKER_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { twoFactorPickerBus, type TwoFactorMethod } from '../auth.eventBus';
import MfaWizardSteps from './MfaWizardSteps.vue';

const props = defineProps<{
	data?: { current?: TwoFactorMethod | null };
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const current = computed(() => props.data?.current ?? null);
const isChange = computed(() => current.value !== null);
const selected = ref<TwoFactorMethod | null>(null);

const title = computed(() =>
	isChange.value
		? i18n.baseText('settings.personal.twoFactor.picker.title.change')
		: i18n.baseText('settings.personal.twoFactor.picker.title.enable'),
);

const showReplaceWarning = computed(
	() => isChange.value && selected.value !== null && selected.value !== current.value,
);

const select = (method: TwoFactorMethod) => {
	selected.value = method;
};

const onCancel = () => {
	twoFactorPickerBus.emit('cancelled');
	uiStore.closeModal(TWO_FACTOR_METHOD_PICKER_MODAL_KEY);
};

const onContinue = () => {
	if (!selected.value) return;
	twoFactorPickerBus.emit('selected', { method: selected.value });
	uiStore.closeModal(TWO_FACTOR_METHOD_PICKER_MODAL_KEY);
};

interface MethodOption {
	method: TwoFactorMethod;
	icon: 'shield' | 'fingerprint' | 'key-round';
	tone: 'totp' | 'passkey' | 'security_key';
	labelKey: string;
	descriptionKey: string;
}

const methods: MethodOption[] = [
	{
		method: 'totp',
		icon: 'shield',
		tone: 'totp',
		labelKey: 'settings.personal.twoFactor.picker.totp.label',
		descriptionKey: 'settings.personal.twoFactor.picker.totp.description',
	},
	{
		method: 'passkey',
		icon: 'fingerprint',
		tone: 'passkey',
		labelKey: 'settings.personal.twoFactor.picker.passkey.label',
		descriptionKey: 'settings.personal.twoFactor.picker.passkey.description',
	},
	{
		method: 'security_key',
		icon: 'key-round',
		tone: 'security_key',
		labelKey: 'settings.personal.twoFactor.picker.security_key.label',
		descriptionKey: 'settings.personal.twoFactor.picker.security_key.description',
	},
];
</script>

<template>
	<Modal width="460px" :title="title" :name="TWO_FACTOR_METHOD_PICKER_MODAL_KEY" :center="true">
		<template #content>
			<MfaWizardSteps :current="1" :total="2" />
			<div :class="$style.stepLabel">
				{{
					i18n.baseText('settings.personal.twoFactor.picker.step', {
						interpolate: { current: 1, total: 2 },
					})
				}}
			</div>
			<div
				v-for="option in methods"
				:key="option.method"
				:class="[$style.card, { [$style.selected]: selected === option.method }]"
				role="button"
				tabindex="0"
				:data-test-id="`mfa-picker-${option.method}`"
				@click="select(option.method)"
				@keydown.enter="select(option.method)"
			>
				<div :class="[$style.iconBox, $style[`tone_${option.tone}`]]">
					<N8nIcon :icon="option.icon" />
				</div>
				<div :class="$style.cardContent">
					<div :class="$style.cardLabel">
						{{ i18n.baseText(option.labelKey as never) }}
						<span v-if="current === option.method" :class="$style.currentTag">
							{{ i18n.baseText('settings.personal.twoFactor.picker.current') }}
						</span>
					</div>
					<N8nText size="small" color="text-base">
						{{ i18n.baseText(option.descriptionKey as never) }}
					</N8nText>
				</div>
			</div>
			<N8nNotice
				v-if="showReplaceWarning"
				theme="warning"
				:content="i18n.baseText('settings.personal.twoFactor.picker.replaceWarning')"
				:class="$style.warningTip"
			/>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="onCancel">
					{{ i18n.baseText('settings.personal.twoFactor.cancel') }}
				</N8nButton>
				<N8nButton :disabled="!selected" data-test-id="mfa-picker-continue" @click="onContinue">
					{{ i18n.baseText('settings.personal.twoFactor.picker.continue') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.stepLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	letter-spacing: 0.04em;
	margin-bottom: var(--spacing--sm);
	text-transform: uppercase;
	font-weight: var(--font-weight--medium);
}

.card {
	display: flex;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--md);
	margin-bottom: var(--spacing--3xs);
	cursor: pointer;
	transition:
		border-color 0.15s,
		background-color 0.15s;
	align-items: center;

	&:hover {
		border-color: var(--color--primary);
		background-color: var(--color--background--light-2);
	}

	&:focus-visible {
		outline: none;
		border-color: var(--color--primary);
	}
}

.selected {
	border-color: var(--color--primary);
	background-color: var(--color--background--light-2);
}

.iconBox {
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--sm);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	font-size: var(--font-size--md);
}

.tone_totp {
	background: var(--color--green-alpha-100);
	color: var(--color--green-500);
}

.tone_passkey {
	background: var(--background--info);
	color: var(--color--blue-500);
}

.tone_security_key {
	background: var(--color--orange-alpha-100);
	color: var(--color--orange-500);
}

.cardContent {
	flex: 1;
	min-width: 0;
}

.cardLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
	margin-bottom: var(--spacing--4xs);
}

.currentTag {
	display: inline-block;
	font-size: var(--font-size--3xs);
	background: var(--color--background--light-2);
	color: var(--color--primary);
	border: var(--border-width) var(--border-style) var(--color--primary);
	border-radius: var(--radius--3xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	margin-left: var(--spacing--3xs);
	vertical-align: middle;
	font-weight: var(--font-weight--medium);
}

.warningTip {
	margin-top: var(--spacing--xs);
}

.footer {
	display: flex;
	gap: var(--spacing--3xs);
	justify-content: flex-end;
}
</style>
