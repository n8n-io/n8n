var readInstalled = require("../read-installed.js");
var test = require("tap").test;
var path = require("path");

test("Handle bad path", function (t) {
  readInstalled(path.join(__dirname, "../unknown"), {
    dev: true,
    log: console.error
  }, function (er, map) {
      t.notOk(er, "er should be null");
      t.ok(map, "map should be data");
      t.equal(Object.keys(map.dependencies).length, 0, "Dependencies should have no keys");
      if (er) return console.error(er.stack || er.message);
      t.end();
  });
});
