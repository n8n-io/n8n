const GoogleFontsPlugin = require('@beyonk/google-fonts-webpack-plugin');

module.exports = {
	chainWebpack: config => config.resolve.symlinks(false),
	// transpileDependencies: [
	//   // 'node_modules/quill'
	//   /\/node_modules\/quill\//
	// ]
	pluginOptions: {
		webpackBundleAnalyzer: {
			openAnalyzer: false,
		},
	},
	configureWebpack: {
		plugins: [
			new GoogleFontsPlugin({
				apiUrl: 'https://n8n-google-fonts-helper.herokuapp.com/api/fonts',
				fonts: [
					{ family: 'Open Sans', variants: ['300', '400', '600', '700'] },
				],
			}),
		],
		devServer: {
			disableHostCheck: true,
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
