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

function toggleAll() {
	if (!diff.value) return;
	if (expandedFiles.value.size === diff.value.files.length) {
		expandedFiles.value.clear();
	} else {
		expandedFiles.value = new Set(diff.value.files.map((f) => f.path));
	}
}

function statusBadgeClass(status: string): string {
	switch (status) {
		case 'added':
			return $style.badgeAdded;
		case 'deleted':
			return $style.badgeDeleted;
		default:
			return $style.badgeModified;
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
	<div :class="$style.diffViewer">
		<template v-if="diff && diff.files.length > 0">
			<!-- Summary bar -->
			<div :class="$style.diffSummary">
				<span :class="$style.diffSummaryCount">
					{{ diff.stats.filesChanged }} file{{ diff.stats.filesChanged !== 1 ? 's' : '' }}
					changed
				</span>
				<span v-if="diff.stats.additions > 0" :class="$style.diffSummaryAdditions">
					+{{ diff.stats.additions }}
				</span>
				<span v-if="diff.stats.deletions > 0" :class="$style.diffSummaryDeletions">
					-{{ diff.stats.deletions }}
				</span>
				<button :class="$style.toggleAllBtn" @click="toggleAll">
					{{ expandedFiles.size === diff.files.length ? 'Collapse all' : 'Expand all' }}
				</button>
			</div>

			<!-- File list -->
			<div v-for="file in diff.files" :key="file.path" :class="$style.diffFile">
				<!-- Collapsed file header -->
				<div :class="$style.diffFileHeader" @click="toggleFile(file.path)">
					<span
						:class="[
							$style.diffFileChevron,
							expandedFiles.has(file.path) && $style.diffFileChevronExpanded,
						]"
					>
						&#9654;
					</span>
					<span :class="$style.diffFilePath">{{ file.path }}</span>
					<span :class="[$style.diffFileBadge, statusBadgeClass(file.status)]">
						{{ file.status }}
					</span>
					<span v-if="file.additions > 0" :class="$style.diffFileStatAdd">
						+{{ file.additions }}
					</span>
					<span v-if="file.deletions > 0" :class="$style.diffFileStatDel">
						-{{ file.deletions }}
					</span>
				</div>

				<!-- Expanded diff content -->
				<div v-if="expandedFiles.has(file.path) && file.patch" :class="$style.diffFilePatch">
					<div
						v-for="(line, idx) in parsePatchLines(file.patch)"
						:key="idx"
						:class="[
							$style.diffLine,
							line.type === 'add' && $style.diffLineAdd,
							line.type === 'del' && $style.diffLineDel,
							line.type === 'header' && $style.diffLineHeader,
						]"
					>
						<code>{{ line.content }}</code>
					</div>
				</div>
			</div>
		</template>

		<div v-else :class="$style.diffEmpty">No changes detected.</div>
	</div>
</template>

<style lang="scss" module>
.diffViewer {
	padding: var(--spacing-s);
	overflow: auto;
	height: 100%;
	font-family: var(--font-family-monospace, monospace);
	font-size: var(--font-size-2xs);
}

.diffSummary {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	padding: var(--spacing-xs) var(--spacing-s);
	margin-bottom: var(--spacing-s);
	border-radius: var(--border-radius-base);
	background: var(--color-background-light);
	font-family: var(--font-family);
	font-size: var(--font-size-s);
}

.diffSummaryCount {
	font-weight: var(--font-weight-bold);
}

.diffSummaryAdditions {
	color: var(--color-success);
	font-weight: var(--font-weight-bold);
}

.diffSummaryDeletions {
	color: var(--color-danger);
	font-weight: var(--font-weight-bold);
}

.toggleAllBtn {
	margin-left: auto;
	background: none;
	border: none;
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
	cursor: pointer;
	padding: var(--spacing-4xs) var(--spacing-2xs);
	border-radius: var(--border-radius-base);

	&:hover {
		background: var(--color-background-base);
		color: var(--color-text-dark);
	}
}

.diffFile {
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	margin-bottom: var(--spacing-2xs);
	overflow: hidden;
}

.diffFileHeader {
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

.diffFileChevron {
	font-size: 10px;
	transition: transform 0.15s ease;
	color: var(--color-text-base);
}

.diffFileChevronExpanded {
	transform: rotate(90deg);
}

.diffFilePath {
	flex: 1;
	font-weight: var(--font-weight-bold);
	font-family: var(--font-family-monospace, monospace);
}

.diffFileBadge {
	padding: 1px 6px;
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-3xs);
	font-weight: var(--font-weight-bold);
	text-transform: uppercase;
}

.diffFileStatAdd {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-3xs);
	color: var(--color-success);
}

.diffFileStatDel {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-3xs);
	color: var(--color-danger);
}

.diffFilePatch {
	border-top: 1px solid var(--color-foreground-base);
	max-height: 500px;
	overflow: auto;
}

.badgeAdded {
	background: var(--color-success-tint-2);
	color: var(--color-success);
}

.badgeModified {
	background: var(--color-warning-tint-2);
	color: var(--color-warning);
}

.badgeDeleted {
	background: var(--color-danger-tint-2);
	color: var(--color-danger);
}

.diffLine {
	padding: 0 var(--spacing-s);
	white-space: pre;
	line-height: 1.6;

	code {
		font-family: inherit;
	}
}

.diffLineAdd {
	background: var(--color-success-tint-2);
}

.diffLineDel {
	background: var(--color-danger-tint-2);
}

.diffLineHeader {
	background: var(--color-background-light);
	color: var(--color-text-light);
	font-style: italic;
}

.diffEmpty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color-text-light);
	font-family: var(--font-family);
}
</style>
