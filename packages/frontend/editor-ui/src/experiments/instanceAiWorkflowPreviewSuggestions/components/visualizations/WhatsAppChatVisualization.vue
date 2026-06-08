<script lang="ts" setup>
import { ref, watch, onUnmounted } from 'vue';

const APPEAR_DELAY_MS = 200;
const BUBBLE_DELAY_MS = 350;
const COMPLETE_DELAY_MS = BUBBLE_DELAY_MS + 700;

const WHATSAPP_ICON =
	'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2260%22%20height%3D%2260%22%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20viewBox%3D%220%200%2048%2048%22%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22m4.868%2043.303%202.694-9.835a18.94%2018.94%200%200%201-2.535-9.489C5.032%2013.514%2013.548%205%2024.014%205a18.87%2018.87%200%200%201%2013.43%205.566A18.87%2018.87%200%200%201%2043%2023.994c-.004%2010.465-8.522%2018.98-18.986%2018.98h-.008a19%2019%200%200%201-9.073-2.311z%22/%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M4.868%2043.803a.5.5%200%200%201-.482-.631l2.639-9.636a19.5%2019.5%200%200%201-2.497-9.556C4.532%2013.238%2013.273%204.5%2024.014%204.5a19.37%2019.37%200%200%201%2013.784%205.713A19.36%2019.36%200%200%201%2043.5%2023.994c-.004%2010.741-8.746%2019.48-19.486%2019.48a19.54%2019.54%200%200%201-9.144-2.277l-9.875%202.589a.5.5%200%200%201-.127.017%22/%3E%3Cpath%20fill%3D%22%23cfd8dc%22%20d%3D%22M24.014%205a18.87%2018.87%200%200%201%2013.43%205.566A18.87%2018.87%200%200%201%2043%2023.994c-.004%2010.465-8.522%2018.98-18.986%2018.98h-.008a19%2019%200%200%201-9.073-2.311l-10.065%202.64%202.694-9.835a18.94%2018.94%200%200%201-2.535-9.489C5.032%2013.514%2013.548%205%2024.014%205m0-1C12.998%204%204.032%2012.962%204.027%2023.979a20%2020%200%200%200%202.461%209.622L3.903%2043.04a.998.998%200%200%200%201.219%201.231l9.687-2.54a20%2020%200%200%200%209.197%202.244c11.024%200%2019.99-8.963%2019.995-19.98A19.86%2019.86%200%200%200%2038.153%209.86%2019.87%2019.87%200%200%200%2024.014%204%22/%3E%3Cpath%20fill%3D%22%2340c351%22%20d%3D%22M35.176%2012.832a15.67%2015.67%200%200%200-11.157-4.626c-8.704%200-15.783%207.076-15.787%2015.774a15.74%2015.74%200%200%200%202.413%208.396l.376.597-1.595%205.821%205.973-1.566.577.342a15.75%2015.75%200%200%200%208.032%202.199h.006c8.698%200%2015.777-7.077%2015.78-15.776a15.68%2015.68%200%200%200-4.618-11.161%22/%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M19.268%2016.045c-.355-.79-.729-.806-1.068-.82-.277-.012-.593-.011-.909-.011s-.83.119-1.265.594-1.661%201.622-1.661%203.956%201.7%204.59%201.937%204.906%203.282%205.259%208.104%207.161c4.007%201.58%204.823%201.266%205.693%201.187s2.807-1.147%203.202-2.255.395-2.057.277-2.255c-.119-.198-.435-.316-.909-.554s-2.807-1.385-3.242-1.543-.751-.237-1.068.238c-.316.474-1.225%201.543-1.502%201.859s-.554.357-1.028.119-2.002-.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285-.277-.474-.03-.731.208-.968.213-.213.474-.554.712-.831.237-.277.316-.475.474-.791s.079-.594-.04-.831c-.117-.238-1.039-2.584-1.461-3.522%22/%3E%3C/svg%3E';

const props = withDefaults(
	defineProps<{
		active: boolean;
		sender?: string;
		message?: string;
		isOutgoing?: boolean;
		slideFrom?: 'left' | 'right';
	}>(),
	{
		sender: 'Customer',
		message: 'How do I reset my password?',
		isOutgoing: false,
		slideFrom: 'right',
	},
);

const emit = defineEmits<{ complete: [] }>();

const visible = ref(false);
const bubbleVisible = ref(false);

let timers: Array<ReturnType<typeof setTimeout>> = [];

function clearTimers() {
	for (const t of timers) clearTimeout(t);
	timers = [];
}

function runAnimation() {
	visible.value = false;
	bubbleVisible.value = false;

	timers.push(
		setTimeout(() => {
			visible.value = true;
		}, APPEAR_DELAY_MS),
	);
	timers.push(
		setTimeout(() => {
			bubbleVisible.value = true;
		}, APPEAR_DELAY_MS + BUBBLE_DELAY_MS),
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
		if (val) {
			runAnimation();
		} else {
			clearTimers();
			visible.value = false;
			bubbleVisible.value = false;
		}
	},
	{ immediate: true },
);

onUnmounted(clearTimers);
</script>

<template>
	<div
		:class="[$style.card, visible && $style.cardVisible, slideFrom === 'left' && $style.slideLeft]"
	>
		<div :class="$style.header">
			<div :class="$style.avatar">
				<img :src="WHATSAPP_ICON" :class="$style.avatarIcon" alt="" />
			</div>
			<span :class="$style.sender">{{ sender }}</span>
		</div>

		<div v-if="bubbleVisible" :class="[$style.bubbleRow, isOutgoing && $style.bubbleRowOutgoing]">
			<div :class="[$style.bubble, isOutgoing ? $style.bubbleOutgoing : $style.bubbleIncoming]">
				<p :class="$style.bubbleText">{{ message }}</p>
				<svg
					v-if="isOutgoing"
					:class="$style.readTicks"
					width="18"
					height="12"
					viewBox="0 0 18 12"
					fill="none"
				>
					<path
						d="M1 6 L4.5 9.5 L10 2"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M5 6 L8.5 9.5 L14 2"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>
		</div>
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

.slideLeft {
	transform: translateX(-8px);
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
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: #25d366;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4px;
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

.bubbleRow {
	display: flex;
	justify-content: flex-start;
}

.bubbleRowOutgoing {
	justify-content: flex-end;
}

.bubble {
	max-width: 85%;
	border-radius: 8px;
	padding: 6px 10px;
	animation: bubble-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bubbleIncoming {
	background: light-dark(#ebebeb, #3a3a3a);
	border-bottom-left-radius: 2px;
}

.bubbleOutgoing {
	background: light-dark(#d9fdd3, #1a4a2a);
	border-bottom-right-radius: 2px;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 2px;
}

.bubbleText {
	margin: 0;
	font-size: var(--font-size--xs);
	color: var(--color--text--base);
	line-height: 1.4;
}

.readTicks {
	color: #8696a0;
	flex-shrink: 0;
}

@keyframes bubble-pop {
	from {
		opacity: 0;
		transform: scale(0.85);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
