import fs from 'fs';
import webpack from 'webpack';

let nodeModules = fs.readdirSync('./node_modules')
    .filter((module) => {
        return module !== '.bin';
    })
    .reduce((prev, module) => {
        return Object.assign(prev, {[module]: 'commonjs ' + module});
    }, {});

export default {
    entry: ['./index.js'],
    output: {
        path: './dist',
        filename: 'index.js',
        library: 'electron-machine-id',
        libraryTarget: 'umd'
    },
    target: 'electron',
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel',
                query: {
                    cacheDirectory: true
                }
            },
            {
                test: /\.json$/,
                loader: 'json'
            }
        ]
    },
    plugins: [
        new webpack.IgnorePlugin(/node_modules/),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin({
            compress: { warnings: false },
            output: { comments: false },
        })
    ],
    node: {
        //do not include polyfills...
        //http://webpack.github.io/docs/configuration.html#node
        console: false,
        process: false,
        child_process: false,
        global: false,
        buffer: false,
        crypto: false,
        __filename: false,
        __dirname: false
    },
    externals: nodeModules
};
