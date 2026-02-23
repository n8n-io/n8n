<script setup lang="ts">
import parseDiff from 'parse-diff';
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';

const MIN_LINES = 4;

interface Props {
	title?: string;
	content?: string;
	replacing?: boolean;
	replaced?: boolean;
	error?: boolean;
	streaming?: boolean;
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

const { t } = useI18n();

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
	// why programmatic and not min height? to ensure numbers border goes all the way down.
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
	<div :class="$style.container" data-test-id="code-diff-suggestion">
		<div :class="$style.title">
			{{ title }}
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
					</span>
				</div>
			</div>
		</div>
		<div :class="$style.actions">
			<div v-if="error">
				<N8nIcon icon="triangle-alert" color="danger" class="mr-5xs" />
				<span :class="$style.infoText">{{ t('codeDiff.couldNotReplace') }}</span>
			</div>
			<div v-else-if="replaced">
				<N8nButton
					type="secondary"
					size="mini"
					icon="undo-2"
					data-test-id="undo-replace-button"
					@click="() => emit('undo')"
				>
					{{ t('codeDiff.undo') }}
				</N8nButton>
				<N8nIcon icon="check" color="success" class="ml-xs" />
				<span :class="$style.infoText" data-test-id="code-replaced-message">
					{{ t('codeDiff.codeReplaced') }}
				</span>
			</div>
			<N8nButton
				v-else
				:type="replacing ? 'secondary' : 'primary'"
				size="mini"
				icon="refresh-cw"
				data-test-id="replace-code-button"
				:disabled="!content || streaming"
				:loading="replacing"
				@click="() => emit('replace')"
				>{{ replacing ? t('codeDiff.replacing') : t('codeDiff.replaceMyCode') }}</N8nButton
			>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	border: var(--border);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
}

.title {
	padding: var(--spacing--2xs);
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	// ensure consistent spacing even if title is empty
	min-height: 32.5px;
	line-height: normal;
	display: flex;
}

.lineNumber {
	font-size: var(--font-size--3xs);
	min-width: 18px;
	max-width: 18px;
	text-align: center;
	border-right: var(--border);
}

.diffSection {
	overflow: scroll;
	border-top: var(--border);
	border-bottom: var(--border);
	max-height: 218px; // 12 lines
	background-color: var(--color--background);
	font-family: var(--font-family--monospace);
}

.diff {
	display: flex;
	font-size: var(--font-size--3xs);
	line-height: 18px; /* 100% */
	height: 18px;
	max-height: 18px;
}

.diffContent {
	width: auto;
	text-wrap: nowrap;
	display: flex;

	> span {
		display: flex;
	}
}

.add {
	color: var(--color--success);
	background-color: var(--color--success--tint-4);
}

.del {
	color: var(--color--danger);
	background-color: var(--color--danger--tint-4);
}

.normal {
	background-color: var(--color--foreground--tint-2);
}

.actions {
	padding: var(--spacing--2xs);

	> button {
		> span {
			margin-right: var(--spacing--4xs);
		}
	}
}

.infoText {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
	margin-left: var(--spacing--4xs);
}
</style>
