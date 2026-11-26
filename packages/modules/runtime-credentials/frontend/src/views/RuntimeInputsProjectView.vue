<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nCallout, N8nLoading, N8nSettingsSection } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

import ProjectAccessTable from '../components/project/ProjectAccessTable.vue';
import { useProjectRuntimeInputs } from '../components/project/useProjectRuntimeInputs';

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const ProjectHeader = computed(() => componentRegistry.get('project-header'));

const projectId = computed(() => String(route.params.projectId ?? ''));
const inputs = useProjectRuntimeInputs(() => projectId.value);

onMounted(async () => {
	await inputs.load();
});

const isInitialLoad = computed(() => inputs.loading.value && inputs.rows.value.length === 0);
const hasNoRules = computed(
	() => !inputs.loading.value && !inputs.loadFailure.value && inputs.rows.value.length === 0,
);
const loadErrorKey = computed(() =>
	inputs.loadFailure.value === 'forbidden'
		? 'runtimeCredentials.project.error.forbidden'
		: 'runtimeCredentials.project.error.load',
);
const saveErrorKey = computed(() =>
	inputs.saveFailure.value === 'conflict'
		? 'runtimeCredentials.project.error.conflict'
		: 'runtimeCredentials.project.error.generic',
);

async function onChange(credentialType: string, access: 'allow' | 'deny', displayName: string) {
	const saved = await inputs.setAccess(credentialType, access);
	if (!saved) return;
	toast.showMessage({
		type: 'success',
		title: i18n.baseText(
			access === 'allow'
				? 'runtimeCredentials.project.toast.allowed'
				: 'runtimeCredentials.project.toast.blocked',
			{ interpolate: { name: displayName } },
		),
	});
}
</script>

<template>
	<div :class="$style.page" data-test-id="runtime-inputs-project">
		<component :is="ProjectHeader" v-if="ProjectHeader" />
		<N8nSettingsSection :description="i18n.baseText('runtimeCredentials.project.description')">
			<N8nLoading v-if="isInitialLoad" :rows="4" data-test-id="runtime-project-loading" />
			<N8nCallout
				v-else-if="inputs.loadFailure.value"
				theme="danger"
				data-test-id="runtime-project-error"
			>
				{{ i18n.baseText(loadErrorKey) }}
				<template v-if="inputs.loadFailure.value !== 'forbidden'" #trailingContent>
					<N8nButton
						variant="ghost"
						size="small"
						:label="i18n.baseText('generic.retry')"
						data-test-id="runtime-project-retry"
						@click="inputs.load"
					/>
				</template>
			</N8nCallout>
			<N8nCallout v-else-if="hasNoRules" theme="info" data-test-id="runtime-project-no-rules">
				{{ i18n.baseText('runtimeCredentials.project.noRules') }}
			</N8nCallout>
			<template v-else>
				<N8nCallout
					v-if="inputs.instanceUnavailable.value"
					theme="secondary"
					slim
					data-test-id="runtime-project-instance-unavailable"
				>
					{{ i18n.baseText('runtimeCredentials.project.instanceUnavailable') }}
				</N8nCallout>
				<N8nCallout
					v-if="inputs.saveFailure.value"
					theme="danger"
					slim
					data-test-id="runtime-project-save-error"
				>
					{{ i18n.baseText(saveErrorKey) }}
					<template v-if="inputs.saveFailure.value === 'conflict'" #trailingContent>
						<N8nButton
							variant="ghost"
							size="small"
							:label="i18n.baseText('runtimeCredentials.project.error.refresh')"
							data-test-id="runtime-project-refresh"
							@click="inputs.load"
						/>
					</template>
				</N8nCallout>
				<ProjectAccessTable
					:rows="inputs.rows.value"
					:saving-type="inputs.savingType.value"
					@change="onChange"
				/>
			</template>
		</N8nSettingsSection>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	/* The project header pads itself; the section needs the same bottom room as other project tabs. */
	padding-bottom: var(--spacing--2xl);
}
</style>
