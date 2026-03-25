var options = require("..");

exports.noneIsAnOption = function(test) {
    test.equal(true, options.isOption(options.none));
    test.done();
};

exports.someIsAnOption = function(test) {
    test.equal(true, options.isOption(options.some(4)));
    test.done();
};

exports.nullIsNotAnOption = function(test) {
    test.equal(false, options.isOption(null));
    test.done();
};

exports.stringIsNotAnOption = function(test) {
    test.equal(false, options.isOption("surrender"));
    test.done();
};

exports["none.isNone() returns true"] = function(test) {
    test.equal(true, options.none.isNone());
    test.done();
};

exports["none.isSome() returns false"] = function(test) {
    test.equal(false, options.none.isSome());
    test.done();
};

exports["some(_).isNone() returns false"] = function(test) {
    test.equal(false, options.some(1).isNone());
    test.done();
};

exports["some(_).isSome() returns true"] = function(test) {
    test.equal(true, options.some(1).isSome());
    test.done();
};

exports.fromNullableConvertsNullToNone = function(test) {
    test.deepEqual(options.none, options.fromNullable(null));
    test.done();
};

exports.fromNullableConvertsUndefinedToNone = function(test) {
    test.deepEqual(options.none, options.fromNullable(undefined));
    test.done();
};

exports.fromNullableConvertsNumberToSome = function(test) {
    test.deepEqual(options.some(5), options.fromNullable(5));
    test.done();
};

exports.mappingOverNoneHasNoEffect = function(test) {
    test.equal(options.none, options.none.map(function() { return true }));
    test.done();
};

exports.mappingOverSomeAppliesFunctionToValue = function(test) {
    test.deepEqual(options.some(4), options.some(2).map(function(value) {
        return value * value; 
    }));
    test.done();
};

exports["none.flatMap(_) returns none"] = function(test) {
    test.deepEqual(options.none, options.none.flatMap(function(value) {
        return options.some("apple");
    }));
    test.done();
};


exports["when func(value) is none, then some(value).flatMap(func) returns none"] = function(test) {
    test.deepEqual(options.none, options.some(2).flatMap(function(value) {
        return options.none;
    }));
    test.done();
};


exports["when func(value) is some(result), then some(value).flatMap(func) returns some(result)"] = function(test) {
    test.deepEqual(options.some(4), options.some(2).flatMap(function(value) {
        return options.some(value * value);
    }));
    test.done();
};

exports.noneToArrayIsEmptyArray = function(test) {
    test.deepEqual([], options.none.toArray());
    test.done();
};

exports.someToArrayIsSingleElementArray = function(test) {
    test.deepEqual(["apple"], options.some("apple").toArray());
    test.done();
};

exports.noneValueOrElseCallsPassedValueIfItsAFunction = function(test) {
    test.deepEqual(4, options.none.valueOrElse(function() { return 4; }));
    test.done();
};

exports.noneValueOrElseReturnsArgumentIfItsNotAFunction = function(test) {
    test.deepEqual(4, options.none.valueOrElse(4));
    test.done();
};

exports.someValueOrElseReturnsWrappedValue = function(test) {
    test.deepEqual(1, options.some(1).valueOrElse(function() { return 4; }));
    test.done();
};

exports.noneOrElseReturnsArgumentIfItsNotAFunction = function(test) {
    test.deepEqual(options.some(4), options.none.orElse(options.some(4)));
    test.done();
};

exports.noneOrElseCallsArgumentIfItsAFunction = function(test) {
    test.deepEqual(options.some(4), options.none.orElse(function() { return options.some(4); }));
    test.done();
};

exports.someOrElseReturnsTheCurrentOption = function(test) {
    test.deepEqual(options.some(1), options.some(1).orElse(4));
    test.done();
};

exports.callingValueOnNoneRaisesError = function(test) {
    test.throws(function(){
        options.none.value();
    }, /Called value on none/);
    test.done();
};

exports.callingValueOnSomeReturnsValue = function(test) {
    test.deepEqual(4, options.some(4).value());
    test.done();
};

exports["none.filter returns none"] = function(test) {
    function equals3(x) {
        return x === 3;
    }

    test.deepEqual(options.none.filter(equals3), options.none);
    test.done();
};

exports["when predicate(value) is true, some(value).filter(predicate) returns some(value)"] = function(test) {
    var some3 = options.some(3);

    function equals3(x) {
        return x === 3;
    }

    test.deepEqual(some3.filter(equals3), some3);
    test.done();
};

exports["when predicate(value) is false, some(value).filter(predicate) returns none"] = function(test) {
    var some11 = options.some(11);

    function equals3(x) {
        return x === 3;
    }

    test.deepEqual(some11.filter(equals3), options.none);
    test.done();
};