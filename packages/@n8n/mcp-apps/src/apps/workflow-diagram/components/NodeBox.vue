<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type {
	PreviewWorkflowNode,
	PreviewWorkflowNodeIcon,
} from '../../../shared/workflow-diagram';
import { getPreviewNodeIconSvg, resolvePreviewNodeIconColor } from '../node-icon.utils';
import NodeIconGlyph from './NodeIconGlyph.vue';
import NodeIconSvg from './NodeIconSvg.vue';

const ICON_SIZE = 44;
const SUB_NODE_ICON_SIZE = 58;
const SUB_NODE_CIRCLE_RADIUS = 39;
const SUB_NODE_CIRCLE_CENTER_Y = 44;
const ICON_TOP = 17;
const ICON_IMAGE_INSET = 7;
const LABEL_CENTER_Y = 96;
const SUB_NODE_LABEL_CENTER_Y = 111;
const LABEL_INSET_X = 10;
const SUB_NODE_LABEL_INSET_X = 2;
const LINE_HEIGHT = 18;
const MAX_LABEL_LINES = 2;
const STATUS_BADGE_VIEWBOX_SIZE = 26;
const STATUS_BADGE_SIZE = 20;
const STATUS_BADGE_INSET = 9;

const props = defineProps<{
	x: number;
	y: number;
	width: number;
	height: number;
	name: string;
	type: string;
	icon: PreviewWorkflowNodeIcon;
	variant?: 'node' | 'subNode';
	executionStatus?: PreviewWorkflowNode['executionStatus'];
}>();

const imageFailed = ref(false);

const isSubNode = computed(() => props.variant === 'subNode');
const showFileIcon = computed(() => props.icon.type === 'file' && !imageFailed.value);
const iconSize = computed(() => (isSubNode.value ? SUB_NODE_ICON_SIZE : ICON_SIZE));
const iconX = computed(() => (props.width - iconSize.value) / 2);
const iconY = computed(() =>
	isSubNode.value ? SUB_NODE_CIRCLE_CENTER_Y - iconSize.value / 2 : ICON_TOP,
);
const textX = computed(() => props.width / 2);
const textMaxWidth = computed(() =>
	Math.max(props.width - (isSubNode.value ? SUB_NODE_LABEL_INSET_X : LABEL_INSET_X) * 2, 24),
);
const nameLines = computed(() => wrapLabel(props.name, textMaxWidth.value));
const textStartY = computed(
	() =>
		(isSubNode.value ? SUB_NODE_LABEL_CENTER_Y : LABEL_CENTER_Y) -
		((nameLines.value.length - 1) * LINE_HEIGHT) / 2,
);
const nodeIconSvg = computed(() => getPreviewNodeIconSvg(props.icon));
const iconGlyph = computed(() => getIconGlyph(props.icon));
const titleText = computed(() =>
	props.executionStatus
		? `${props.name}\n${props.type}\nExecution: ${props.executionStatus}`
		: `${props.name}\n${props.type}`,
);
const statusBadgeX = computed(() => props.width - STATUS_BADGE_SIZE - STATUS_BADGE_INSET);
const statusBadgeY = computed(() => props.height - STATUS_BADGE_SIZE - STATUS_BADGE_INSET);
const statusBadgeScale = computed(() => STATUS_BADGE_SIZE / STATUS_BADGE_VIEWBOX_SIZE);

const fallbackIconLabel = computed(() => {
	if (props.icon.type === 'unknown') return '?';

	const iconName = getIconReference(props.icon);
	const [firstSegment] = iconName.split(/[-_\s.]+/).filter(Boolean);

	return firstSegment?.charAt(0).toUpperCase() ?? '?';
});

const iconColor = computed(() =>
	props.icon.type === 'icon' ? resolvePreviewNodeIconColor(props.icon.color) : undefined,
);

watch(
	() => props.icon,
	() => {
		imageFailed.value = false;
	},
);

const cardPath = computed(() => createRoundedSketchPath(props.width, props.height, 19, 'primary'));
const overdrawPath = computed(() =>
	createRoundedSketchPath(props.width, props.height, 19, 'overdraw'),
);

function createRoundedSketchPath(
	width: number,
	height: number,
	radius: number,
	variant: 'primary' | 'overdraw',
) {
	const offset = variant === 'primary' ? 0 : 1;
	const left = 2.1 + offset * 0.6;
	const top = 2 - offset * 0.5;
	const right = width - 2.2 + offset * 0.4;
	const bottom = height - 2.1 + offset * 0.7;
	const r = radius + (variant === 'primary' ? 0 : 1.6);
	const wobble = variant === 'primary' ? 1 : -1;

	return [
		`M ${left + r} ${top + 0.3 * wobble}`,
		`C ${width * 0.24} ${top - 1.7 * wobble}, ${width * 0.37} ${top + 1.1 * wobble}, ${width * 0.5} ${top - 0.5 * wobble}`,
		`C ${width * 0.64} ${top - 1.2 * wobble}, ${width * 0.75} ${top + 1.5 * wobble}, ${right - r} ${top + 0.2 * wobble}`,
		`C ${right - 8} ${top - 0.4 * wobble}, ${right + 1.2 * wobble} ${top + 8}, ${right - 0.2 * wobble} ${top + r}`,
		`C ${right + 0.9 * wobble} ${height * 0.36}, ${right - 1.2 * wobble} ${height * 0.55}, ${right + 0.5 * wobble} ${height * 0.7}`,
		`C ${right + 1.1 * wobble} ${bottom - r}, ${right - 6} ${bottom + 0.9 * wobble}, ${right - r} ${bottom - 0.1 * wobble}`,
		`C ${width * 0.76} ${bottom + 1.5 * wobble}, ${width * 0.63} ${bottom - 0.9 * wobble}, ${width * 0.5} ${bottom + 0.4 * wobble}`,
		`C ${width * 0.35} ${bottom + 1.2 * wobble}, ${width * 0.24} ${bottom - 1.3 * wobble}, ${left + r} ${bottom}`,
		`C ${left + 8} ${bottom + 0.5 * wobble}, ${left - 1.1 * wobble} ${bottom - 8}, ${left + 0.2 * wobble} ${bottom - r}`,
		`C ${left - 1.2 * wobble} ${height * 0.68}, ${left + 0.9 * wobble} ${height * 0.5}, ${left - 0.4 * wobble} ${height * 0.32}`,
		`C ${left - 1 * wobble} ${top + r}, ${left + 7} ${top - 0.5 * wobble}, ${left + r} ${top + 0.3 * wobble}`,
		'Z',
	].join(' ');
}

function getIconReference(icon: PreviewWorkflowNodeIcon) {
	if (icon.type === 'unknown') return '';
	if (icon.type === 'file') {
		if (icon.src.startsWith('data:')) return '';

		return (
			icon.src
				.split('/')
				.pop()
				?.replace(/\.[^.]+$/, '') ?? ''
		);
	}
	if (!icon.name.includes(':')) return icon.name;

	return icon.name.split(':')[1] ?? icon.name;
}

function getIconGlyph(icon: PreviewWorkflowNodeIcon) {
	if (icon.type !== 'icon') return undefined;

	const normalizedName = normalizeIconReference(icon.name);
	const reference = normalizeIconReference(getIconReference(icon));
	const knownGlyph = getKnownNodeIconGlyph(reference);

	if (knownGlyph) return knownGlyph;
	if (normalizedName.startsWith('node-')) return undefined;

	if (/schedule|clock|timer/.test(reference)) return 'schedule-trigger';
	if (/edit|set|manual|pencil/.test(reference)) return 'edit-fields';
	if (/aggregate|merge|combine|summar/.test(reference)) return 'aggregate';
	if (/parser|schema|structured|json|braces/.test(reference)) return 'structured-output-parser';
	if (/open-ai|openai|ai|model|llm|chat|robot/.test(reference)) return 'ai';
	if (/code/.test(reference)) return 'code';
	if (/database|memory|vector|storage/.test(reference)) return 'database';
	if (/webhook|http|request|globe/.test(reference)) return 'globe';
	if (/mail|email|send/.test(reference)) return 'mail';

	return undefined;
}

function getKnownNodeIconGlyph(reference: string) {
	const localGlyphs: Record<string, string> = {
		aggregate: 'aggregate',
		'ai-agent': 'ai-agent',
		'basic-llm-chain': 'basic-llm-chain',
		code: 'code',
		'edit-fields': 'edit-fields',
		form: 'form-trigger',
		'form-trigger': 'form-trigger',
		gmail: 'mail',
		html: 'html',
		'information-extractor': 'information-extractor',
		openai: 'ai',
		'schedule-trigger': 'schedule-trigger',
		'send-mail': 'mail',
		sort: 'sort',
		'structured-output-parser': 'structured-output-parser',
	};

	return localGlyphs[reference];
}

function normalizeIconReference(reference: string) {
	return reference
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[:_.\s]+/g, '-')
		.toLowerCase();
}

function wrapLabel(label: string, maxWidth: number) {
	const maxCharacters = Math.max(8, Math.floor(maxWidth / 7.2));
	const words = label.trim().split(/\s+/).filter(Boolean);

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

		lines.push(truncateLabel(currentLine, maxCharacters));
		currentLine = word;

		if (lines.length === MAX_LABEL_LINES - 1) {
			const remainingText = [currentLine, ...words.slice(index + 1)].join(' ');
			lines.push(truncateLabel(remainingText, maxCharacters));
			return lines;
		}
	}

	if (currentLine) lines.push(truncateLabel(currentLine, maxCharacters));

	return lines.slice(0, MAX_LABEL_LINES);
}

function truncateLabel(label: string, maxCharacters: number) {
	if (label.length <= maxCharacters) return label;
	if (maxCharacters <= 3) return label.slice(0, maxCharacters);

	return `${label.slice(0, maxCharacters - 3).trimEnd()}...`;
}
</script>

<template>
	<g
		:transform="`translate(${x}, ${y})`"
		:class="[
			'node-box',
			{
				'is-sub-node': isSubNode,
				'execution-success': executionStatus === 'success',
				'execution-error': executionStatus === 'error',
			},
		]"
	>
		<title>{{ titleText }}</title>
		<template v-if="isSubNode">
			<ellipse
				class="subnode-circle"
				:cx="width / 2"
				:cy="SUB_NODE_CIRCLE_CENTER_Y"
				:rx="SUB_NODE_CIRCLE_RADIUS"
				:ry="SUB_NODE_CIRCLE_RADIUS"
			/>
			<ellipse
				class="subnode-circle-overdraw"
				:cx="width / 2 + 0.8"
				:cy="SUB_NODE_CIRCLE_CENTER_Y - 0.5"
				:rx="SUB_NODE_CIRCLE_RADIUS + 1.2"
				:ry="SUB_NODE_CIRCLE_RADIUS - 0.8"
			/>
		</template>
		<template v-else>
			<path class="node-card node-card-outline" :d="cardPath" />
			<path class="node-card-overdraw" :d="overdrawPath" />
		</template>
		<foreignObject
			v-if="showFileIcon && icon.type === 'file'"
			:x="iconX + ICON_IMAGE_INSET"
			:y="iconY + ICON_IMAGE_INSET"
			:width="iconSize - ICON_IMAGE_INSET * 2"
			:height="iconSize - ICON_IMAGE_INSET * 2"
		>
			<img
				xmlns="http://www.w3.org/1999/xhtml"
				class="node-icon-image"
				:src="icon.src"
				alt=""
				@error="imageFailed = true"
			/>
		</foreignObject>
		<NodeIconSvg
			v-else-if="nodeIconSvg"
			:svg="nodeIconSvg"
			:x="iconX + ICON_IMAGE_INSET"
			:y="iconY + ICON_IMAGE_INSET"
			:size="iconSize - ICON_IMAGE_INSET * 2"
			:color="iconColor"
			aria-hidden="true"
		/>
		<NodeIconGlyph
			v-else-if="iconGlyph"
			:glyph="iconGlyph"
			:x="iconX + ICON_IMAGE_INSET"
			:y="iconY + ICON_IMAGE_INSET"
			:size="iconSize - ICON_IMAGE_INSET * 2"
			:color="iconColor"
			aria-hidden="true"
		/>
		<text
			v-else
			class="node-icon-fallback"
			:x="iconX + iconSize / 2"
			:y="iconY + iconSize / 2"
			:style="{ fill: iconColor }"
			aria-hidden="true"
		>
			{{ fallbackIconLabel }}
		</text>
		<text class="node-name" :x="textX" :y="textStartY">
			<tspan
				v-for="(line, lineIndex) in nameLines"
				:key="lineIndex"
				:x="textX"
				:y="textStartY + lineIndex * LINE_HEIGHT"
			>
				{{ line }}
			</tspan>
		</text>
		<g
			v-if="executionStatus"
			:class="['node-execution-badge', `node-execution-badge-${executionStatus}`]"
			:transform="`translate(${statusBadgeX}, ${statusBadgeY}) scale(${statusBadgeScale})`"
			aria-hidden="true"
		>
			<circle class="node-execution-badge-marker" cx="13" cy="13" r="11.5" />
			<path
				v-if="executionStatus === 'success'"
				class="node-execution-badge-icon"
				d="M7.75 13.25L11.25 16.75L18.25 9.25"
			/>
			<template v-else>
				<path class="node-execution-badge-icon" d="M13 7.25V14.25" />
				<path class="node-execution-badge-icon" d="M13 18.25H13.01" />
			</template>
		</g>
	</g>
</template>
