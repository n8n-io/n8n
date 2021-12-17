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
