var readInstalled = require("../read-installed.js")
var test = require("tap").test
var json = require("../package.json")
var path = require("path")
var known = [].concat(Object.keys(json.dependencies)
  , Object.keys(json.optionalDependencies)
  , Object.keys(json.devDependencies)).sort()

test("make sure that it works with depth=1", function (t) {
  readInstalled(path.join(__dirname, "../"), {
    depth: 1
  }, function (er, map) {
    t.notOk(er, "er should be bull")
    t.ok(map, "map should be data")
    if (er) return console.error(er.stack || er.message)
    var subdeps = Object.keys(map.dependencies).reduce(function(acc, dep) {
      acc += Object.keys(map.dependencies[dep].dependencies).length;
      return acc;
    }, 0);
    t.notEqual(subdeps, 0, "there should some sub dependencies")
    t.end()
  })
})
