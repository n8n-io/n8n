<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { N8nHeading, N8nText, N8nSelect, N8nOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
// eslint-disable-next-line import-x/extensions
import { useAIGatewayStore } from './aiGateway.store';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const aiGatewayStore = useAIGatewayStore();

const categories = computed(() => aiGatewayStore.categories);
const selectedCategory = computed(() => aiGatewayStore.selectedCategory);
const selectedModel = computed(() => aiGatewayStore.selectedModel);
const isManualMode = computed(() => aiGatewayStore.selectedCategory === 'manual');
const allModels = computed(() => aiGatewayStore.availableModels);
const usage = computed(() => aiGatewayStore.usage);
const hasUsageData = computed(() => usage.value && usage.value.totalRequests > 0);

const totalTokens = computed(() =>
	usage.value ? usage.value.totalInputTokens + usage.value.totalOutputTokens : 0,
);

const usageModels = computed(() => {
	if (!usage.value) return [];
	return Object.entries(usage.value.byModel)
		.map(([id, stats]) => ({
			id,
			displayName: id.includes('/') ? id.split('/').pop()! : id,
			provider: id.includes('/') ? id.split('/')[0] : '',
			...stats,
			totalTokens: stats.inputTokens + stats.outputTokens,
		}))
		.sort((a, b) => b.totalTokens - a.totalTokens);
});

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function tokenPercent(modelTokens: number): number {
	return totalTokens.value > 0 ? (modelTokens / totalTokens.value) * 100 : 0;
}

async function onCategoryChange(value: string) {
	aiGatewayStore.setCategory(value);
	await aiGatewayStore.updateDefaultCategory(value);
}

async function onModelChange(value: string) {
	aiGatewayStore.setModel(value);
	await aiGatewayStore.updateDefaultCategory(aiGatewayStore.selectedCategory);
}

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.aiGateway.title'));
	void aiGatewayStore.initialize();
	void aiGatewayStore.fetchUsage();
});
</script>

<template>
	<div :class="$style.container" data-test-id="ai-gateway-settings">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.aiGateway.title') }}</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.aiGateway.description') }}
			</N8nText>
		</div>

		<div :class="$style.section">
			<div :class="$style.field">
				<N8nText :bold="true" size="medium">
					{{ i18n.baseText('settings.aiGateway.category.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.aiGateway.category.description') }}
				</N8nText>
				<N8nSelect
					:model-value="selectedCategory"
					size="medium"
					@update:model-value="onCategoryChange"
				>
					<N8nOption v-for="cat in categories" :key="cat.id" :value="cat.id" :label="cat.label" />
				</N8nSelect>
			</div>

			<div v-if="isManualMode" :class="$style.field">
				<N8nText :bold="true" size="medium">
					{{ i18n.baseText('settings.aiGateway.model.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.aiGateway.model.description') }}
				</N8nText>
				<N8nSelect
					:model-value="selectedModel"
					:placeholder="i18n.baseText('settings.aiGateway.model.placeholder')"
					size="medium"
					filterable
					@update:model-value="onModelChange"
				>
					<N8nOption
						v-for="model in allModels"
						:key="model.id"
						:value="model.id"
						:label="model.name"
					/>
				</N8nSelect>
			</div>
		</div>

		<div :class="$style.section">
			<div :class="$style.field">
				<N8nHeading size="large">
					{{ i18n.baseText('settings.aiGateway.usage.title') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.aiGateway.usage.description') }}
				</N8nText>
			</div>

			<template v-if="hasUsageData">
				<div :class="$style.usageStats">
					<div :class="$style.statCard">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.aiGateway.usage.totalRequests') }}
						</N8nText>
						<span :class="$style.statValue">{{ formatNumber(usage!.totalRequests) }}</span>
					</div>
					<div :class="$style.statCard">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.aiGateway.usage.totalTokens') }}
						</N8nText>
						<span :class="$style.statValue">{{ formatNumber(totalTokens) }}</span>
					</div>
					<div :class="$style.statCard">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.aiGateway.usage.totalInputTokens') }}
						</N8nText>
						<span :class="$style.statValue">{{ formatNumber(usage!.totalInputTokens) }}</span>
					</div>
					<div :class="$style.statCard">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.aiGateway.usage.totalOutputTokens') }}
						</N8nText>
						<span :class="$style.statValue">{{ formatNumber(usage!.totalOutputTokens) }}</span>
					</div>
				</div>

				<div v-if="usageModels.length > 0" :class="$style.modelsSection">
					<N8nText :bold="true" size="medium">
						{{ i18n.baseText('settings.aiGateway.usage.byModel') }}
					</N8nText>
					<div :class="$style.modelList">
						<div v-for="model in usageModels" :key="model.id" :class="$style.modelRow">
							<div :class="$style.modelInfo">
								<div :class="$style.modelName">
									<N8nText :bold="true" size="small">{{ model.displayName }}</N8nText>
									<N8nText v-if="model.provider" size="small" color="text-light">
										{{ model.provider }}
									</N8nText>
								</div>
								<div :class="$style.modelMeta">
									<span :class="$style.modelMetaItem">
										{{ formatNumber(model.requests) }}
										{{ model.requests === 1 ? 'request' : 'requests' }}
									</span>
									<span :class="$style.modelMetaSep" />
									<span :class="$style.modelMetaItem">
										{{ formatNumber(model.inputTokens) }} in /
										{{ formatNumber(model.outputTokens) }} out
									</span>
								</div>
							</div>
							<div :class="$style.modelBarRow">
								<div :class="$style.modelBar">
									<div
										:class="$style.modelBarFill"
										:style="{ width: `${tokenPercent(model.totalTokens)}%` }"
									/>
								</div>
								<N8nText size="small" color="text-light" :class="$style.modelBarPercent">
									{{ tokenPercent(model.totalTokens).toFixed(0) }}%
								</N8nText>
							</div>
						</div>
					</div>
				</div>
			</template>

			<div v-else :class="$style.emptyState">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.aiGateway.usage.noData') }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.usageStats {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: var(--spacing--xs);
}

.statCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--lg);
}

.statValue {
	border: var(--border);
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--sm);
	color: var(--color--text);
}

.modelsSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.modelList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.modelRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.modelInfo {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.modelName {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.modelMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}

.modelMetaSep {
	width: 3px;
	height: 3px;
	border-radius: 50%;
	background: var(--color--text--tint-2);
}

.modelMetaItem {
	white-space: nowrap;
}

.modelBar {
	height: 4px;
	border-radius: 2px;
	background: var(--color--foreground--tint-1);
	.modelBarRow {
		display: flex;
		align-items: center;
		gap: var(--spacing--3xs);
	}

	.modelBarPercent {
		flex-shrink: 0;
		width: 32px;
		text-align: right;
	}

	overflow: hidden;
	flex: 1;
}

.modelBarFill {
	height: 100%;
	border-radius: 2px;
	background: var(--color--primary);
	min-width: 2px;
	transition: width 0.3s ease;
}

.emptyState {
	padding: var(--spacing--xl) 0;
	text-align: center;
}
</style>
