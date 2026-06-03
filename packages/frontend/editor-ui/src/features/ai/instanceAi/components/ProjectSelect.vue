<script setup lang="ts">
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { N8nButton, N8nIcon, N8nScrollArea, N8nTooltip } from '@n8n/design-system';
import { type IconOrEmoji, isIconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import {
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxPortal,
	ComboboxRoot,
	ComboboxTrigger,
} from 'reka-ui';
import { computed } from 'vue';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

const projectsStore = useProjectsStore();
const selectedProject = computed(() =>
	projectsStore.myProjects.find((project) => project.id === model.value),
);
const showSearch = computed(() => projectsStore.myProjects.length > 5);

const model = defineModel<string | null>();

function projectIcon(icon: unknown): IconOrEmoji {
	return isIconOrEmoji(icon) ? icon : { type: 'icon', value: 'layers' };
}
</script>

<template>
	<ComboboxRoot v-model="model">
		<ComboboxAnchor as-child>
			<ComboboxTrigger as-child>
				<N8nTooltip placement="bottom" as-child :content-class="$style.tooltip">
					<N8nButton variant="ghost" size="xsmall">
						<template v-if="selectedProject?.type === 'personal'">
							<ProjectIcon :icon="{ type: 'icon', value: 'user-round' }" size="small" border-less />
							Personal space
						</template>
						<template v-else-if="selectedProject">
							<ProjectIcon :icon="projectIcon(selectedProject.icon)" size="small" border-less />
							{{ selectedProject.name }}
						</template>
						<template v-else> 'Select a project' </template>
						<N8nIcon icon="chevron-down" />
					</N8nButton>
					<template #content>
						<span style="white-space: nowrap">Where AI assistant creates automations</span>
					</template>
				</N8nTooltip>
			</ComboboxTrigger>
		</ComboboxAnchor>

		<ComboboxPortal>
			<ComboboxContent position="popper" align="start" :class="$style.content">
				<ComboboxInput
					v-if="showSearch"
					placeholder="Search projects"
					:class="$style.input"
					:display-value="() => ''"
					@keydown.enter.prevent
				/>

				<ComboboxEmpty>No results</ComboboxEmpty>

				<N8nScrollArea
					:class="$style.scrollArea"
					type="hover"
					max-height="min(320px, var(--reka-combobox-content-available-height))"
					as-child
				>
					<template v-for="project in projectsStore.myProjects">
						<ComboboxItem
							v-if="project.type === 'personal'"
							:key="project.id"
							:value="project.id"
							:class="$style.item"
						>
							<ProjectIcon :icon="{ type: 'icon', value: 'user-round' }" size="small" border-less />
							<span :class="$style.label">Personal space</span>
							<N8nIcon
								v-if="selectedProject?.id === project.id"
								icon="check"
								:class="$style.check"
							/>
						</ComboboxItem>

						<ComboboxItem v-else :key="project.id" :value="project.id" :class="$style.item">
							<ProjectIcon :icon="projectIcon(project.icon)" size="small" border-less />
							<span :class="$style.label">{{ project.name }}</span>
							<N8nIcon
								v-if="selectedProject?.id === project.id"
								icon="check"
								:class="$style.check"
							/>
						</ComboboxItem>
					</template>
				</N8nScrollArea>
			</ComboboxContent>
		</ComboboxPortal>
	</ComboboxRoot>
</template>

<style module lang="scss">
.trigger {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--xs);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius--xs);
}

.triggerLabel {
	display: inline-flex;
	margin-right: var(--spacing--sm);
}

.triggerShortcut {
	display: inline-flex;
	font-size: var(--font-size--2xs);
}

.overlay {
	position: fixed;
	inset: 0;
	z-index: 30;
	background-color: var(--dialog--overlay--color--background);
}

.content {
	display: flex;
	flex-direction: column;
	// Cap the width so long names truncate. max-width also clamps the popper's
	// `min-width: max-content`, so the dropdown won't grow to fit the longest item.
	max-width: 320px;
	overflow: hidden;
	border-radius: var(--radius);
	border: 0.5px solid var(--border-color);
	background: var(--background--surface);

	&:focus {
		outline: none;
	}
}

.scrollArea {
	flex: 1;
	min-height: 0;
}

.input {
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: transparent;
	outline: none;
	position: sticky;
	top: 0;
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
	border: none;
	border-bottom: var(--border);
	height: var(--height--lg);

	// &:focus {
	// 	box-shadow:
	// 		0 0 0 0 transparent,
	// 		inset 0 0 0 1px var(--focus--border-color);
	// }

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.list {
	max-height: 20rem;
	padding: var(--spacing--2xs);
	overflow-y: auto;
	border-top: var(--border);
}

.empty {
	padding: var(--spacing--sm);
	color: var(--color--text--tint-1);
	text-align: center;
}

.groupLabel {
	margin-top: var(--spacing--xs);
	margin-bottom: var(--spacing--xs);
	padding: 0 var(--spacing--sm);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
	margin: 0 var(--spacing--2xs);
	cursor: default;
	border-radius: var(--radius--2xs);
	font-size: var(--font-size--sm);
	color: var(--text-color);
	height: var(--height--lg);

	&[data-highlighted] {
		background-color: var(--color--background--light-2);
	}
}

.label {
	// Take the row's free space (right-aligns the trailing check) and truncate.
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.check {
	flex-shrink: 0;
	color: var(--color--text);
}

.tooltip {
	max-width: none;
}
</style>
