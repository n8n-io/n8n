
module.exports.__defineGetter__('parse', function() {
	return require('./lib/parse').parse
})

module.exports.__defineGetter__('stringify', function() {
	return require('./lib/stringify').stringify
})

module.exports.__defineGetter__('tokenize', function() {
	return require('./lib/parse').tokenize
})

module.exports.__defineGetter__('update', function() {
	return require('./lib/document').update
})

module.exports.__defineGetter__('analyze', function() {
	return require('./lib/analyze').analyze
})

module.exports.__defineGetter__('utils', function() {
	return require('./lib/utils')
})

/**package
{ "name": "jju",
  "version": "0.0.0",
  "dependencies": {"js-yaml": "*"},
  "scripts": {"postinstall": "js-yaml package.yaml > package.json ; npm install"}
}
**/
