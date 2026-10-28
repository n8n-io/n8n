<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from '@n8n/i18n';
import { INSTANCE_AI_EMBED_SUBJECT_KEY } from '@/features/ai/instanceAi/embed/instanceAiEmbed.types';
import { N8nIcon } from '@n8n/design-system';
import {
	buildAgentTestHref,
	resolveAgentTestLink,
	type AgentTestTarget,
} from '@/features/agents/utils/agentTestUrl';
import type { ChatResource } from './ChatMarkdown.utils';
import {
	resourceIcons,
	INTERNAL_ROUTE_PATTERNS,
	getResourceLinkIcon,
	getSameOriginUrl,
	decodeResourceId,
	buildResourceUrl,
} from './ChatResourceLink.utils';

const props = defineProps<{
	href: string;
	label: string;
	/** Sanitized label HTML from the Markdown link slot. */
	labelHtml?: string;
	title?: string;
	target?: string;
	rel?: string;
	resources?: readonly ChatResource[];
	agentPreviewTarget?: AgentTestTarget;
	openWorkflowPreview?: (id: string) => boolean;
	openDataTablePreview?: (id: string, projectId: string) => boolean;
	openAgentPreview?: (id: string, projectId: string) => boolean;
	openAgentChatPreview?: (id: string, projectId: string) => boolean;
}>();

const embedSubject = inject(INSTANCE_AI_EMBED_SUBJECT_KEY, undefined);
const i18n = useI18n();
const testLabel = computed(() =>
	embedSubject?.value.type === 'agent' && preview.value && props.label === 'Preview'
		? i18n.baseText('agents.builder.chatMode.test')
		: undefined,
);

const custom = computed(() =>
	/^#?n8n-resource:\/\/(workflow|credential|data-table|agent)\/(.+)$/.exec(props.href),
);
const id = computed(() => (custom.value ? decodeResourceId(custom.value[2]) : undefined));
const entry = computed(() =>
	props.resources?.find(
		(resource) => resource.type === custom.value?.[1] && resource.id === id.value,
	),
);

const preview = computed(() => {
	const resolved = resolveAgentTestLink(props.href);
	if (!resolved || !props.agentPreviewTarget) return resolved;
	const target = props.agentPreviewTarget;
	return {
		...target,
		href: buildAgentTestHref(
			target.projectId,
			target.agentId,
			new URL(resolved.href, window.location.origin).searchParams,
		),
	};
});

const type = computed(() => {
	if (custom.value) return custom.value[1];
	const url = getSameOriginUrl(props.href);
	return url && INTERNAL_ROUTE_PATTERNS.find(({ pattern }) => pattern.test(url.pathname))?.type;
});

const href = computed(
	() =>
		preview.value?.href ??
		(custom.value && id.value
			? buildResourceUrl(custom.value[1], id.value, entry.value?.projectId)
			: props.href),
);
const icon = computed(() =>
	preview.value ? undefined : (resourceIcons[type.value ?? ''] ?? getResourceLinkIcon(props.href)),
);

function handleClick(event: MouseEvent) {
	if (embedSubject?.value.type === 'agent' && (event.metaKey || event.ctrlKey)) return;
	if (preview.value && props.openAgentChatPreview) {
		event.preventDefault();
		props.openAgentChatPreview(preview.value.agentId, preview.value.projectId);
		return;
	}
	if (
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey ||
		event.button !== 0 ||
		!id.value
	)
		return;
	let switched: boolean | undefined;
	if (type.value === 'workflow') switched = props.openWorkflowPreview?.(id.value);
	if (entry.value?.projectId) {
		if (type.value === 'data-table')
			switched = props.openDataTablePreview?.(id.value, entry.value.projectId);
		if (type.value === 'agent')
			switched = props.openAgentPreview?.(id.value, entry.value.projectId);
	}
	if (switched === true) event.preventDefault();
}
</script>
<template>
	<a
		:href="href"
		:title="title"
		:target="preview ? undefined : type ? '_blank' : target"
		:rel="preview ? undefined : type ? 'noopener noreferrer' : rel"
		:data-resource-chip="preview ? undefined : type"
		:data-resource-id="id"
		:data-agent-preview-id="preview?.agentId"
		:data-agent-preview-project-id="preview?.projectId"
		:class="$style.link"
		@click="handleClick"
	>
		<N8nIcon v-if="icon" :icon="icon" aria-hidden="true" :class="$style.icon" />
		<template v-if="testLabel">{{ testLabel }}</template>
		<span v-else-if="labelHtml !== undefined" v-html="labelHtml" />
		<template v-else>{{ label }}</template>
	</a>
</template>

<style module>
.icon {
	vertical-align: middle;
	margin-right: var(--spacing--4xs);
	transform: translateY(-1px);
}
.link {
	display: inline;
	font-size: inherit;
}
</style>
