<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';

import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import {
	OEM_PROTOTYPE_TICKETS,
	isOemPrototypeTicket,
} from '@/features/oemPrototype/oemPrototype.constants';

const route = useRoute();
const uiStore = useUIStore();
const i18n = useI18n();

const ticket = computed(() =>
	isOemPrototypeTicket(route.params.ticket) ? route.params.ticket : 'API-317',
);
const title = computed(() => i18n.baseText(OEM_PROTOTYPE_TICKETS[ticket.value].titleKey));
const isDark = computed(() => uiStore.appliedTheme === 'dark');

function toggleTheme() {
	uiStore.setTheme(isDark.value ? 'light' : 'dark');
}
</script>

<template>
	<div :class="$style.bar">
		<strong>{{ ticket }}</strong>
		<span :class="$style.title">{{ title }}</span>
		<span :class="$style.spacer" />
		<button type="button" :class="$style.control" :aria-pressed="isDark" @click="toggleTheme">
			{{
				isDark
					? i18n.baseText('oemPrototype.theme.light')
					: i18n.baseText('oemPrototype.theme.dark')
			}}
		</button>
		<RouterLink :class="$style.control" :to="{ name: VIEWS.OEM_PROTOTYPE_HUB }">
			{{ i18n.baseText('oemPrototype.backToHub') }}
		</RouterLink>
	</div>
</template>

<style lang="scss" module>
.bar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--lg);
	background: var(--color--neutral-950);
	color: var(--color--neutral-50);
	border-bottom: var(--border-width) var(--border-style) var(--color--neutral-700);
	font-size: var(--font-size--sm);
}

:global(body[data-theme='dark']) .bar {
	background: var(--color--neutral-50);
	color: var(--color--neutral-950);
}

.title {
	color: var(--color--neutral-400);
}

:global(body[data-theme='dark']) .title {
	color: var(--color--neutral-600);
}

.spacer {
	flex: 1;
}

.control {
	appearance: none;
	padding: var(--spacing--3xs) var(--spacing--xs);
	background: transparent;
	color: inherit;
	border: var(--border-width) var(--border-style) currentColor;
	border-radius: var(--radius);
	font: inherit;
	text-decoration: none;
	cursor: pointer;
}
</style>
