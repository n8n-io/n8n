<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { projectPage } from '../nav/pages';
import AuditLogPage from '../pages/AuditLogPage.vue';
import ExecutionLimitsPage from '../pages/ExecutionLimitsPage.vue';
import NodeCredentialAccessPage from '../pages/NodeCredentialAccessPage.vue';

/**
 * The baseline: master's one settings form, with the sections it doesn't
 * have yet appended to it, the way sections have been added so far.
 */
defineProps<{ projectId: string }>();

const SECTIONS = [
	{ page: projectPage('node-and-credential-access'), component: NodeCredentialAccessPage },
	{ page: projectPage('execution-limits'), component: ExecutionLimitsPage },
	{ page: projectPage('audit-log'), component: AuditLogPage },
];

/** The sections sit inside master's form. Their buttons must not submit it. */
function keepFromSubmitting(event: MouseEvent) {
	const target = event.target instanceof Element ? event.target : null;
	if (target?.closest('button:not([type="button"])')) event.preventDefault();
}
</script>

<template>
	<div data-test-id="proto-baseline-sections" @click="keepFromSubmitting">
		<fieldset
			v-for="section in SECTIONS"
			:id="`proto-${section.page.id}`"
			:key="section.page.id"
			:data-test-id="`proto-baseline-${section.page.id}`"
		>
			<h3>
				<label>{{ section.page.label }}</label>
			</h3>
			<N8nText tag="p" size="small" color="text-light" :class="$style.description">
				{{ section.page.description }}
			</N8nText>
			<component :is="section.component" :project-id="projectId" />
		</fieldset>
	</div>
</template>

<style lang="scss" module>
.description {
	margin-bottom: var(--spacing--sm);
}
</style>
