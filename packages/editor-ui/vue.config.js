const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
	chainWebpack: config => {
		config.resolve.symlinks(false);
		// config.plugins.delete("prefetch"); // enable when language package grows
	},
	// transpileDependencies: [
	//   // 'node_modules/quill'
	//   /\/node_modules\/quill\//
	// ]
	pluginOptions: {
		webpackBundleAnalyzer: {
			openAnalyzer: false,
		},
		i18n: {
			locale: "en",
			fallbackLocale: "en",
			localeDir: "./src/i18n/locales",
			enableInSFC: false,
		},
	},
	configureWebpack: {
		devServer: {
			disableHostCheck: true,
		},
		plugins: [
			new MonacoWebpackPlugin({ languages: ['javascript', 'json', 'typescript'] }),
		],
		resolve: {
			alias: {
				'element-ui/packages/button': path.resolve(__dirname, '..', 'design-system/src/components/N8nButton/overrides/ElButton.vue'),
				'element-ui/lib/button': path.resolve(__dirname, '..', 'design-system/src/components/N8nButton/overrides/ElButton.vue'),
			},
		},
	},
	css: {
		loaderOptions: {
			sass: {
				prependData: `
					@import "@/n8n-theme-variables.scss";
				`,
			},
		},
	},
	publicPath: process.env.VUE_APP_PUBLIC_PATH ? process.env.VUE_APP_PUBLIC_PATH : '/',
};
