#!/usr/bin/env coffee

fs         = require('fs')
path       = require('path')
uglify     = require('uglify-js')
browserify = require('browserify')

BANNER = '''
/**
 * @fileoverview Text diff library ported from Python's difflib module. 
 *     https://github.com/qiao/difflib.js
 */

'''

build = (dest) ->
  bify = browserify()
  bify.add(__dirname + '/../lib/difflib.js')
  bify.bundle((err, payload) -> 
    browserified = payload.toString('utf8')
    namespaced   = 'var difflib = (function() {' + browserified + 'return require("/difflib");})();'
    uglified     = uglify.minify(namespaced).code
    bannered     = BANNER + uglified
    fs.writeFileSync(dest, bannered)
  )
  
build(__dirname + '/../dist/difflib-browser.js')
