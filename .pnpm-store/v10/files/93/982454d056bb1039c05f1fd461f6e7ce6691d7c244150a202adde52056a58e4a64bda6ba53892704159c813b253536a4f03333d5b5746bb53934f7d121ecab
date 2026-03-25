var readInstalled = require("../read-installed.js")
var test = require("tap").test
var path = require("path")

test("extraneous detected", function(t) {
  // This test verifies read-installed#16
  readInstalled(
    path.join(__dirname, "fixtures/extraneous-dev-dep"),
    {
      log: console.error,
      dev: true
    },
    function (err, map) {
      t.ifError(err, "read-installed made it")

      t.notOk(map.dependencies.d.extraneous, "d is not extraneous, it's required by root")
      t.ok(map.dependencies.x.extraneous, "x is extraneous, it's only a dev dep of d")
      t.end()
    })
})
