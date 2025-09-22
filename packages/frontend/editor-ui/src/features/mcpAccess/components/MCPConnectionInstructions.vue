<script setup lang="ts">
import { computed, ref } from 'vue';
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@n8n/i18n';

const MCP_ENDPOINT = 'rest/mcp-control/http';

type Props = {
	baseUrl: string;
};

const props = defineProps<Props>();

const { copy, copied, isSupported } = useClipboard();
const i18n = useI18n();

// mcp.json value that's to be copied
const connectionString = ref(`
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
        "authorization:<YOUR_N8N_API_KEY>"
      ]
    }
  }
}
`);

// formatted code block for markdown component
const connectionCode = computed(() => {
	return `\`\`\`json${connectionString.value}\`\`\``;
});
</script>

<template>
	<div :class="$style.container">
		<ol :class="$style.instructions">
			<li>
				<span :class="$style.label">
					{{ i18n.baseText('settings.mcp.instructions.serverUrl') }}:
				</span>
				<span :class="$style.value">
					<code>{{ props.baseUrl + MCP_ENDPOINT }}</code>
				</span>
			</li>
			<li>
				<span :class="$style.label">
					{{ i18n.baseText('settings.mcp.instructions.authorization') }}:
				</span>
				<span :class="$style.value">
					{{ i18n.baseText('generic.your') }}
					<n8n-link to="/settings/api">n8n {{ i18n.baseText('generic.apiKey') }}</n8n-link>
				</span>
			</li>
		</ol>
		<div :class="$style.connectionString">
			<n8n-info-accordion :title="i18n.baseText('settings.mcp.instructions.json')">
				<template #customContent>
					<n8n-markdown :content="connectionCode"></n8n-markdown>
					<n8n-button
						v-if="isSupported"
						type="tertiary"
						:icon="copied ? 'check' : 'copy'"
						:square="true"
						:class="$style['copy-button']"
						@click="copy(connectionString)"
					/>
				</template>
			</n8n-info-accordion>
		</div>
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
	gap: var(--spacing-m);
	padding-left: var(--spacing-l);
	margin: var(--spacing-s);

	.value {
		padding: var(--spacing-4xs);
		background: var(--color-background-xlight);
		border: var(--border-base);
		border-radius: var(--border-radius-base);
		font-size: var(--font-size-s);

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
		.copy-button {
			display: flex;
		}
	}
}

.copy-button {
	position: absolute;
	top: var(--spacing-xl);
	right: var(--spacing-xl);
	display: none;
}
</style>
