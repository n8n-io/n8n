<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { onMounted, onUnmounted, ref } from 'vue';
import { N8nActionBox, N8nButton, N8nHeading, N8nIcon } from '@n8n/design-system';
import { useSecretsProviders } from '../composables/useSecretsProviders';

const i18n = useI18n();
const secretsProviders = useSecretsProviders();

const emit = defineEmits<{
	addSecretsStore: [];
}>();

// Provider logos for animation
const providerLogos = [
	// HashiCorp Vault
	'data:image/webp;base64,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',
	// Infisical
	'data:image/webp;base64,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',
	// GCP Secrets Manager (data URL from SVG)
	`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M22 6v11.887h-3.962a.19.19 0 0 1-.189-.189v-1.132c0-.104.085-.189.189-.189h2.452V7.509h-2.452a.19.19 0 0 1-.189-.188V6.189c0-.105.085-.189.189-.189zM6.31 6c.103 0 .188.084.188.189V7.32a.19.19 0 0 1-.189.188h-2.8v8.868h2.783c.105 0 .19.085.19.189v1.132a.19.19 0 0 1-.19.189H2V6zm11.117 3.868v1.456l.06.025 1.351-.478.28.82-1.362.465-.037.098.937 1.26-.706.514-.912-1.26h-.085l-.913 1.26-.705-.514.924-1.26-.024-.098-1.362-.465.28-.82 1.337.478.073-.025V9.868zm-10.231 0v1.442l.06.024 1.351-.473.28.812-1.363.46-.036.097.937 1.248-.706.51-.912-1.249h-.085l-.913 1.248-.705-.509.924-1.248-.024-.097-1.362-.46.28-.812 1.337.473.073-.024V9.868zm5.094 0v1.442l.061.024 1.35-.473.28.812-1.362.46-.037.097.937 1.248-.706.51-.912-1.249h-.085l-.912 1.248-.706-.509.925-1.248-.025-.097-1.362-.46.28-.812 1.338.473.073-.024V9.868z"/></svg>')}`,
	// Azure Key Vault
	`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="a" x1="-1032.172" x2="-1059.213" y1="145.312" y2="65.426" gradientTransform="matrix(1 0 0 -1 1075 158)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#114a8b"/><stop offset="1" stop-color="#0669bc"/></linearGradient><linearGradient id="b" x1="-1023.725" x2="-1029.98" y1="108.083" y2="105.968" gradientTransform="matrix(1 0 0 -1 1075 158)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-opacity=".3"/><stop offset=".071" stop-opacity=".2"/><stop offset=".321" stop-opacity=".1"/><stop offset=".623" stop-opacity=".05"/><stop offset="1" stop-opacity="0"/></linearGradient><linearGradient id="c" x1="-1027.165" x2="-997.482" y1="147.642" y2="68.561" gradientTransform="matrix(1 0 0 -1 1075 158)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3ccbf4"/><stop offset="1" stop-color="#2892df"/></linearGradient></defs><path fill="url(#a)" d="M33.338 6.544h26.038l-27.03 80.087a4.15 4.15 0 0 1-3.933 2.824H8.149a4.145 4.145 0 0 1-3.928-5.47L29.404 9.368a4.15 4.15 0 0 1 3.934-2.825z"/><path fill="#0078d4" d="M71.175 60.261h-41.29a1.911 1.911 0 0 0-1.305 3.309l26.532 24.764a4.17 4.17 0 0 0 2.846 1.121h23.38z"/><path fill="url(#b)" d="M33.338 6.544a4.12 4.12 0 0 0-3.943 2.879L4.252 83.917a4.14 4.14 0 0 0 3.908 5.538h20.787a4.44 4.44 0 0 0 3.41-2.9l5.014-14.777 17.91 16.705a4.24 4.24 0 0 0 2.666.972H81.24L71.024 60.261l-29.781.007L59.47 6.544z"/><path fill="url(#c)" d="M66.595 9.364a4.145 4.145 0 0 0-3.928-2.82H33.648a4.15 4.15 0 0 1 3.928 2.82l25.184 74.62a4.146 4.146 0 0 1-3.928 5.472h29.02a4.146 4.146 0 0 0 3.927-5.472z"/></svg>')}`,
	// AWS Secrets Manager
	`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="a" x1="0%" x2="100%" y1="100%" y2="0%"><stop offset="0%" stop-color="#BD0816"/><stop offset="100%" stop-color="#FF5252"/></linearGradient></defs><rect fill="url(#a)" width="80" height="80"/><path fill="#FFF" d="M38.76 43.36A1.241 1.241 0 1 0 40 42.12c-.683 0-1.24.556-1.24 1.24m-2 0A3.243 3.243 0 0 1 40 40.12a3.243 3.243 0 0 1 3.24 3.24A3.23 3.23 0 0 1 41 46.426V49h-2v-2.574a3.23 3.23 0 0 1-2.24-3.066M49 38H31v13h18v-3h-3v-2h3v-3h-3v-2h3zm-15-2h11.999L46 31c.001-2.616-2.857-4.998-5.996-5h-.003a6.6 6.6 0 0 0-4.238 1.575c-1.12.962-1.763 2.211-1.763 3.426zm14-4.999L47.999 36H50a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H30a1 1 0 0 1-1-1V37a1 1 0 0 1 1-1h2v-5c.001-1.798.897-3.599 2.459-4.942A8.63 8.63 0 0 1 40.001 24h.003c4.261.002 7.997 3.273 7.996 7.001M19.207 55.049l1.621-1.172c-2.735-3.78-4.247-8.215-4.432-12.877H19v-2h-2.601c.199-4.634 1.709-9.043 4.429-12.802l-1.621-1.173c-2.968 4.103-4.608 8.917-4.808 13.975H12v2h2.396c.186 5.086 1.828 9.926 4.811 14.049m34.631 4.159c-3.769 2.728-8.19 4.238-12.838 4.431V61h-2v2.639c-4.648-.192-9.07-1.702-12.841-4.431l-1.171 1.62c4.112 2.977 8.94 4.617 14.012 4.811V68h2v-2.361c5.072-.194 9.898-1.834 14.01-4.811zM26.159 20.866c3.771-2.728 8.193-4.238 12.841-4.43V19h2v-2.564c4.648.192 9.069 1.702 12.838 4.43l1.172-1.62c-4.112-2.976-8.938-4.616-14.01-4.81V12h-2v2.436c-5.072.193-9.9 1.833-14.012 4.81zM65.599 39c-.2-5.058-1.84-9.872-4.809-13.975l-1.621 1.173C61.89 29.957 63.4 34.366 63.599 39H61v2h2.602c-.186 4.662-1.697 9.097-4.433 12.877l1.621 1.172c2.984-4.123 4.625-8.963 4.812-14.049H68v-2zm-9.213-13.936 7.84-7.84-1.414-1.414-7.84 7.84zM23.612 55.01l-7.84 7.84 1.414 1.414 7.84-7.84zm5.054-27.757-14.841-14.84-1.414 1.414 14.841 14.84zM54.193 52.78l13.393 13.393-1.414 1.414-13.393-13.393z"/></svg>')}`,
];

// Animation state
const leftIconIndex = ref(0);
const rightIconIndex = ref(2);
const leftFading = ref(false);
const rightFading = ref(false);
let animationInterval: ReturnType<typeof setInterval> | null = null;

function animateLeft() {
	leftFading.value = true;
	setTimeout(() => {
		leftIconIndex.value = (leftIconIndex.value + 1) % providerLogos.length;
		leftFading.value = false;
	}, 300);
}

function animateRight() {
	rightFading.value = true;
	setTimeout(() => {
		rightIconIndex.value = (rightIconIndex.value + 1) % providerLogos.length;
		rightFading.value = false;
	}, 300);
}

onMounted(() => {
	if (secretsProviders.isEnterpriseExternalSecretsEnabled.value) {
		void secretsProviders.fetchProviders();
	}
	
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
				<div :class="$style.iconCard">
					<img 
						:src="providerLogos[leftIconIndex]" 
						:class="[$style.providerLogo, { [$style.fading]: leftFading }]" 
						alt="" 
					/>
				</div>
				<!-- Center icon - static vault -->
				<div :class="$style.iconCard">
					<N8nIcon icon="vault" />
				</div>
				<!-- Right icon - animated -->
				<div :class="$style.iconCard">
					<img 
						:src="providerLogos[rightIconIndex]" 
						:class="[$style.providerLogo, { [$style.fading]: rightFading }]" 
						alt="" 
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
				type="highlight"
				class="mr-2xs"
				element="a"
				:href="i18n.baseText('settings.externalSecrets.docs')"
				target="_blank"
				data-test-id="secrets-provider-connections-learn-more"
			>
				{{ i18n.baseText('generic.learnMore') }} <N8nIcon icon="arrow-up-right" />
			</N8nButton>
			<N8nButton type="primary" @click="onAddSecretsStore">
				{{ i18n.baseText('settings.secretsProviderConnections.emptyState.buttonText') }}
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
	width: 40px;
	height: 40px;
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
		margin-top: -5px;
	}

	&:nth-child(3) {
		transform: rotate(8deg);
	}
}

.iconCard :global(img),
.iconCard :global(svg) {
	width: 24px;
	height: 24px;
}

.providerLogo {
	width: 24px;
	height: 24px;
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
