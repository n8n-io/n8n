var assert = require("assert");

var JSZip = require("jszip");

var zipfile = require("../lib/zipfile");
var test = require("./test")(module);

test('file in zip can be read after being written', function() {
    return emptyZipFile().then(function(zip) {
        assert(!zip.exists("song/title"));

        zip.write("song/title", "Dark Blue");

        assert(zip.exists("song/title"));
        return zip.read("song/title", "utf8").then(function(contents) {
            assert.equal(contents, "Dark Blue");
        });
    });
});

function emptyZipFile() {
    var zip = new JSZip();
    return zip.generateAsync({type: "arraybuffer"}).then(function(arrayBuffer) {
        return zipfile.openArrayBuffer(arrayBuffer);
    });
}


test("splitPath splits zip paths on last forward slash", function() {
    assert.deepEqual(zipfile.splitPath("a/b"), {dirname: "a", basename: "b"});
    assert.deepEqual(zipfile.splitPath("a/b/c"), {dirname: "a/b", basename: "c"});
    assert.deepEqual(zipfile.splitPath("/a/b/c"), {dirname: "/a/b", basename: "c"});
});


test("when path has no forward slashes then splitPath returns empty dirname", function() {
    assert.deepEqual(zipfile.splitPath("name"), {dirname: "", basename: "name"});
});


test("joinPath joins arguments with forward slashes", function() {
    assert.equal(zipfile.joinPath("a", "b"), "a/b");
    assert.equal(zipfile.joinPath("a/b", "c"), "a/b/c");
    assert.equal(zipfile.joinPath("a", "b/c"), "a/b/c");
    assert.equal(zipfile.joinPath("/a/b", "c"), "/a/b/c");
});


test("empty parts are ignored when joining paths", function() {
    assert.equal(zipfile.joinPath("a", ""), "a");
    assert.equal(zipfile.joinPath("", "b"), "b");
    assert.equal(zipfile.joinPath("a", "", "b"), "a/b");
});


test("when joining paths then absolute paths ignore earlier paths", function() {
    assert.equal(zipfile.joinPath("a", "/b"), "/b");
    assert.equal(zipfile.joinPath("a", "/b", "c"), "/b/c");
    assert.equal(zipfile.joinPath("/a", "/b"), "/b");
    assert.equal(zipfile.joinPath("/a"), "/a");
});
