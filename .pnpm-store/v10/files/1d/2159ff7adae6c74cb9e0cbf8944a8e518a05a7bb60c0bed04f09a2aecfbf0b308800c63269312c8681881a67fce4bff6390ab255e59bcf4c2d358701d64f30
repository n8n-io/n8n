var tape = require("tape");

var EventEmitter = require("..");

tape.test("eventemitter", function(test) {

    var ee = new EventEmitter();
    var fn;
    var ctx = {};

    test.doesNotThrow(function() {
        ee.emit("a", 1);
        ee.off();
        ee.off("a");
        ee.off("a", function() {});
    }, "should not throw if no listeners are registered");
    
    test.equal(ee.on("a", function(arg1) {
        test.equal(this, ctx, "should be called with this = ctx");
        test.equal(arg1, 1, "should be called with arg1 = 1");
    }, ctx), ee, "should return itself when registering events");
    ee.emit("a", 1);

    ee.off("a");
    test.same(ee._listeners, { a: [] }, "should remove all listeners of the respective event when calling off(evt)");

    ee.off();
    test.same(ee._listeners, {}, "should remove all listeners when just calling off()");

    ee.on("a", fn = function(arg1) {
        test.equal(this, ctx, "should be called with this = ctx");
        test.equal(arg1, 1, "should be called with arg1 = 1");
    }, ctx).emit("a", 1);

    ee.off("a", fn);
    test.same(ee._listeners, { a: [] }, "should remove the exact listener when calling off(evt, fn)");

    ee.on("a", function() {
        test.equal(this, ee, "should be called with this = ee");
    }).emit("a");

    test.doesNotThrow(function() {
        ee.off("a", fn);
    }, "should not throw if no such listener is found");

    test.end();
});
