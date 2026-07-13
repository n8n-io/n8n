<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { Component } from 'vue';
import { N8nIcon } from '@n8n/design-system';

import ClaudeIcon from '../assets/client-icons/claude.svg?component';
import CursorIcon from '../assets/client-icons/cursor.svg?component';
import OpenAiIcon from '../assets/client-icons/openai.svg?component';
import VsCodeIcon from '../assets/client-icons/vscode.svg?component';

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
</script>

<template>
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
</template>

<style lang="scss" module>
.iconCardContainer {
	display: flex;
	justify-content: center;
	align-items: center;
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
