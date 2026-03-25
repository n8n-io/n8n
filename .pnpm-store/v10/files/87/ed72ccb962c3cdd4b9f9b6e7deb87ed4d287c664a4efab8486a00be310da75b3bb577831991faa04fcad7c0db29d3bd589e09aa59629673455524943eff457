var assert = require("assert");

var _ = require("underscore");

var optionsReader = require("../lib/options-reader");
var standardOptions = optionsReader._standardOptions;
var readOptions = optionsReader.readOptions;
var test = require("./test")(module);


test('standard options are used if options is undefined', function() {
    var options = readOptions(undefined);
    assert.deepEqual(standardOptions, _.omit(options, "customStyleMap", "readStyleMap"));
    assert.deepEqual(options.customStyleMap, []);
});

test('standard options are used if options is empty', function() {
    var options = readOptions({});
    assert.deepEqual(standardOptions, _.omit(options, "customStyleMap", "readStyleMap"));
    assert.deepEqual(options.customStyleMap, []);
});

test('custom style map as string is prepended to standard style map', function() {
    var options = readOptions({
        styleMap: "p.SectionTitle => h2"
    });
    var styleMap = options.readStyleMap();
    assert.deepEqual("p.SectionTitle => h2", styleMap[0]);
    assert.deepEqual(optionsReader._defaultStyleMap, styleMap.slice(1));
});

test('custom style map as array is prepended to standard style map', function() {
    var options = readOptions({
        styleMap: ["p.SectionTitle => h2"]
    });
    var styleMap = options.readStyleMap();
    assert.deepEqual("p.SectionTitle => h2", styleMap[0]);
    assert.deepEqual(optionsReader._defaultStyleMap, styleMap.slice(1));
});

test('lines starting with # in custom style map are ignored', function() {
    var options = readOptions({
        styleMap: "# p.SectionTitle => h3\np.SectionTitle => h2"
    });
    var styleMap = options.readStyleMap();
    assert.deepEqual("p.SectionTitle => h2", styleMap[0]);
    assert.deepEqual(optionsReader._defaultStyleMap, styleMap.slice(1));
});

test('blank lines in custom style map are ignored', function() {
    var options = readOptions({
        styleMap: "\n\n"
    });
    assert.deepEqual(optionsReader._defaultStyleMap, options.readStyleMap());
});

test('default style mappings are ignored if includeDefaultStyleMap is false', function() {
    var options = readOptions({
        styleMap: "p.SectionTitle => h2",
        includeDefaultStyleMap: false
    });
    assert.deepEqual(["p.SectionTitle => h2"], options.readStyleMap());
});
