<script setup lang="ts">
import type { AutomationMapSummary } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nIcon, N8nInput, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';

import { createAutomationMap, fetchAutomationMaps } from '../automationMaps.api';
import { AUTOMATION_MAP_VIEW } from '../constants';

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const { showError } = useToast();
const documentTitle = useDocumentTitle();

const maps = ref<AutomationMapSummary[]>([]);
const loading = ref(true);
const prompt = ref('');
const creating = ref(false);

const examplePrompts = [
	i18n.baseText('automationMaps.prompt.example.project'),
	i18n.baseText('automationMaps.prompt.example.folder'),
	i18n.baseText('automationMaps.prompt.example.flow'),
];

async function loadMaps() {
	try {
		maps.value = await fetchAutomationMaps(rootStore.restApiContext);
	} catch (error) {
		showError(error, i18n.baseText('automationMaps.error.load'));
	} finally {
		loading.value = false;
	}
}

async function onCreate() {
	if (!prompt.value.trim() || creating.value) return;
	creating.value = true;
	try {
		const map = await createAutomationMap(rootStore.restApiContext, prompt.value.trim());
		await router.push({ name: AUTOMATION_MAP_VIEW, params: { id: map.id } });
	} catch (error) {
		showError(error, i18n.baseText('automationMaps.error.create'));
	} finally {
		creating.value = false;
	}
}

function onPromptKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
		void onCreate();
	}
}

function openMap(map: AutomationMapSummary) {
	void router.push({ name: AUTOMATION_MAP_VIEW, params: { id: map.id } });
}

onMounted(() => {
	documentTitle.set(i18n.baseText('automationMaps.title'));
	void loadMaps();
});
</script>

<template>
	<PageViewLayout>
		<template #header>
			<ProjectHeader />
		</template>
		<div :class="$style.content" data-test-id="automation-maps-view">
			<section :class="$style.composer">
				<div :class="$style.composerHeader">
					<N8nIcon icon="waypoints" :size="20" :class="$style.composerIcon" />
					<div>
						<N8nHeading tag="h2" size="medium" bold>
							{{ i18n.baseText('automationMaps.composer.title') }}
						</N8nHeading>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('automationMaps.composer.description') }}
						</N8nText>
					</div>
				</div>
				<N8nInput
					v-model="prompt"
					type="textarea"
					:rows="2"
					:autosize="{ minRows: 2, maxRows: 5 }"
					:placeholder="i18n.baseText('automationMaps.prompt.placeholder')"
					data-test-id="automation-map-prompt"
					@keydown="onPromptKeydown"
				/>
				<div :class="$style.composerFooter">
					<div :class="$style.examples">
						<button
							v-for="example in examplePrompts"
							:key="example"
							type="button"
							:class="$style.example"
							@click="prompt = example"
						>
							{{ example }}
						</button>
					</div>
					<N8nButton
						variant="solid"
						:loading="creating"
						:disabled="!prompt.trim()"
						data-test-id="automation-map-create"
						@click="onCreate"
					>
						<N8nIcon icon="sparkles" />
						{{ i18n.baseText('automationMaps.composer.create') }}
					</N8nButton>
				</div>
			</section>

			<section>
				<N8nHeading tag="h3" size="small" bold :class="$style.sectionTitle">
					{{ i18n.baseText('automationMaps.saved.title') }}
				</N8nHeading>
				<N8nText v-if="!loading && maps.length === 0" size="small" color="text-light">
					{{ i18n.baseText('automationMaps.saved.empty') }}
				</N8nText>
				<div :class="$style.grid">
					<button
						v-for="map in maps"
						:key="map.id"
						type="button"
						:class="$style.card"
						data-test-id="automation-map-card"
						@click="openMap(map)"
					>
						<div :class="$style.cardTitle">
							<N8nIcon icon="waypoints" :size="16" />
							<N8nText bold>{{ map.name }}</N8nText>
							<N8nIcon
								v-if="map.autoUpdate"
								icon="refresh-cw"
								:size="12"
								:class="$style.autoUpdate"
							/>
						</div>
						<N8nText size="small" color="text-light" :class="$style.cardPrompt">
							“{{ map.prompt }}”
						</N8nText>
						<div :class="$style.cardMeta">
							<span>
								<N8nIcon icon="workflow" :size="12" />
								{{ map.counts.workflows }}
							</span>
							<span>
								<N8nIcon icon="table" :size="12" />
								{{ map.counts.dataTables }}
							</span>
							<span>
								<N8nIcon icon="globe" :size="12" />
								{{ map.counts.services }}
							</span>
							<span v-if="map.builtAt" :class="$style.updated">
								{{ i18n.baseText('automationMaps.updated') }}
								<N8nTimeAgo :date="map.builtAt" />
							</span>
						</div>
					</button>
				</div>
			</section>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	padding-bottom: var(--spacing--xl);
}

.composer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-3);
}

.composerHeader {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.composerIcon {
	color: var(--color--primary);
	margin-top: var(--spacing--5xs);
}

.composerFooter {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.examples {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.example {
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--color--background);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	padding: var(--spacing--4xs) var(--spacing--xs);
	cursor: pointer;

	&:hover {
		color: var(--color--primary);
		border-color: var(--color--primary);
	}
}

.sectionTitle {
	display: block;
	margin-bottom: var(--spacing--sm);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: var(--spacing--sm);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	text-align: left;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-3);
	cursor: pointer;
	transition: border-color 0.2s ease;

	&:hover {
		border-color: var(--color--primary);
	}
}

.cardTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.autoUpdate {
	color: var(--color--success);
}

.cardPrompt {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cardMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);

	span {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing--4xs);
	}
}

.updated {
	margin-left: auto;
}
</style>
