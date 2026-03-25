var console = require("../index")
var test = require("tape")

if (typeof window !== "undefined" && !window.JSON) {
    window.JSON = require("jsonify")
}

test("console has expected methods", function (assert) {
    assert.ok(console.log)
    assert.ok(console.info)
    assert.ok(console.warn)
    assert.ok(console.dir)
    assert.ok(console.time, "time")
    assert.ok(console.timeEnd, "timeEnd")
    assert.ok(console.trace, "trace")
    assert.ok(console.assert)

    assert.end()
})

test("invoke console.log", function (assert) {
    console.log("test-log")

    assert.end()
})

test("invoke console.info", function (assert) {
    console.info("test-info")

    assert.end()
})

test("invoke console.warn", function (assert) {
    console.warn("test-warn")
    
    assert.end()
})

test("invoke console.time", function (assert) {
    console.time("label")

    assert.end()
})

test("invoke console.trace", function (assert) {
    console.trace("test-trace")

    assert.end()
})

test("invoke console.assert", function (assert) {
    console.assert(true)

    assert.end()
})

test("invoke console.dir", function (assert) {
    console.dir("test-dir")

    assert.end()
})

test("invoke console.timeEnd", function (assert) {
    console.timeEnd("label")

    assert.end()
})
