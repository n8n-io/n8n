var test = require("tap").test
var mkdirp = require("mkdirp")
var rimraf = require("rimraf")
var fs = require("fs")
var path = require("path")
var readInstalled = require("../read-installed.js")

var parent = {
  name: "parent",
  version: "1.2.3",
  dependencies: {},
  devDependencies: {
    "child1":"*"
  },
  readme:"."
}

var child1 = {
  name: "child1",
  version: "1.2.3",
  peerDependencies: {
    child2: "*"
  },
  readme:"."
}

var child2 = {
  name: "child2",
  version: "1.2.3",
  peerDependencies: {
    child1: "*"
  },
  readme:"."
}


var root = path.resolve(__dirname, "cyclic-extraneous-peer-deps")
var parentjson = path.resolve(root, "package.json")
var child1root = path.resolve(root, "node_modules/child1")
var child1json = path.resolve(child1root, "package.json")
var child2root = path.resolve(root, "node_modules/child2")
var child2json = path.resolve(child2root, "package.json")

test("setup", function (t) {
  rimraf.sync(root)
  mkdirp.sync(child1root)
  mkdirp.sync(child2root)
  fs.writeFileSync(parentjson, JSON.stringify(parent, null, 2) + "\n", "utf8")
  fs.writeFileSync(child1json, JSON.stringify(child1, null, 2) + "\n", "utf8")
  fs.writeFileSync(child2json, JSON.stringify(child2, null, 2) + "\n", "utf8")
  t.pass("setup done")
  t.end()
})

test("dev mode", function (t) {
  // peer dev deps should both be not extraneous.
  readInstalled(root, { dev: true }, function (er, data) {
    if (er)
      throw er
    t.notOk(data.dependencies.child1.extraneous, "c1 not extra")
    t.notOk(data.dependencies.child2.extraneous, "c2 not extra")
    t.end()
  })
})

test("prod mode", function (t) {
  readInstalled(root, { dev: false }, function (er, data) {
    if (er)
      throw er
    t.ok(data.dependencies.child1.extraneous, "c1 extra")
    t.ok(data.dependencies.child2.extraneous, "c2 extra")
    t.end()
  })
})


test("cleanup", function (t) {
  rimraf.sync(root)
  t.pass("cleanup done")
  t.end()
})
