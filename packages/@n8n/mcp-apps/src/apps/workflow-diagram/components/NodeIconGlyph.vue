<script setup lang="ts">
defineProps<{
	glyph: string;
	x: number;
	y: number;
	size: number;
	color?: string;
}>();
</script>

<template>
	<g
		class="node-icon-glyph"
		:transform="`translate(${x}, ${y}) scale(${size / 32})`"
		:style="{ color }"
	>
		<template v-if="glyph === 'clock' || glyph === 'schedule-trigger'">
			<g transform="translate(4 4)">
				<circle cx="12" cy="12" r="8.75" />
				<path d="M12 6v6l-3.5 2" />
			</g>
		</template>

		<template v-else-if="glyph === 'form-trigger'">
			<g transform="translate(4 4)">
				<path
					d="M7.75 4.75H6.25C5.42157 4.75 4.75 5.42157 4.75 6.25V18.75C4.75 19.5784 5.42157 20.25 6.25 20.25H17.75C18.5784 20.25 19.25 19.5784 19.25 18.75V6.25C19.25 5.42157 18.5784 4.75 17.75 4.75H16.25"
				/>
				<path
					d="M14.25 3.75H13.5V4.5H14.25V3.75ZM16.25 5.25H17H16.25ZM16.25 7.25V8H17V7.25H16.25ZM7.75 7.25H7V8H7.75V7.25ZM9.25 3.75V3V3V3.75ZM9.75 3.75V4.5H10.5V3.75H9.75ZM12.75 1.75V2.5C13.1642 2.5 13.5 2.83579 13.5 3.25H14.25H15C15 2.00736 13.9926 1 12.75 1V1.75ZM14.25 3.25H13.5V3.75H14.25H15V3.25H14.25ZM14.25 3.75V4.5H14.75V3.75V3H14.25V3.75ZM14.75 3.75V4.5C15.1642 4.5 15.5 4.83579 15.5 5.25H16.25H17C17 4.00736 15.9926 3 14.75 3V3.75ZM16.25 5.25H15.5V7.25H16.25H17V5.25H16.25ZM16.25 7.25V6.5H7.75V7.25V8H16.25V7.25ZM7.75 7.25H8.5V5.25H7.75H7V7.25H7.75ZM7.75 5.25H8.5C8.5 4.83579 8.83579 4.5 9.25 4.5V3.75V3C8.00736 3 7 4.00736 7 5.25H7.75ZM9.25 3.75V4.5H9.75V3.75V3H9.25V3.75ZM9.75 3.75H10.5V3.25H9.75H9V3.75H9.75ZM9.75 3.25H10.5C10.5 2.83579 10.8358 2.5 11.25 2.5V1.75V1C10.0074 1 9 2.00736 9 3.25H9.75ZM11.25 1.75V2.5H12.75V1.75V1H11.25V1.75Z"
					fill="currentColor"
					stroke="none"
				/>
				<path d="M8 11.75H16" />
				<path d="M8 14.75H16" />
			</g>
		</template>

		<template v-else-if="glyph === 'sort'">
			<g transform="translate(4 4)">
				<path d="M21.75 13.75L17.25 18.25L12.75 13.75" />
				<path d="M11.25 10.25L6.75 5.75L2.25 10.25" />
				<path d="M17.25 5V18.25" />
				<path d="M6.75 19V5.75" />
			</g>
		</template>

		<template v-else-if="glyph === 'edit' || glyph === 'edit-fields'">
			<g transform="translate(4 4)">
				<path
					d="M12.2676 4.34277L11.1113 5.5H5.75C5.33579 5.5 5 5.83579 5 6.25V18.25C5 18.6642 5.33579 19 5.75 19H17.75C18.1642 19 18.5 18.6642 18.5 18.25V12.8887L19.6562 11.7324H20V18.25C20 19.4926 18.9926 20.5 17.75 20.5H5.75C4.50736 20.5 3.5 19.4926 3.5 18.25V6.25C3.5 5.00736 4.50736 4 5.75 4H12.2676V4.34277Z"
					fill="currentColor"
					stroke="none"
				/>
				<path
					d="M17.1893 3.31066C17.7751 2.72487 18.7249 2.72487 19.3107 3.31066L20.6893 4.68934C21.2751 5.27513 21.2751 6.22487 20.6893 6.81066L12.6893 14.8107C12.408 15.092 12.0265 15.25 11.6287 15.25H8.75V12.3713C8.75 11.9735 8.90804 11.592 9.18934 11.3107L17.1893 3.31066Z"
				/>
				<path d="M15.75 4.75l3.5 3.5" />
			</g>
		</template>

		<template v-else-if="glyph === 'aggregate'">
			<g transform="translate(4 4)">
				<path
					d="M4 4.75h6.4789c1.0926 0 2.0989.59407 2.6267 1.55077l2.2888 4.14868C15.9222 11.4059 16.9285 12 18.0211 12H21"
				/>
				<path
					d="M4 19.25h6.4789c1.0926 0 2.0989-.5941 2.6267-1.5508l2.2888-4.1484C15.9222 12.5941 16.9285 12 18.0211 12H21"
				/>
				<path d="M11 9.75H4" />
				<path d="M11 14.25H4" />
			</g>
		</template>

		<template v-else-if="glyph === 'extract' || glyph === 'information-extractor'">
			<g transform="translate(4 4)">
				<path
					d="M19.25 13V5.25c0-.82843-.6716-1.5-1.5-1.5H9.87132c-.39782 0-.77936.15804-1.06066.43934L5.18934 7.81066C4.90803 8.09197 4.75 8.4735 4.75 8.87132V13M19.25 16.25v2.5c0 .8284-.6716 1.5-1.5 1.5H6.25c-.82843 0-1.5-.6716-1.5-1.5v-2.5"
				/>
				<path d="M9.25 3.75v4.5h-4.5" />
				<path d="M2 16.25h20" />
			</g>
		</template>

		<template v-else-if="glyph === 'parser' || glyph === 'structured-output-parser'">
			<g transform="translate(4 4)">
				<path
					d="M9 3.75H6.25c-.82843 0-1.5.67157-1.5 1.5v4.12868c0 .39782-.15803.77932-.43934 1.06062L2.75 12l1.56066 1.5607c.2813.2813.43934.6628.43934 1.0606v4.1287c0 .8284.67157 1.5 1.5 1.5H9"
				/>
				<path
					d="M15 3.75h2.75c.8284 0 1.5.67157 1.5 1.5v4.12868c0 .39782.158.77932.4393 1.06062L21.25 12l-1.5607 1.5607c-.2813.2813-.4393.6628-.4393 1.0606v4.1287c0 .8284-.6716 1.5-1.5 1.5H15"
				/>
				<path d="m7.75 11.75 3 3 5.5-5.5" />
			</g>
		</template>

		<template v-else-if="glyph === 'basic-llm-chain'">
			<g transform="translate(4 4)">
				<path
					d="M7.75 5.75h9.5c1.6569 0 3 1.34315 3 3s-1.3431 3-3 3H7C5.20507 11.75 3.75 13.2051 3.75 15S5.20507 18.25 7 18.25h13.5"
				/>
				<circle cx="5.75" cy="5.75" r="2" />
				<path d="m17 21.75 3.5-3.5-3.5-3.5" />
			</g>
		</template>

		<template v-else-if="glyph === 'ai' || glyph === 'ai-agent'">
			<g transform="translate(4 4)">
				<path
					d="M3.75 10c0-2.89949 2.35051-5.25 5.25-5.25h6c2.8995 0 5.25 2.35051 5.25 5.25s-2.3505 5.25-5.25 5.25H9c-2.89949 0-5.25-2.3505-5.25-5.25Z"
				/>
				<rect x="6.75" y="7.75" width="10.5" height="4.5" rx="2.25" />
				<path
					d="M21.25 21v-.5c0-2.8995-2.3505-5.25-5.25-5.25H8c-2.89949 0-5.25 2.3505-5.25 5.25v.5"
				/>
				<path d="M12 1v3.75" />
			</g>
		</template>

		<template v-else-if="glyph === 'code'">
			<g transform="translate(4 4)">
				<path
					d="M9 3.75H6.25c-.82843 0-1.5.67157-1.5 1.5v4.12868c0 .39782-.15803.77932-.43934 1.06062L2.75 12l1.56066 1.5607c.2813.2813.43934.6628.43934 1.0606v4.1287c0 .8284.67157 1.5 1.5 1.5H9"
				/>
				<path
					d="M15 3.75h2.75c.8284 0 1.5.67157 1.5 1.5v4.12868c0 .39782.158.77932.4393 1.06062L21.25 12l-1.5607 1.5607c-.2813.2813-.4393.6628-.4393 1.0606v4.1287c0 .8284-.6716 1.5-1.5 1.5H15"
				/>
			</g>
		</template>

		<template v-else-if="glyph === 'html'">
			<g transform="translate(4 4)">
				<path d="m17.25 16.5 4.5-4.5-4.5-4.5" />
				<path d="M7.25 16.5 2.75 12l4.5-4.5" />
				<path
					d="M10.7432 21H9.20605L13.2568 3H14.7939L10.7432 21Z"
					fill="currentColor"
					stroke="none"
				/>
			</g>
		</template>

		<template v-else-if="glyph === 'mail' || glyph === 'send-mail'">
			<g transform="translate(4 4)">
				<path
					d="M21.25 17.75c0 .8284-.6716 1.5-1.5 1.5H4.25c-.82843 0-1.5-.6716-1.5-1.5V6.25c0-.82843.67157-1.5 1.5-1.5h15.5c.8284 0 1.5.67157 1.5 1.5v11.5Z"
				/>
				<path d="m3 8 9 6 9-6" />
			</g>
		</template>

		<template v-else-if="glyph === 'database'">
			<ellipse cx="16" cy="9" rx="9" ry="4" />
			<path d="M7 9v14c0 2.2 4 4 9 4s9-1.8 9-4V9" />
			<path d="M7 16c0 2.2 4 4 9 4s9-1.8 9-4" />
		</template>

		<template v-else-if="glyph === 'globe'">
			<circle cx="16" cy="16" r="10" />
			<path d="M6 16h20" />
			<path d="M16 6c3 3 4 7 4 10s-1 7-4 10" />
			<path d="M16 6c-3 3-4 7-4 10s1 7 4 10" />
		</template>

		<template v-else>
			<rect x="8" y="8" width="16" height="16" rx="4" />
			<path d="M12 16h8" />
			<path d="M16 12v8" />
		</template>
	</g>
</template>
