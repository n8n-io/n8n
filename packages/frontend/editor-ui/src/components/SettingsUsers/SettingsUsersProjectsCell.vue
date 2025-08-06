<script lang="ts" setup="">
import { computed, ref } from 'vue';
import { ROLE, type Role, type UsersList } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';

const props = defineProps<{ data: UsersList['items'][number] }>();

const i18n = useI18n();

const rolesAccessingAllProjects = ref<Role[]>([ROLE.Owner, ROLE.Admin]);

const visibleProjectsNum = ref(2);
const allProjects = computed(() => {
	if (props.data.role && rolesAccessingAllProjects.value.includes(props.data.role)) {
		return [i18n.baseText('settings.users.table.row.allProjects')];
	} else if (!props.data.projectRelations?.length) {
		return [i18n.baseText('settings.users.table.row.personalProject')];
	} else {
		return props.data.projectRelations.map(({ name }) => name);
	}
});
const projects = computed(() => ({
	visible: allProjects.value.slice(0, visibleProjectsNum.value),
	additional: allProjects.value.slice(visibleProjectsNum.value),
}));
</script>

<template>
	<div :class="$style.projects">
		<template v-for="(project, index) in projects.visible" :key="index">
			<span :class="$style.project">{{ project }}</span>
			<span v-if="index < projects.visible.length - 1" :class="$style.comma">,</span>
		</template>
		<span v-if="projects.additional.length > 0" :class="$style.comma">,</span>
		<N8nTooltip v-if="projects.additional.length > 0">
			<template #content>
				<ul :class="$style.projectList">
					<li v-for="(project, index) in projects.additional" :key="index">{{ project }}</li>
				</ul>
			</template>
			<span :class="$style.project">+ {{ projects.additional.length }}</span>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.projects {
	display: flex;
	height: 100%;
	align-items: center;
}

.project {
	flex: 1 1 0;
	min-width: 0;
	max-width: max-content;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.comma {
	flex-shrink: 0;
	padding: 0 var(--spacing-5xs);
}

.projectList {
	padding: 0 var(--spacing-s);

	li {
		list-style: disc outside;
	}
}
</style>
