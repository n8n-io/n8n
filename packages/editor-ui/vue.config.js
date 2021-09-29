module.exports = {
	chainWebpack: config => {
		config.devServer.disableHostCheck(true);
		// config.entry('app')
		// 	.add('./src/main.ts')
		// 	.end()
		// .output
		// .filename('js/[name].[contenthash].js');
		// config.entry('iframe')
		// 	.add('./src/expressions-iframe.ts')
		// .end()
		// .output
		// .filename('js/[name].[hash].js');
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
		// entry: {
		// 	app: './src/main.ts',
		// 	'expressions-iframe': './src/expressions-iframe.ts',
		// },
		// module: {
		// 	rules: [{
		// 		test: require.resolve('./src/expressions-iframe.ts'),
		// 		use:
		// 		'exports-loader?type=commonjs&exports=potato',
		// 	}]
		// }
	},
	pages: {
		'index': {
			template: './public/index.html',
			entry: `./src/main.ts`,
		},
		'expressions-iframe': {
			template: './public/expressions-iframe.html',
			entry: `./src/expressions-iframe.ts`,
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
