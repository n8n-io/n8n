<script setup lang="ts">
import { JSONUIProvider, Renderer, type Spec } from '@json-render/vue';
import {
	N8nButton,
	N8nHeading,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import { jsonParse, type IConnections, type INode } from 'n8n-workflow';
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue';
import FollowUpBar from '../FollowUpBar.vue';
import NodeBrand from '../components/NodeBrand.vue';
import { provideGenerativeUiLookOnly, provideGenerativeUiNodes } from '../nodeLookup';
import { registry } from '../registry';
import { buildFallbackSpec } from '../workflowGenerativeUi.store';
import {
	useWorkflowGenerativeUiStore,
	type WorkflowGenerativeUiError,
	type WorkflowGenerativeUiView,
} from '../workflowGenerativeUi.store';
import { buildWorkflowUiPayload } from '../workflowPayload';

type WorkflowFixture = {
	name: string;
	nodes: INode[];
	connections: IConnections;
};

type FixtureId = 'leads' | 'ops' | 'interview';

const fixtureModules = import.meta.glob('./fixtures/*.json', { eager: true, import: 'default' });

function loadFixture(path: string): WorkflowFixture {
	const fixture = fixtureModules[path];
	if (fixture === undefined) throw new Error(`Missing workflow fixture: ${path}`);
	return jsonParse<WorkflowFixture>(JSON.stringify(fixture));
}

const fixtures: Array<{ id: FixtureId; label: string; workflow: WorkflowFixture }> = [
	{
		id: 'leads',
		label: 'Lead qualification',
		workflow: loadFixture('./fixtures/leads.json'),
	},
	{
		id: 'ops',
		label: 'Service recovery',
		workflow: loadFixture('./fixtures/ops.json'),
	},
	{
		id: 'interview',
		label: 'Interview coordination',
		workflow: loadFixture('./fixtures/interview.json'),
	},
];

const store = useWorkflowGenerativeUiStore();
const selectedFixtureId = ref<FixtureId>('leads');
const highlightedNodeId = ref<string | null>(null);
const apiKeyDraft = ref(store.apiKey ?? '');
const activeFixture = computed(
	() => fixtures.find((fixture) => fixture.id === selectedFixtureId.value) ?? fixtures[0],
);
const nodes = computed(() => activeFixture.value.workflow.nodes);

provideGenerativeUiNodes(nodes);
provideGenerativeUiLookOnly(toRef(store, 'lookOnly'));

store.setWorkflowGetter(() => ({
	name: activeFixture.value.workflow.name,
	nodes: activeFixture.value.workflow.nodes.map((node) => ({ ...node })),
	connections: activeFixture.value.workflow.connections,
}));

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSpec(value: unknown): value is Spec {
	return (
		isRecord(value) &&
		typeof value.root === 'string' &&
		isRecord(value.elements) &&
		isRecord(value.elements[value.root])
	);
}

function isFixtureId(value: unknown): value is FixtureId {
	return value === 'leads' || value === 'ops' || value === 'interview';
}

function isGeneratedView(value: unknown): value is Exclude<WorkflowGenerativeUiView, 'canvas'> {
	return value === 'story' || value === 'play';
}

function selectFixture(value: unknown) {
	if (isFixtureId(value)) selectedFixtureId.value = value;
}

function selectView(value: unknown) {
	if (isGeneratedView(value)) void store.setView(value);
}

function saveApiKey() {
	store.apiKey = apiKeyDraft.value.trim();
	if (store.apiKey) void store.regenerate();
}

const fallbackSpec = computed(() =>
	buildFallbackSpec(
		buildWorkflowUiPayload({
			name: activeFixture.value.workflow.name,
			nodes: activeFixture.value.workflow.nodes.map((node) => ({ ...node })),
			connections: activeFixture.value.workflow.connections,
		}),
	),
);
const hasParseFailure = computed(() => store.activeSpec !== undefined && !isSpec(store.activeSpec));
const renderSpec = computed<Spec | null>(() => {
	if (isSpec(store.activeSpec)) return store.activeSpec;
	if (hasParseFailure.value) return fallbackSpec.value;
	return null;
});

const errorMessages: Record<WorkflowGenerativeUiError, string> = {
	'missing-key': 'Enter an Anthropic API key to generate this view.',
	'missing-workflow': 'The workflow is not available.',
	unauthorized: 'The API key was rejected. Update it and try again.',
	'generate-failed': 'Generation failed. Showing a basic workflow view.',
};
const errorMessage = computed(() => (store.error ? errorMessages[store.error] : null));

const handlers = {
	openNode: (params: Record<string, unknown> = {}) => {
		const nodeId = typeof params.nodeId === 'string' ? params.nodeId : null;
		if (!store.lookOnly && nodes.value.some((node) => node.id === nodeId)) {
			highlightedNodeId.value = nodeId;
		}
		return Promise.resolve();
	},
};

watch(
	() => store.apiKey,
	(apiKey) => {
		apiKeyDraft.value = apiKey ?? '';
	},
);

watch(selectedFixtureId, () => {
	highlightedNodeId.value = null;
	store.invalidateHistories();
	if (store.view !== 'canvas') void store.setView(store.view);
});

onBeforeUnmount(() => {
	store.invalidateHistories();
	void store.setView('canvas');
});
</script>

<template>
	<main :class="$style.playground">
		<header :class="$style.header">
			<div>
				<N8nHeading tag="h1" size="xlarge">Workflow generative UI playground</N8nHeading>
				<N8nText color="text-light">
					Preview generated workflow views against credential-free fixtures.
				</N8nText>
			</div>
			<div :class="$style.controls">
				<N8nSelect
					:model-value="selectedFixtureId"
					aria-label="Workflow template"
					data-testid="generative-ui-template"
					@update:model-value="selectFixture"
				>
					<N8nOption
						v-for="fixture in fixtures"
						:key="fixture.id"
						:label="fixture.label"
						:value="fixture.id"
					/>
				</N8nSelect>
				<N8nSelect
					:model-value="store.view === 'canvas' ? '' : store.view"
					placeholder="Pick a view"
					aria-label="Workflow view"
					data-testid="generative-ui-playground-view"
					@update:model-value="selectView"
				>
					<N8nOption label="Story" value="story" />
					<N8nOption label="Play-by-play" value="play" />
				</N8nSelect>
				<N8nSwitch2 v-model="store.lookOnly" label="Look only" />
				<N8nButton
					variant="subtle"
					:loading="store.isGenerating"
					:disabled="store.isGenerating || store.view === 'canvas'"
					@click="store.regenerate"
				>
					Regenerate
				</N8nButton>
				<N8nButton
					variant="ghost"
					:disabled="!store.canUndo || store.isGenerating"
					@click="store.undo"
				>
					Undo
				</N8nButton>
			</div>
			<form
				v-if="store.error === 'missing-key'"
				:class="$style.apiKey"
				data-testid="generative-ui-playground-api-key"
				@submit.prevent="saveApiKey"
			>
				<N8nInput
					v-model="apiKeyDraft"
					type="password"
					placeholder="Anthropic API key"
					aria-label="Anthropic API key"
				/>
				<N8nButton type="submit" :disabled="!apiKeyDraft.trim()">Save</N8nButton>
			</form>
		</header>

		<section :class="$style.workspace">
			<aside :class="$style.nodes" aria-label="Fixture nodes">
				<N8nHeading tag="h2" size="medium">{{ activeFixture.workflow.name }}</N8nHeading>
				<ol :class="$style.nodeList">
					<li
						v-for="node in nodes"
						:key="node.id"
						:class="[$style.node, { [$style.highlighted]: node.id === highlightedNodeId }]"
					>
						<NodeBrand :node-id="node.id" />
						<N8nText>{{ node.name }}</N8nText>
					</li>
				</ol>
			</aside>

			<div :class="$style.preview">
				<N8nText v-if="errorMessage" color="danger" :class="$style.error">
					{{ errorMessage }}
				</N8nText>
				<div v-if="store.isGenerating && !renderSpec" :class="$style.status">
					<N8nText>Generating…</N8nText>
				</div>
				<JSONUIProvider v-else-if="renderSpec" :registry="registry" :handlers="handlers">
					<Renderer :spec="renderSpec" :registry="registry" :loading="store.isGenerating" />
				</JSONUIProvider>
				<div v-else :class="$style.status">
					<N8nText>Pick a view to generate one.</N8nText>
				</div>
				<FollowUpBar />
			</div>
		</section>
	</main>
</template>

<style lang="scss" module>
.playground {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	min-height: 100vh;
	padding: var(--spacing--lg);
	color: var(--text-color);
	background: var(--background--subtle);
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.controls {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.apiKey {
	display: flex;
	flex-basis: 100%;
	gap: var(--spacing--2xs);
	max-width: var(--spacing--5xl);
	margin-left: auto;
}

.workspace {
	display: grid;
	grid-template-columns: minmax(calc(var(--spacing--5xl) / 2), var(--spacing--5xl)) minmax(0, 1fr);
	flex: 1;
	min-height: 0;
	overflow: hidden;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--sm);
}

.nodes {
	overflow: auto;
	padding: var(--spacing--sm);
	background: var(--background--subtle);
	border-right: var(--border);
}

.nodeList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: 0;
	margin: var(--spacing--sm) 0 0;
	list-style: none;
}

.node {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	background: var(--background--surface);
	border-radius: var(--radius--sm);
}

.highlighted {
	outline: var(--focus--border-width) solid var(--focus--outline-color);
	outline-offset: var(--spacing--5xs);
}

.preview {
	position: relative;
	overflow: auto;
	padding: var(--spacing--2xl) var(--spacing--lg) calc(var(--spacing--3xl) + var(--spacing--lg));
}

.error {
	display: block;
	margin-bottom: var(--spacing--sm);
	text-align: center;
}

.status {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100%;
}

@media (max-width: 768px) {
	.workspace {
		grid-template-columns: 1fr;
	}

	.nodes {
		border-right: 0;
		border-bottom: var(--border);
	}
}
</style>
