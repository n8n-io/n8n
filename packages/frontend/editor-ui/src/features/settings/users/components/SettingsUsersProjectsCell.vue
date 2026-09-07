<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ROLE, type UsersList } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nLink } from '@n8n/design-system';
import SettingsUsersProjectsModal from './SettingsUsersProjectsModal.vue';

const props = defineProps<{ data: UsersList['items'][number] }>();

const i18n = useI18n();

const rolesAccessingAllProjects = ref<string[]>([ROLE.Owner, ROLE.Admin]);

const visibleProjectsNum = ref(1);

const dialogOpen = ref(false);

// Interactive only for members that actually have project relations.
// Owner/Admin ("All projects") and personal-only members stay a plain label.
const hasProjectList = computed(
	() =>
		!(props.data.role && rolesAccessingAllProjects.value.includes(props.data.role)) &&
		(props.data.projectRelations?.length ?? 0) > 0,
);

const label = computed(() => {
	if (props.data.role && rolesAccessingAllProjects.value.includes(props.data.role)) {
		return i18n.baseText('settings.users.table.row.allProjects');
	}
	return i18n.baseText('settings.users.table.row.personalProject');
});

const projectNames = computed(() => props.data.projectRelations?.map(({ name }) => name) ?? []);
const projects = computed(() => ({
	visible: projectNames.value.slice(0, visibleProjectsNum.value),
	additional: projectNames.value.slice(visibleProjectsNum.value),
}));
</script>

<template>
	<div :class="$style.projects">
		<template v-if="hasProjectList">
			<N8nLink
				theme="text"
				underline
				:class="$style.trigger"
				:aria-label="i18n.baseText('settings.users.projectsModal.trigger')"
				:title="i18n.baseText('settings.users.projectsModal.trigger')"
				data-test-id="user-projects-cell-trigger"
				@click.stop="dialogOpen = true"
			>
				<template v-for="(project, index) in projects.visible" :key="index">
					<span :class="$style.project">{{ project }}</span>
					<span v-if="index < projects.visible.length - 1" :class="$style.comma">,</span>
				</template>
				<span v-if="projects.additional.length > 0" :class="$style.comma">,</span>
				<span v-if="projects.additional.length > 0" :class="$style.additional"
					>+ {{ projects.additional.length }}</span
				>
			</N8nLink>
			<SettingsUsersProjectsModal
				v-model:open="dialogOpen"
				:first-name="props.data.firstName"
				:last-name="props.data.lastName"
				:email="props.data.email"
				:projects="props.data.projectRelations ?? []"
			/>
		</template>
		<span v-else :class="$style.project">{{ label }}</span>
	</div>
</template>

<style lang="scss" module>
.projects {
	display: flex;
	height: 100%;
	align-items: center;
	min-width: 0;
}

// N8nLink wraps the slot in a theme span > .n8n-text span. Force both to flex
// so the project names (flexible) truncate while commas / +N (fixed) stay pinned
// on a single line — never wrapping, never clipping the overflow count.
.trigger {
	display: flex;
	align-items: baseline;
	max-width: 100%;
	min-width: 0;

	> span {
		display: flex;
		align-items: baseline;
		min-width: 0;
		max-width: 100%;
	}

	:global(.n8n-text) {
		display: flex;
		align-items: baseline;
		min-width: 0;
	}
}

.project {
	min-width: 0;
	flex: 0 1 auto;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.comma {
	flex: 0 0 auto;
	padding: 0 var(--spacing--5xs);
}

.additional {
	flex: 0 0 auto;
}
</style>
