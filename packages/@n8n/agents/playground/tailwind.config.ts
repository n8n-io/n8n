import type { Config } from 'tailwindcss';

export default {
	content: [
		'./components/**/*.{vue,ts}',
		'./layouts/**/*.{vue,ts}',
		'./pages/**/*.{vue,ts}',
		'./app.vue',
	],
	theme: { extend: {} },
	plugins: [require('@tailwindcss/typography')],
} satisfies Config;
