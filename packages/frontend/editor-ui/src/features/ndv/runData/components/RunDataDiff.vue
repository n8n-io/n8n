<script setup lang="ts">
import type { INodeExecutionData } from 'n8n-workflow';
import { computed, ref } from 'vue';

const { inputData } = defineProps<{
	inputData: INodeExecutionData[];
}>();

interface DiffFile {
	path: string;
	status: string;
	additions: number;
	deletions: number;
	patch: string;
}

interface DiffData {
	unified: string;
	stats: { additions: number; deletions: number; filesChanged: number };
	files: DiffFile[];
}

const diff = computed<DiffData | null>(() => {
	const json = inputData[0]?.json;
	if (!json?.diff) return null;
	return json.diff as unknown as DiffData;
});

const expandedFiles = ref<Set<string>>(new Set());

function toggleFile(path: string) {
	if (expandedFiles.value.has(path)) {
		expandedFiles.value.delete(path);
	} else {
		expandedFiles.value.add(path);
	}
}

function statusBadgeClass(status: string): string {
	switch (status) {
		case 'added':
			return 'badge--added';
		case 'deleted':
			return 'badge--deleted';
		default:
			return 'badge--modified';
	}
}

function parsePatchLines(
	patch: string,
): Array<{ type: 'add' | 'del' | 'context' | 'header'; content: string }> {
	if (!patch) return [];
	return patch.split('\n').map((line) => {
		if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff --git')) {
			return { type: 'header' as const, content: line };
		}
		if (line.startsWith('@@')) {
			return { type: 'header' as const, content: line };
		}
		if (line.startsWith('+')) {
			return { type: 'add' as const, content: line };
		}
		if (line.startsWith('-')) {
			return { type: 'del' as const, content: line };
		}
		return { type: 'context' as const, content: line };
	});
}
</script>

<template>
	<div class="diff-viewer">
		<template v-if="diff">
			<!-- Summary bar -->
			<div class="diff-summary">
				<span class="diff-summary__count"
					>{{ diff.stats.filesChanged }} file{{
						diff.stats.filesChanged !== 1 ? 's' : ''
					}}
					changed</span
				>
				<span v-if="diff.stats.additions > 0" class="diff-summary__additions"
					>+{{ diff.stats.additions }}</span
				>
				<span v-if="diff.stats.deletions > 0" class="diff-summary__deletions"
					>-{{ diff.stats.deletions }}</span
				>
			</div>

			<!-- File list -->
			<div v-for="file in diff.files" :key="file.path" class="diff-file">
				<!-- Collapsed file header -->
				<div class="diff-file__header" @click="toggleFile(file.path)">
					<span
						class="diff-file__chevron"
						:class="{ 'diff-file__chevron--expanded': expandedFiles.has(file.path) }"
					>
						&#9654;
					</span>
					<span class="diff-file__path">{{ file.path }}</span>
					<span class="diff-file__badge" :class="statusBadgeClass(file.status)">
						{{ file.status }}
					</span>
					<span v-if="file.additions > 0" class="diff-file__stat diff-file__stat--add"
						>+{{ file.additions }}</span
					>
					<span v-if="file.deletions > 0" class="diff-file__stat diff-file__stat--del"
						>-{{ file.deletions }}</span
					>
				</div>

				<!-- Expanded diff content -->
				<div v-if="expandedFiles.has(file.path) && file.patch" class="diff-file__patch">
					<div
						v-for="(line, idx) in parsePatchLines(file.patch)"
						:key="idx"
						class="diff-line"
						:class="{
							'diff-line--add': line.type === 'add',
							'diff-line--del': line.type === 'del',
							'diff-line--header': line.type === 'header',
						}"
					>
						<code>{{ line.content }}</code>
					</div>
				</div>
			</div>
		</template>

		<div v-else class="diff-empty">No changes detected.</div>
	</div>
</template>

<style lang="scss" scoped>
.diff-viewer {
	padding: var(--spacing-s);
	overflow: auto;
	height: 100%;
	font-family: var(--font-family-monospace, monospace);
	font-size: var(--font-size-2xs);
}

.diff-summary {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	padding: var(--spacing-xs) var(--spacing-s);
	margin-bottom: var(--spacing-s);
	border-radius: var(--border-radius-base);
	background: var(--color-background-light);
	font-family: var(--font-family);
	font-size: var(--font-size-s);

	&__count {
		font-weight: var(--font-weight-bold);
	}

	&__additions {
		color: var(--color-success);
		font-weight: var(--font-weight-bold);
	}

	&__deletions {
		color: var(--color-danger);
		font-weight: var(--font-weight-bold);
	}
}

.diff-file {
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	margin-bottom: var(--spacing-2xs);
	overflow: hidden;

	&__header {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-2xs) var(--spacing-s);
		cursor: pointer;
		background: var(--color-background-light);
		font-family: var(--font-family);
		font-size: var(--font-size-2xs);

		&:hover {
			background: var(--color-background-base);
		}
	}

	&__chevron {
		font-size: 10px;
		transition: transform 0.15s ease;
		color: var(--color-text-base);

		&--expanded {
			transform: rotate(90deg);
		}
	}

	&__path {
		flex: 1;
		font-weight: var(--font-weight-bold);
		font-family: var(--font-family-monospace, monospace);
	}

	&__badge {
		padding: 1px 6px;
		border-radius: var(--border-radius-base);
		font-size: var(--font-size-3xs);
		font-weight: var(--font-weight-bold);
		text-transform: uppercase;
	}

	&__stat {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-3xs);

		&--add {
			color: var(--color-success);
		}

		&--del {
			color: var(--color-danger);
		}
	}

	&__patch {
		border-top: 1px solid var(--color-foreground-base);
		max-height: 500px;
		overflow: auto;
	}
}

.badge {
	&--added {
		background: var(--color-success-tint-2);
		color: var(--color-success);
	}

	&--modified {
		background: var(--color-warning-tint-2);
		color: var(--color-warning);
	}

	&--deleted {
		background: var(--color-danger-tint-2);
		color: var(--color-danger);
	}
}

.diff-line {
	padding: 0 var(--spacing-s);
	white-space: pre;
	line-height: 1.6;

	code {
		font-family: inherit;
	}

	&--add {
		background: var(--color-success-tint-2);
	}

	&--del {
		background: var(--color-danger-tint-2);
	}

	&--header {
		background: var(--color-background-light);
		color: var(--color-text-light);
		font-style: italic;
	}
}

.diff-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color-text-light);
	font-family: var(--font-family);
}
</style>
