<script setup lang="ts">
import { computed } from 'vue';
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nInfoAccordion,
	N8nInfoTip,
	N8nLoading,
	N8nMarkdown,
	N8nNotice,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { ApiKey } from '@n8n/api-types';
import ConnectionParameter from './ConnectionParameter.vue';

const MCP_ENDPOINT = 'mcp-server/http';
// TODO: Update once docs page is ready
const DOCS_URL = 'https://docs.n8n.io/';

type Props = {
	baseUrl: string;
	apiKey: ApiKey;
	loadingApiKey: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	rotateKey: [];
}>();

const { copy, copied, isSupported } = useClipboard();
const i18n = useI18n();

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
        "${props.baseUrl}${MCP_ENDPOINT}",
        "--header",
        "authorization:Bearer ${apiKeyText.value}"
      ]
    }
  }
}
`;
});

const isKeyRedacted = computed(() => {
	return props.apiKey.apiKey.includes('******');
});

// formatted code block for markdown component
const connectionCode = computed(() => {
	return `\`\`\`json${connectionString.value}\`\`\``;
});

const fullServerUrl = computed(() => {
	return props.baseUrl + MCP_ENDPOINT;
});

const apiKeyText = computed(() => {
	if (props.loadingApiKey) {
		return `<${i18n.baseText('generic.loading')}...>`;
	}
	return isKeyRedacted.value ? '<YOUR_ACCESS_TOKEN_HERE>' : props.apiKey.apiKey;
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style['instructions-container']">
			<ol :class="$style.instructions">
				<li>
					<div :class="$style.item">
						<span :class="$style.label">
							{{ i18n.baseText('settings.mcp.instructions.enableAccess') }}
						</span>
					</div>
				</li>
				<li>
					<div :class="$style.item">
						<span :class="$style.label">
							{{ i18n.baseText('settings.mcp.instructions.serverUrl') }}:
						</span>
						<ConnectionParameter :value="fullServerUrl" />
					</div>
				</li>
				<li>
					<div :class="$style.item">
						<span :class="$style.label">
							{{ i18n.baseText('settings.mcp.instructions.apiKey.label') }}:
						</span>
						<N8nLoading
							v-if="props.loadingApiKey"
							:loading="props.loadingApiKey"
							:class="$style['api-key-loader']"
						/>
						<ConnectionParameter
							v-else
							:value="props.apiKey.apiKey"
							:max-width="400"
							:allow-copy="!isKeyRedacted"
						>
							<template #customActions>
								<N8nTooltip :content="i18n.baseText('settings.mcp.instructions.rotateKey.tooltip')">
									<N8nButton
										type="tertiary"
										icon="refresh-cw"
										:square="true"
										@click="emit('rotateKey')"
									/>
								</N8nTooltip>
							</template>
						</ConnectionParameter>
						<N8nInfoTip v-if="!props.loadingApiKey" type="tooltip" tooltip-placement="right">
							{{ i18n.baseText('settings.mcp.instructions.apiKey.tip') }}
						</N8nInfoTip>
					</div>
				</li>
			</ol>
			<N8nNotice
				v-if="!isKeyRedacted && !props.loadingApiKey"
				theme="warning"
				:class="$style['copy-key-notice']"
				:content="i18n.baseText('settings.mcp.newKey.notice')"
			/>
		</div>
		<div :class="$style.connectionString">
			<N8nInfoAccordion :title="i18n.baseText('settings.mcp.instructions.json')">
				<template #customContent>
					<N8nMarkdown :content="connectionCode"></N8nMarkdown>
					<N8nTooltip
						:disables="!isSupported"
						:content="copied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy')"
					>
						<N8nButton
							v-if="isSupported && !props.loadingApiKey"
							type="tertiary"
							:icon="copied ? 'clipboard-check' : 'clipboard'"
							:square="true"
							:class="$style['copy-json-button']"
							@click="copy(connectionString)"
						/>
					</N8nTooltip>
				</template>
			</N8nInfoAccordion>
		</div>
		<N8nText size="small" class="mt-m">
			{{ i18n.baseText('settings.mcp.instructions.docs.part1') }}
			<a :href="DOCS_URL" target="_blank">
				{{ i18n.baseText('settings.mcp.instructions.docs.part2') }}
			</a>
		</N8nText>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
}

.instructions-container {
	:global(.notice) {
		margin: var(--spacing--sm) var(--spacing--lg) var(--spacing--md);
	}
}

.instructions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-left: var(--spacing--lg);
	margin: var(--spacing--sm);

	li {
		min-height: var(--spacing--lg);
	}

	.item {
		display: flex;
		align-items: center;
		gap: var(--spacing--2xs);

		:global(.n8n-loading) div {
			height: 32px;
			width: 300px;
			margin: 0;
		}
	}

	.label {
		font-size: var(--font-size--sm);
		flex: none;
	}

	.url {
		display: flex;
		align-items: stretch;
		gap: var(--spacing--2xs);
		background: var(--color--background--light-3);
		border: var(--border);
		border-radius: var(--radius);
		font-size: var(--font-size--sm);
		overflow: hidden;

		code {
			text-overflow: ellipsis;
			overflow: hidden;
			white-space: pre;
			padding: var(--spacing--2xs) var(--spacing--3xs);
		}

		.copy-url-wrapper {
			display: flex;
			align-items: center;
			border-left: var(--border);
		}

		.copy-url-button {
			border: none;
			border-radius: 0;
		}

		@media screen and (max-width: 820px) {
			word-wrap: break-word;
			margin-top: var(--spacing--2xs);
		}
	}
}

.connectionString {
	flex-grow: 1;
	position: relative;
	padding: 0 var(--spacing--lg);

	:global(.n8n-markdown) {
		width: 100%;
	}
	code {
		font-size: var(--font-size--xs);
	}

	&:hover {
		.copy-json-button {
			display: flex;
		}
	}
}

.copy-json-button {
	position: absolute;
	top: var(--spacing--xl);
	right: var(--spacing--2xl);
	display: none;
}
</style>
