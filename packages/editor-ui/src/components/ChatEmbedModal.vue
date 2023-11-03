<script lang="ts" setup>
import type { PropType } from 'vue';
import { computed, ref } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';
import Modal from './Modal.vue';
import { CHAT_EMBED_MODAL_KEY, WEBHOOK_NODE_TYPE } from '../constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useWorkflowsStore } from '@/stores';
import HtmlEditor from '@/components/HtmlEditor/HtmlEditor.vue';
import CodeNodeEditor from '@/components/CodeNodeEditor/CodeNodeEditor.vue';
import { useI18n } from '@/composables';

const props = defineProps({
	modalBus: {
		type: Object as PropType<EventBus>,
		default: () => createEventBus(),
	},
});

const i18n = useI18n();
const rootStore = useRootStore();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();

const tabs = ref([
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
const currentTab = ref('cdn');

const webhookNode = computed(() => {
	return workflowsStore.workflow.nodes.find((node) => node.type === WEBHOOK_NODE_TYPE);
});

const webhookUrl = computed(() => {
	return `${rootStore.getWebhookUrl}${webhookNode.value ? `/${webhookNode.value.webhookId}` : ''}`;
});

function indentLines(code: string, indent: string = '	') {
	return code
		.split('\n')
		.map((line) => `${indent}${line}`)
		.join('\n');
}

const commonCode = computed(() => ({
	import: `import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';`,
	createChat: `createChat({
	webhookUrl: '${webhookUrl.value}'
});`,
	install: 'npm install @n8n/chat',
}));

const cdnCode = computed(
	() => `<link href="https://cdn.jsdelivr.net/npm/@n8n/chat/style.css" rel="stylesheet" />
<script type="module">
import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/chat.bundle.es.js';

${commonCode.value.createChat}
</${'script'}>`,
);

const vueCode = computed(
	() => `<script lang="ts" setup>
import { onMounted } from 'vue';
${commonCode.value.import}

onMounted(() => {
${indentLines(commonCode.value.createChat)}
});
</${'script'}>`,
);

const reactCode = computed(
	() => `import { useEffect } from 'react';
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
		:eventBus="modalBus"
		:name="CHAT_EMBED_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-tabs :options="tabs" v-model="currentTab" />

				<div v-if="currentTab !== 'cdn'">
					<n8n-text>
						{{ i18n.baseText('chatEmbed.install') }}
					</n8n-text>
					<CodeNodeEditor :modelValue="commonCode.install" isReadOnly />
				</div>

				<n8n-text>
					<i18n-t :keypath="`chatEmbed.paste.${currentTab}`">
						<template #code>
							<code>{{ i18n.baseText(`chatEmbed.paste.${currentTab}.file`) }}</code>
						</template>
					</i18n-t>
				</n8n-text>
				<HtmlEditor v-if="currentTab === 'cdn'" :modelValue="cdnCode" isReadOnly />
				<HtmlEditor v-if="currentTab === 'vue'" :modelValue="vueCode" isReadOnly />
				<CodeNodeEditor v-if="currentTab === 'react'" :modelValue="reactCode" isReadOnly />
				<CodeNodeEditor v-if="currentTab === 'other'" :modelValue="otherCode" isReadOnly />

				<n8n-info-tip>
					{{ i18n.baseText('chatEmbed.packageInfo.description') }}
					<n8n-link :href="i18n.baseText('chatEmbed.url')" new-window size="small" bold>
						{{ i18n.baseText('chatEmbed.packageInfo.link') }}
					</n8n-link>
				</n8n-info-tip>
			</div>
		</template>

		<template #footer>
			<div class="action-buttons">
				<n8n-button @click="closeDialog" float="right" :label="i18n.baseText('chatEmbed.close')" />
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
