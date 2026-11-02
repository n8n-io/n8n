<script setup lang="ts">
import {
	N8nAssistantIcon,
	N8nButton,
	N8nResizeWrapper,
	N8nTooltip,
	useResizablePanel,
} from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { PENDING_APP_ID_STATE, PROJECT_APPS } from '../apps.constants';
import { getAppPermissions } from '../apps.permissions';
import AppView from '../components/AppView.vue';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();

const projectId = computed(() => String(route.params.projectId));
const appId = computed(() => String(route.params.appId));
function pendingAppIdFromHistory() {
	const state = (history.state ?? {}) as Record<string, unknown>;
	const value = state[PENDING_APP_ID_STATE];
	return typeof value === 'string' ? value : undefined;
}
const pendingAppId = ref(pendingAppIdFromHistory());
const pending = computed(() => pendingAppId.value === appId.value);
const AssistantChat = computed(() => componentRegistry.get('instance-ai-app-chat'));
const canUseAssistant = computed(() => {
	if (!AssistantChat.value) return false;
	const permissions = getAppPermissions(projectId.value);
	return pending.value ? permissions.canCreate : permissions.canUpdate;
});
const assistantAvailable = ref<boolean | null>(null);
const chatOpen = ref(true);
const page = useTemplateRef<HTMLElement>('page');
const appView = useTemplateRef<InstanceType<typeof AppView>>('appView');
const chatResizer = useResizablePanel({
	container: page,
	width: {
		localStorageKey: 'N8N_APP_ASSISTANT_PANEL_WIDTH',
		defaultSize: (size) => Math.min(Math.max(size * 0.35, 320), 640),
		minSize: 320,
		maxSize: (size) => Math.min(size * 0.5, 640),
		snap: true,
	},
});
const chatWidth = chatResizer.width;
const showChat = computed(
	() => canUseAssistant.value && assistantAvailable.value !== false && chatOpen.value,
);
const section = computed({
	get: () => (typeof route.query.section === 'string' ? route.query.section : 'preview'),
	set: (value: string) => {
		void router.replace({
			query: { ...route.query, section: value === 'preview' ? undefined : value },
		});
	},
});
const assistantThread = computed({
	get: () =>
		typeof route.query.assistantThread === 'string' ? route.query.assistantThread : undefined,
	set: (value: string | undefined) => {
		void router.replace({ query: { ...route.query, assistantThread: value } });
	},
});

watch(appId, () => {
	pendingAppId.value = pendingAppIdFromHistory();
	assistantAvailable.value = null;
	chatOpen.value = true;
});

function onCreated() {
	const state = (history.state ?? {}) as Record<string, unknown>;
	const { [PENDING_APP_ID_STATE]: _pendingAppId, ...rest } = state;
	history.replaceState(rest, '');
	pendingAppId.value = undefined;
}

function refreshApp() {
	void appView.value?.refresh();
}

function onDeleted() {
	void router.push({ name: PROJECT_APPS, params: { projectId: projectId.value } });
}
</script>

<template>
	<div ref="page" :class="$style.page">
		<AppView
			ref="appView"
			v-model:section="section"
			:project-id="projectId"
			:app-id="appId"
			:pending="pending"
			@created="onCreated"
			@deleted="onDeleted"
		>
			<template #aside>
				<N8nResizeWrapper
					v-if="showChat"
					:class="$style.chat"
					:style="{ width: `${chatWidth}px` }"
					:resizer="chatResizer"
					:supported-directions="['right']"
				>
					<component
						:is="AssistantChat"
						v-if="AssistantChat"
						:project-id="projectId"
						:app-id="appId"
						:pending="pending"
						:thread-id="assistantThread"
						@update:thread-id="assistantThread = $event"
						@update:available="assistantAvailable = $event"
						@updated="refreshApp"
						@close="chatOpen = false"
					/>
				</N8nResizeWrapper>
				<div v-else-if="canUseAssistant && assistantAvailable" :class="$style.chatToggle">
					<N8nTooltip :content="i18n.baseText('apps.assistant.open')">
						<N8nButton
							variant="outline"
							size="medium"
							icon-only
							:aria-label="i18n.baseText('apps.assistant.open')"
							data-test-id="app-assistant-open"
							@click="chatOpen = true"
						>
							<template #icon><N8nAssistantIcon size="large" /></template>
						</N8nButton>
					</N8nTooltip>
				</div>
			</template>
		</AppView>
	</div>
</template>

<style lang="scss" module>
.page {
	width: 100%;
	height: 100%;
	min-height: 0;
}

.chat {
	flex: 0 0 auto;
	min-height: 0;
	border-right: var(--border);
	background: var(--background--surface);
}

.chatToggle {
	display: flex;
	align-items: flex-start;
	padding: var(--spacing--xs);
	border-right: var(--border);
}

@container (max-width: 680px) {
	.chat {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100% !important;
		border-right: 0;
	}
}
</style>
