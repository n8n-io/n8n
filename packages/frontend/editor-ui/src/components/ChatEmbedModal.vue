<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from './Modal.vue';
import { CHAT_EMBED_MODAL_KEY, CHAT_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from '../constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsStore } from '@/stores/workflows.store';
import HtmlEditor from '@/components/HtmlEditor/HtmlEditor.vue';
import JsEditor from '@/components/JsEditor/JsEditor.vue';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';

const props = withDefaults(
	defineProps<{
		modalBus?: EventBus;
	}>(),
	{
		modalBus: () => createEventBus(),
	},
);

const i18n = useI18n();
const rootStore = useRootStore();
const workflowsStore = useWorkflowsStore();

type ChatEmbedModalTabValue = 'cdn' | 'vue' | 'react' | 'other';
type ChatEmbedModalTab = {
	label: string;
	value: ChatEmbedModalTabValue;
};
const tabs = ref<ChatEmbedModalTab[]>([
	{
		label: 'CDN Embed',
		value: 'cdn',
	},
	{
		label: 'Vue Embed',
		value: 'vue',
	},
	{
		label: 'React Embed',
		value: 'react',
	},
	{
		label: 'Other',
		value: 'other',
	},
]);
const currentTab = ref<ChatEmbedModalTabValue>('cdn');

const webhookNode = computed(() => {
	for (const type of [CHAT_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE]) {
		const node = workflowsStore.workflow.nodes.find((node) => node.type === type);
		if (node) {
			// This has to be kept up-to-date with the mode in the Chat-Trigger node
			if (type === CHAT_TRIGGER_NODE_TYPE && !node.parameters.public) {
				continue;
			}

			return {
				type,
				node,
			};
		}
	}

	return null;
});

const webhookUrl = computed(() => {
	const url = `${rootStore.webhookUrl}${
		webhookNode.value ? `/${webhookNode.value.node.webhookId}` : ''
	}`;

	return webhookNode.value?.type === CHAT_TRIGGER_NODE_TYPE ? `${url}/chat` : url;
});

function indentLines(code: string, indent: string = '	') {
	return code
		.split('\n')
		.map((line) => `${indent}${line}`)
		.join('\n');
}

const importCode = 'import'; // To avoid vite from parsing the import statement
const commonCode = computed(() => ({
	import: `${importCode} '@n8n/chat/style.css';
${importCode} { createChat } from '@n8n/chat';`,
	createChat: `createChat({
	webhookUrl: '${webhookUrl.value}'
});`,
	install: 'npm install @n8n/chat',
}));

const cdnCode = computed(
	() => `<link href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css" rel="stylesheet" />
<script type="module">
${importCode} { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

${commonCode.value.createChat}
</${'script'}>`,
);

const vueCode = computed(
	() => `<script lang="ts" setup>
${importCode} { onMounted } from 'vue';
${commonCode.value.import}

onMounted(() => {
${indentLines(commonCode.value.createChat)}
});
</${'script'}>`,
);

const reactCode = computed(
	() => `${importCode} { useEffect } from 'react';
${commonCode.value.import}

export const App = () => {
	useEffect(() => {
${indentLines(commonCode.value.createChat, '		')}
	}, []);

	return (<div></div>);
};

</${'script'}>`,
);

const otherCode = computed(
	() => `${commonCode.value.import}

${commonCode.value.createChat}`,
);

function closeDialog() {
	props.modalBus.emit('close');
}
</script>

<template>
	<Modal
		max-width="960px"
		:title="i18n.baseText('chatEmbed.title')"
		:event-bus="modalBus"
		:name="CHAT_EMBED_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-tabs v-model="currentTab" :options="tabs" />

				<div v-if="currentTab !== 'cdn'">
					<div class="mb-s">
						<n8n-text>
							{{ i18n.baseText('chatEmbed.install') }}
						</n8n-text>
					</div>
					<HtmlEditor :model-value="commonCode.install" is-read-only />
				</div>

				<div class="mb-s">
					<n8n-text>
						<I18nT :keypath="`chatEmbed.paste.${currentTab}`" scope="global">
							<template #code>
								<code>{{ i18n.baseText(`chatEmbed.paste.${currentTab}.file`) }}</code>
							</template>
						</I18nT>
					</n8n-text>
				</div>

				<HtmlEditor v-if="currentTab === 'cdn'" :model-value="cdnCode" is-read-only />
				<HtmlEditor v-if="currentTab === 'vue'" :model-value="vueCode" is-read-only />
				<JsEditor v-if="currentTab === 'react'" :model-value="reactCode" is-read-only />
				<JsEditor v-if="currentTab === 'other'" :model-value="otherCode" is-read-only />

				<n8n-text>
					{{ i18n.baseText('chatEmbed.packageInfo.description') }}
					<n8n-link :href="i18n.baseText('chatEmbed.url')" new-window bold>
						{{ i18n.baseText('chatEmbed.packageInfo.link') }}
					</n8n-link>
				</n8n-text>

				<n8n-info-tip class="mt-s">
					{{ i18n.baseText('chatEmbed.chatTriggerNode') }}
				</n8n-info-tip>
			</div>
		</template>

		<template #footer>
			<div class="action-buttons">
				<n8n-button float="right" :label="i18n.baseText('chatEmbed.close')" @click="closeDialog" />
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container > * {
	margin-bottom: var(--spacing-s);
	overflow-wrap: break-word;
}
</style>
