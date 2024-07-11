<script setup lang="ts">
import parseDiff from 'parse-diff';
import { computed } from 'vue';

interface Props {
	title: string;
	content: string;
	replacing: boolean;
	replaced: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	replacing: false,
	replaced: false,
});

const diffs = computed(() => {
	const parsed = parseDiff(props.content);

	const file = parsed[0];

	return file.chunks.reduce((accu: parseDiff.Change[], chunk) => {
		const changes = chunk.changes.map((change) => {
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
		return [...accu, ...changes];
	}, []);
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.title">
			{{ props.title }}
		</div>
		<div :class="$style.diffSection">
			<div v-for="(diff, i) in diffs" :key="i" :class="$style.diff">
				<div :class="$style.lineNumber">
					{{ diff.type === 'normal' ? diff.ln1 : diff.ln }}
				</div>
				<div :class="[$style[diff.type], $style.diffContent]">
					<span v-if="diff.type === 'add'">&nbsp;+&nbsp;</span>
					<span v-else-if="diff.type === 'del'">&nbsp;-&nbsp;</span>
					<span v-else>&nbsp;&nbsp;&nbsp;</span>
					<span>{{ diff.content }}</span>
				</div>
			</div>
		</div>
		<div :class="$style.actions">
			<n8n-button type="primary" size="mini">Replace my code</n8n-button>
			<!-- <button>Undo</button> -->
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
	min-height: 74px; // 4 lines
	background-color: var(--color-foreground-light);
}

.diff {
	display: flex;
	font-size: 10px;
	line-height: 18px; /* 100% */
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
</style>
