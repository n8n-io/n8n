<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useClipboard } from '@/app/composables/useClipboard';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import {
	LOADING_INDICATOR_TIMEOUT,
	MCP_TOOLTIP_DELAY,
} from '@/features/ai/mcpAccess/mcp.constants';
import { N8nLoading, N8nTooltip, N8nButton, N8nMarkdown, N8nNotice } from '@n8n/design-system';
import ConnectionParameter from '@/features/ai/mcpAccess/components/header/connectPopover/ConnectionParameter.vue';

type Props = {
	serverUrl: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	copy: [type: 'serverUrl' | 'accessToken' | 'mcpJson', value: string];
}>();

const i18n = useI18n();
const toast = useToast();
const mcpStore = useMCPStore();

const loadingApiKey = ref(true);
const keyRotating = ref(false);
const apiKey = computed(() => mcpStore.currentUserMCPKey);

const { copy, copied, isSupported } = useClipboard();

// mcp.json value that's to be copied
const connectionString = computed(() => {
	return `
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "${props.serverUrl}",
        "--header",
        "authorization:Bearer ${apiKeyText.value}"
      ]
    }
  }
}
`;
});

const isKeyRedacted = computed(() => {
	return apiKey.value?.apiKey?.includes('******') ?? false;
});

// formatted code block for markdown component
const connectionCode = computed(() => {
	return `\`\`\`json${connectionString.value}\`\`\``;
});

const apiKeyText = computed(() => {
	if (keyRotating.value) {
		return `<${i18n.baseText('generic.loading')}...>`;
	}
	return isKeyRedacted.value ? '<YOUR_ACCESS_TOKEN_HERE>' : apiKey.value?.apiKey;
});

const fetchApiKey = async () => {
	try {
		loadingApiKey.value = true;
		await mcpStore.getOrCreateApiKey();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.apiKey'));
	} finally {
		setTimeout(() => {
			loadingApiKey.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const rotateKey = async () => {
	try {
		keyRotating.value = true;
		await mcpStore.generateNewApiKey();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.rotating.apiKey'));
	} finally {
		setTimeout(() => {
			keyRotating.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const handleConnectionStringCopy = async () => {
	await copy(connectionString.value);
	emit('copy', 'mcpJson', connectionString.value);
};

const handleUrlCopy = (url: string) => {
	emit('copy', 'serverUrl', url);
};

const handleAccessTokenCopy = () => {
	if (apiKey.value?.apiKey) {
		emit('copy', 'accessToken', apiKey.value.apiKey);
	}
};

onMounted(async () => {
	if (!apiKey.value) {
		await fetchApiKey();
	} else {
		loadingApiKey.value = false;
	}
});
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-access-token-popover-tab">
		<ConnectionParameter
			id="oauth-server-url"
			:label="i18n.baseText('settings.mcp.connectPopover.serverUrl')"
			:value="props.serverUrl"
			@copy="handleUrlCopy"
		/>
		<div v-if="loadingApiKey" :class="$style['loading-container']">
			<N8nLoading :loading="loadingApiKey" variant="h1" :class="$style['url-skeleton']" />
			<N8nLoading :loading="loadingApiKey" variant="button" :class="$style['code-skeleton']" />
		</div>

		<div v-else-if="apiKey?.apiKey" :class="$style['parameters-container']">
			<ConnectionParameter
				id="access-token"
				:value="apiKey.apiKey"
				:value-loading="keyRotating"
				:label="i18n.baseText('settings.mcp.connectPopover.tab.accessToken')"
				:info-tip="i18n.baseText('settings.mcp.instructions.apiKey.tip')"
				:allow-copy="!isKeyRedacted"
				@copy="handleAccessTokenCopy"
			>
				<template #customActions>
					<N8nTooltip
						:content="i18n.baseText('settings.mcp.instructions.rotateKey.tooltip')"
						:show-after="MCP_TOOLTIP_DELAY"
					>
						<N8nButton
							variant="subtle"
							iconOnly
							icon="refresh-cw"
							:disabled="keyRotating"
							@click="rotateKey"
						/>
					</N8nTooltip>
				</template>
			</ConnectionParameter>
			<N8nNotice v-if="!isKeyRedacted">
				{{ i18n.baseText('settings.mcp.access.token.notice') }}
			</N8nNotice>
			<div :class="$style['json-container']" data-test-id="mcp-access-token-json">
				<label :class="$style.label" for="mcp-json">
					{{ i18n.baseText('settings.mcp.connectPopover.jsonConfig') }}
				</label>
				<N8nMarkdown id="mcp-json" :content="connectionCode"></N8nMarkdown>
				<N8nTooltip
					:disabled="!isSupported"
					:content="copied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy')"
					:show-after="MCP_TOOLTIP_DELAY"
				>
					<N8nButton
						v-if="isSupported && !loadingApiKey && !keyRotating"
						variant="subtle"
						iconOnly
						:icon="copied ? 'check' : 'copy'"
						:class="$style['copy-json-button']"
						data-test-id="mcp-json-copy-button"
						@click="handleConnectionStringCopy"
					/>
				</N8nTooltip>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
}

.loading-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

// Make skeletons same height as the actual content
// so nothing moves when loading finishes
.url-skeleton div {
	width: 100%;
	min-height: 40px;
}

.code-skeleton div {
	width: 100%;
	min-height: 350px;
}

.parameters-container {
	display: flex;
	flex-direction: column;

	padding-top: var(--spacing--sm);
}

.json-container {
	flex-grow: 1;
	position: relative;
	margin-top: var(--spacing--sm);

	.label {
		display: inline-flex;
		font-size: var(--font-size--sm);
		color: var(--color--text--shade-1);
		margin-bottom: var(--spacing--4xs);
	}

	:global(.n8n-markdown) {
		width: 100%;
	}

	code {
		color: var(--color--text) !important;
		font-size: var(--font-size--2xs);
		padding: var(--spacing--2xs) !important;
		tab-size: 1;
		background: none !important;
		border: var(--border);
		border-radius: var(--radius);
	}

	&:hover {
		.copy-json-button {
			display: flex;
		}
	}
}

.copy-json-button {
	position: absolute;
	top: var(--spacing--lg);
	right: var(--spacing--3xs);
	display: none;
	border: none;
	outline: none;

	&:hover {
		border: none;
		outline: none;
		background: none;
	}
}
</style>
