<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import N8nTooltip from '../../components/N8nTooltip/Tooltip.vue';
import { TOOLTIP_DELAY_MS } from '../../constants';

type ColorRow = {
	label: string;
	tokenPrefix?: string;
	tokens?: Record<string, string>;
};

const columns = [
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
];

const rows: ColorRow[] = [
	{ label: 'Neutral', tokenPrefix: '--color--neutral-' },
	{ label: 'Red', tokenPrefix: '--color--red-' },
	{ label: 'Orange', tokenPrefix: '--color--orange-' },
	{ label: 'Yellow', tokenPrefix: '--color--yellow-' },
	{ label: 'Green', tokenPrefix: '--color--green-' },
	{ label: 'Mint', tokenPrefix: '--color--mint-' },
	{ label: 'Blue', tokenPrefix: '--color--blue-' },
	{ label: 'Purple', tokenPrefix: '--color--purple-' },
	{ label: 'Pink', tokenPrefix: '--color--pink-' },
	{ label: 'White Alpha', tokenPrefix: '--color--white-alpha-' },
	{ label: 'Black Alpha', tokenPrefix: '--color--black-alpha-' },
];

const tokenValues = ref<Record<string, string>>({});
const copiedToken = ref('');

let copiedTimeout: ReturnType<typeof setTimeout> | null = null;
let observer: MutationObserver | null = null;

const allTokens = computed(() => {
	const tokens = new Set<string>();

	for (const row of rows) {
		for (const column of columns) {
			const token = resolveToken(row, column);
			if (token) {
				tokens.add(token);
			}
		}
	}

	return [...tokens];
});

const updateValues = () => {
	const style = getComputedStyle(document.body);

	tokenValues.value = allTokens.value.reduce<Record<string, string>>((acc, token) => {
		acc[token] = style.getPropertyValue(token).trim();
		return acc;
	}, {});
};

const resolveToken = (row: ColorRow, column: string): string => {
	if (row.tokens?.[column]) {
		return row.tokens[column];
	}

	if (row.tokenPrefix) {
		return `${row.tokenPrefix}${column}`;
	}

	return '';
};

const hasTokenValue = (token: string) => Boolean(token && tokenValues.value[token]);

const getTooltipContent = (token: string) =>
	copiedToken.value === token ? 'Copy' : 'Click to copy';

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
		copiedToken.value = '';
	}, 1200);
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
	<div :class="$style.container">
		<div :class="$style.wrapper">
			<div></div>
			<div :class="$style.row">
				<p v-for="column in columns" :key="column">{{ column }}</p>
			</div>
		</div>

		<section v-for="row in rows" :key="row.label" :class="$style.wrapper">
			<p :class="$style.label">{{ row.label }}</p>
			<div :class="$style.row">
				<N8nTooltip
					v-for="column in columns"
					:key="`${row.label}-${column}`"
					:disabled="!hasTokenValue(resolveToken(row, column))"
					placement="top"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<template #content>{{ getTooltipContent(resolveToken(row, column)) }}</template>
					<button
						type="button"
						:class="$style.swatch"
						:style="{ backgroundColor: `var(${resolveToken(row, column)})` }"
						:aria-label="`Copy ${resolveToken(row, column)}`"
						:disabled="!hasTokenValue(resolveToken(row, column))"
						@click="copyToken(resolveToken(row, column))"
					>
						<span v-if="copiedToken === resolveToken(row, column)" :class="$style.copied">
							Copied
						</span>
					</button>
				</N8nTooltip>
			</div>
		</section>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	overflow: hidden;
	margin: var(--spacing--2xl) 0;
}

.wrapper {
	display: grid;
	grid-template-columns: 160px 1fr;
	width: 100%;
	align-items: end;
	gap: var(--spacing--xs);
	margin-top: 0;
}

.row {
	display: grid;
	grid-template-columns: repeat(13, 1fr);
	gap: var(--spacing--2xs);
	justify-items: end;

	p {
		margin: 0;
		font-size: var(--font-size--sm);
		color: var(--text-color--subtle);
	}
}

.label {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
	margin-bottom: 0 !important;
}

.swatch {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
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
		outline-offset: 2px;
	}
}

.copied {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
	padding: 2px 4px;
	border-radius: var(--radius);
	color: var(--text-color);
	background: var(--color--white-alpha-500);
}
</style>
