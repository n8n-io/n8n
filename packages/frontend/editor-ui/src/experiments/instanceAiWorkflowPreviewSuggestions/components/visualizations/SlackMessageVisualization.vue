<script lang="ts" setup>
import { ref, watch, onUnmounted } from 'vue';

const APPEAR_DELAY_MS = 200;
const COMPLETE_DELAY_MS = 600;

const props = withDefaults(
	defineProps<{
		active: boolean;
		sender?: string;
		message?: string;
	}>(),
	{
		sender: 'n8n Bot',
		message: 'Urgent ticket: Login page broken',
	},
);

const emit = defineEmits<{
	complete: [];
}>();

const visible = ref(false);
let timers: Array<ReturnType<typeof setTimeout>> = [];

function clearTimers() {
	for (const t of timers) clearTimeout(t);
	timers = [];
}

function runAnimation() {
	visible.value = false;

	timers.push(
		setTimeout(() => {
			visible.value = true;
		}, APPEAR_DELAY_MS),
	);

	timers.push(
		setTimeout(() => {
			emit('complete');
		}, APPEAR_DELAY_MS + COMPLETE_DELAY_MS),
	);
}

watch(
	() => props.active,
	(val) => {
		if (val) runAnimation();
		else clearTimers();
	},
	{ immediate: true },
);

onUnmounted(clearTimers);
</script>

<template>
	<div :class="[$style.card, visible && $style.cardVisible]">
		<div :class="$style.header">
			<div :class="$style.avatar">
				<img
					:class="$style.avatarIcon"
					src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' fill='%23fff' fill-rule='evenodd' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 150.852 150.852'%3E%3Cuse xlink:href='%23a' x='.926' y='.926'/%3E%3Csymbol id='a' overflow='visible'%3E%3Cg stroke-width='1.852'%3E%3Cpath fill='%23e01e5a' stroke='%23e01e5a' d='M40.741 93.55c0-8.735 6.607-15.772 14.815-15.772s14.815 7.037 14.815 15.772v38.824c0 8.737-6.607 15.774-14.815 15.774s-14.815-7.037-14.815-15.772z'/%3E%3Cpath fill='%23ecb22d' stroke='%23ecb22d' d='M93.55 107.408c-8.735 0-15.772-6.607-15.772-14.815s7.037-14.815 15.772-14.815h38.826c8.735 0 15.772 6.607 15.772 14.815s-7.037 14.815-15.772 14.815z'/%3E%3Cpath fill='%232fb67c' stroke='%232fb67c' d='M77.778 15.772C77.778 7.037 84.385 0 92.593 0s14.815 7.037 14.815 15.772v38.826c0 8.735-6.607 15.772-14.815 15.772s-14.815-7.037-14.815-15.772z'/%3E%3Cpath fill='%2336c5f1' stroke='%2336c5f1' d='M15.772 70.371C7.037 70.371 0 63.763 0 55.556s7.037-14.815 15.772-14.815h38.826c8.735 0 15.772 6.607 15.772 14.815s-7.037 14.815-15.772 14.815z'/%3E%3Cg stroke-linejoin='miter'%3E%3Cpath fill='%23ecb22d' stroke='%23ecb22d' d='M77.778 133.333c0 8.208 6.607 14.815 14.815 14.815s14.815-6.607 14.815-14.815-6.607-14.815-14.815-14.815H77.778z'/%3E%3Cpath fill='%232fb67c' stroke='%232fb67c' d='M133.334 70.371h-14.815V55.556c0-8.207 6.607-14.815 14.815-14.815s14.815 6.607 14.815 14.815-6.607 14.815-14.815 14.815z'/%3E%3Cpath fill='%23e01e5a' stroke='%23e01e5a' d='M14.815 77.778H29.63v14.815c0 8.207-6.607 14.815-14.815 14.815S0 100.8 0 92.593s6.607-14.815 14.815-14.815z'/%3E%3Cpath fill='%2336c5f1' stroke='%2336c5f1' d='M70.371 14.815V29.63H55.556c-8.207 0-14.815-6.607-14.815-14.815S47.348 0 55.556 0s14.815 6.607 14.815 14.815z'/%3E%3C/g%3E%3C/g%3E%3C/symbol%3E%3C/svg%3E"
					alt=""
				/>
			</div>
			<span :class="$style.sender">{{ props.sender }}</span>
		</div>
		<p :class="$style.message">{{ props.message }}</p>
	</div>
</template>

<style lang="scss" module>
.card {
	width: 280px;
	padding: var(--spacing--sm) var(--spacing--md);
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: 1px solid
		light-dark(
			oklch(from var(--color--neutral-black) l c h / 0.08),
			oklch(from var(--color--neutral-white) l c h / 0.12)
		);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	opacity: 0;
	transform: translateX(8px);
	transition:
		opacity 0.3s ease,
		transform 0.3s ease;
}

.cardVisible {
	opacity: 1;
	transform: translateX(0);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.avatar {
	width: 32px;
	height: 32px;
	border-radius: 6px;
	background: var(--color--neutral-700);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 5px;
}

.avatarIcon {
	width: 100%;
	height: 100%;
}

.sender {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--base);
}

.message {
	margin: 0;
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	line-height: 1.5;
}
</style>
