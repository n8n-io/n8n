<script setup lang="ts">
import { N8nIcon, N8nLogo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import type { Plan } from '../assistant/planner';
import { useAssistantScreen } from '../assistant/use-assistant-screen';

const props = defineProps<{ plan: Plan }>();

const i18n = useI18n();
const { goHome } = useAssistantScreen();

const backRef = ref<HTMLButtonElement | null>(null);

// Escape mirrors the back/Cancel action so keyboard users can always retreat.
function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') goHome();
}

onMounted(() => {
	// On mount, focus the back button so keyboard users land on this screen
	// rather than on a control that no longer exists.
	backRef.value?.focus();
	window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
	<div :class="$style.view">
		<header :class="$style.header">
			<button
				ref="backRef"
				type="button"
				:class="$style.back"
				:aria-label="i18n.baseText('desktopAssistant.complex.back')"
				@click="goHome"
			>
				<N8nIcon icon="arrow-left" :size="18" aria-hidden="true" />
			</button>
			<h1 :class="$style.headerTitle">
				{{ i18n.baseText('desktopAssistant.complex.headerTitle') }}
			</h1>
		</header>

		<div :class="$style.content">
			<div :class="$style.tile" aria-hidden="true">🧩</div>
			<h2 :class="$style.title">{{ i18n.baseText('desktopAssistant.complex.title') }}</h2>
			<p :class="$style.body">
				{{
					i18n.baseText('desktopAssistant.complex.body', {
						interpolate: { title: props.plan.title },
					})
				}}
			</p>
			<div :class="$style.summary">{{ props.plan.summary }}</div>
		</div>

		<div :class="$style.footer">
			<button type="button" :class="[$style.btn, $style.btnSubtle]" @click="goHome">
				{{ i18n.baseText('desktopAssistant.complex.notNow') }}
			</button>
			<span :class="$style.spacer" />
			<button type="button" :class="[$style.btn, $style.btnSolid]" @click="goHome">
				<span :class="$style.continueLabel">
					<N8nLogo size="small" :collapsed="true" />
					{{ i18n.baseText('desktopAssistant.complex.continue') }}
				</span>
			</button>
		</div>
	</div>
</template>

<style module>
.view {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 14px var(--spacing--sm);
	background: var(--da-bg);
	border-bottom: 1px solid var(--da-border);
}

.back {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	margin-left: -6px;
	color: var(--da-subtler);
	cursor: pointer;
	background: none;
	border: none;
	border-radius: 7px;
	transition:
		background 0.12s,
		color 0.12s;
}

.back:hover {
	color: var(--da-text);
	background: var(--da-surface-2);
}

.back:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.headerTitle {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
	color: var(--da-text);
}

.content {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing--lg) var(--spacing--md);
	overflow-y: auto;
	text-align: center;
}

.tile {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56px;
	height: 56px;
	font-size: 26px;
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--radius--md);
}

.title {
	margin: var(--spacing--sm) 0 0;
	font-size: 17px;
	font-weight: 600;
	color: var(--da-text);
}

.body {
	max-width: 320px;
	margin-top: var(--spacing--2xs);
	font-size: 13px;
	line-height: 1.6;
	color: var(--da-subtler);
}

.summary {
	width: 100%;
	margin-top: 18px;
	padding: var(--spacing--xs) 14px;
	font-size: 13px;
	line-height: 1.5;
	color: var(--da-subtler);
	text-align: left;
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--da-radius);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border-top: 1px solid var(--da-border);
}

.spacer {
	flex: 1;
}

.btn {
	padding: 9px 14px;
	font: inherit;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
	border-radius: var(--da-radius-sm);
}

.btn:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.btnSolid {
	color: #fff;
	background: var(--da-accent);
	border: none;
}

.btnSolid:hover {
	background: var(--da-accent-press);
}

.btnSubtle {
	color: var(--da-text);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
}

.btnSubtle:hover {
	background: var(--da-surface);
	border-color: var(--da-border-strong);
}

.continueLabel {
	display: inline-flex;
	align-items: center;
	gap: 7px;
}
</style>
