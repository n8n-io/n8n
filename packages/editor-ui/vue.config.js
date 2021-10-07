module.exports = {
	chainWebpack: config => {
		config.devServer.disableHostCheck(true);
		config.resolve.symlinks(false);
		config.optimization.minimize(false);
	},
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
	pages: {
		'index': {
			template: './public/index.html',
			entry: `./src/main.ts`,
		},
		'expressions': {
			template: './public/expressions.html',
			entry: `./src/expressions.ts`,
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
	outputDir: 'dist',
};
