<script lang="ts" setup>
import type { BreakingChangeRecommendation } from '@n8n/api-types';
import { N8nCallout, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import { BREAKING_CHANGES_DOCUMENTATION_URL } from '../constants';

defineOptions({ name: 'HowToFixPanel' });

const props = defineProps<{
	recommendations: BreakingChangeRecommendation[];
	// The rule's own docs page. Falls back to the general breaking-changes docs.
	documentationUrl?: string;
	// True when the table offers a "Migrate" action for this rule.
	migratable: boolean;
}>();

const i18n = useI18n();

const fallbackDocumentationUrl = computed(
	() => props.documentationUrl ?? BREAKING_CHANGES_DOCUMENTATION_URL,
);
</script>

<template>
	<N8nCallout theme="info" icon="lightbulb" data-test-id="migration-rule-how-to-fix">
		<div :class="$style.body">
			<N8nText tag="h3" size="small" bold color="text-dark">
				{{ i18n.baseText('settings.migrationReport.detail.howToFix.title') }}
			</N8nText>

			<ul v-if="recommendations.length" :class="$style.list">
				<li v-for="(rec, index) in recommendations" :key="index" :class="$style.item">
					<N8nText size="small" bold color="text-dark">{{ rec.action }}</N8nText>
					<N8nText size="small" color="text-base">{{ rec.description }}</N8nText>
				</li>
			</ul>

			<N8nText v-else size="small" color="text-base">
				<I18nT
					keypath="settings.migrationReport.detail.howToFix.fallback"
					tag="span"
					scope="global"
				>
					<template #link>
						<N8nLink
							theme="text"
							:href="fallbackDocumentationUrl"
							target="_blank"
							rel="noopener noreferrer"
							data-test-id="migration-rule-how-to-fix-docs-link"
						>
							<span :class="$style.underlinedText">{{
								i18n.baseText('settings.migrationReport.detail.howToFix.fallback.link')
							}}</span>
						</N8nLink>
					</template>
				</I18nT>
			</N8nText>

			<N8nText
				v-if="migratable"
				size="small"
				color="text-base"
				data-test-id="migration-rule-how-to-fix-migratable"
			>
				{{ i18n.baseText('settings.migrationReport.detail.howToFix.migratable') }}
			</N8nText>
		</div>
	</N8nCallout>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.list {
	list-style-type: disc;
	padding-left: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.item {
	display: flex;
	flex-direction: column;
}

.underlinedText {
	text-decoration: underline;
}
</style>
