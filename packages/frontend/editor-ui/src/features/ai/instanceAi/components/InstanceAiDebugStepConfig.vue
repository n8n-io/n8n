<script lang="ts" setup>
import type { ReadableStepConfig } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import InstanceAiDebugJsonPanel from './InstanceAiDebugJsonPanel.vue';

const props = defineProps<{
	config: ReadableStepConfig;
}>();

const i18n = useI18n();

const toolsBySize = computed(() =>
	[...props.config.tools].sort((a, b) => b.estimatedTokens - a.estimatedTokens),
);
const largestToolTokens = computed(() => toolsBySize.value[0]?.estimatedTokens ?? 0);

function formatTokens(tokens: number): string {
	return tokens < 1000 ? tokens.toString() : `${(tokens / 1000).toFixed(1)}k`;
}

function estimatedTokensLabel(tokens: number): string {
	return i18n.baseText('instanceAi.debug.runDebug.estimatedTokens', {
		interpolate: { count: formatTokens(tokens) },
	});
}

function barWidth(tokens: number): string {
	return largestToolTokens.value > 0 ? `${(tokens / largestToolTokens.value) * 100}%` : '0%';
}
</script>

<template>
	<article :class="$style.card" data-test-id="instance-ai-llm-step-config">
		<div :class="$style.cardHeader">
			<span :class="$style.roleLabel">
				{{ i18n.baseText('instanceAi.debug.runDebug.inputSettings') }}
			</span>
		</div>
		<div :class="$style.cardBody">
			<div v-if="config.settings.length > 0" :class="$style.settings">
				<span
					v-for="setting in config.settings"
					:key="setting.label"
					:class="$style.settingChip"
					:title="`${setting.label}: ${setting.value}`"
				>
					<span :class="$style.settingLabel">{{ setting.label }}</span>
					<span :class="$style.settingValue">{{ setting.value }}</span>
				</span>
			</div>

			<details v-if="config.tools.length > 0" :class="$style.tools">
				<summary :class="$style.toolsSummary">
					<span>
						{{
							i18n.baseText('instanceAi.debug.runDebug.toolCount', {
								interpolate: { count: config.tools.length.toString() },
							})
						}}
					</span>
					<span :class="$style.toolsTotal">
						{{ estimatedTokensLabel(config.toolsEstimatedTokens) }}
					</span>
				</summary>
				<ul :class="$style.toolList">
					<li v-for="tool in toolsBySize" :key="tool.name">
						<details :class="$style.tool">
							<summary :class="$style.toolSummary">
								<code :class="$style.toolName">{{ tool.name }}</code>
								<span :class="$style.toolBar" aria-hidden="true">
									<span
										:class="$style.toolBarFill"
										:style="{ width: barWidth(tool.estimatedTokens) }"
									/>
								</span>
								<span :class="$style.toolTokens">
									{{ estimatedTokensLabel(tool.estimatedTokens) }}
								</span>
							</summary>
							<div :class="$style.toolBody">
								<p v-if="tool.description" :class="$style.description">
									{{ tool.description }}
								</p>
								<InstanceAiDebugJsonPanel
									v-if="tool.inputSchema"
									:value="tool.inputSchema"
									:label="i18n.baseText('instanceAi.debug.runDebug.toolInputSchema')"
								/>
							</div>
						</details>
					</li>
				</ul>
			</details>
		</div>
	</article>
</template>

<style lang="scss" module>
.card {
	border-radius: var(--radius);
	background: var(--background--surface);
	border: 1px solid var(--color--foreground--tint-2);
	border-left: 2px solid var(--color--foreground--tint-1);
	overflow: hidden;
}

.cardHeader {
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: var(--color--background--shade-1);
}

.roleLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
	text-transform: lowercase;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs);
}

.settings {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.settingChip {
	display: inline-flex;
	gap: var(--spacing--4xs);
	max-width: 100%;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--xl);
	background: var(--color--background--shade-1);
	font-size: var(--font-size--3xs);
}

.settingLabel {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.settingValue {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: monospace;
	color: var(--color--text);
}

.tools {
	border: 1px solid var(--color--foreground--tint-2);
	border-radius: var(--radius);
	overflow: hidden;
}

.toolsSummary,
.toolSummary {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	cursor: pointer;
	list-style: none;
	user-select: none;
	font-size: var(--font-size--3xs);

	&::-webkit-details-marker {
		display: none;
	}

	&::before {
		content: '▸';
		flex-shrink: 0;
		color: var(--color--text--tint-2);
		transition: transform var(--duration--fast) ease;
	}
}

.toolsSummary {
	padding-block: var(--spacing--3xs);
	background: var(--color--background--shade-1);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
}

.toolsTotal {
	margin-left: auto;
	font-weight: var(--font-weight--regular);
	font-variant-numeric: tabular-nums;
}

.tools[open] > .toolsSummary::before,
.tool[open] > .toolSummary::before {
	transform: rotate(90deg);
}

.toolList {
	margin: 0;
	padding: var(--spacing--5xs) 0;
	list-style: none;
	border-top: 1px solid var(--color--foreground--tint-2);
}

.toolSummary:hover,
.tool[open] > .toolSummary {
	background: var(--color--background--shade-1);
}

.toolName {
	flex: 0 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: monospace;
	color: var(--color--text);
}

.toolBar {
	flex: 1;
	min-width: var(--spacing--xl);
	height: var(--spacing--5xs);
	border-radius: var(--radius--xl);
	background: var(--color--foreground--tint-2);
	overflow: hidden;
}

.toolBarFill {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: color-mix(in srgb, var(--color--primary) 55%, transparent);
}

.toolTokens {
	flex-shrink: 0;
	min-width: var(--spacing--2xl);
	text-align: right;
	font-variant-numeric: tabular-nums;
	color: var(--color--text--tint-1);
}

.toolBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--2xs) var(--spacing--lg);
}

.description {
	margin: 0;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	color: var(--color--text--tint-1);
}
</style>
