<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
	content: string;
	nodeNameToId?: Record<string, string>;
	executingNodeNames?: string[];
}>();

const emit = defineEmits<{
	centerOn: [nodeNames: string[]];
}>();

interface HighlightSegment {
	type: 'highlight';
	nodeNames: string[];
	text: string;
	colorIndex: number;
}

interface TextSegment {
	type: 'text';
	text: string;
}

type Segment = HighlightSegment | TextSegment;

const HIGHLIGHT_COLORS = [
	'var(--color--primary)',
	'var(--color--success)',
	'var(--color--secondary)',
	'var(--color--warning)',
	'var(--color--danger)',
];

const segments = computed((): Segment[] => {
	const result: Segment[] = [];
	const regex = /<highlight ref="([^"]*)">([\s\S]*?)<\/highlight>/g;
	let lastIndex = 0;
	let colorIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(props.content)) !== null) {
		if (match.index > lastIndex) {
			const text = props.content.slice(lastIndex, match.index);
			if (text.trim()) result.push({ type: 'text', text });
		}
		const nodeNames = match[1]
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		result.push({
			type: 'highlight',
			nodeNames,
			text: match[2],
			colorIndex: colorIndex++ % HIGHLIGHT_COLORS.length,
		});
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < props.content.length) {
		const text = props.content.slice(lastIndex);
		if (text.trim()) result.push({ type: 'text', text });
	}

	return result;
});

function isRunning(segment: HighlightSegment): boolean {
	if (!props.executingNodeNames?.length) return false;
	return segment.nodeNames.some((name) => props.executingNodeNames!.includes(name));
}

function setNodeHighlight(nodeNames: string[], color: string, active: boolean): void {
	for (const name of nodeNames) {
		const id = props.nodeNameToId?.[name];
		const selector = id ? `[data-id="${id}"]` : `[data-node-name="${name}"]`;
		document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
			if (active) {
				el.style.outline = `2px dashed ${color}`;
				el.style.outlineOffset = '4px';
				el.style.borderRadius = '8px';
				el.style.transition = 'outline 0.15s ease';
			} else {
				el.style.outline = '';
				el.style.outlineOffset = '';
				el.style.borderRadius = '';
				el.style.transition = '';
			}
		});
	}
}
</script>

<template>
	<p :class="$style.description">
		<template v-for="(segment, i) in segments" :key="i">
			<span v-if="segment.type === 'text'">{{ segment.text }}</span>
			<span
				v-else
				:class="[$style.highlight, { [$style.running]: isRunning(segment) }]"
				:data-ref="segment.nodeNames.join(',')"
				:style="{ '--highlight--color': HIGHLIGHT_COLORS[segment.colorIndex] }"
				@mouseenter="
					setNodeHighlight(segment.nodeNames, HIGHLIGHT_COLORS[segment.colorIndex], true);
					emit('centerOn', segment.nodeNames);
				"
				@mouseleave="
					setNodeHighlight(segment.nodeNames, HIGHLIGHT_COLORS[segment.colorIndex], false)
				"
				>{{ segment.text }}</span
			>
		</template>
	</p>
</template>

<style module lang="scss">
.description {
	margin: var(--spacing--2xs) 0 0;
	padding-top: var(--spacing--2xs);
	border-top: 1px dashed var(--color--foreground);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--assistant--color--text);
}

.highlight {
	position: relative;
	border-bottom: 2px dashed var(--highlight--color);
	cursor: pointer;
	transition: transform 0.15s ease;

	&:hover {
		transform: translate3d(0, -1px, 4px);
	}

	&.running {
		animation: highlight-running 0.5s ease-in-out infinite alternate;
	}
}

@keyframes highlight-running {
	from {
		border-bottom-color: var(--highlight--color);
	}
	to {
		border-bottom-color: var(--canvas--color--background, transparent);
	}
}
</style>
