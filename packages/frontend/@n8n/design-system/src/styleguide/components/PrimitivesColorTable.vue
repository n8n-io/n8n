<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import N8nTooltip from '../../components/N8nTooltip/Tooltip.vue';
import primitivesSource from '../../css/_primitives.scss?raw';
import { getColorTokenNames } from '../utils/cssTokenSource';

const SCALE_STEPS = [
	'50',
	'100',
	'150',
	'200',
	'250',
	'300',
	'400',
	'500',
	'600',
	'700',
	'800',
	'900',
	'950',
] as const;

type ScaleStep = (typeof SCALE_STEPS)[number];

type ColorFamily = {
	id: string;
	label: string;
	scale: Partial<Record<ScaleStep, string>>;
	extras: Array<{ step: string; token: string }>;
};

const isScaleStep = (step: string): step is ScaleStep =>
	SCALE_STEPS.some((scaleStep) => scaleStep === step);

const humanize = (value: string) =>
	value
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

const groupColorFamilies = (tokens: string[]): ColorFamily[] => {
	const families = new Map<string, ColorFamily>();

	for (const token of tokens) {
		if (!token.startsWith('--color--')) {
			continue;
		}

		const rest = token.slice('--color--'.length);
		const lastDash = rest.lastIndexOf('-');
		if (lastDash <= 0) {
			continue;
		}

		const id = rest.slice(0, lastDash);
		const step = rest.slice(lastDash + 1);
		const family = families.get(id) ?? { id, label: humanize(id), scale: {}, extras: [] };

		if (isScaleStep(step)) {
			family.scale[step] = token;
		} else {
			family.extras.push({ step, token });
		}

		families.set(id, family);
	}

	return [...families.values()];
};

const columns = SCALE_STEPS;
const columnCount = columns.length;
const families = groupColorFamilies(getColorTokenNames(primitivesSource));

const COPIED_FEEDBACK_MS = 2000;
const SWATCH_TOOLTIP_OFFSET = 4;

const tokenValues = ref<Record<string, string>>({});
const copiedToken = ref<string | null>(null);

let copiedTimeout: ReturnType<typeof setTimeout> | null = null;
let observer: MutationObserver | null = null;

const allTokens = families.flatMap((family) => [
	...Object.values(family.scale),
	...family.extras.map((extra) => extra.token),
]);

const updateValues = () => {
	const style = getComputedStyle(document.body);

	tokenValues.value = allTokens.reduce<Record<string, string>>((acc, token) => {
		acc[token] = style.getPropertyValue(token).trim();
		return acc;
	}, {});
};

const scaleToken = (family: ColorFamily, column: ScaleStep): string => family.scale[column] ?? '';

const scaleCells = (family: ColorFamily) =>
	columns.map((column) => ({
		column,
		token: scaleToken(family, column),
	}));

const hasScale = (family: ColorFamily) => Object.keys(family.scale).length > 0;

const hasTokenValue = (token: string) => Boolean(token && tokenValues.value[token]);

const isCopied = (token: string) => Boolean(token) && copiedToken.value === token;

const tokenValue = (token: string) => tokenValues.value[token] ?? '';

const copyToken = async (token: string) => {
	if (!token || !hasTokenValue(token) || !navigator.clipboard?.writeText) {
		return;
	}

	await navigator.clipboard.writeText(token);
	copiedToken.value = token;

	if (copiedTimeout) {
		clearTimeout(copiedTimeout);
	}

	copiedTimeout = setTimeout(() => {
		copiedToken.value = null;
	}, COPIED_FEEDBACK_MS);
};

onMounted(() => {
	updateValues();

	observer = new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				updateValues();
			}
		}
	});

	observer.observe(document.body, { attributes: true });
});

onUnmounted(() => {
	observer?.disconnect();
	if (copiedTimeout) {
		clearTimeout(copiedTimeout);
	}
});
</script>

<template>
	<div :class="$style.container" :style="{ '--n8n--color-scale-columns': columnCount }">
		<div :class="$style.wrapper">
			<div></div>
			<div :class="$style.row">
				<span v-for="column in columns" :key="column" :class="$style.columnLabel">{{
					column
				}}</span>
			</div>
		</div>

		<section v-for="family in families" :key="family.id" :class="$style.wrapper">
			<span :class="$style.label">{{ family.label }}</span>
			<div>
				<div v-if="hasScale(family)" :class="$style.row">
					<template v-for="cell in scaleCells(family)" :key="`${family.id}-${cell.column}`">
						<N8nTooltip
							v-if="cell.token"
							as-child
							:disabled="!hasTokenValue(cell.token)"
							placement="top"
							:offset="SWATCH_TOOLTIP_OFFSET"
							:avoid-collisions="false"
							:show-after="0"
							:enterable="false"
							:content-class="$style.tooltip"
						>
							<template #content>
								<template v-if="isCopied(cell.token)">Copied</template>
								<template v-else>
									<span :class="$style.tooltipToken">{{ cell.token }}</span>
									<span :class="$style.tooltipValue">{{ tokenValue(cell.token) }}</span>
								</template>
							</template>
							<button
								type="button"
								:class="$style.swatch"
								:style="{ backgroundColor: `var(${cell.token})` }"
								:aria-label="isCopied(cell.token) ? `Copied ${cell.token}` : `Copy ${cell.token}`"
								:disabled="!hasTokenValue(cell.token)"
								@click="copyToken(cell.token)"
							/>
						</N8nTooltip>
						<span v-else :class="$style.swatchPlaceholder" aria-hidden="true" />
					</template>
				</div>
				<div v-if="family.extras.length > 0" :class="$style.extras">
					<N8nTooltip
						v-for="extra in family.extras"
						:key="extra.token"
						as-child
						:disabled="!hasTokenValue(extra.token)"
						placement="top"
						:offset="SWATCH_TOOLTIP_OFFSET"
						:avoid-collisions="false"
						:show-after="0"
						:enterable="false"
						:content-class="$style.tooltip"
					>
						<template #content>
							<template v-if="isCopied(extra.token)">Copied</template>
							<template v-else>
								<span :class="$style.tooltipToken">{{ extra.token }}</span>
								<span :class="$style.tooltipValue">{{ tokenValue(extra.token) }}</span>
							</template>
						</template>
						<button
							type="button"
							:class="$style.swatch"
							:style="{ backgroundColor: `var(${extra.token})` }"
							:aria-label="isCopied(extra.token) ? `Copied ${extra.token}` : `Copy ${extra.token}`"
							:disabled="!hasTokenValue(extra.token)"
							@click="copyToken(extra.token)"
						/>
					</N8nTooltip>
				</div>
			</div>
		</section>
	</div>
</template>

<style lang="scss" module>
.container {
	--n8n--color-swatch-gap: var(--spacing--2xs);
	--n8n--color-swatch-row-gap: var(--spacing--2xs);

	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--n8n--color-swatch-row-gap);
	margin: var(--spacing--2xl) 0;
}

.wrapper {
	display: grid;
	grid-template-columns: minmax(var(--spacing--4xl), max-content) minmax(0, 1fr);
	width: 100%;
	align-items: center;
	gap: var(--spacing--sm);
	margin-top: 0;
}

.row {
	display: grid;
	grid-template-columns: repeat(var(--n8n--color-scale-columns), minmax(0, 1fr));
	gap: var(--n8n--color-swatch-gap);
	width: 100%;
	min-width: 0;

	> * {
		min-width: 0;
		width: 100%;
	}
}

.extras {
	display: grid;
	grid-template-columns: repeat(var(--n8n--color-scale-columns), minmax(0, 1fr));
	gap: var(--n8n--color-swatch-gap);
	width: 100%;
	min-width: 0;
	margin-top: var(--n8n--color-swatch-gap);

	> * {
		min-width: 0;
		width: 100%;
	}
}

.columnLabel,
.label {
	margin: 0;
}

.columnLabel {
	display: block;
	width: 100%;
	text-align: center;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	font-variant-numeric: tabular-nums;
	color: var(--text-color--subtle);
}

.label {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
}

.swatch,
.swatchPlaceholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	aspect-ratio: 1;
	height: auto;
}

.swatch {
	padding: 0;
	border: 0;
	border-radius: var(--radius);
	box-shadow: var(--shadow--outline);
	cursor: pointer;

	&:disabled {
		cursor: default;
		opacity: 0.4;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--spacing--5xs);
	}
}

:global(.n8n-tooltip).tooltip {
	max-width: none;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-family: var(--font-family--monospace);
	font-weight: var(--font-weight--regular);
	white-space: nowrap;
}

.tooltipToken {
	color: var(--color--neutral-100);
}

.tooltipValue {
	color: var(--color--neutral-400);
}
</style>
