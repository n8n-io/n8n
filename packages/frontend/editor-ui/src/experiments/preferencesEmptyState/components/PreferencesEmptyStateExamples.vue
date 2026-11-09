<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';

import {
	PREFERENCE_EXAMPLE_CARDS,
	type PreferenceExample,
	type PreferenceExampleCard,
} from '../preferenceExamples';

const emit = defineEmits<{
	'use-example': [example: PreferenceExample];
	'write-own': [];
}>();

const i18n = useI18n();

function useExample(card: PreferenceExampleCard) {
	emit('use-example', { id: card.id, content: i18n.baseText(card.contentKey) });
}
</script>

<template>
	<div :class="$style.emptyState" data-test-id="preferences-empty-state-examples">
		<N8nHeading tag="h2" size="medium" bold>
			{{ i18n.baseText('experiments.preferencesEmptyState.examples.title') }}
		</N8nHeading>
		<N8nText color="text-light" :class="$style.description">
			{{ i18n.baseText('experiments.preferencesEmptyState.examples.description') }}
		</N8nText>
		<ul :class="$style.grid">
			<li v-for="card in PREFERENCE_EXAMPLE_CARDS" :key="card.id">
				<N8nCard :class="$style.card" :data-test-id="`preferences-example-${card.id}`">
					<template #header>
						<span :class="$style.category">
							<span :class="$style.categoryIcon">
								<N8nIcon :icon="card.icon" size="small" />
							</span>
							<N8nText size="small" color="text-base">
								{{ i18n.baseText(card.categoryKey) }}
							</N8nText>
						</span>
					</template>
					<N8nText tag="p" color="text-dark" :class="$style.content">
						{{ i18n.baseText(card.contentKey) }}
					</N8nText>
					<template #footer>
						<N8nText size="small" color="text-light" :class="$style.scope">
							<N8nIcon icon="user" size="small" />
							{{ i18n.baseText('experiments.preferencesEmptyState.examples.scope') }}
						</N8nText>
						<N8nButton
							variant="outline"
							size="small"
							data-test-id="preferences-example-use-button"
							@click="useExample(card)"
						>
							{{ i18n.baseText('experiments.preferencesEmptyState.examples.use') }}
						</N8nButton>
					</template>
				</N8nCard>
			</li>
		</ul>
		<N8nButton
			variant="solid"
			data-test-id="preferences-empty-state-write-own"
			@click="emit('write-own')"
		>
			<N8nIcon icon="plus" />
			{{ i18n.baseText('experiments.preferencesEmptyState.writeOwn') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
	text-align: center;
}

.description {
	max-width: 34rem;
}

.grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--xs);
	width: 100%;
	max-width: 48rem;
	margin: var(--spacing--xs) 0;
	padding: 0;
	list-style: none;
	text-align: left;
}

.card {
	height: 100%;
	align-items: stretch;
}

.category {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.categoryIcon {
	display: grid;
	place-items: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	border: var(--border);
	border-radius: var(--radius--3xs);
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
}

.content {
	flex: 1;
	padding: var(--spacing--2xs) 0 var(--spacing--sm);
}

.scope {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
