const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const package = require('./package');

module.exports = {
  entry: {
    'indefinite': require.resolve(`./${package.main}`),
    'indefinite.min': require.resolve(`./${package.main}`)
  },
  output: {
    library: 'indefinite',
    libraryTarget: 'umd',
    path: `${__dirname}/dist`,
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /lib.*\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        test: /\.min\.js$/
      })
    ]
  }
};
