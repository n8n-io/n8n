<script setup lang="ts">
import { N8nDialog, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useStorage } from '@vueuse/core';
import { computed, ref } from 'vue';

import type { ExportDestination, ExportInclude } from '@/app/utils/wireframeOtelExport';

// Wireframe: one export dialog for sessions, checks and executions. What → Include → Where.
const open = defineModel<boolean>('open', { required: true });

const props = defineProps<{
	summary: { sessions?: number; checks?: number; executions?: number; verdicts: number };
	canLangsmith?: boolean;
	exporting?: boolean;
	result?: string | null;
}>();

const emit = defineEmits<{
	export: [
		payload: {
			include: ExportInclude;
			destination: ExportDestination;
			endpoint: string;
			headers: string;
			project: string;
			remember: boolean;
		},
	];
}>();

const i18n = useI18n();

const include = ref<ExportInclude>({
	messages: true,
	toolCalls: true,
	verdicts: true,
	checks: true,
	metrics: true,
	reviewers: false,
});
const includeKeys: Array<keyof ExportInclude> = [
	'messages',
	'toolCalls',
	'verdicts',
	'checks',
	'metrics',
	'reviewers',
];

type SavedDestination = {
	destination: ExportDestination;
	endpoint: string;
	headers: string;
	project: string;
};
const saved = useStorage<SavedDestination[]>('N8N_WIREFRAME_EXPORT_DESTINATIONS', []);

const destination = ref<ExportDestination>(saved.value[0]?.destination ?? 'otel');
const endpoint = ref(saved.value[0]?.endpoint ?? '');
const headers = ref(saved.value[0]?.headers ?? '');
const project = ref(saved.value[0]?.project ?? '');
const remember = ref(true);

function pickSaved(s: SavedDestination) {
	destination.value = s.destination;
	endpoint.value = s.endpoint;
	headers.value = s.headers;
	project.value = s.project;
}

const total = computed(
	() =>
		(props.summary.sessions ?? 0) + (props.summary.checks ?? 0) + (props.summary.executions ?? 0),
);
const canSend = computed(() => {
	if (total.value === 0) return false;
	if (destination.value === 'otel') return endpoint.value.trim().length > 0;
	if (destination.value === 'langsmith') return props.canLangsmith !== false;
	return true;
});

function submit() {
	if (!canSend.value) return;
	if (remember.value && destination.value !== 'json') {
		const entry: SavedDestination = {
			destination: destination.value,
			endpoint: endpoint.value.trim(),
			headers: headers.value.trim(),
			project: project.value.trim(),
		};
		saved.value = [
			entry,
			...saved.value.filter(
				(s) => s.endpoint !== entry.endpoint || s.destination !== entry.destination,
			),
		].slice(0, 5);
	}
	emit('export', {
		include: { ...include.value },
		destination: destination.value,
		endpoint: endpoint.value.trim(),
		headers: headers.value.trim(),
		project: project.value.trim(),
		remember: remember.value,
	});
}
</script>

<template>
	<N8nDialog v-model:open="open" size="medium" :header="i18n.baseText('wireframe.export.title')">
		<div :class="$style.body" data-testid="wireframe-export-dialog">
			<p :class="$style.what" data-testid="wireframe-export-summary">
				<template v-if="summary.sessions !== undefined">{{
					i18n.baseText('wireframe.export.sessions', {
						adjustToNumber: summary.sessions,
						interpolate: { count: String(summary.sessions) },
					})
				}}</template>
				<template v-if="summary.checks">
					·
					{{
						i18n.baseText('wireframe.export.checks', {
							adjustToNumber: summary.checks,
							interpolate: { count: String(summary.checks) },
						})
					}}</template
				>
				<template v-if="summary.executions !== undefined">{{
					i18n.baseText('wireframe.export.executions', {
						adjustToNumber: summary.executions,
						interpolate: { count: String(summary.executions) },
					})
				}}</template>
				<template v-if="summary.verdicts">
					·
					{{
						i18n.baseText('wireframe.export.verdicts', {
							adjustToNumber: summary.verdicts,
							interpolate: { count: String(summary.verdicts) },
						})
					}}</template
				>
			</p>

			<div :class="$style.section">
				<span :class="$style.label">{{ i18n.baseText('wireframe.export.include') }}</span>
				<div :class="$style.includeGrid">
					<label
						v-for="key in includeKeys"
						:key="key"
						:class="[$style.check, { [$style.checkOn]: include[key] }]"
					>
						<input v-model="include[key]" type="checkbox" />
						<span>{{ i18n.baseText(`wireframe.export.include.${key}`) }}</span>
					</label>
				</div>
			</div>

			<div :class="$style.section">
				<span :class="$style.label">{{ i18n.baseText('wireframe.export.where') }}</span>
				<div v-if="saved.length > 0" :class="$style.savedRow">
					<button
						v-for="s in saved"
						:key="`${s.destination}:${s.endpoint}`"
						type="button"
						:class="[
							$style.chip,
							{ [$style.chipOn]: s.destination === destination && s.endpoint === endpoint },
						]"
						@click="pickSaved(s)"
					>
						{{
							s.destination === 'langsmith' ? 'LangSmith' : s.endpoint.replace(/^https?:\/\//, '')
						}}
					</button>
				</div>
				<div :class="$style.segments">
					<button
						type="button"
						:class="[$style.segment, { [$style.segmentOn]: destination === 'otel' }]"
						data-testid="wireframe-export-dest-otel"
						@click="destination = 'otel'"
					>
						{{ i18n.baseText('wireframe.export.dest.otel') }}
					</button>
					<button
						type="button"
						:class="[$style.segment, { [$style.segmentOn]: destination === 'langsmith' }]"
						:disabled="canLangsmith === false"
						@click="destination = 'langsmith'"
					>
						{{ i18n.baseText('wireframe.export.dest.langsmith') }}
					</button>
					<button
						type="button"
						:class="[$style.segment, { [$style.segmentOn]: destination === 'json' }]"
						data-testid="wireframe-export-dest-json"
						@click="destination = 'json'"
					>
						{{ i18n.baseText('wireframe.export.dest.json') }}
					</button>
				</div>
				<div v-if="destination === 'otel'" :class="$style.fields">
					<input
						v-model="endpoint"
						:class="$style.input"
						type="url"
						:placeholder="i18n.baseText('wireframe.export.endpoint')"
						data-testid="wireframe-export-endpoint"
					/>
					<input
						v-model="headers"
						:class="$style.input"
						type="text"
						:placeholder="i18n.baseText('wireframe.export.headers')"
					/>
				</div>
				<div v-else-if="destination === 'langsmith'" :class="$style.fields">
					<input
						v-model="project"
						:class="$style.input"
						type="text"
						:placeholder="i18n.baseText('wireframe.export.project')"
					/>
				</div>
				<label v-if="destination !== 'json'" :class="$style.remember">
					<input v-model="remember" type="checkbox" />
					<span>{{ i18n.baseText('wireframe.export.remember') }}</span>
				</label>
			</div>

			<div v-if="result" :class="$style.result" data-testid="wireframe-export-result">
				<N8nIcon icon="check" :size="14" />
				<span>{{ result }}</span>
			</div>

			<div :class="$style.footer">
				<span :class="$style.grow" />
				<button type="button" :class="$style.button" @click="open = false">
					{{ i18n.baseText('agents.builder.checks.invite.cancel') }}
				</button>
				<button
					type="button"
					:class="[$style.button, $style.primary]"
					:disabled="!canSend || exporting"
					data-testid="wireframe-export-submit"
					@click="submit"
				>
					<N8nIcon v-if="exporting" icon="loader-circle" :size="14" spin />
					{{
						i18n.baseText('wireframe.export.submit', {
							adjustToNumber: total,
							interpolate: { count: String(total) },
						})
					}}
				</button>
			</div>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	font-family: var(--wireframe--font-family);
	letter-spacing: var(--wireframe--letter-spacing);
	font-size: var(--font-size--sm);
	color: var(--text-color);
}

.what {
	margin: 0;
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--md);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.label {
	color: var(--text-color--subtler);
}

.includeGrid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--3xs);
}

.check,
.remember {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	border-radius: var(--wireframe--radius);
	cursor: pointer;
	font-weight: var(--wireframe--body-weight);
}

.checkOn {
	border-style: solid;
	border-color: var(--wireframe--ink);
}

.remember {
	border: 0;
	padding-left: 0;
	color: var(--text-color--subtler);
}

.savedRow {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.chip {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	border-radius: var(--radius--xl);
	background: var(--background--surface);
	font: inherit;
	font-size: var(--font-size--2xs);
	letter-spacing: inherit;
	cursor: pointer;
}

.chipOn {
	border-style: solid;
	border-color: var(--wireframe--ink);
}

.segments {
	display: flex;
	gap: var(--spacing--3xs);
}

.segment {
	flex: 1;
	padding: var(--spacing--2xs);
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	letter-spacing: inherit;
	cursor: pointer;

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
}

.segmentOn {
	border-style: solid;
	border-color: var(--wireframe--ink);
	background: var(--wireframe--hover-fill);
}

.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.input {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	letter-spacing: inherit;
}

.result {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--wireframe--border-width) dashed var(--color--success);
	border-radius: var(--wireframe--radius);
	color: var(--color--success);
	font-weight: var(--wireframe--font-weight);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
}

.grow {
	flex: 1;
}

.button {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--wireframe--ink);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	letter-spacing: inherit;
	cursor: pointer;

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
}

.primary {
	background: var(--wireframe--ink);
	color: var(--background--surface);
}
</style>
