export default defineNuxtConfig({
	app: {
		head: {
			title: '@n8n/agents Playground',
		},
	},
	modules: ['@nuxtjs/tailwindcss'],
	ssr: false,
	devtools: { enabled: false },
	typescript: { strict: true },
	vite: {
		optimizeDeps: {
			include: ['monaco-editor'],
		},
	},
});
