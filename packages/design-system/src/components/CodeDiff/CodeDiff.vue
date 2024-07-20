<script setup lang="ts">
import parseDiff from 'parse-diff';
import { computed } from 'vue';
import BlinkingCursor from '../BlinkingCursor/BlinkingCursor.vue';

const MIN_LINES = 4;

interface Props {
	title: string;
	content: string;
	replacing: boolean;
	replaced: boolean;
	error: boolean;
	streaming: boolean;
}

type Line =
	| parseDiff.Change
	| {
			type: 'filler' | 'seperator';
			content: string;
	  };

const props = withDefaults(defineProps<Props>(), {
	title: '',
	content: '',
	replacing: false,
	replaced: false,
	error: false,
	streaming: false,
});

const emit = defineEmits<{
	replace: [];
	undo: [];
}>();

const diffs = computed(() => {
	const parsed = parseDiff(props.content);

	const file = parsed[0] ?? { chunks: [] };

	const lines: Line[] = file.chunks.reduce((accu: Line[], chunk, i) => {
		const changes: Line[] = chunk.changes.map((change) => {
			let content = change.content;
			if (change.type === 'add' && content.startsWith('+')) {
				content = content.replace('+', '');
			} else if (change.type === 'del' && content.startsWith('-')) {
				content = content.replace('-', '');
			}

			return {
				...change,
				content,
			};
		});

		if (i !== file.chunks.length - 1) {
			changes.push({
				type: 'seperator',
				content: '...',
			});
		}
		return [...accu, ...changes];
	}, []);

	const len = lines.length;
	// why programmatic and not min height? to ensure numbers border goes all the way down.s
	if (len <= MIN_LINES) {
		for (let i = 0; i < MIN_LINES - len; i++) {
			lines.push({
				type: 'filler',
				content: '',
			});
		}
	}

	return lines;
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.title">
			{{ props.title }}
			<BlinkingCursor v-if="streaming && !props.content" />
		</div>
		<div :class="$style.diffSection">
			<div v-for="(diff, i) in diffs" :key="i" :class="$style.diff">
				<div :class="$style.lineNumber">
					<!-- ln1 is line number in original text -->
					<!-- ln2 is line number in updated text -->
					{{ diff.type === 'normal' ? diff.ln2 : diff.type === 'add' ? diff.ln : '' }}
				</div>
				<div :class="[$style[diff.type], $style.diffContent]">
					<span v-if="diff.type === 'add'">&nbsp;+&nbsp;</span>
					<span v-else-if="diff.type === 'del'">&nbsp;-&nbsp;</span>
					<span v-else>&nbsp;&nbsp;&nbsp;</span>
					<span>
						{{ diff.content }}
						<BlinkingCursor
							v-if="
								streaming &&
								diff.content &&
								(i === diffs.length - 1 || diffs[i + 1].type === 'filler')
							"
						/>
					</span>
				</div>
			</div>
		</div>
		<div :class="$style.actions">
			<div v-if="error">
				<n8n-icon icon="exclamation-triangle" color="danger" :class="$style.infoIcon" />
				<span :class="$style.infoText">Could not replace code</span>
			</div>
			<div v-else-if="replaced">
				<n8n-button
					type="secondary"
					size="mini"
					icon="undo"
					:class="$style.undoButton"
					@click="() => emit('undo')"
					>Undo</n8n-button
				>
				<n8n-icon icon="check" color="success" :class="$style.infoIcon" />
				<span :class="$style.infoText">Code replaced</span>
			</div>
			<n8n-button
				v-else
				:type="replacing ? 'secondary' : 'primary'"
				size="mini"
				icon="refresh"
				:disabled="!props.content || props.streaming"
				:loading="replacing"
				@click="() => emit('replace')"
				>{{ replacing ? 'Replacing...' : 'Replace my code' }}</n8n-button
			>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	border: var(--border-base);
	background-color: var(--color-foreground-xlight);
	border-radius: 4px;
}

.title {
	padding: 8px;
	font-weight: 600;
	font-size: 12px;
	min-height: 28px;
}

.lineNumber {
	font-size: 10px;
	min-width: 18px;
	max-width: 18px;
	text-align: center;
	border-right: var(--border-base);
}

.diffSection {
	overflow: scroll;
	border-top: var(--border-base);
	border-bottom: var(--border-base);
	max-height: 218px; // 12 lines
	background-color: var(--color-foreground-light);
}

.diff {
	display: flex;
	font-size: 10px;
	line-height: 18px; /* 100% */
	height: 18px;
	max-height: 18px;
}

.diffContent {
	// flex-grow: 1;
	width: 100%;
	text-wrap: nowrap;
}

.add {
	color: var(--color-success);
	background-color: var(--color-success-tint-2);
}

.del {
	color: var(--color-danger);
	background-color: var(--color-danger-tint-2);
}

.normal {
	background-color: var(--color-foreground-xlight);
}

.actions {
	padding: 8px;
}

.infoText {
	color: var(--color-text-light);
}

.undoButton {
	// todo
	margin-right: 8px !important;
}

.infoIcon {
	margin-right: 2px;
}
</style>
