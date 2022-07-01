const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const os = require("os");

module.exports = {
	chainWebpack: config => {
		config.resolve.symlinks(false);

		config
			.plugin('fork-ts-checker')
			.tap(args => {
				const totalMemory = Math.floor(os.totalmem() / (1024 * 1024)); // in MB
				if (totalMemory > 4096) {
					args[0].memoryLimit = 4096;
				}

				return args;
			});
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
