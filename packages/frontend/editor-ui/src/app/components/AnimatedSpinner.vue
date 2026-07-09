<template>
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
		<g>
			<path d="M7 0L7 3" stroke="currentColor" stroke-width="2" class="line one" />
			<path
				d="M11.9497 2.05031L9.82837 4.17163"
				stroke="currentColor"
				stroke-width="2"
				class="line two"
			/>
			<path d="M14 7L11 7" stroke="currentColor" stroke-width="2" class="line three" />
			<path
				d="M11.9497 11.9497L9.82839 9.82839"
				stroke="currentColor"
				stroke-width="2"
				class="line four"
			/>
			<path d="M7 14L7 11" stroke="currentColor" stroke-width="2" class="line five" />
			<path d="M0 7L3 7" stroke="currentColor" stroke-width="2" class="line seven" />

			<path
				d="M2.05031 2.05031L4.17163 4.17163"
				stroke="currentColor"
				stroke-width="2"
				class="line eight"
			/>

			<path
				d="M2.05029 11.9497L4.17161 9.82839"
				stroke="currentColor"
				stroke-width="2"
				class="line six"
			/>
		</g>
	</svg>
</template>

<style scoped>
@keyframes fade {
	0% {
		opacity: 100;
	}
	20% {
		opacity: 0;
	}
	40% {
		opacity: 100;
	}
}

.line {
	animation: fade 1.6s infinite;
}

.one {
	animation-delay: 0s;
}

.two {
	animation-delay: 0.2s;
}

.three {
	animation-delay: 0.4s;
}

.four {
	animation-delay: 0.6s;
}

.five {
	animation-delay: 0.8s;
}

.six {
	animation-delay: 1s;
}

.seven {
	animation-delay: 1.2s;
}

.eight {
	animation-delay: 1.4s;
}
</style>
