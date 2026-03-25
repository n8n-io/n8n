var assert = require("assert");
var child_process = require("child_process"); // eslint-disable-line camelcase
var path = require("path");
var fs = require("fs");

var temp = require('temp').track();

var promises = require("../lib/promises");
var test = require("./test")(module);
var testPath = require("./testing").testPath;

test("HTML is printed to stdout if output file is not set", function() {
    return runMammoth(testPath("single-paragraph.docx")).then(function(result) {
        assert.equal(result.stderrOutput, "");
        assert.equal(result.output, "<p>Walking on imported air</p>");
    });
});

test("HTML is written to file if output file is set", function() {
    return createTempDir().then(function(tempDir) {
        var outputPath = path.join(tempDir, "output.html");
        return runMammoth(testPath("single-paragraph.docx"), outputPath).then(function(result) {
            assert.equal(result.stderrOutput, "");
            assert.equal(result.output, "");
            assert.equal(fs.readFileSync(outputPath, "utf8"), "<p>Walking on imported air</p>");
        });
    });
});

var imageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAOvgAADr4B6kKxwAAAABNJREFUKFNj/M+ADzDhlWUYqdIAQSwBE8U+X40AAAAASUVORK5CYII=";

test("inline images are included in output if writing to single file", function() {
    return runMammoth(testPath("tiny-picture.docx")).then(function(result) {
        assert.equal(result.stderrOutput, "");
        assert.equal(result.output, '<p><img src="data:image/png;base64,' + imageBase64 + '" /></p>');
    });
});

test("images are written to separate files if output dir is set", function() {
    return createTempDir().then(function(tempDir) {
        var outputPath = path.join(tempDir, "tiny-picture.html");
        var imagePath = path.join(tempDir, "1.png");
        return runMammoth(testPath("tiny-picture.docx"), "--output-dir", tempDir).then(function(result) {
            assert.equal(result.stderrOutput, "");
            assert.equal(result.output, "");
            assert.equal(fs.readFileSync(outputPath, "utf8"), '<p><img src="1.png" /></p>');
            assert.equal(fs.readFileSync(imagePath, "base64"), imageBase64);
        });
    });
});

test("style map is used if set", function() {
    return createTempDir().then(function(tempDir) {
        var styleMapPath = path.join(tempDir, "style-map");
        fs.writeFileSync(styleMapPath, "p => span:fresh");
        return runMammoth(testPath("single-paragraph.docx"), "--style-map", styleMapPath).then(function(result) {
            assert.equal(result.stderrOutput, "");
            assert.equal(result.output, "<span>Walking on imported air</span>");
        });
    });
});

test("--output-format=markdown option generate markdown output", function() {
    return runMammoth(testPath("single-paragraph.docx"), "--output-format=markdown").then(function(result) {
        assert.equal(result.stderrOutput, "");
        assert.equal(result.output, "Walking on imported air\n\n");
    });
});


function runMammoth() {
    var args = Array.prototype.slice.call(arguments, 0);
    var deferred = promises.defer();
    
    var processArgs = ["node", "bin/mammoth"].concat(args);
    // TODO: proper escaping of args
    var command = processArgs.join(" ");
    child_process.exec(command, function(error, stdout, stderr) { // eslint-disable-line camelcase
        console.log(stderr); // eslint-disable-line no-console
        assert.equal(error, null);
        deferred.resolve({output: stdout, stderrOutput: stderr});
    });
    
    return deferred.promise;
}

function createTempDir() {
    return promises.nfcall(temp.mkdir, null);
}
