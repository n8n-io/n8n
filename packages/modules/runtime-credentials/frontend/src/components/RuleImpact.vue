<script setup lang="ts">
import { RuntimeCredentialRuleImpactDto } from '@n8n/api-types';
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { fetchRuleImpact } from '../runtime-credentials.api';
import type { RuntimeCredentialRuleImpact } from '../runtime-credentials.api';

const IMPACT_DEBOUNCE_MS = 400;

const {
	nodeType,
	path,
	baseline = undefined,
} = defineProps<{
	nodeType: string;
	path: string;
	/** The saved node type and path of a rule that is being edited. Only a change can remove a value. */
	baseline?: { nodeType: string; path: string };
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const impact = ref<RuntimeCredentialRuleImpact | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let requestId = 0;

function clearImpact() {
	clearTimeout(timer);
	requestId++;
	impact.value = null;
}

watch(
	() => [nodeType.trim(), path.trim()] as const,
	([type, currentPath]) => {
		clearImpact();
		if (baseline && type === baseline.nodeType && currentPath === baseline.path) return;
		const body = RuntimeCredentialRuleImpactDto.safeParse({ nodeType: type, path: currentPath });
		if (!body.success) return;
		const request = requestId;
		timer = setTimeout(async () => {
			try {
				const result = await fetchRuleImpact(rootStore.restApiContext, body.data);
				// A newer input or a closed wizard makes this result stale.
				if (request === requestId) impact.value = result;
			} catch {
				// The warning is advisory. A failed check must not block saving.
			}
		}, IMPACT_DEBOUNCE_MS);
	},
	{ immediate: true },
);

onBeforeUnmount(clearImpact);

const workflows = computed(() => impact.value?.workflows ?? []);
</script>

<template>
	<N8nCallout v-if="workflows.length > 0" theme="warning" slim data-test-id="runtime-rule-impact">
		<div :class="$style.impact">
			<span data-test-id="runtime-rule-impact-title">
				{{
					workflows.length === 1
						? i18n.baseText('runtimeCredentials.rules.modal.impact.title.one')
						: i18n.baseText('runtimeCredentials.rules.modal.impact.title.other', {
								interpolate: { count: String(workflows.length) },
							})
				}}
			</span>
			<details>
				<summary data-test-id="runtime-rule-impact-toggle">
					{{ i18n.baseText('runtimeCredentials.rules.modal.impact.show') }}
				</summary>
				<ul :class="$style.list">
					<li
						v-for="workflow in workflows"
						:key="workflow.id"
						data-test-id="runtime-rule-impact-workflow"
					>
						<RouterLink :to="`/workflow/${workflow.id}`" target="_blank">
							{{ workflow.name }}
						</RouterLink>
						<span :class="$style.meta">
							{{ workflow.projectName }}.
							{{
								i18n.baseText('runtimeCredentials.rules.modal.impact.nodes', {
									interpolate: { nodes: workflow.nodeNames.join(', ') },
								})
							}}
						</span>
					</li>
				</ul>
			</details>
			<span
				v-if="impact?.truncated"
				:class="$style.meta"
				data-test-id="runtime-rule-impact-truncated"
			>
				{{ i18n.baseText('runtimeCredentials.rules.modal.impact.truncated') }}
			</span>
		</div>
	</N8nCallout>
</template>

<style lang="scss" module>
.impact {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: var(--spacing--2xs) 0 0;
	padding-inline-start: var(--spacing--md);
}

.meta {
	color: var(--text-color--subtle);
}
</style>
