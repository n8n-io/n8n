<script lang="ts" setup>
defineProps<{ id: string }>();
</script>

<template>
	<svg>
		<defs>
			<marker
				:id="id"
				viewBox="-10 -10 20 20"
				refX="0"
				refY="0"
				markerWidth="12.5"
				markerHeight="12.5"
				markerUnits="strokeWidth"
				orient="auto-start-reverse"
			>
				<polyline
					stroke-linecap="round"
					stroke-linejoin="round"
					points="-5,-4 0,0 -5,4 -5,-4"
					stroke-width="2"
					stroke="context-stroke"
					fill="context-stroke"
				/>
			</marker>
		</defs>
	</svg>
</template>
