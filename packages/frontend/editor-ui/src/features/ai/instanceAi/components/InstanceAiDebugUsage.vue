<script lang="ts" setup>
import type { ReadableUsageSummary, StepCacheBreak } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { describeCacheBreak } from '../utils/cache-break';
import InstanceAiDebugJsonPanel from './InstanceAiDebugJsonPanel.vue';

const props = defineProps<{
	usage: ReadableUsageSummary;
	cacheBreak?: StepCacheBreak;
}>();

const i18n = useI18n();

const cacheBreakDescription = computed(() =>
	props.cacheBreak ? describeCacheBreak(i18n, props.cacheBreak) : undefined,
);

function formatTokens(tokens: number): string {
	return tokens.toLocaleString();
}
</script>

<template>
	<article :class="$style.card" data-test-id="instance-ai-llm-step-usage">
		<div :class="$style.cardHeader">
			<span :class="$style.roleLabel">{{ i18n.baseText('instanceAi.debug.runDebug.usage') }}</span>
		</div>
		<div :class="$style.cardBody">
			<p
				v-if="cacheBreakDescription"
				:class="$style.cacheBreak"
				data-test-id="instance-ai-llm-step-cache-break-detail"
			>
				<span :class="$style.cacheBreakLabel">
					{{ i18n.baseText('instanceAi.debug.runDebug.cacheBreak') }}
				</span>
				{{ cacheBreakDescription }}
			</p>

			<table v-if="usage.rows.length > 0" :class="$style.table">
				<tbody>
					<tr v-for="row in usage.rows" :key="row.label">
						<th :class="$style.rowLabel" scope="row">{{ row.label }}</th>
						<td :class="$style.tokens">{{ formatTokens(row.tokens) }}</td>
						<td :class="$style.details">
							<span v-for="detail in row.details" :key="detail.label" :class="$style.detail">
								{{ detail.label }}
								<span :class="$style.detailTokens">{{ formatTokens(detail.tokens) }}</span>
							</span>
						</td>
					</tr>
				</tbody>
			</table>

			<div v-if="usage.settings.length > 0" :class="$style.settings">
				<span v-for="setting in usage.settings" :key="setting.label" :class="$style.settingChip">
					<span :class="$style.settingLabel">{{ setting.label }}</span>
					{{ setting.value }}
				</span>
			</div>

			<InstanceAiDebugJsonPanel
				:value="usage.metadata"
				:label="i18n.baseText('instanceAi.debug.runDebug.usageRaw')"
			/>
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

.cacheBreak {
	margin: 0;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-left: 3px solid var(--color--danger);
	border-radius: var(--radius);
	background: color-mix(in srgb, var(--color--danger) 10%, transparent);
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	color: var(--color--text);
}

.cacheBreakLabel {
	margin-right: var(--spacing--4xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--danger);
}

.table {
	border-collapse: collapse;
	font-size: var(--font-size--2xs);

	th,
	td {
		padding: var(--spacing--5xs) var(--spacing--2xs) var(--spacing--5xs) 0;
		vertical-align: baseline;
	}
}

.rowLabel {
	font-weight: var(--font-weight--regular);
	text-align: left;
	color: var(--color--text--tint-1);
	white-space: nowrap;
}

.tokens {
	font-family: monospace;
	font-variant-numeric: tabular-nums;
	text-align: right;
	color: var(--color--text);
	white-space: nowrap;
}

.details {
	width: 100%;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
}

.detail + .detail::before {
	content: '·';
	margin: 0 var(--spacing--4xs);
}

.detailTokens {
	font-family: monospace;
	font-variant-numeric: tabular-nums;
	color: var(--color--text);
}

.settings {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.settingChip {
	display: inline-flex;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--xl);
	background: var(--color--background--shade-1);
	font-size: var(--font-size--3xs);
	color: var(--color--text);
}

.settingLabel {
	color: var(--color--text--tint-1);
}
</style>
