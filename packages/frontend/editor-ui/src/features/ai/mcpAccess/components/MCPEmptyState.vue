<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { Component } from 'vue';
import { N8nActionBox, N8nButton, N8nHeading, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';
import { useI18n } from '@n8n/i18n';

import ClaudeIcon from '../assets/client-icons/claude.svg?component';
import CursorIcon from '../assets/client-icons/cursor.svg?component';
import OpenAiIcon from '../assets/client-icons/openai.svg?component';
import VsCodeIcon from '../assets/client-icons/vscode.svg?component';

type Props = {
	disabled?: boolean;
	loading?: boolean;
	managedByEnv?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	loading: false,
	managedByEnv: false,
});

const emit = defineEmits<{
	turnOnMcp: [];
}>();

const i18n = useI18n();

const CLIENT_ICONS: Component[] = [ClaudeIcon, CursorIcon, VsCodeIcon, OpenAiIcon];

// Staggered fade/blur cycle through the known client logos on the side cards,
// same animation as the secrets-providers empty state.
const leftIconIndex = ref(0);
const rightIconIndex = ref(2);
const leftFading = ref(false);
const rightFading = ref(false);
let animationInterval: ReturnType<typeof setInterval> | null = null;

function animateLeft() {
	leftFading.value = true;
	setTimeout(() => {
		leftIconIndex.value = (leftIconIndex.value + 1) % CLIENT_ICONS.length;
		leftFading.value = false;
	}, 300);
}

function animateRight() {
	rightFading.value = true;
	setTimeout(() => {
		rightIconIndex.value = (rightIconIndex.value + 1) % CLIENT_ICONS.length;
		rightFading.value = false;
	}, 300);
}

onMounted(() => {
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

const buttonDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-empty-state-container">
		<N8nActionBox description="-">
			<template #description>
				<div :class="$style.iconCardContainer">
					<div :class="$style.iconCard">
						<component
							:is="CLIENT_ICONS[leftIconIndex]"
							:class="[$style.clientLogo, { [$style.fading]: leftFading }]"
						/>
					</div>
					<div :class="$style.iconCard">
						<N8nIcon icon="mcp" :class="$style.mcpIcon" />
					</div>
					<div :class="$style.iconCard">
						<component
							:is="CLIENT_ICONS[rightIconIndex]"
							:class="[$style.clientLogo, { [$style.fading]: rightFading }]"
						/>
					</div>
				</div>
				<N8nHeading tag="h2" size="medium" align="center" class="mb-2xs">
					{{ i18n.baseText('settings.mcp.actionBox.heading') }}
				</N8nHeading>
				<div>
					{{ i18n.baseText('settings.mcp.emptyState.description') }}
				</div>
			</template>
			<template #additionalContent>
				<N8nButton
					variant="ghost"
					class="mr-2xs n8n-button--highlight"
					:href="MCP_DOCS_PAGE_URL"
					target="_blank"
					data-test-id="mcp-empty-state-learn-more"
				>
					{{ i18n.baseText('generic.learnMore') }} <N8nIcon icon="arrow-up-right" />
				</N8nButton>
				<N8nTooltip :disabled="!buttonDisabled">
					<template #content>
						<span v-if="props.loading">{{ i18n.baseText('generic.loading') }}...</span>
						<span v-else-if="props.managedByEnv">
							{{ i18n.baseText('settings.mcp.managedByEnv.tooltip') }}
						</span>
						<span v-else>
							{{ i18n.baseText('settings.mcp.toggle.disabled.tooltip') }}
						</span>
					</template>
					<N8nButton
						variant="solid"
						:disabled="buttonDisabled"
						data-test-id="enable-mcp-access-button"
						@click="emit('turnOnMcp')"
					>
						{{ i18n.baseText('settings.mcp.actionBox.button.label') }}
					</N8nButton>
				</N8nTooltip>
			</template>
		</N8nActionBox>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.iconCardContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: var(--spacing--lg);
}

.iconCard {
	width: 2.5rem;
	height: 2.5rem;
	border: var(--border);
	display: flex;
	justify-content: center;
	align-items: center;
	/* fixed white tile so dark brand marks stay visible on the dark theme */
	background: var(--color--neutral-white);
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

.clientLogo {
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	object-fit: contain;
	opacity: 1;
	filter: blur(0);
	transition:
		opacity 300ms ease-in-out,
		filter 300ms ease-in-out;
}

.mcpIcon {
	font-size: var(--spacing--lg);
	/* the tile is always white, so the MCP glyph must stay dark in both themes */
	color: var(--color--neutral-black);
}

.fading {
	opacity: 0;
	filter: blur(4px);
}
</style>
