<script lang="ts" setup>
import type { McpServerDetailDto } from '@n8n/api-types';
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { McpServerTab } from '../constants';
import {
	ACCESS_LABEL_KEYS,
	BEHAVIOR_BADGE_VARIANTS,
	BEHAVIOR_LABEL_KEYS,
} from '../mcpServers.utils';

const INSTRUCTIONS_EXCERPT_LENGTH = 90;

const props = defineProps<{ server: McpServerDetailDto }>();

const emit = defineEmits<{
	openTool: [toolId: string];
	openTab: [tab: McpServerTab];
}>();

const i18n = useI18n();

const urlPath = computed(() => {
	try {
		return new URL(props.server.url).pathname;
	} catch {
		return props.server.url;
	}
});

const rateLimitLabel = computed(() =>
	props.server.rateLimitPerMinute > 0
		? i18n.baseText('mcpServers.canvas.rateLimit', {
				interpolate: { count: props.server.rateLimitPerMinute },
			})
		: i18n.baseText('mcpServers.canvas.noRateLimit'),
);

const instructionsExcerpt = computed(() => {
	const text = props.server.instructions.trim();
	if (!text) return '';
	return text.length > INSTRUCTIONS_EXCERPT_LENGTH
		? `"${text.slice(0, INSTRUCTIONS_EXCERPT_LENGTH)}…"`
		: `"${text}"`;
});
</script>

<template>
	<div :class="$style.canvas" data-testid="mcp-server-canvas">
		<N8nText size="small" color="text-light" :class="$style.hint">
			{{ i18n.baseText('mcpServers.canvas.hint') }}
		</N8nText>
		<div :class="$style.scroll">
			<div :class="$style.branch">
				<div :class="[$style.node, $style.root]">
					<span :class="$style.rootTitle">
						<N8nIcon icon="mcp" size="small" />
						<b>{{ server.name }}</b>
					</span>
					<span :class="$style.mono">{{ urlPath }}</span>
				</div>
				<div :class="$style.children">
					<!-- Access -->
					<div :class="$style.branch">
						<div :class="[$style.node, $style.group]">
							{{ i18n.baseText('mcpServers.canvas.access') }}
						</div>
						<div :class="$style.children">
							<div :class="$style.branch">
								<button
									type="button"
									:class="[$style.node, $style.clickable]"
									@click="emit('openTab', 'access')"
								>
									{{ i18n.baseText(ACCESS_LABEL_KEYS[server.accessMode]) }}
								</button>
							</div>
							<div :class="$style.branch">
								<button
									type="button"
									:class="[$style.node, $style.clickable]"
									@click="emit('openTab', 'access')"
								>
									{{ rateLimitLabel }}
								</button>
							</div>
						</div>
					</div>

					<!-- Tools -->
					<div :class="$style.branch">
						<div :class="[$style.node, $style.group]">
							{{ i18n.baseText('mcpServers.build.tools.title') }}
						</div>
						<div :class="$style.children">
							<div v-for="tool in server.tools" :key="tool.id" :class="$style.branch">
								<button
									type="button"
									:class="[$style.node, $style.clickable, { [$style.dim]: !tool.enabled }]"
									data-testid="mcp-server-canvas-tool"
									@click="emit('openTool', tool.id)"
								>
									<span :class="$style.mono">{{ tool.name }}</span>
									<N8nBadge :variant="BEHAVIOR_BADGE_VARIANTS[tool.behavior]" size="xsmall">
										{{ i18n.baseText(BEHAVIOR_LABEL_KEYS[tool.behavior]) }}
									</N8nBadge>
									<N8nIcon
										v-if="!tool.available"
										icon="triangle-alert"
										size="small"
										:class="$style.warn"
									/>
								</button>
								<div :class="$style.children">
									<div :class="$style.branch">
										<button
											type="button"
											:class="[$style.node, $style.clickable]"
											:title="tool.previewNodes?.map((node) => node.name).join(' → ')"
											@click="emit('openTool', tool.id)"
										>
											<N8nIcon :icon="tool.kind === 'workflow' ? 'workflow' : 'bot'" size="small" />
											{{ tool.targetName }}
										</button>
									</div>
								</div>
							</div>
							<div :class="$style.branch">
								<div :class="[$style.node, $style.soon]">
									{{ i18n.baseText('mcpServers.canvas.externalTools') }}
								</div>
							</div>
						</div>
					</div>

					<!-- Resources -->
					<div :class="$style.branch">
						<div :class="[$style.node, $style.group]">
							{{ i18n.baseText('mcpServers.build.resources.title') }}
						</div>
						<div :class="$style.children">
							<div v-for="resource in server.resources" :key="resource.id" :class="$style.branch">
								<div :class="$style.node">
									<span :class="$style.kind">{{ resource.kind }}:</span> {{ resource.name }}
								</div>
							</div>
							<div v-if="server.resources.length === 0" :class="$style.branch">
								<div :class="[$style.node, $style.sub]">
									{{ i18n.baseText('mcpServers.canvas.none') }}
								</div>
							</div>
						</div>
					</div>

					<!-- Instructions -->
					<div :class="$style.branch">
						<div :class="[$style.node, $style.group]">
							{{ i18n.baseText('mcpServers.build.instructions.title') }}
						</div>
						<div :class="$style.children">
							<div :class="$style.branch">
								<div :class="[$style.node, $style.sub, $style.excerpt]">
									{{ instructionsExcerpt || i18n.baseText('mcpServers.canvas.none') }}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.canvas {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.hint {
	display: block;
}

.scroll {
	overflow: auto;
	padding: var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--subtle);
	background-image: radial-gradient(var(--border-color) 1px, transparent 1px);
	background-size: var(--spacing--md) var(--spacing--md);
	min-height: 360px;
}

.branch {
	position: relative;
	display: flex;
	align-items: center;
}

/* Children column with tree connectors: a stub from the parent and an elbow per child. */
.children {
	--tree-gap: var(--spacing--md);

	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-left: calc(var(--tree-gap) * 2);

	&::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		width: var(--tree-gap);
		border-top: var(--border-width) solid var(--border-color);
	}

	> .branch::before {
		content: '';
		position: absolute;
		left: calc(var(--tree-gap) * -1);
		top: 50%;
		width: var(--tree-gap);
		border-top: var(--border-width) solid var(--border-color);
	}

	> .branch::after {
		content: '';
		position: absolute;
		left: calc(var(--tree-gap) * -1);
		top: calc(var(--spacing--2xs) / -2);
		bottom: calc(var(--spacing--2xs) / -2);
		border-left: var(--border-width) solid var(--border-color);
	}

	> .branch:first-child::after {
		top: 50%;
	}

	> .branch:last-child::after {
		bottom: 50%;
	}

	> .branch:only-child::after {
		display: none;
	}
}

.node {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	flex-shrink: 0;
}

.root {
	flex-direction: column;
	align-items: flex-start;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-color: var(--color--primary);
	font-size: var(--font-size--sm);
}

.rootTitle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.group {
	font-weight: var(--font-weight--bold);
	background: var(--background--subtle);
}

.clickable {
	cursor: pointer;

	&:hover {
		border-color: var(--color--primary);
	}
}

.dim {
	opacity: 0.55;
}

.excerpt {
	max-width: 420px;
	white-space: normal;
}

.soon {
	border-style: dashed;
	color: var(--text-color--subtler);
}

.kind {
	color: var(--text-color--subtle);
}

.mono {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}

.warn {
	color: var(--color--warning);
}
</style>
