<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nInput,
	N8nInputLabel,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import RulesTable from '../components/RulesTable.vue';
import type { PolicyRule } from '../runtime-credentials.api';
import { useRuntimeCredentialsStore } from '../runtime-credentials.store';
import { getHttpStatus } from '../runtime-credentials.utils';

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const store = useRuntimeCredentialsStore();

const projectId = computed(() => String(route.params.projectId ?? ''));
const credentialType = ref('');
const saving = ref(false);
const saveError = ref('');

onMounted(async () => {
	await Promise.all([store.loadRules(), store.loadPolicies(projectId.value)]);
});

function ruleLabel(key: 'instanceRule' | 'projectRule', rule: PolicyRule): string {
	return i18n.baseText(`runtimeCredentials.project.policy.${key}`, {
		interpolate: {
			action: i18n.baseText(
				`runtimeCredentials.project.policy.action.${rule.action === 'deny' ? 'deny' : 'allow'}`,
			),
			selector: rule.selector.value,
		},
	});
}

async function onDeny() {
	const value = credentialType.value.trim();
	if (!value) return;
	saving.value = true;
	saveError.value = '';
	try {
		await store.denyCredentialType(projectId.value, value);
		credentialType.value = '';
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('runtimeCredentials.project.policy.toast.denied'),
		});
	} catch (error) {
		saveError.value =
			getHttpStatus(error) === 409
				? i18n.baseText('runtimeCredentials.project.policy.error.conflict')
				: i18n.baseText('runtimeCredentials.project.policy.error.generic');
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<div :class="$style.page" data-test-id="runtime-inputs-project">
		<section :class="$style.section">
			<N8nHeading tag="h2" size="medium">
				{{ i18n.baseText('runtimeCredentials.project.rules.title') }}
			</N8nHeading>
			<N8nText color="text-light">
				{{ i18n.baseText('runtimeCredentials.project.rules.description') }}
			</N8nText>
			<N8nLoading v-if="store.isLoading && store.rules.length === 0" :rows="3" />
			<N8nCallout v-else-if="store.hasLoadError" theme="danger" data-test-id="runtime-rules-error">
				{{ i18n.baseText('runtimeCredentials.rules.loadError') }}
			</N8nCallout>
			<N8nText v-else-if="store.rules.length === 0" data-test-id="runtime-rules-empty">
				{{ i18n.baseText('runtimeCredentials.rules.empty.title') }}
			</N8nText>
			<RulesTable v-else :rules="store.rules" readonly />
		</section>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="medium">
				{{ i18n.baseText('runtimeCredentials.project.policy.title') }}
			</N8nHeading>
			<N8nText color="text-light">
				{{ i18n.baseText('runtimeCredentials.project.policy.description') }}
			</N8nText>
			<N8nLoading v-if="store.isPolicyLoading" :rows="2" />
			<N8nCallout
				v-else-if="store.hasPolicyLoadError"
				theme="danger"
				data-test-id="runtime-policy-error"
			>
				{{ i18n.baseText('runtimeCredentials.project.policy.loadError') }}
				<template #trailingContent>
					<N8nButton
						variant="ghost"
						size="small"
						:label="i18n.baseText('generic.retry')"
						@click="store.loadPolicies(projectId)"
					/>
				</template>
			</N8nCallout>
			<template v-else-if="store.instancePolicy && store.projectPolicy">
				<ul :class="$style.list" data-test-id="runtime-policy-list">
					<li>
						{{
							i18n.baseText('runtimeCredentials.project.policy.instanceDefault', {
								interpolate: {
									action: i18n.baseText(
										`runtimeCredentials.project.policy.action.${store.instancePolicy.defaultAction}`,
									),
								},
							})
						}}
					</li>
					<li v-for="rule in store.instancePolicy.rules" :key="`instance-${rule.id}`">
						{{ ruleLabel('instanceRule', rule) }}
					</li>
					<li v-for="rule in store.projectPolicy.rules" :key="`project-${rule.id}`">
						{{ ruleLabel('projectRule', rule) }}
					</li>
				</ul>
				<N8nText v-if="store.projectPolicy.rules.length === 0" data-test-id="runtime-policy-empty">
					{{ i18n.baseText('runtimeCredentials.project.policy.empty') }}
				</N8nText>
				<form :class="$style.form" @submit.prevent="onDeny">
					<N8nInputLabel
						:label="i18n.baseText('runtimeCredentials.project.policy.deny.label')"
						input-name="runtime-policy-credential-type"
					>
						<N8nInput
							id="runtime-policy-credential-type"
							v-model="credentialType"
							:placeholder="i18n.baseText('runtimeCredentials.project.policy.deny.placeholder')"
							data-test-id="runtime-policy-input"
						/>
					</N8nInputLabel>
					<N8nButton
						variant="solid"
						:label="i18n.baseText('runtimeCredentials.project.policy.deny.button')"
						:disabled="credentialType.trim() === ''"
						:loading="saving"
						data-test-id="runtime-policy-deny"
						@click="onDeny"
					/>
				</form>
				<N8nCallout v-if="saveError" theme="danger" slim data-test-id="runtime-policy-save-error">
					{{ saveError }}
				</N8nCallout>
			</template>
		</section>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	padding-block: var(--spacing--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.list {
	margin: 0;
	padding-inline-start: var(--spacing--md);
}

.form {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--xs);
}
</style>
