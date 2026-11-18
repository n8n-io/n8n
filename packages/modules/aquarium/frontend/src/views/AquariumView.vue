<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nSegmentControl,
	N8nSwitch,
	N8nText,
	type SegmentOption,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useElementSize } from '@vueuse/core';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { SMALL_PROJECTS } from '../aquarium.constants';
import { useAquariumStore } from '../aquarium.store';
import type { AquariumEntity, TankGrouping } from '../aquarium.types';
import AquariumTank from '../components/AquariumTank.vue';
import { hideSmallProjects } from '../engine/projects';
import { readDatasetFile } from '../sources/dataset';
import { hasMembership, isInMemberProject } from '../sources/membership.source';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const store = useAquariumStore();
const documentTitle = useDocumentTitle();
const toast = useToast();
const fileInput = ref<HTMLInputElement>();
const overlay = ref<HTMLDivElement>();
const { height: overlayHeight } = useElementSize(overlay);
/** The header panels cover the top of the tank. Leave a little gap below them. */
const tankTopInset = computed(() => Math.ceil(overlayHeight.value) + 16);

const isDemo = computed(() => route.query.demo === 'true');

/** Kept in the URL, so a reload or a shared link opens the same view. */
const grouping = computed<TankGrouping>({
	get: () => (route.query.view === 'projects' ? 'project' : 'single'),
	set: (value) => {
		void router.replace({
			query: { ...route.query, view: value === 'project' ? 'projects' : undefined },
		});
	},
});

/** Shows only projects that the account is a member of. Kept in the URL like the other options. */
const onlyMyProjects = computed<boolean>({
	get: () => route.query.mine === 'true',
	set: (value) => {
		void router.replace({ query: { ...route.query, mine: value ? 'true' : undefined } });
	},
});

const canFilterByMembership = computed(() => hasMembership(store.entities));

const memberEntities = computed(() =>
	onlyMyProjects.value && canFilterByMembership.value
		? store.entities.filter(isInMemberProject)
		: store.entities,
);

/** Only the project view hides small projects: there, each project takes a tank. */
const smallProjects = computed(() =>
	grouping.value === 'project'
		? hideSmallProjects(memberEntities.value)
		: { entities: memberEntities.value, hiddenProjects: 0 },
);

const visibleEntities = computed(() => smallProjects.value.entities);

const groupingOptions = computed<Array<SegmentOption<TankGrouping>>>(() => [
	{ label: i18n.baseText('aquarium.view.single'), value: 'single' },
	{ label: i18n.baseText('aquarium.view.projects'), value: 'project' },
]);

async function load() {
	const options = { demo: isDemo.value };
	await store.load(options);
	store.startLiveUpdates(options);
}

async function setDemo(value: string | number | boolean) {
	await router.replace({ query: { ...route.query, demo: value === true ? 'true' : undefined } });
}

/** The file stays in the browser. It is not uploaded or stored. */
async function onDatasetFile(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;
	const file = input.files?.[0];
	// Clear the value, so picking the same file again still fires `change`.
	input.value = '';
	if (!file) return;

	const dataset = await readDatasetFile(file);
	if (!dataset) {
		toast.showMessage({ type: 'error', title: i18n.baseText('aquarium.dataset.invalid') });
		return;
	}
	store.setDataset(dataset);
	await load();
}

async function clearDataset() {
	store.setDataset(undefined);
	await load();
}

async function onSelect(entity: AquariumEntity) {
	if (entity.route) await router.push(entity.route);
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('aquarium.title'));
	await load();
});

onBeforeUnmount(() => store.stopLiveUpdates());

watch(isDemo, load);
</script>

<template>
	<div :class="$style.view">
		<div :class="$style.tank">
			<AquariumTank
				:entities="visibleEntities"
				:instance-entities="store.entities"
				:activity="store.activity"
				:grouping="grouping"
				:top-inset="tankTopInset"
				@select="onSelect"
			/>
		</div>

		<!-- The overlay lets pointer events through, so creatures under its gaps stay clickable. -->
		<div ref="overlay" :class="$style.overlay">
			<header :class="[$style.panel, $style.intro]">
				<N8nHeading tag="h1" size="xlarge">{{ i18n.baseText('aquarium.title') }}</N8nHeading>
			</header>

			<div :class="[$style.panel, $style.actions]">
				<N8nSegmentControl
					v-model="grouping"
					:options="groupingOptions"
					size="small"
					:aria-label="i18n.baseText('aquarium.view.label')"
					data-test-id="aquarium-grouping"
				/>
				<N8nSwitch
					v-if="canFilterByMembership"
					v-model="onlyMyProjects"
					:label="i18n.baseText('aquarium.myProjects')"
					data-test-id="aquarium-my-projects"
				/>
				<template v-if="store.dataset">
					<N8nButton
						variant="ghost"
						size="small"
						data-test-id="aquarium-dataset-clear"
						@click="clearDataset"
					>
						<template #icon><N8nIcon icon="x" size="small" /></template>
						{{ i18n.baseText('aquarium.dataset.clear') }}
					</N8nButton>
				</template>
				<template v-else>
					<N8nSwitch
						:model-value="isDemo"
						:label="i18n.baseText('aquarium.demo')"
						data-test-id="aquarium-demo-switch"
						@update:model-value="setDemo"
					/>
					<N8nButton
						variant="outline"
						size="small"
						data-test-id="aquarium-dataset-load"
						@click="fileInput?.click()"
					>
						<template #icon><N8nIcon icon="upload" size="small" /></template>
						{{ i18n.baseText('aquarium.dataset.load') }}
					</N8nButton>
				</template>
				<input
					ref="fileInput"
					type="file"
					accept=".json,application/json"
					:class="$style.fileInput"
					data-test-id="aquarium-dataset-input"
					@change="onDatasetFile"
				/>
				<N8nButton
					variant="outline"
					size="small"
					:loading="store.isLoading"
					data-test-id="aquarium-refresh"
					@click="load"
				>
					<template #icon><N8nIcon icon="refresh-cw" size="small" /></template>
					{{ i18n.baseText('aquarium.refresh') }}
				</N8nButton>
			</div>

			<N8nCallout v-if="store.isPartial" :class="$style.callout" theme="warning">
				{{ i18n.baseText('aquarium.partialData') }}
			</N8nCallout>
		</div>

		<N8nText
			v-if="smallProjects.hiddenProjects > 0"
			:class="[$style.panel, $style.hiddenNote]"
			size="small"
			color="text-light"
			:title="
				i18n.baseText('aquarium.smallProjectsHidden.hint', {
					interpolate: { min: String(SMALL_PROJECTS.minCreatures) },
				})
			"
			data-test-id="aquarium-small-projects-hidden"
		>
			{{
				i18n.baseText('aquarium.smallProjectsHidden', {
					adjustToNumber: smallProjects.hiddenProjects,
					interpolate: { count: String(smallProjects.hiddenProjects) },
				})
			}}
		</N8nText>
		<N8nText
			v-if="store.hasLoaded && visibleEntities.length === 0"
			:class="[$style.panel, $style.empty]"
			color="text-light"
			data-test-id="aquarium-empty"
		>
			{{ i18n.baseText(store.entities.length > 0 ? 'aquarium.emptyMyProjects' : 'aquarium.empty') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.view {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.tank {
	position: absolute;
	inset: 0;
}

.overlay {
	position: absolute;
	inset: var(--spacing--sm) var(--spacing--sm) auto;
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--xs);
	pointer-events: none;

	> * {
		pointer-events: auto;
	}
}

.panel {
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: color-mix(in srgb, var(--color--background--light-3) 85%, transparent);
	backdrop-filter: blur(4px);
	box-shadow: var(--shadow--sm);
}

.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-width: 40ch;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.fileInput {
	display: none;
}

.callout {
	flex-basis: 100%;
}

.hiddenNote {
	position: absolute;
	bottom: var(--spacing--sm);
	left: var(--spacing--sm);
}

.empty {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}
</style>
