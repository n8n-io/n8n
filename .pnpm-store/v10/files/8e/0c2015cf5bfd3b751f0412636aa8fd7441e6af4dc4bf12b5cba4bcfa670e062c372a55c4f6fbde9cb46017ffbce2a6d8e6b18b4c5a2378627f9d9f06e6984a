var readInstalled = require("../read-installed.js")
var test = require("tap").test
var json = require("../package.json")
var path = require("path")
var known = [].concat(Object.keys(json.dependencies)
  , Object.keys(json.optionalDependencies)
  , Object.keys(json.devDependencies)).sort()

test("make sure that it works without dev deps", function (t) {
  readInstalled(path.join(__dirname, "../"), function (er, map) {
    t.notOk(er, "er should be bull")
    t.ok(map, "map should be data")
    if (er) return console.error(er.stack || er.message)
    var deps = Object.keys(map.dependencies).sort()
    t.equal(deps.length, known.length, "array lengths are equal")
    t.deepEqual(deps, known, "arrays should be equal")
    t.ok(map.dependencies.tap.extraneous, 'extraneous is set on devDep')
    t.end()
  })
})

