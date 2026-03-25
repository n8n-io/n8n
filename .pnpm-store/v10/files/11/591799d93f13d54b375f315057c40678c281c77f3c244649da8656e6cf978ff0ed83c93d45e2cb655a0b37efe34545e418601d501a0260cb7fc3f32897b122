var results = require("../lib/parsing-results");

exports.errorIsThrownIfCreatingFailureWithoutAnyErrors = function(test) {
    test.throws(function() {
        results.failure([]);
    });
    test.done();
};
