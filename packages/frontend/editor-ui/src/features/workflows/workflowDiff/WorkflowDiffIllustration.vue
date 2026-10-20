<template>
	<svg viewBox="0 0 400 160" fill="none" aria-hidden="true" focusable="false">
		<!-- Neutral shapes indicate a placeholder, not changes to the user's workflow. -->
		<g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M144 80H254M247 75L254 80L247 85" />
			<rect x="64" y="44" width="72" height="72" rx="18" :class="$style.node" />
			<rect x="264" y="44" width="72" height="72" rx="12" :class="$style.node" />
			<circle cx="140" cy="80" r="4" :class="$style.node" />
			<rect x="256" y="76" width="8" height="8" rx="2" :class="$style.node" />
			<path d="M104 61L88 83H99L96 99L113 76H102L104 61Z" />
			<path d="M292 70L282 80L292 90M308 70L318 80L308 90M303 67L297 93" />
		</g>
	</svg>
</template>

<style module lang="scss">
.node {
	fill: var(--canvas-node--color--background, var(--node--color--background));
}
</style>
