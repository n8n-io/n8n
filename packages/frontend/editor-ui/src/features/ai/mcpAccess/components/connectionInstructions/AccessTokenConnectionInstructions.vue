<script setup lang="ts">
import { computed } from 'vue';
import type { ApiKey } from '@n8n/api-types';
import { useClipboard } from '@/app/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nInfoAccordion,
	N8nInfoTip,
	N8nLoading,
	N8nMarkdown,
	N8nNotice,
	N8nTooltip,
} from '@n8n/design-system';
import ConnectionParameter from '@/features/ai/mcpAccess/components/connectionInstructions/ConnectionParameter.vue';

type Props = {
	serverUrl: string;
	apiKey: ApiKey;
	loadingApiKey: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	rotateKey: [];
	urlCopied: [url: string];
	accessTokenCopied: [];
	connectionStringCopied: [];
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
	return props.apiKey.apiKey.includes('******');
});

// formatted code block for markdown component
const connectionCode = computed(() => {
	return `\`\`\`json${connectionString.value}\`\`\``;
});

const apiKeyText = computed(() => {
	if (props.loadingApiKey) {
		return `<${i18n.baseText('generic.loading')}...>`;
	}
	return isKeyRedacted.value ? '<YOUR_ACCESS_TOKEN_HERE>' : props.apiKey.apiKey;
});

const handleConnectionStringCopy = async () => {
	await copy(connectionString.value);
	emit('connectionStringCopied');
};

const handleUrlCopy = (url: string) => {
	emit('urlCopied', url);
};

const handleAccessTokenCopy = () => {
	emit('accessTokenCopied');
};
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
						<ConnectionParameter :value="props.serverUrl" @copy="handleUrlCopy" />
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
							@copy="handleAccessTokenCopy"
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
						:disabled="!isSupported"
						:content="copied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy')"
					>
						<N8nButton
							v-if="isSupported && !props.loadingApiKey"
							type="tertiary"
							:icon="copied ? 'clipboard-check' : 'clipboard'"
							:square="true"
							:class="$style['copy-json-button']"
							@click="handleConnectionStringCopy"
						/>
					</N8nTooltip>
				</template>
			</N8nInfoAccordion>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--xs);
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
	margin-bottom: var(--spacing--sm);

	:global(.n8n-markdown) {
		width: 100%;
	}
	code {
		font-size: var(--font-size--xs);
		tab-size: 1;
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
