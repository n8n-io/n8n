<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useWorkflowsEmptyState } from '@/features/workflows/composables/useWorkflowsEmptyState';
import RecommendedTemplatesSection from '@/features/workflows/templates/recommendations/components/RecommendedTemplatesSection.vue';
import ReadyToRunButton from '@/features/workflows/readyToRun/components/ReadyToRunButton.vue';

const emit = defineEmits<{
	'click:add': [];
}>();

const i18n = useI18n();
const bannersStore = useBannersStore();

const {
	showRecommendedTemplatesInline,
	emptyStateHeading,
	emptyStateDescription,
	canCreateWorkflow,
} = useWorkflowsEmptyState();

const addWorkflow = () => {
	emit('click:add');
};

const containerStyle = computed(() => ({
	minHeight: `calc(100vh - ${bannersStore.bannersHeight}px)`,
}));
</script>

<template>
	<div
		:class="[
			$style.emptyStateLayout,
			{ [$style.noTemplatesContent]: !showRecommendedTemplatesInline },
		]"
		:style="containerStyle"
	>
		<div :class="$style.content">
			<N8nHeading tag="h1" size="2xlarge" bold :class="$style.welcomeTitle">
				{{ emptyStateHeading }}
			</N8nHeading>

			<div v-if="showRecommendedTemplatesInline" :class="$style.templatesSection">
				<RecommendedTemplatesSection />

				<div :class="$style.orDivider">
					<N8nText size="medium" color="text-light">
						{{ i18n.baseText('generic.or') }}
					</N8nText>
				</div>

				<div :class="$style.actionButtons">
					<ReadyToRunButton type="secondary" size="large" />
					<N8nButton
						type="secondary"
						icon="file"
						size="large"
						data-test-id="start-from-scratch-button"
						@click="addWorkflow"
					>
						{{ i18n.baseText('workflows.empty.startFromScratch') }}
					</N8nButton>
				</div>
			</div>
			<div v-else :class="$style.noTemplatesContent">
				<N8nText tag="p" size="large" color="text-base">
					{{ emptyStateDescription }}
				</N8nText>
				<N8nCard
					v-if="canCreateWorkflow && !showRecommendedTemplatesInline"
					:class="$style.actionCard"
					hoverable
					data-test-id="new-workflow-card"
					@click="addWorkflow"
				>
					<div :class="$style.cardContent">
						<N8nIcon
							:class="$style.cardIcon"
							icon="file"
							color="foreground-dark"
							:stroke-width="1.5"
						/>
						<N8nText size="large" class="mt-xs">
							{{ i18n.baseText('workflows.empty.startFromScratch') }}
						</N8nText>
					</div>
				</N8nCard>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.emptyStateLayout {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--4xl) var(--spacing--2xl) 0;
	max-width: var(--content-container--width);

	&.noTemplatesContent {
		padding-top: var(--spacing--3xl);
	}
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.welcomeTitle {
	margin-bottom: var(--spacing--2xl);
}

.actionCard {
	width: 192px;
	height: 230px;
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: var(--spacing--2xl);
	transition:
		transform 0.2s ease,
		box-shadow 0.2s ease;

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);

		.cardIcon svg {
			color: var(--color--primary);
		}
	}
}

.cardContent {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--md);
}

.cardIcon {
	font-size: 48px;
	margin-bottom: var(--spacing--xs);

	svg {
		transition: color 0.3s ease;
	}
}

.orDivider {
	margin-top: var(--spacing--lg);
	text-align: center;
}

.actionButtons {
	display: flex;
	justify-content: center;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--lg);
}
</style>
