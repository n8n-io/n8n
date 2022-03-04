const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const webpack = require('webpack');

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
			new webpack.NormalModuleReplacementPlugin(/element-ui[\/\\]lib[\/\\]locale[\/\\]lang[\/\\]zh-CN/, 'element-ui/lib/locale/lang/en'),
		],
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
