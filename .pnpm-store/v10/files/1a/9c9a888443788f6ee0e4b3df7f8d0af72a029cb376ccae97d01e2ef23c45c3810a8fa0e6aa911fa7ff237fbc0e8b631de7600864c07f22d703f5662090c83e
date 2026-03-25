var tape = require("tape");

var fetch = require("..");

tape.test("fetch", function(test) {

    if (typeof Promise !== "undefined") {
        var promise = fetch("NOTFOUND");
        promise.catch(function() {});
        test.ok(promise instanceof Promise, "should return a promise if callback has been omitted");
    }

    // TODO - some way to test this properly?
    
    test.end();
});
