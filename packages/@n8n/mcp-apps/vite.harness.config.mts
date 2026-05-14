import { defineConfig } from 'vite';

export default defineConfig({
	root: __dirname,
	server: {
		host: '127.0.0.1',
		port: 4174,
		strictPort: false,
	},
});
