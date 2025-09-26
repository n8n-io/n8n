<script setup lang="ts">
import { computed } from 'vue';
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@n8n/i18n';

const MCP_ENDPOINT = 'rest/mcp-control/http';
// TODO: Update once docs page is ready
const DOCS_URL = 'https://docs.n8n.io/';

type Props = {
	baseUrl: string;
};

const props = defineProps<Props>();

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
        "authorization:Bearer <YOUR_N8N_API_KEY>"
      ]
    }
  }
}
`;
});

// formatted code block for markdown component
const connectionCode = computed(() => {
	return `\`\`\`json${connectionString.value}\`\`\``;
});

const fullServerUrl = computed(() => {
	return props.baseUrl + MCP_ENDPOINT;
});
</script>

<template>
	<div :class="$style.container">
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
					<span :class="$style.url">
						<code>{{ fullServerUrl }}</code>
						<N8nButton
							v-if="isSupported"
							type="tertiary"
							:icon="copied ? 'check' : 'copy'"
							:square="true"
							:class="$style['copy-url-button']"
							@click="copy(fullServerUrl)"
						/>
					</span>
				</div>
			</li>
			<li>
				<div :class="$style.item">
					<span :class="$style.label">
						{{ i18n.baseText('settings.mcp.instructions.apiKey.part1') }}
						<N8nLink to="/settings/api">{{ i18n.baseText('generic.apiKey') }}</N8nLink
						>.
						{{ i18n.baseText('settings.mcp.instructions.apiKey.part2') }}
					</span>
				</div>
			</li>
		</ol>
		<div :class="$style.connectionString">
			<N8nInfoAccordion :title="i18n.baseText('settings.mcp.instructions.json')">
				<template #customContent>
					<N8nMarkdown :content="connectionCode"></N8nMarkdown>
					<N8nButton
						v-if="isSupported"
						type="tertiary"
						:icon="copied ? 'check' : 'copy'"
						:square="true"
						:class="$style['copy-json-button']"
						@click="copy(connectionString)"
					/>
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

.instructions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	padding-left: var(--spacing-l);
	margin: var(--spacing-s);

	.item {
		display: flex;
		align-items: center;
		gap: var(--spacing-2xs);
	}

	.label {
		font-size: var(--font-size-s);
	}

	.url {
		display: flex;
		align-items: center;
		gap: var(--spacing-2xs);
		padding-left: var(--spacing-3xs);
		background: var(--color-background-xlight);
		border: var(--border-base);
		border-radius: var(--border-radius-base);
		font-size: var(--font-size-s);
		overflow: hidden;

		.copy-url-button {
			border: none;
			border-radius: 0;
			border-left: var(--border-base);
		}

		@media screen and (max-width: 820px) {
			display: block;
			word-wrap: break-word;
			margin-top: var(--spacing-2xs);
		}
	}
}

.connectionString {
	flex-grow: 1;
	position: relative;
	padding: 0 var(--spacing-l);

	:global(.n8n-markdown) {
		width: 100%;
	}
	code {
		font-size: var(--font-size-xs);
	}

	&:hover {
		.copy-json-button {
			display: flex;
		}
	}
}

.copy-json-button {
	position: absolute;
	top: var(--spacing-xl);
	right: var(--spacing-xl);
	display: none;
}
</style>
