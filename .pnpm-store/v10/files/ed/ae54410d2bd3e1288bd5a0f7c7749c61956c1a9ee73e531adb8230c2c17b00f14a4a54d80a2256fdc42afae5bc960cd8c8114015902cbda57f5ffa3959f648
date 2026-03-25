const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
// const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

// webpack 配置
let webpackConfig = {
  entry: {
    index: './src/index.js',
  },
  output: {
    path: path.resolve(__dirname, `./build`), // 输出路径
    filename: '[name].js', // js 文件路径
    library: 'ISO6391',
    libraryTarget: 'umd'
  },
  devtool: 'cheap-source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: require('os').tmpdir(),
            presets: ['es2015', 'stage-0'],
            plugins: ['add-module-exports', 'transform-runtime'],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.NamedModulesPlugin(),
    new CleanWebpackPlugin(['./build']),
    // new UglifyJSPlugin()
  ],
};

module.exports = webpackConfig;
