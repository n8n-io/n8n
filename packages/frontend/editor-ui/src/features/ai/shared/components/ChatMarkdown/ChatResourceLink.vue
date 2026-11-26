<script setup lang="ts">
import { isArtifactLinkType, type useArtifactLinks } from '@/features/ai/instanceAi/artifactLinks';
import { computed, inject } from 'vue';
import { useI18n } from '@n8n/i18n';
import { INSTANCE_AI_EMBED_SUBJECT_KEY } from '@/features/ai/instanceAi/embed/instanceAiEmbed.types';
import { N8nIcon, n8nHtml as vN8nHtml } from '@n8n/design-system';
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
	parseResourceRoute,
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
	openSkillPreview?: (id: string) => boolean;
	openAppPreview?: (id: string) => boolean;
	artifactLinks?: Pick<
		ReturnType<typeof useArtifactLinks>,
		'artifactHref' | 'routerPathHref' | 'toRouterPath'
	>;
}>();

const embedSubject = inject(INSTANCE_AI_EMBED_SUBJECT_KEY, undefined);
const i18n = useI18n();
const testLabel = computed(() =>
	embedSubject?.value.type === 'agent' && preview.value && props.label === 'Preview'
		? i18n.baseText('agents.builder.chatMode.test')
		: undefined,
);

const custom = computed(() =>
	/^#?n8n-resource:\/\/(workflow|credential|data-table|agent|skill|app)\/(.+)$/.exec(props.href),
);

const routerPath = computed(() => {
	if (props.artifactLinks) return props.artifactLinks.toRouterPath(props.href);
	const url = getSameOriginUrl(props.href);
	return url
		? { pathname: url.pathname, fullPath: `${url.pathname}${url.search}${url.hash}` }
		: undefined;
});

const internalRoute = computed(() => {
	const pathname = routerPath.value?.pathname;
	return pathname === undefined
		? undefined
		: INTERNAL_ROUTE_PATTERNS.find(({ pattern }) => pattern.test(pathname));
});

/**
 * A known resource that a plain app link, such as `/workflow/<id>`, points to. Only a
 * resource of the thread counts, so a link to anything else still opens in a new tab.
 */
const routeResource = computed(() => {
	if (custom.value || !routerPath.value) return undefined;
	const resource = parseResourceRoute(routerPath.value.pathname);
	const known = props.resources?.some(
		(candidate) => candidate.type === resource?.type && candidate.id === resource?.id,
	);
	return known ? resource : undefined;
});

const id = computed(() => {
	if (custom.value) return decodeResourceId(custom.value[2]);
	return routeResource.value?.id;
});
const entry = computed(() => {
	const resourceType = custom.value?.[1] ?? routeResource.value?.type;
	return props.resources?.find(
		(resource) => resource.type === resourceType && resource.id === id.value,
	);
});
/** The project of the resource, from the thread or from the link path. */
const projectId = computed(() => entry.value?.projectId ?? routeResource.value?.projectId);

const preview = computed(() => {
	const resolved = routerPath.value ? resolveAgentTestLink(routerPath.value.fullPath) : undefined;
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
	return internalRoute.value?.type;
});

const href = computed(() => {
	if (preview.value) {
		return props.artifactLinks?.routerPathHref(preview.value.href) ?? preview.value.href;
	}
	if (custom.value && id.value) {
		const resourceType = custom.value[1];
		if (props.artifactLinks && isArtifactLinkType(resourceType)) {
			return (
				props.artifactLinks.artifactHref(resourceType, id.value, entry.value?.projectId) ?? '#'
			);
		}
		return buildResourceUrl(resourceType, id.value, entry.value?.projectId);
	}
	return internalRoute.value && routerPath.value && props.artifactLinks
		? props.artifactLinks.routerPathHref(routerPath.value.fullPath)
		: props.href;
});

const icon = computed(() =>
	preview.value ? undefined : (resourceIcons[type.value ?? ''] ?? getResourceLinkIcon(props.href)),
);

function handleClick(event: MouseEvent) {
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
		return;
	if (preview.value && props.openAgentChatPreview) {
		event.preventDefault();
		props.openAgentChatPreview(preview.value.agentId, preview.value.projectId);
		return;
	}
	if (!id.value) return;
	let switched: boolean | undefined;
	if (type.value === 'workflow') switched = props.openWorkflowPreview?.(id.value);
	if (type.value === 'skill') switched = props.openSkillPreview?.(id.value);
	if (type.value === 'app') switched = props.openAppPreview?.(id.value);
	if (projectId.value) {
		if (type.value === 'data-table')
			switched = props.openDataTablePreview?.(id.value, projectId.value);
		if (type.value === 'agent') switched = props.openAgentPreview?.(id.value, projectId.value);
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
		<span v-else-if="labelHtml !== undefined" v-n8n-html="labelHtml" />
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
