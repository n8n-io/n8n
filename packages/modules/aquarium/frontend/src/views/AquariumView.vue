<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { N8nButton, N8nCallout, N8nHeading, N8nSwitch, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAquariumStore } from '../aquarium.store';
import type { AquariumEntity } from '../aquarium.types';
import AquariumTank from '../components/AquariumTank.vue';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const store = useAquariumStore();
const documentTitle = useDocumentTitle();

const isDemo = computed(() => route.query.demo === 'true');

async function load() {
	await store.load({ demo: isDemo.value });
}

async function setDemo(value: string | number | boolean) {
	await router.replace({ query: { ...route.query, demo: value === true ? 'true' : undefined } });
}

async function onSelect(entity: AquariumEntity) {
	if (entity.route) await router.push(entity.route);
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('aquarium.title'));
	await load();
});

watch(isDemo, load);
</script>

<template>
	<div :class="$style.view">
		<div :class="$style.tank">
			<AquariumTank :entities="store.entities" @select="onSelect" />
		</div>

		<!-- The overlay lets pointer events through, so creatures under its gaps stay clickable. -->
		<div :class="$style.overlay">
			<header :class="[$style.panel, $style.intro]">
				<N8nHeading tag="h1" size="xlarge">{{ i18n.baseText('aquarium.title') }}</N8nHeading>
				<N8nText size="small" color="text-light">{{
					i18n.baseText('aquarium.description')
				}}</N8nText>
			</header>

			<div :class="[$style.panel, $style.actions]">
				<N8nSwitch
					:model-value="isDemo"
					:label="i18n.baseText('aquarium.demo')"
					data-test-id="aquarium-demo-switch"
					@update:model-value="setDemo"
				/>
				<N8nButton
					type="secondary"
					size="small"
					icon="refresh-cw"
					:loading="store.isLoading"
					data-test-id="aquarium-refresh"
					@click="load"
				>
					{{ i18n.baseText('aquarium.refresh') }}
				</N8nButton>
			</div>

			<N8nCallout v-if="store.isPartial" :class="$style.callout" theme="warning">
				{{ i18n.baseText('aquarium.partialData') }}
			</N8nCallout>
		</div>

		<N8nText
			v-if="store.hasLoaded && store.entities.length === 0"
			:class="[$style.panel, $style.empty]"
			color="text-light"
		>
			{{ i18n.baseText('aquarium.empty') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.view {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.tank {
	position: absolute;
	inset: 0;
}

.overlay {
	position: absolute;
	inset: var(--spacing--sm) var(--spacing--sm) auto;
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--xs);
	pointer-events: none;

	> * {
		pointer-events: auto;
	}
}

.panel {
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: color-mix(in srgb, var(--color--background--light-3) 85%, transparent);
	backdrop-filter: blur(4px);
	box-shadow: var(--shadow--sm);
}

.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-width: 40ch;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.callout {
	flex-basis: 100%;
}

.empty {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}
</style>
