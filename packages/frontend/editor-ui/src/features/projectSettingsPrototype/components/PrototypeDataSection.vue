<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { updateProject } from '@/features/collaboration/projects/projects.api';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { projectsFor } from '../data/projects';
import { protoParams } from '../params';
import { resetStore } from '../state/store';

/**
 * Sample data. The prototype runs on the instance's real team projects, so
 * showing 40 or 400 of them means creating them. This section creates the
 * missing ones, removes the ones it created, and resets the settings data.
 */
const CREATED_KEY = 'n8n-prototype.project-settings.sample-projects';
/** A few requests at a time: quick for 400 projects, gentle on a small backend. */
const CONCURRENCY = 4;

const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const rootStore = useRootStore();
const toast = useToast();

function readCreated(): string[] {
	try {
		const parsed: unknown = JSON.parse(window.localStorage.getItem(CREATED_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

const created = ref<string[]>(readCreated());

function saveCreated() {
	try {
		window.localStorage.setItem(CREATED_KEY, JSON.stringify(created.value));
	} catch {
		// Storage can be full or blocked. The projects still exist.
	}
}

const signedIn = computed(() => usersStore.currentUser !== null);
const target = computed(() => Number(protoParams.projectCount) as 4 | 40 | 400);
const teamProjects = computed(() =>
	projectsStore.myProjects.filter((project) => project.type === 'team'),
);

/** The sample projects the instance doesn't have yet, up to the count the parameter asks for. */
const missing = computed(() => {
	const names = new Set(teamProjects.value.map((project) => (project.name ?? '').toLowerCase()));
	const room = Math.max(0, target.value - teamProjects.value.length);
	return projectsFor(target.value)
		.filter((project) => !names.has(project.name.toLowerCase()))
		.slice(0, room);
});

/** Only the ones still on the instance can be removed. */
const removable = computed(() => {
	const ids = new Set(teamProjects.value.map((project) => project.id));
	return created.value.filter((id) => ids.has(id));
});

const progress = ref<{ verb: string; done: number; total: number } | null>(null);
const busy = computed(() => progress.value !== null);

const summary = computed(() => {
	const count = teamProjects.value.length;
	const have = `This instance has ${count} team ${count === 1 ? 'project' : 'projects'}.`;
	if (missing.value.length === 0) return have;
	return `${have} The navigation is set to show ${target.value}.`;
});

async function runAll<T>(verb: string, queue: T[], task: (item: T) => Promise<void>) {
	progress.value = { verb, done: 0, total: queue.length };
	const pending = [...queue];
	let failure: unknown;
	const worker = async () => {
		for (let item = pending.shift(); item !== undefined; item = pending.shift()) {
			try {
				await task(item);
			} catch (error) {
				// One failure, such as a project limit, would repeat for every project left.
				failure = error;
				pending.length = 0;
			}
			if (progress.value) progress.value.done += 1;
		}
	};
	await Promise.all(Array.from({ length: CONCURRENCY }, worker));
	progress.value = null;
	saveCreated();
	if (failure) throw failure;
}

async function createSamples() {
	const total = missing.value.length;
	try {
		await runAll('Creating', missing.value, async (sample) => {
			const project = await projectsStore.createProject({ name: sample.name, icon: sample.icon });
			created.value.push(project.id);
			// Saved per project: a reload halfway through must not orphan the ones already created.
			saveCreated();
			if (sample.description) {
				// The store's update also writes to the project on screen, whichever one changed.
				await updateProject(rootStore.restApiContext, project.id, {
					description: sample.description,
				});
				const listed = projectsStore.myProjects.find((entry) => entry.id === project.id);
				if (listed) listed.description = sample.description;
			}
		});
		toast.showMessage({
			title: `Created ${total} sample ${total === 1 ? 'project' : 'projects'}`,
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, "Couldn't create every sample project");
	}
}

async function removeSamples() {
	const total = removable.value.length;
	try {
		await runAll('Removing', removable.value, async (id) => {
			await projectsStore.deleteProject(id);
			created.value = created.value.filter((entry) => entry !== id);
			saveCreated();
		});
		toast.showMessage({
			title: `Removed ${total} sample ${total === 1 ? 'project' : 'projects'}`,
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, "Couldn't remove every sample project");
	}
}

function resetSettings() {
	resetStore();
	toast.showMessage({ title: 'Settings data reset', type: 'success' });
}
</script>

<template>
	<section :class="$style.section" aria-labelledby="proto-data-title">
		<div :class="$style.heading">
			<N8nText id="proto-data-title" tag="h3" size="small" bold color="text-dark">
				Sample data
			</N8nText>
			<N8nText size="xsmall" color="text-light">
				{{ signedIn ? summary : 'Sign in to create sample projects.' }}
			</N8nText>
		</div>

		<div v-if="signedIn" :class="$style.actions">
			<N8nButton
				v-if="missing.length > 0 || busy"
				variant="solid"
				size="small"
				:loading="busy"
				:disabled="busy"
				data-test-id="proto-data-create"
				@click="createSamples"
			>
				{{
					progress
						? `${progress.verb} ${progress.done} of ${progress.total}`
						: `Create ${missing.length} sample ${missing.length === 1 ? 'project' : 'projects'}`
				}}
			</N8nButton>
			<N8nButton
				v-if="removable.length > 0 && !busy"
				variant="outline"
				size="small"
				data-test-id="proto-data-remove"
				@click="removeSamples"
			>
				Remove {{ removable.length }} sample {{ removable.length === 1 ? 'project' : 'projects' }}
			</N8nButton>
			<N8nButton
				variant="ghost"
				size="small"
				:disabled="busy"
				data-test-id="proto-data-reset"
				@click="resetSettings"
			>
				Reset settings data
			</N8nButton>
		</div>
		<span :class="$style.srOnly" role="status">
			{{ progress ? `${progress.verb} ${progress.done} of ${progress.total}` : '' }}
		</span>
	</section>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/utils' as utils;

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-top: var(--spacing--md);
	border-top: var(--border);
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.srOnly {
	@include utils.utils-sr-only;
}
</style>
