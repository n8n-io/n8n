<script setup lang="ts">
import { computed } from 'vue';

const PADDING_X = 18;
const PADDING_Y = 16;
const LINE_HEIGHT = 21;
const MIN_TEXT_WIDTH = 80;

const props = defineProps<{
	x: number;
	y: number;
	width: number;
	height: number;
	name: string;
	content?: string;
	color?: number;
}>();

const notePath = computed(() => createSketchPath(0));
const noteOverdrawPath = computed(() => createSketchPath(1.2));
const colorClass = computed(() => `sticky-note-color-${props.color ?? 1}`);
const textMaxWidth = computed(() => Math.max(props.width - PADDING_X * 2, MIN_TEXT_WIDTH));
const maxLines = computed(() =>
	Math.max(1, Math.floor((props.height - PADDING_Y * 2) / LINE_HEIGHT)),
);
const contentLines = computed(() =>
	wrapText(normalizeContent(props.content ?? props.name), textMaxWidth.value, maxLines.value),
);

function createSketchPath(offset: number) {
	const left = 2 + offset;
	const top = 2 - offset * 0.4;
	const right = props.width - 2 + offset * 0.4;
	const bottom = props.height - 2 + offset * 0.6;
	const radius = Math.min(8, props.width / 8, props.height / 8);
	const wobble = offset === 0 ? 1 : -1;

	return [
		`M ${left + radius} ${top + 0.4 * wobble}`,
		`C ${props.width * 0.3} ${top - 1.1 * wobble}, ${props.width * 0.65} ${top + 0.9 * wobble}, ${right - radius} ${top}`,
		`C ${right - 2} ${top}, ${right + 0.7 * wobble} ${top + 3}, ${right} ${top + radius}`,
		`C ${right + 0.8 * wobble} ${props.height * 0.33}, ${right - 0.9 * wobble} ${props.height * 0.66}, ${right} ${bottom - radius}`,
		`C ${right} ${bottom - 2}, ${right - 3} ${bottom + 0.4 * wobble}, ${right - radius} ${bottom}`,
		`C ${props.width * 0.68} ${bottom + 1 * wobble}, ${props.width * 0.35} ${bottom - 0.8 * wobble}, ${left + radius} ${bottom}`,
		`C ${left + 3} ${bottom}, ${left - 0.6 * wobble} ${bottom - 3}, ${left} ${bottom - radius}`,
		`C ${left - 0.7 * wobble} ${props.height * 0.62}, ${left + 0.8 * wobble} ${props.height * 0.34}, ${left} ${top + radius}`,
		`C ${left} ${top + 3}, ${left + 3} ${top}, ${left + radius} ${top + 0.4 * wobble}`,
		'Z',
	].join(' ');
}

function normalizeContent(content: string) {
	return content
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^#{1,6}\s*/gm, '')
		.replace(/[*_~>]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function wrapText(text: string, maxWidth: number, maxLineCount: number) {
	const maxCharacters = Math.max(10, Math.floor(maxWidth / 8.3));
	const words = text.split(/\s+/).filter(Boolean);

	if (words.length === 0) return [''];

	const lines: string[] = [];
	let currentLine = '';

	for (let index = 0; index < words.length; index++) {
		const word = words[index];
		const candidate = currentLine ? `${currentLine} ${word}` : word;

		if (candidate.length <= maxCharacters || currentLine.length === 0) {
			currentLine = candidate;
			continue;
		}

		lines.push(truncateText(currentLine, maxCharacters));
		currentLine = word;

		if (lines.length === maxLineCount - 1) {
			lines.push(truncateText([currentLine, ...words.slice(index + 1)].join(' '), maxCharacters));
			return lines;
		}
	}

	if (currentLine) lines.push(truncateText(currentLine, maxCharacters));

	return lines.slice(0, maxLineCount);
}

function truncateText(text: string, maxCharacters: number) {
	if (text.length <= maxCharacters) return text;
	if (maxCharacters <= 3) return text.slice(0, maxCharacters);

	return `${text.slice(0, maxCharacters - 3).trimEnd()}...`;
}
</script>

<template>
	<g :transform="`translate(${x}, ${y})`" :class="['sticky-note-box', colorClass]">
		<title>{{ name }}</title>
		<path class="sticky-note-surface" :d="notePath" />
		<path class="sticky-note-overdraw" :d="noteOverdrawPath" />
		<text class="sticky-note-text" :x="PADDING_X" :y="PADDING_Y + LINE_HEIGHT - 4">
			<tspan
				v-for="(line, lineIndex) in contentLines"
				:key="lineIndex"
				:x="PADDING_X"
				:y="PADDING_Y + LINE_HEIGHT - 4 + lineIndex * LINE_HEIGHT"
			>
				{{ line }}
			</tspan>
		</text>
	</g>
</template>
