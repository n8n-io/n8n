<script setup lang="ts">
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const emit = defineEmits<{ 'build-website': [] }>();

const i18n = useI18n();

const cards = [
	{
		titleKey: 'instanceAi.projectHome.agents.title' as const,
		bodyKey: 'instanceAi.projectHome.agents.body' as const,
	},
	{
		titleKey: 'instanceAi.projectHome.approvals.title' as const,
		bodyKey: 'instanceAi.projectHome.approvals.body' as const,
	},
	{
		titleKey: 'instanceAi.projectHome.people.title' as const,
		bodyKey: 'instanceAi.projectHome.people.body' as const,
	},
];
</script>

<template>
	<section :class="$style.home" data-test-id="instance-ai-project-home">
		<div :class="$style.heading">
			<N8nText tag="h2" size="large" bold>{{
				i18n.baseText('instanceAi.projectHome.title')
			}}</N8nText>
			<N8nButton
				size="small"
				icon="code"
				data-test-id="instance-ai-build-website"
				@click="emit('build-website')"
			>
				{{ i18n.baseText('instanceAi.projectHome.buildWebsite') }}
			</N8nButton>
		</div>
		<N8nCallout theme="info" slim>
			{{ i18n.baseText('instanceAi.projectHome.mcp') }}
		</N8nCallout>
		<div :class="$style.cards">
			<article v-for="card in cards" :key="card.titleKey" :class="$style.card">
				<N8nText tag="h3" size="small" bold>{{ i18n.baseText(card.titleKey) }}</N8nText>
				<N8nText size="small" color="text-light">{{ i18n.baseText(card.bodyKey) }}</N8nText>
			</article>
		</div>
	</section>
</template>

<style lang="scss" module>
.home {
	width: 100%;
	/* Matches the composer width. No spacing token is 680px. */
	max-width: 680px;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.cards {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--xs);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-3);
	min-width: 0;
}

@media (max-width: 50rem) {
	.cards {
		grid-template-columns: 1fr;
	}
}
</style>
