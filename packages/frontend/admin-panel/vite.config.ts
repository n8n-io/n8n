import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import icons from 'unplugin-icons/vite';

const packagesDir = resolve(__dirname, '..', '..');
const isProduction = process.env.NODE_ENV === 'production';

// SaaS 平台化：支持通过环境变量配置 CDN URL
const cdnUrl = process.env.VITE_ADMIN_CDN_URL;

export default defineConfig({
	plugins: [vue(), icons({ compiler: 'vue3' })],
	resolve: {
		alias: [
			{ find: '@', replacement: resolve(__dirname, './src') },
			{
				find: /^@n8n\/design-system(.+)$/,
				replacement: resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src$1'),
			},
		],
	},
	// SaaS 架构：支持 CDN 部署
	base: cdnUrl || '/admin/',
	server: {
		port: 5679,
		proxy: {
			'/rest': {
				target: process.env.VITE_API_BASE_URL || 'http://localhost:5678',
				changeOrigin: true,
			},
		},
	},
	build: {
		// SaaS 架构：统一输出到 ./dist，方便上传到 CDN
		outDir: './dist',
		emptyOutDir: true,
		cssMinify: isProduction,
		minify: isProduction ? 'esbuild' : false,
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
			},
			// 生产环境：添加文件名 hash，利于 CDN 缓存
			output: isProduction
				? {
						entryFileNames: 'assets/[name].[hash].js',
						chunkFileNames: 'assets/[name].[hash].js',
						assetFileNames: 'assets/[name].[hash].[ext]',
					}
				: undefined,
		},
	},
});
