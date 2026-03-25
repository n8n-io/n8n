var tape = require("tape");

var asPromise = require("..");

tape.test("aspromise", function(test) {

    test.test(this.name + " - resolve", function(test) {

        function fn(arg1, arg2, callback) {
            test.equal(this, ctx, "function should be called with this = ctx");
            test.equal(arg1, 1, "function should be called with arg1 = 1");
            test.equal(arg2, 2, "function should be called with arg2 = 2");
            callback(null, arg2);
        }

        var ctx = {};

        var promise = asPromise(fn, ctx, 1, 2);
        promise.then(function(arg2) {
            test.equal(arg2, 2, "promise should be resolved with arg2 = 2");
            test.end();
        }).catch(function(err) {
            test.fail("promise should not be rejected (" + err + ")");
        });
    });

    test.test(this.name + " - reject", function(test) {

        function fn(arg1, arg2, callback) {
            test.equal(this, ctx, "function should be called with this = ctx");
            test.equal(arg1, 1, "function should be called with arg1 = 1");
            test.equal(arg2, 2, "function should be called with arg2 = 2");
            callback(arg1);
        }

        var ctx = {};

        var promise = asPromise(fn, ctx, 1, 2);
        promise.then(function() {
            test.fail("promise should not be resolved");
        }).catch(function(err) {
            test.equal(err, 1, "promise should be rejected with err = 1");
            test.end();
        });
    });

    test.test(this.name + " - resolve twice", function(test) {

        function fn(arg1, arg2, callback) {
            test.equal(this, ctx, "function should be called with this = ctx");
            test.equal(arg1, 1, "function should be called with arg1 = 1");
            test.equal(arg2, 2, "function should be called with arg2 = 2");
            callback(null, arg2);
            callback(null, arg1);
        }

        var ctx = {};
        var count = 0;

        var promise = asPromise(fn, ctx, 1, 2);
        promise.then(function(arg2) {
            test.equal(arg2, 2, "promise should be resolved with arg2 = 2");
            if (++count > 1)
                test.fail("promise should not be resolved twice");
            test.end();
        }).catch(function(err) {
            test.fail("promise should not be rejected (" + err + ")");
        });
    });

    test.test(this.name + " - reject twice", function(test) {

        function fn(arg1, arg2, callback) {
            test.equal(this, ctx, "function should be called with this = ctx");
            test.equal(arg1, 1, "function should be called with arg1 = 1");
            test.equal(arg2, 2, "function should be called with arg2 = 2");
            callback(arg1);
            callback(arg2);
        }

        var ctx = {};
        var count = 0;

        var promise = asPromise(fn, ctx, 1, 2);
        promise.then(function() {
            test.fail("promise should not be resolved");
        }).catch(function(err) {
            test.equal(err, 1, "promise should be rejected with err = 1");
            if (++count > 1)
                test.fail("promise should not be rejected twice");
            test.end();
        });
    });

    test.test(this.name + " - reject error", function(test) {

        function fn(callback) {
            test.ok(arguments.length === 1 && typeof callback === "function", "function should be called with just a callback");
            throw 3;
        }

        var promise = asPromise(fn, null);
        promise.then(function() {
            test.fail("promise should not be resolved");
        }).catch(function(err) {
            test.equal(err, 3, "promise should be rejected with err = 3");
            test.end();
        });
    });

    test.test(this.name + " - reject and error", function(test) {

        function fn(callback) {
            callback(3);
            throw 4;
        }

        var count = 0;

        var promise = asPromise(fn, null);
        promise.then(function() {
            test.fail("promise should not be resolved");
        }).catch(function(err) {
            test.equal(err, 3, "promise should be rejected with err = 3");
            if (++count > 1)
                test.fail("promise should not be rejected twice");
            test.end();
        });
    });
});
