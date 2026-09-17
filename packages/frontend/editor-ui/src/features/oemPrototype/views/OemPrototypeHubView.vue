<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { OEM_PROTOTYPE_TICKETS } from '@/features/oemPrototype/oemPrototype.constants';

const i18n = useI18n();
const router = useRouter();

const prototypes = Object.entries(OEM_PROTOTYPE_TICKETS).map(([ticket, prototype]) => ({
	ticket,
	title: i18n.baseText(prototype.titleKey),
	linearUrl: prototype.linearUrl,
	prototypeUrl: router.resolve({
		name: VIEWS.OEM_PROTOTYPE_LAUNCH,
		params: { ticket },
	}).href,
}));
</script>

<template>
	<main :class="$style.shell">
		<h1 :class="$style.title">{{ i18n.baseText('oemPrototype.hub.title') }}</h1>
		<p :class="$style.description">{{ i18n.baseText('oemPrototype.hub.description') }}</p>
		<div :class="$style.grid">
			<article v-for="prototype in prototypes" :key="prototype.ticket" :class="$style.card">
				<h2 :class="$style.cardTitle">
					<a :href="prototype.prototypeUrl" target="_blank" rel="noopener noreferrer">
						{{ prototype.title }}
					</a>
				</h2>
				<a
					:class="$style.ticket"
					:href="prototype.linearUrl"
					target="_blank"
					rel="noopener noreferrer"
				>
					{{ prototype.ticket }}
				</a>
			</article>
		</div>
	</main>
</template>

<style lang="scss" module>
.shell {
	width: min(56rem, 100%);
	margin: 0 auto;
	padding: var(--spacing--2xl) var(--spacing--lg);
}

.title {
	margin: 0 0 var(--spacing--sm);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--2xl);
}

.description {
	margin: 0 0 var(--spacing--xl);
	color: var(--color--text--shade-2);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	gap: var(--spacing--lg);
}

.card {
	padding: var(--spacing--lg);
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
}

.cardTitle {
	margin: 0 0 var(--spacing--xs);
	font-size: var(--font-size--lg);

	a {
		color: var(--color--text--shade-1);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
			text-underline-offset: var(--spacing--4xs);
		}
	}
}

.ticket {
	color: var(--color--text--shade-2);
	font-size: var(--font-size--sm);
	text-underline-offset: var(--spacing--4xs);
}
</style>
