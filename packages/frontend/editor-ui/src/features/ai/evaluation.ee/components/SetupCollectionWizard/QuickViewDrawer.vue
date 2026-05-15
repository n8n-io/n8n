<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { EvalVersionEntry } from '../../evalCollections.types';

const props = defineProps<{
	open: boolean;
	version: EvalVersionEntry | null;
	datasetLabel: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();

const formatDate = (iso: string | null) => {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString();
};

const scoreLabel = computed(() => {
	if (!props.version?.lastRun) return i18n.baseText('evaluation.setup.versions.noRunYet');
	return `${Math.round(props.version.lastRun.avgScore !== null ? props.version.lastRun.avgScore * 100 : 0)}%`;
});

const close = () => emit('update:open', false);
</script>

<template>
	<Transition name="drawer-slide">
		<aside
			v-if="open"
			:class="$style.drawer"
			role="dialog"
			aria-modal="false"
			data-test-id="version-quick-view"
		>
			<header :class="$style.header">
				<N8nText tag="h3" size="medium" bold>
					{{ version?.label ?? '' }}
				</N8nText>
				<button
					type="button"
					:class="$style.closeBtn"
					:aria-label="i18n.baseText('generic.close')"
					@click="close"
				>
					<N8nIcon icon="x" size="small" />
				</button>
			</header>

			<div :class="$style.body">
				<dl :class="$style.meta">
					<div :class="$style.metaRow">
						<dt>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('evaluation.setup.versions.col.version')
							}}</N8nText>
						</dt>
						<dd>
							<N8nText size="small">{{ version?.sourceLabel ?? '—' }}</N8nText>
						</dd>
					</div>
					<div :class="$style.metaRow">
						<dt>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('evaluation.setup.versions.col.lastRun', {
									interpolate: { dataset: datasetLabel },
								})
							}}</N8nText>
						</dt>
						<dd>
							<N8nText size="small">{{ formatDate(version?.lastRun?.runAt ?? null) }}</N8nText>
						</dd>
					</div>
					<div :class="$style.metaRow">
						<dt>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('evaluation.setup.versions.col.avgScore')
							}}</N8nText>
						</dt>
						<dd>
							<N8nText size="small" bold>{{ scoreLabel }}</N8nText>
						</dd>
					</div>
				</dl>

				<div :class="$style.placeholderCanvas">
					<N8nIcon icon="eye" size="medium" />
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('evaluation.setup.versions.previewPlaceholder') }}
					</N8nText>
				</div>
			</div>
		</aside>
	</Transition>
</template>

<style module lang="scss">
.drawer {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	width: min(420px, 90vw);
	background: var(--background--surface);
	box-shadow: var(--shadow--xl, -4px 0 16px rgba(0, 0, 0, 0.08));
	border-left: 1px solid var(--border-color--base);
	display: flex;
	flex-direction: column;
	z-index: 60;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: 1px solid var(--border-color--subtle);
}

.closeBtn {
	background: none;
	border: none;
	padding: var(--spacing--3xs);
	cursor: pointer;
	color: var(--icon-color);
	border-radius: var(--radius--md);
}

.closeBtn:hover {
	background: var(--background--hover);
}

.body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.meta {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
}

.metaRow {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.metaRow dt,
.metaRow dd {
	margin: 0;
}

.placeholderCanvas {
	border: 1px dashed var(--border-color--base);
	border-radius: var(--radius--md);
	padding: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
}
</style>
