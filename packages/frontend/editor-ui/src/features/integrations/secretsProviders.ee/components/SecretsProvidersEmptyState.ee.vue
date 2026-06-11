<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, onUnmounted, ref, toRef } from 'vue';
import { N8nActionBox, N8nButton, N8nHeading, N8nIcon } from '@n8n/design-system';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import SecretsProviderImage from './SecretsProviderImage.ee.vue';

const i18n = useI18n();

const props = defineProps<{
	providerTypes?: SecretProviderTypeResponse[];
	canCreate?: boolean;
}>();

const providerTypes = toRef(props, 'providerTypes');
const supportedProviders = computed(() => providerTypes.value ?? []);

const emit = defineEmits<{
	addSecretsStore: [];
}>();

// Animation state
const leftIconIndex = ref(0);
const rightIconIndex = ref(2);
const leftFading = ref(false);
const rightFading = ref(false);
let animationInterval: ReturnType<typeof setInterval> | null = null;

function animateLeft() {
	leftFading.value = true;
	setTimeout(() => {
		leftIconIndex.value = (leftIconIndex.value + 1) % supportedProviders.value.length;
		leftFading.value = false;
	}, 300);
}

function animateRight() {
	rightFading.value = true;
	setTimeout(() => {
		rightIconIndex.value = (rightIconIndex.value + 1) % supportedProviders.value.length;
		rightFading.value = false;
	}, 300);
}

onMounted(() => {
	// Start staggered animation for side icons
	// Left animates, then right animates 1.5s later, cycle repeats every 3s
	animationInterval = setInterval(() => {
		animateLeft();
		setTimeout(() => {
			animateRight();
		}, 1500);
	}, 3000);
});

onUnmounted(() => {
	if (animationInterval) {
		clearInterval(animationInterval);
	}
});

function onAddSecretsStore() {
	emit('addSecretsStore');
}
</script>

<template>
	<N8nActionBox
		class="mt-2xl mb-l"
		description="yes"
		data-test-id="secrets-provider-connections-empty-state"
	>
		<template #description>
			<div :class="$style.iconCardContainer">
				<!-- Left icon - animated -->
				<div v-if="supportedProviders?.[leftIconIndex]" :class="$style.iconCard">
					<SecretsProviderImage
						:provider="supportedProviders?.[leftIconIndex]"
						:class="[$style.providerLogo, { [$style.fading]: leftFading }]"
					/>
				</div>
				<!-- Center icon - static vault -->
				<div :class="$style.iconCard">
					<N8nIcon icon="vault" />
				</div>
				<!-- Right icon - animated -->
				<div v-if="supportedProviders?.[rightIconIndex]" :class="$style.iconCard">
					<SecretsProviderImage
						:provider="supportedProviders?.[rightIconIndex]"
						:class="[$style.providerLogo, { [$style.fading]: rightFading }]"
					/>
				</div>
			</div>
			<N8nHeading tag="h2" size="medium" align="center" class="mb-2xs">
				{{ i18n.baseText('settings.secretsProviderConnections.emptyState.heading') }}
			</N8nHeading>
			<div>
				{{ i18n.baseText('settings.secretsProviderConnections.emptyState.description') }}
			</div>
		</template>
		<template #additionalContent>
			<N8nButton
				variant="ghost"
				class="mr-2xs n8n-button--highlight"
				:href="i18n.baseText('settings.externalSecrets.docs')"
				target="_blank"
				data-test-id="secrets-provider-connections-learn-more"
			>
				{{ i18n.baseText('generic.learnMore') }} <N8nIcon icon="arrow-up-right" />
			</N8nButton>
			<N8nButton v-if="canCreate" variant="solid" @click="onAddSecretsStore">
				{{ i18n.baseText('settings.secretsProviderConnections.buttons.addSecretsStore') }}
			</N8nButton>
		</template>
	</N8nActionBox>
</template>

<style lang="css" module>
.iconCardContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: var(--spacing--lg);
}

.iconCard {
	width: 2.5rem;
	height: 2.5rem;
	border: 1px solid var(--color--neutral-100);
	display: flex;
	justify-content: center;
	align-items: center;
	background: var(--color--background--light-2);
	box-shadow: var(--shadow--dark);
	border-radius: var(--radius);
	overflow: hidden;

	&:nth-child(1) {
		transform: rotate(-8deg);
	}

	&:nth-child(2) {
		z-index: 1;
		margin-top: -0.3rem;
	}

	&:nth-child(3) {
		transform: rotate(8deg);
	}
}

.iconCard :global(img),
.iconCard :global(svg) {
	width: var(--spacing--lg);
	height: var(--spacing--lg);
}

.providerLogo {
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	object-fit: contain;
	opacity: 1;
	filter: blur(0);
	transition:
		opacity 300ms ease-in-out,
		filter 300ms ease-in-out;
}

.fading {
	opacity: 0;
	filter: blur(4px);
}
</style>
