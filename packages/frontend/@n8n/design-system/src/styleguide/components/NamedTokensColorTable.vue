<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import N8nIcon from '../../components/N8nIcon/Icon.vue';
import N8nInput from '../../components/N8nInput/Input.vue';
import tokensSource from '../../css/_tokens.scss?raw';
import { getColorTokenNames } from '../utils/cssTokenSource';

const SEMANTIC_COLOR_TOKENS = getColorTokenNames(tokensSource);

type TokenGroup = {
	label: string;
	tokens: string[];
};

const GROUP_ORDER = ['Text Color', 'Background', 'Border Color', 'Icon Color', 'Color', 'Focus'];

const query = ref('');
const tokenValues = ref<Record<string, string>>({});

let observer: MutationObserver | null = null;
let colorSchemeQuery: MediaQueryList | null = null;

const groupLabelFor = (token: string) => {
	const firstGroup = token.slice(2).split('--')[0] ?? token;
	return firstGroup
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
};

const allNamedTokens = computed(() =>
	[...SEMANTIC_COLOR_TOKENS].sort((a, b) => a.localeCompare(b)),
);

const filteredTokens = computed(() => {
	const needle = query.value.trim().toLowerCase();

	if (!needle) {
		return allNamedTokens.value;
	}

	return allNamedTokens.value.filter((token) => {
		const value = tokenValues.value[token] ?? '';
		return token.toLowerCase().includes(needle) || value.toLowerCase().includes(needle);
	});
});

const groupedTokens = computed((): TokenGroup[] => {
	const groups = new Map<string, string[]>();

	for (const token of filteredTokens.value) {
		const label = groupLabelFor(token);
		const tokens = groups.get(label) ?? [];
		tokens.push(token);
		groups.set(label, tokens);
	}

	return [...groups.entries()]
		.map(([label, tokens]) => ({ label, tokens }))
		.sort((a, b) => {
			const aOrder = GROUP_ORDER.indexOf(a.label);
			const bOrder = GROUP_ORDER.indexOf(b.label);

			if (aOrder !== bOrder) {
				if (aOrder === -1) {
					return 1;
				}
				if (bOrder === -1) {
					return -1;
				}
				return aOrder - bOrder;
			}

			return a.label.localeCompare(b.label);
		});
});

const updateValues = () => {
	const style = getComputedStyle(document.body);
	const nextValues: Record<string, string> = {};

	for (const token of SEMANTIC_COLOR_TOKENS) {
		nextValues[token] = style.getPropertyValue(token).trim();
	}

	tokenValues.value = nextValues;
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

	if (typeof window.matchMedia === 'function') {
		colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
		colorSchemeQuery.addEventListener('change', updateValues);
	}
});

onUnmounted(() => {
	observer?.disconnect();
	colorSchemeQuery?.removeEventListener('change', updateValues);
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.search">
			<N8nInput v-model="query" size="small" placeholder="Search" clearable>
				<template #prefix>
					<N8nIcon icon="search" :size="14" />
				</template>
			</N8nInput>
		</div>

		<div v-if="filteredTokens.length === 0" :class="$style.empty">
			No named tokens match that search.
		</div>

		<section v-for="group in groupedTokens" :key="group.label" :class="$style.group">
			<div :class="$style.groupLabel">{{ group.label }}</div>
			<ul :class="$style.list">
				<li v-for="token in group.tokens" :key="token" :class="$style.item">
					<div :class="$style.row">
						<span :class="$style.swatch" aria-hidden="true">
							<span :class="$style.swatchFill" :style="{ background: `var(${token})` }" />
						</span>
						<span :class="$style.name">{{ token }}</span>
						<span :class="$style.value">{{ tokenValues[token] }}</span>
					</div>
				</li>
			</ul>
		</section>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	margin: var(--spacing--xl) 0;
}

.search {
	width: fit-content;
	max-width: 100%;

	> :global(*) {
		width: auto;
	}

	:global(input) {
		flex: none;
		width: 20ch;
	}
}

.empty,
.groupLabel,
.name,
.value {
	margin: 0;
	color: var(--text-color--subtle);
}

.empty {
	font-size: var(--font-size--sm);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.groupLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.item {
	display: block;
}

.row {
	display: grid;
	grid-template-columns: var(--spacing--xl) minmax(0, 1.2fr) minmax(0, 1fr);
	align-items: center;
	gap: var(--spacing--sm);
	width: 100%;
}

.swatch {
	display: block;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius);
	box-shadow: var(--shadow--outline);
	background-color: var(--background--surface);
	overflow: hidden;
}

.swatchFill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}

.name,
.value {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.name {
	color: var(--text-color);
}

.value {
	color: var(--text-color--subtle);
}
</style>
