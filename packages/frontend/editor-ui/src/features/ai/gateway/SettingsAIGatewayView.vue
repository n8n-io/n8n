<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants/navigation';
import { ModelSelect } from '@/features/ndv/parameters/components/ModelSelect';
// eslint-disable-next-line import-x/extensions
import { useAIGatewayStore } from './aiGateway.store';
const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const aiGatewayStore = useAIGatewayStore();

const modelSelectOptions = computed(() => aiGatewayStore.modelSelectOptions);
const modelsLoading = computed(() => aiGatewayStore.modelsLoading);

interface DraftModels {
	chat: string;
	text: string;
	image: string;
	file: string;
	audio: string;
}

const draft = ref<DraftModels>({
	chat: '',
	text: '',
	image: '',
	file: '',
	audio: '',
});

const saved = ref<DraftModels>({ ...draft.value });

const isSaving = ref(false);

function snapshotFromStore(): DraftModels {
	return {
		chat: aiGatewayStore.defaultChatModel,
		text: aiGatewayStore.defaultTextModel,
		image: aiGatewayStore.defaultImageModel,
		file: aiGatewayStore.defaultFileModel,
		audio: aiGatewayStore.defaultAudioModel,
	};
}

function applyDraftToRefs(source: DraftModels) {
	draft.value = { ...source };
}

const isDirty = computed(() => {
	const d = draft.value;
	const s = saved.value;
	return (
		d.chat !== s.chat ||
		d.text !== s.text ||
		d.image !== s.image ||
		d.file !== s.file ||
		d.audio !== s.audio
	);
});

const formattedCreditsRemaining = computed(() => {
	const c = aiGatewayStore.creditsRemaining;
	if (c === null || c === undefined) return null;
	return `$${c.toFixed(2)}`;
});

const usage = computed(() => aiGatewayStore.usage);
const hasUsageData = computed(() => usage.value && usage.value.totalRequests > 0);

const totalTokens = computed(() =>
	usage.value ? usage.value.totalInputTokens + usage.value.totalOutputTokens : 0,
);

const usageModels = computed(() => {
	if (!usage.value) return [];
	const byModel = (
		usage.value as {
			byModel?: Record<string, { inputTokens: number; outputTokens: number; requests: number }>;
		}
	).byModel;
	if (!byModel) return [];
	return Object.entries(byModel)
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

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.aiGateway.title'));
	await aiGatewayStore.initialize();
	await aiGatewayStore.fetchUsage();
	const snap = snapshotFromStore();
	applyDraftToRefs(snap);
	saved.value = { ...snap };
});

async function handleSave() {
	isSaving.value = true;
	try {
		await aiGatewayStore.updateInstanceModelDefaults({
			defaultChatModel: draft.value.chat,
			defaultTextModel: draft.value.text,
			defaultImageModel: draft.value.image,
			defaultFileModel: draft.value.file,
			defaultAudioModel: draft.value.audio,
		});
		saved.value = { ...draft.value };
	} finally {
		isSaving.value = false;
	}
}

function goToCredits() {
	void router.push({ name: VIEWS.CREDITS_SETTINGS });
}
</script>

<template>
	<div class="pb-3xl" :class="$style.page" data-test-id="ai-gateway-settings">
		<div :class="$style.headerTitle">
			<N8nHeading tag="h1" size="2xlarge">{{
				i18n.baseText('settings.aiGateway.title')
			}}</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.aiGateway.description') }}
			</N8nText>
			<div :class="$style.creditsRow">
				<N8nButton
					size="small"
					variant="outline"
					:label="i18n.baseText('settings.aiGateway.credits.topUp')"
					data-test-id="ai-gateway-credits-top-up"
					@click="goToCredits"
				/>
				<div :class="$style.creditsRemaining">
					<N8nIcon icon="hand-coins" :size="18" />
					<N8nText size="small" color="text-light">
						<template v-if="formattedCreditsRemaining !== null">
							{{
								i18n.baseText('settings.aiGateway.credits.remaining', {
									interpolate: { amount: formattedCreditsRemaining },
								})
							}}
						</template>
						<template v-else>—</template>
					</N8nText>
				</div>
			</div>
		</div>

		<div :class="$style.defaultsSection">
			<div :class="$style.defaultsHeadingRow">
				<div :class="$style.defaultsHeadingTitle">
					<N8nHeading size="large">
						{{ i18n.baseText('settings.aiGateway.defaults.heading') }}
					</N8nHeading>
				</div>
				<N8nButton
					variant="solid"
					:label="i18n.baseText('settings.credits.save')"
					:disabled="!isDirty"
					:loading="isSaving"
					data-test-id="ai-gateway-settings-save"
					@click="handleSave"
				/>
			</div>

			<div :class="$style.field">
				<N8nText :bold="true" size="medium">
					{{ i18n.baseText('settings.aiGateway.defaults.chatModel.label') }}
				</N8nText>
				<div :class="$style.modelSelect">
					<ModelSelect
						:options="modelSelectOptions"
						:model-value="draft.chat"
						:loading="modelsLoading"
						:default-value="saved.chat"
						@update:model-value="draft.chat = $event"
					/>
				</div>
			</div>

			<div :class="$style.field">
				<N8nText :bold="true" size="medium">
					{{ i18n.baseText('settings.aiGateway.defaults.text.label') }}
				</N8nText>
				<div :class="$style.modelSelect">
					<ModelSelect
						:options="modelSelectOptions"
						:model-value="draft.text"
						:loading="modelsLoading"
						:default-value="saved.text"
						@update:model-value="draft.text = $event"
					/>
				</div>
			</div>

			<div :class="$style.field">
				<N8nText :bold="true" size="medium">
					{{ i18n.baseText('settings.aiGateway.defaults.image.label') }}
				</N8nText>
				<div :class="$style.modelSelect">
					<ModelSelect
						:options="modelSelectOptions"
						:model-value="draft.image"
						:loading="modelsLoading"
						:default-value="saved.image"
						@update:model-value="draft.image = $event"
					/>
				</div>
			</div>

			<div :class="$style.field">
				<N8nText :bold="true" size="medium">
					{{ i18n.baseText('settings.aiGateway.defaults.file.label') }}
				</N8nText>
				<div :class="$style.modelSelect">
					<ModelSelect
						:options="modelSelectOptions"
						:model-value="draft.file"
						:loading="modelsLoading"
						:default-value="saved.file"
						@update:model-value="draft.file = $event"
					/>
				</div>
			</div>

			<div :class="$style.field">
				<N8nText :bold="true" size="medium">
					{{ i18n.baseText('settings.aiGateway.defaults.audio.label') }}
				</N8nText>
				<div :class="$style.modelSelect">
					<ModelSelect
						:options="modelSelectOptions"
						:model-value="draft.audio"
						:loading="modelsLoading"
						:default-value="saved.audio"
						@update:model-value="draft.audio = $event"
					/>
				</div>
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
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	max-width: 800px;
}

.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.creditsRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
	margin-top: var(--spacing--xs);
}

.creditsRemaining {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.defaultsSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.defaultsHeadingRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	max-width: 560px;
	flex-wrap: wrap;
}

.defaultsHeadingTitle {
	min-width: 0;
	flex: 1;
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

.modelSelect {
	margin-top: var(--spacing--3xs);
	max-width: 560px;
}

.defaultsSection .modelSelect {
	margin-top: var(--spacing--4xs);
}

.usageStats {
	display: flex;
	align-items: stretch;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.statCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm) var(--spacing--md);
	flex: 1;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);

	&:first-child {
		border-left: 0;
	}
}

.statValue {
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
