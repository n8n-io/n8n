<script setup lang="ts">
import type { MinedPreference } from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

const props = defineProps<{
	preferences: MinedPreference[];
	typeNames: Record<string, string>;
	folders?: Array<{ id: string; name: string }>;
	compact?: boolean;
}>();
const i18n = useI18n();
const expanded = ref(new Set<string>());
const categoryLabels = computed(() => ({
	node: i18n.baseText('preferenceMining.category.node'),
	credential: i18n.baseText('preferenceMining.category.credential'),
	folder: i18n.baseText('preferenceMining.category.folder'),
	parameter: i18n.baseText('preferenceMining.category.parameter'),
	naming: i18n.baseText('preferenceMining.category.naming'),
}));
function readableContent(content: string) {
	return content.replace(
		/(?:@[\w-]+\/)?[\w-]+(?:\.[\w-]+)?/g,
		(type) => props.typeNames[type] ?? type,
	);
}
function toggle(id: string) {
	const next = new Set(expanded.value);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	expanded.value = next;
}
function folderName(id: string | null) {
	return (
		props.folders?.find((f) => f.id === id)?.name ?? i18n.baseText('preferenceMining.projectScope')
	);
}
</script>

<template>
	<div :class="$style.list">
		<article
			v-for="(preference, index) in preferences"
			:key="preference.id"
			:class="$style.item"
			data-test-id="mined-preference"
		>
			<div :class="$style.row">
				<N8nBadge variant="subtle">{{ categoryLabels[preference.category] }}</N8nBadge>
				<N8nText v-if="!compact" size="small" color="text-light">{{
					i18n.baseText('preferenceMining.sourceCount', {
						interpolate: { count: preference.support },
					})
				}}</N8nText>
			</div>
			<N8nText tag="p" :class="$style.content">{{ readableContent(preference.content) }}</N8nText>
			<div v-if="!compact" :class="$style.row">
				<N8nText size="small" color="text-light">{{ folderName(preference.folderId) }}</N8nText>
				<N8nButton
					variant="ghost"
					size="small"
					:aria-expanded="expanded.has(preference.id)"
					:aria-controls="`preference-evidence-${index}`"
					@click="toggle(preference.id)"
				>
					{{
						expanded.has(preference.id)
							? i18n.baseText('preferenceMining.hideEvidence')
							: i18n.baseText('preferenceMining.viewEvidence')
					}}
					<N8nIcon
						:icon="expanded.has(preference.id) ? 'chevron-up' : 'chevron-down'"
						size="small"
					/>
				</N8nButton>
			</div>
			<div
				v-if="expanded.has(preference.id) && !compact"
				:id="`preference-evidence-${index}`"
				:class="$style.evidence"
			>
				<div v-if="preference.share !== undefined" :class="$style.row">
					<N8nText size="small"
						>{{ i18n.baseText('preferenceMining.observedShare') }}:
						{{ Math.round(preference.share * 100) }}%</N8nText
					>
					<N8nText v-if="preference.margin !== undefined" size="small"
						>{{ i18n.baseText('preferenceMining.observedMargin') }}:
						{{ Math.round(preference.margin * 100) }}%</N8nText
					>
				</div>
				<ul :class="$style.quotes">
					<li v-for="(evidence, sourceIndex) in preference.evidence" :key="sourceIndex">
						<N8nText size="small" bold>{{
							i18n.baseText('preferenceMining.sourceNumber', {
								interpolate: { count: sourceIndex + 1 },
							})
						}}</N8nText>
						<code :class="$style.sourceId">{{ evidence.sourceId }}</code>
						<blockquote>{{ readableContent(evidence.quote) }}</blockquote>
					</li>
				</ul>
				<div :class="$style.identifiers">
					<N8nText size="small" bold>{{ i18n.baseText('preferenceMining.identifiers') }}</N8nText
					><code>{{ preference.key }} = {{ preference.value }}</code>
				</div>
			</div>
		</article>
	</div>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.item {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xs);
	background: var(--background--surface);
	min-width: 0;
}
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}
.content {
	overflow-wrap: anywhere;
	line-height: var(--line-height--xl);
}
.evidence {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-radius: var(--radius--2xs);
	background: var(--background--subtle);
}
.quotes {
	padding-left: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.sourceId {
	display: block;
	margin-block: var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	overflow-wrap: anywhere;
}
.quotes blockquote {
	padding-left: var(--spacing--xs);
	border-left: var(--border);
	font-size: var(--font-size--sm);
	overflow-wrap: anywhere;
	white-space: pre-wrap;
}
.identifiers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.identifiers code {
	font-size: var(--font-size--xs);
	overflow-wrap: anywhere;
}
</style>
