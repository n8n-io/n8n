{
  "name": "d3-ease",
  "version": "3.0.1",
  "description": "Easing functions for smooth animation.",
  "homepage": "https://d3js.org/d3-ease/",
  "repository": {
    "type": "git",
    "url": "https://github.com/d3/d3-ease.git"
  },
  "keywords": [
    "d3",
    "d3-module",
    "ease",
    "easing",
    "animation",
    "transition"
  ],
  "license": "BSD-3-Clause",
  "author": {
    "name": "Mike Bostock",
    "url": "http://bost.ocks.org/mike"
  },
  "type": "module",
  "files": [
    "dist/**/*.js",
    "src/**/*.js"
  ],
  "module": "src/index.js",
  "main": "src/index.js",
  "jsdelivr": "dist/d3-ease.min.js",
  "unpkg": "dist/d3-ease.min.js",
  "exports": {
    "umd": "./dist/d3-ease.min.js",
    "default": "./src/index.js"
  },
  "sideEffects": false,
  "devDependencies": {
    "eslint": "7",
    "mocha": "8",
    "rollup": "2",
    "rollup-plugin-terser": "7"
  },
  "scripts": {
    "test": "mocha 'test/**/*-test.js' && eslint src test",
    "prepublishOnly": "rm -rf dist && yarn test && rollup -c",
    "postpublish": "git push && git push --tags && cd ../d3.github.com && git pull && cp ../${npm_package_name}/dist/${npm_package_name}.js ${npm_package_name}.v${npm_package_version%%.*}.js && cp ../${npm_package_name}/dist/${npm_package_name}.min.js ${npm_package_name}.v${npm_package_version%%.*}.min.js && git add ${npm_package_name}.v${npm_package_version%%.*}.js ${npm_package_name}.v${npm_package_version%%.*}.min.js && git commit -m \"${npm_package_name} ${npm_package_version}\" && git push && cd -"
  },
  "engines": {
    "node": ">=12"
  }
}
