<script lang="ts" setup>
import {
	N8nCopyInput,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nOption,
	N8nSelect,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import { MCP_ENDPOINT } from '@/features/ai/mcpAccess/mcp.constants';

import CodeSnippet from './CodeSnippet.vue';

const props = defineProps<{
	clientId: string;
	/**
	 * Only known in the moment right after creation; otherwise the snippet falls
	 * back to a shell-variable placeholder.
	 */
	clientSecret?: string;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();

type ResourceKind = 'instanceMcp' | 'publicApi' | 'custom';

const resourceKind = ref<ResourceKind>('instanceMcp');

/** `urlBaseEditor` already carries a trailing slash. */
const tokenEndpoint = computed(() => `${rootStore.urlBaseEditor}oauth/token`);

// Same derivation as the MCP store: the backend-provided canonical URL reflects a
// configured dedicated MCP base URL, with the editor base as the fallback.
const instanceMcpResource = computed(
	() => settingsStore.moduleSettings.mcp?.serverUrl ?? `${rootStore.urlBaseEditor}${MCP_ENDPOINT}`,
);

// Join with exactly one slash: `publicApiPath` may or may not start with one.
const publicApiResource = computed(() => {
	const base = rootStore.urlBaseEditor.replace(/\/+$/, '');
	const path = settingsStore.publicApiPath.replace(/^\/+/, '');
	return `${base}/${path}/v${settingsStore.publicApiLatestVersion}`;
});

/** Prefilled with the MCP Trigger base so only the workflow's path is missing. */
const customResource = ref(`${rootStore.mcpUrl}/`);

const resource = computed(() => {
	switch (resourceKind.value) {
		case 'instanceMcp':
			return instanceMcpResource.value;
		case 'publicApi':
			return publicApiResource.value;
		case 'custom':
			return customResource.value;
	}
});

const resourceOptions = computed<Array<{ value: ResourceKind; label: string }>>(() => [
	{
		value: 'instanceMcp',
		label: i18n.baseText('settings.serviceAccounts.credentials.usage.resourceInstanceMcp'),
	},
	{
		value: 'publicApi',
		label: i18n.baseText('settings.serviceAccounts.credentials.usage.resourcePublicApi'),
	},
	{
		value: 'custom',
		label: i18n.baseText('settings.serviceAccounts.credentials.usage.resourceCustom'),
	},
]);

const secretPlaceholder = '$CLIENT_SECRET';

const curl = computed(
	() => `curl -s -X POST ${tokenEndpoint.value} \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -d grant_type=client_credentials \\
  -d client_id=${props.clientId} \\
  -d client_secret=${props.clientSecret ?? secretPlaceholder} \\
  --data-urlencode 'resource=${resource.value}'`,
);
</script>

<template>
	<div :class="$style.container" data-test-id="service-account-credential-usage">
		<N8nInputLabel
			:label="i18n.baseText('settings.serviceAccounts.credentials.usage.tokenEndpoint')"
			color="text-dark"
		>
			<N8nCopyInput
				:value="tokenEndpoint"
				size="medium"
				:copy-label="i18n.baseText('generic.copy')"
				:copied-label="i18n.baseText('generic.copiedToClipboard')"
				data-test-id="service-account-token-endpoint"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('settings.serviceAccounts.credentials.usage.resource')"
			color="text-dark"
		>
			<div :class="$style.resource">
				<!-- Kept in the dialog's stacking context so the dropdown isn't clipped
					 behind the overlay. -->
				<N8nSelect
					v-model="resourceKind"
					size="medium"
					:teleported="false"
					data-test-id="service-account-resource-select"
				>
					<N8nOption
						v-for="option in resourceOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
				<N8nInput
					v-if="resourceKind === 'custom'"
					v-model="customResource"
					size="medium"
					data-test-id="service-account-resource-custom"
				/>
				<N8nCopyInput
					v-else
					:value="resource"
					size="medium"
					:copy-label="i18n.baseText('generic.copy')"
					:copied-label="i18n.baseText('generic.copiedToClipboard')"
					data-test-id="service-account-resource-value"
				/>
			</div>
		</N8nInputLabel>

		<N8nNotice>
			{{ i18n.baseText('settings.serviceAccounts.credentials.usage.notice') }}
		</N8nNotice>

		<N8nInputLabel
			:label="i18n.baseText('settings.serviceAccounts.credentials.usage.curlLabel')"
			color="text-dark"
		>
			<CodeSnippet :value="curl" language="bash" />
		</N8nInputLabel>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.resource {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
