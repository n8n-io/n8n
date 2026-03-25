// In Node.JS, `module` is a predefined object, which makes the QUnit `module` definitions fail
// unless we redefine it.
module = QUnit.module;

// When using node-qunit on the command line, the module is imported as is and we need to point at
// the XRegExp class inside the module. This does nothing in the browser, where XRegExp is already
// loaded in the global scope.
if (typeof XRegExp === "undefined" && typeof xregexp !== "undefined") {
    var XRegExp = xregexp.XRegExp;
}

//-------------------------------------------------------------------
module("API");
//-------------------------------------------------------------------

test("Basic availability", function () {
    ok(XRegExp, "XRegExp exists");
    ok(XRegExp.addToken, "XRegExp.addToken exists");
    ok(XRegExp.cache, "XRegExp.cache exists");
    ok(XRegExp.escape, "XRegExp.escape exists");
    ok(XRegExp.exec, "XRegExp.exec exists");
    ok(XRegExp.forEach, "XRegExp.forEach exists");
    ok(XRegExp.globalize, "XRegExp.globalize exists");
    ok(XRegExp.install, "XRegExp.install exists");
    ok(XRegExp.isInstalled, "XRegExp.isInstalled exists");
    ok(XRegExp.isRegExp, "XRegExp.isRegExp exists");
    ok(XRegExp.matchChain, "XRegExp.matchChain exists");
    ok(XRegExp.replace, "XRegExp.replace exists");
    ok(XRegExp.split, "XRegExp.split exists");
    ok(XRegExp.test, "XRegExp.test exists");
    ok(XRegExp.uninstall, "XRegExp.uninstall exists");
    ok(XRegExp.union, "XRegExp.union exists");
    ok(XRegExp.version, "XRegExp.version exists");
});

test("XRegExp", function () {
    var blankRegex = XRegExp("(?:)"),
        regexGIM = XRegExp("(?:)", "gim");

    equal(XRegExp("").source, new RegExp("").source, "Empty regex source (test 1)");
    equal(XRegExp("(?:)").source, /(?:)/.source, "Empty regex source (test 2)");
    equal(XRegExp().source, new RegExp().source, "undefined regex source");
    equal(XRegExp(null).source, new RegExp(null).source, "null regex source");
    equal(XRegExp(NaN).source, new RegExp(NaN).source, "NaN regex source");
    equal(XRegExp(1).source, new RegExp(1).source, "numeric regex source");
    equal(XRegExp({}).source, new RegExp({}).source, "object regex source");
    equal(XRegExp("").global, false, "Regex without flags is not global");
    ok(XRegExp("", "g").global, "Regex with global flag is global");
    ok(XRegExp("", "i").ignoreCase, "Regex with ignoreCase flag is ignoreCase");
    ok(XRegExp("", "m").multiline, "Regex with multiline flag is multiline");
    ok(regexGIM.global && regexGIM.ignoreCase && regexGIM.multiline, "Regex with flags gim is global, ignoreCase, multiline");
    deepEqual(blankRegex, XRegExp(blankRegex), "Regex copy and original are alike");
    notEqual(blankRegex, XRegExp(blankRegex), "Regex copy is new instance");
    ok(XRegExp("").xregexp, "XRegExp has xregexp property");
    notStrictEqual(XRegExp("").xregexp.captureNames, undefined, "XRegExp has captureNames property");
    equal(XRegExp("").xregexp.captureNames, null, "Empty XRegExp has null captureNames");
    notStrictEqual(XRegExp("").xregexp.isNative, undefined, "XRegExp has isNative property");
    equal(XRegExp("").xregexp.isNative, false, "XRegExp has isNative false");
    equal(XRegExp(XRegExp("")).xregexp.isNative, false, "Copied XRegExp has isNative false");
    equal(XRegExp(new RegExp("")).xregexp.isNative, true, "Copied RegExp has isNative true");
    equal(XRegExp.exec("aa", XRegExp(XRegExp("(?<name>a)\\k<name>"))).name, "a", "Copied XRegExp retains named capture properties");
    raises(function () {XRegExp(/(?:)/, "g");}, Error, "Regex copy with flag throws");
    ok(XRegExp("") instanceof RegExp, "XRegExp object is instanceof RegExp");
    equal(XRegExp("").constructor, RegExp, "XRegExp object constructor is RegExp");
    raises(function () {XRegExp("", "gg");}, SyntaxError, "Regex with duplicate native flags throws");
    raises(function () {XRegExp("", "ss");}, SyntaxError, "Regex with duplicate nonnative flags throws (test 1)");
    raises(function () {XRegExp("", "sis");}, SyntaxError, "Regex with duplicate nonnative flags throws (test 2)");
    raises(function () {XRegExp("", "?");}, SyntaxError, "Unsupported flag throws");
    ok(!XRegExp("(?:)", "x").extended, "Nonnative flag x does not set extended property");
});

test("XRegExp.addToken", function () {
    XRegExp.install("extensibility");
    XRegExp.addToken(/\x01/, function () {return "1";});
    XRegExp.addToken(/\x02/, function () {return "2";}, {scope: "class"});
    XRegExp.addToken(/\x03/, function () {return "3";}, {scope: "default"});
    XRegExp.addToken(/\x04/, function () {return "4";}, {scope: "all"});
    XRegExp.addToken(/\x05/, function () {return "5";}, {
        scope: "default",
        trigger: function () {return this.hasFlag("5");},
        customFlags: "5"
    });
    XRegExp.uninstall("extensibility");

    ok(XRegExp("\x01").test("1"), "Default scope matches outside class");
    ok(!XRegExp("[\x01]").test("1"), "Default scope doesn't match inside class");
    ok(!XRegExp("\x02").test("2"), "Explicit class scope doesn't match outside class");
    ok(XRegExp("[\x02]").test("2"), "Explicit class scope matches inside class");
    ok(XRegExp("\x03").test("3"), "Explicit default scope matches outside class");
    ok(!XRegExp("[\x03]").test("3"), "Explicit default scope doesn't match inside class");
    ok(XRegExp("\x04").test("4"), "Explicit all scope matches outside class");
    ok(XRegExp("[\x04]").test("4"), "Explicit all scope matches inside class");
    ok(!XRegExp("\x05").test("5"), "Trigger with hasFlag skips token when flag is missing");
    ok(XRegExp("\x05", "5").test("5"), "Trigger with hasFlag uses token when flag is included");
});

test("XRegExp.cache", function () {
    var cached1 = XRegExp.cache("(?:)");
    var cached2 = XRegExp.cache("(?:)");
    var regexWithFlags = XRegExp(". +()\\1 1", "gimsx");

    ok(cached1 instanceof RegExp, "Returns RegExp");
    strictEqual(cached1, cached2, "References to separately cached patterns refer to same object");
    deepEqual(XRegExp.cache(". +()\\1 1", "gimsx"), regexWithFlags, "Cached pattern plus flags");
});

test("XRegExp.escape", function () {
    equal(XRegExp.escape("[()*+?.\\^$|"), "\\[\\(\\)\\*\\+\\?\\.\\\\\\^\\$\\|", "Metacharacters are escaped");
    equal(XRegExp.escape("]{}-, #"), "\\]\\{\\}\\-\\,\\ \\#", "Occasional metacharacters are escaped");
    equal(XRegExp.escape("abc_<123>!"), "abc_<123>!", "Nonmetacharacters are not escaped");
});

test("XRegExp.exec", function () {
    var rX = /x/g;
    var rA = /a/g;
    var xregexp = XRegExp("(?<name>a)"); // tests expect this to be nonglobal and use named capture
    var str = "abcxdef";
    var match;

    ok(XRegExp.exec(str, rX, 2), "Pos test 1");
    ok(!XRegExp.exec(str, rX, 5), "Pos test 2");

    rX.lastIndex = 5;
    ok(XRegExp.exec(str, rX, 2), "Pos ignores lastIndex test 1");

    rX.lastIndex = 0;
    ok(!XRegExp.exec(str, rX, 5), "Pos ignores lastIndex test 2");

    rA.lastIndex = 5;
    ok(XRegExp.exec(str, rA), "Pos ignores lastIndex test 3 (pos defaults to 0)");

    ok(XRegExp.exec(str, rX, 0), "Undefined sticky allows matching after pos");
    ok(XRegExp.exec(str, rX, 0, false), "Explicit sticky=false allows matching after pos");
    ok(!XRegExp.exec(str, rX, 0, true), "Sticky match fails if match possible after (but not at) pos");
    ok(!XRegExp.exec(str, rX, 0, "sticky"), "String 'sticky' triggers sticky mode");
    ok(XRegExp.exec(str, rX, 3, true), "Sticky match succeeds if match at pos");
    equal(XRegExp.exec(str, rX, 5), null, "Result of failure is null");
    deepEqual(XRegExp.exec(str, xregexp), ["a", "a"], "Result of successful match is array with backreferences");

    match = XRegExp.exec(str, xregexp);
    equal(match.name, "a", "Match result includes named capture properties");

    xregexp.lastIndex = 5;
    XRegExp.exec(str, xregexp);
    equal(xregexp.lastIndex, 5, "lastIndex of nonglobal regex left as is");

    rX.lastIndex = 0;
    XRegExp.exec(str, rX);
    equal(rX.lastIndex, 4, "lastIndex of global regex updated to end of match");

    rX.lastIndex = 5;
    XRegExp.exec(str, rX, 2, true);
    equal(rX.lastIndex, 0, "lastIndex of global regex updated to 0 after failure");

    equal(XRegExp.exec("abc", /x/, 5), null, "pos greater than string length results in failure");

    if (RegExp.prototype.sticky !== undefined) {
        var stickyRegex = new RegExp("x", "y"); // can't use /x/y even behind `if` because it errors during compilation in IE9
        ok(XRegExp.exec(str, stickyRegex, 0, false), "Explicit sticky=false overrides flag y");
        ok(!XRegExp.exec(str, stickyRegex, 0), "Sticky follows flag y when not explicitly specified");
    }
});

test("XRegExp.forEach", function () {
    var str = "abc 123 def";
    var regex = XRegExp("(?<first>\\w)\\w*");
    var regexG = XRegExp("(?<first>\\w)\\w*", "g");

    deepEqual(XRegExp.forEach(str, regex, function (m) {this.push(m[0]);}, []), ["abc", "123", "def"], "Match strings with nonglobal regex");
    deepEqual(XRegExp.forEach(str, regexG, function (m) {this.push(m[0]);}, []), ["abc", "123", "def"], "Match strings with global regex");
    deepEqual(XRegExp.forEach(str, regex, function (m) {this.push(m.first);}, []), ["a", "1", "d"], "Named backreferences");
    deepEqual(XRegExp.forEach(str, regex, function (m) {this.push(m.index);}, []), [0, 4, 8], "Match indexes");
    deepEqual(XRegExp.forEach(str, regex, function (m, i) {this.push(i);}, []), [0, 1, 2], "Match numbers");
    deepEqual(XRegExp.forEach(str, regex, function (m, i, s) {this.push(s);}, []), [str, str, str], "Source strings");
    deepEqual(XRegExp.forEach(str, regex, function (m, i, s, r) {this.push(r);}, []), [regex, regex, regex], "Source regexes");

    var str2 = str;
    deepEqual(XRegExp.forEach(str2, regex, function (m, i, s) {this.push(s); s += s; str2 += str2;}, []), [str, str, str], "Source string manipulation in callback doesn't affect iteration");

    var regex2 = XRegExp(regex);
    deepEqual(XRegExp.forEach(str, regex2, function (m, i, s, r) {this.push(i); r = /x/; regex2 = /x/;}, []), [0, 1, 2], "Source regex manipulation in callback doesn't affect iteration");

    regexG.lastIndex = 4;
    deepEqual(XRegExp.forEach(str, regexG, function (m) {this.push(m[0]);}, []), ["abc", "123", "def"], "Iteration starts at pos 0, ignoring lastIndex");

    regex.lastIndex = 4;
    XRegExp.forEach(str, regex, function () {});
    equal(regex.lastIndex, 4, "lastIndex of nonglobal regex unmodified after iteration");

    regexG.lastIndex = 4;
    XRegExp.forEach(str, regexG, function () {});
    equal(regexG.lastIndex, 0, "lastIndex of global regex reset to 0 after iteration");

    var rgOrig = /\d+/g, interimLastIndex1 = 0, interimLastIndex2 = 0;
    XRegExp.forEach(str, rgOrig, function (m, i, s, r) {
        interimLastIndex1 = rgOrig.lastIndex;
        interimLastIndex2 = r.lastIndex;
    });
    equal(interimLastIndex1, 7, "Global regex lastIndex updated during iterations (test 1)");
    equal(interimLastIndex2, 7, "Global regex lastIndex updated during iterations (test 2)");

    var rOrig = /\d+/, interimLastIndex1 = 0, interimLastIndex2 = 0;
    XRegExp.forEach(str, rOrig, function (m, i, s, r) {
        interimLastIndex1 = rOrig.lastIndex;
        interimLastIndex2 = r.lastIndex;
    });
    equal(interimLastIndex1, 0, "Nonglobal regex lastIndex not updated during iterations (test 1)");
    equal(interimLastIndex2, 0, "Nonglobal regex lastIndex not updated during iterations (test 2)");
});

test("XRegExp.globalize", function () {
    var hasNativeY = typeof RegExp.prototype.sticky !== "undefined";
    var regex = XRegExp("(?<name>a)\\k<name>", "im" + (hasNativeY ? "y" : ""));
    var globalCopy = XRegExp.globalize(regex);
    var globalOrig = XRegExp("(?:)", "g");

    notEqual(regex, globalCopy, "Copy is new instance");
    ok(globalCopy.global, "Copy is global");
    equal(regex.source, globalCopy.source, "Copy has same source");
    ok(regex.ignoreCase === globalCopy.ignoreCase && regex.multiline === globalCopy.multiline && regex.sticky === globalCopy.sticky, "Copy has same ignoreCase, multiline, and sticky properties");
    ok(XRegExp.exec("aa", globalCopy).name, "Copy retains named capture capabilities");
    ok(XRegExp.globalize(globalOrig).global, "Copy of global regex is global");
});

test("XRegExp.install", function () {
    expect(0);
    // TODO: Add tests
});

test("XRegExp.isInstalled", function () {
    expect(0);
    // TODO: Add tests
});

test("XRegExp.isRegExp", function () {
    ok(XRegExp.isRegExp(/(?:)/), "Regex built by regex literal is RegExp");
    ok(XRegExp.isRegExp(RegExp("(?:)")), "Regex built by RegExp is RegExp");
    ok(XRegExp.isRegExp(XRegExp("(?:)")), "Regex built by XRegExp is RegExp");
    ok(!XRegExp.isRegExp(undefined), "undefined is not RegExp");
    ok(!XRegExp.isRegExp(null), "null is not RegExp");
    ok(!XRegExp.isRegExp({}), "Object literal is not RegExp");
    ok(!XRegExp.isRegExp(function () {}), "Function literal is not RegExp");

    var fakeRegex = {};
    fakeRegex.constructor = RegExp;
    ok(!XRegExp.isRegExp(fakeRegex), "Object with assigned RegExp constructor is not RegExp");

    var tamperedRegex = /x/;
    tamperedRegex.constructor = {};
    ok(XRegExp.isRegExp(tamperedRegex), "RegExp with assigned Object constructor is RegExp");

    // Check whether `document` exists and only run the frame test if so. This ensures the test is
    // run only in the browser and not in server-side environments without a DOM.
    if (typeof document !== "undefined") {
        var iframe = document.createElement("iframe");
        iframe.width = iframe.height = iframe.border = 0; //iframe.style.display = "none";
        document.body.appendChild(iframe);
        frames[frames.length - 1].document.write("<script>var regex = /x/;<\/script>");
        ok(XRegExp.isRegExp(iframe.contentWindow.regex), "RegExp constructed in another frame is RegExp");
        iframe.parentNode.removeChild(iframe); // cleanup
    }
});

test("XRegExp.matchChain", function () {
    var html = '<html><img src="http://x.com/img.png"><script src="http://xregexp.com/path/file.ext"><img src="http://xregexp.com/path/to/img.jpg?x"><img src="http://xregexp.com/img2.gif"/></html>';
    var xregexpImgFileNames = XRegExp.matchChain(html, [
        {regex: /<img\b([^>]+)>/i, backref: 1}, // <img> tag attributes
        {regex: XRegExp('(?ix) \\s src=" (?<src> [^"]+ )'), backref: "src"}, // src attribute values
        {regex: XRegExp("^http://xregexp\\.com(/[^#?]+)", "i"), backref: 1}, // xregexp.com paths
        /[^\/]+$/ // filenames (strip directory paths)
    ]);

    deepEqual(xregexpImgFileNames, ["img.jpg", "img2.gif"], "Four-level chain with plain regex and regex/backref objects (using named and numbered backrefs)");
    deepEqual(XRegExp.matchChain("x", [/x/, /y/]), [], "Empty array returned if no matches");
    raises(function () {XRegExp.matchChain(html, []);}, Error, "Empty chain regex throws error");
});

test("XRegExp.replace", function () {
    equal(XRegExp.replace("test", "t", "x", "all"), "xesx", "string search with scope='all'");
    equal(XRegExp.replace("test", "t", "x", "one"), "xest", "string search with scope='one'");
    equal(XRegExp.replace("test", "t", "x"), "xest", "string search without scope");
    equal(XRegExp.replace("test", /t/, "x", "all"), "xesx", "regex search with scope='all'");
    equal(XRegExp.replace("test", /t/, "x", "one"), "xest", "regex search with scope='one'");
    equal(XRegExp.replace("test", /t/, "x"), "xest", "regex search without scope");
    equal(XRegExp.replace("test", /t/g, "x", "all"), "xesx", "global regex search with scope='all'");
    equal(XRegExp.replace("test", /t/g, "x", "one"), "xest", "global regex search with scope='one'");
    equal(XRegExp.replace("test", /t/g, "x"), "xesx", "global regex search without scope");

    // TODO: Add tests (above tests cover scope functionality only)
});

test("XRegExp.split", function () {
    expect(0);
    // TODO: Add tests
});

test("XRegExp.test", function () {
    expect(0);
    // TODO: Add tests
});

test("XRegExp.uninstall", function () {
    expect(0);
    // TODO: Add tests
});

test("XRegExp.union", function () {
    equal(XRegExp.union([XRegExp("(?<a>a)\\k<a>")], "n").test("aa"), true, "Apply flag n (test 1)");
    raises(function () {XRegExp.union([XRegExp("(?<a>a)\\k<a>"), /(b)\1/], "n");}, SyntaxError, "Apply flag n (test 2)");
    raises(function () {XRegExp.union([XRegExp("(?<a>a)\\k<a>"), /(b)\1/, XRegExp("(?<x>)")], "n");}, SyntaxError, "Apply flag n (test 3)");

    // TODO: Add tests
});

test("XRegExp.version", function () {
    var parts = XRegExp.version.split(".");

    equal(typeof XRegExp.version, "string", "Version is a string");
    equal(parts.length, 3, "Version is three dot-delimited parts");
    ok(!(isNaN(+parts[0]) || isNaN(+parts[1])), "Major and minor version parts are numeric");
});

//-------------------------------------------------------------------
module("Overriden natives");
//-------------------------------------------------------------------

test("RegExp.prototype.exec", function () {
    XRegExp.install("natives");

    deepEqual(/x/.exec("a"), null, "Nonmatch returns null");
    deepEqual(/a/.exec("a"), ["a"], "Match returns array");
    deepEqual(/(a)/.exec("a"), ["a", "a"], "Match returns array with backreferences");
    deepEqual(/()??/.exec("a"), ["", undefined], "Backrefernces to nonparticipating capturing groups returned as undefined");
    equal(/a/.exec("12a").index, 2, "Match array has index set to match start");
    equal(/a/.exec("12a").input, "12a", "Match array has input set to target string");

    var regex = /x/;
    regex.exec("123x567");
    equal(regex.lastIndex, 0, "Nonglobal regex lastIndex is 0 after match");

    regex.lastIndex = 1;
    regex.exec("123x567");
    equal(regex.lastIndex, 1, "Nonglobal regex lastIndex is unmodified after match");

    regex.exec("abc");
    equal(regex.lastIndex, 1, "Nonglobal regex lastIndex is unmodified after failure");

    var regexG = /x/g;
    regexG.exec("123x567");
    equal(regexG.lastIndex, 4, "Global regex lastIndex is updated after match");

    regexG.lastIndex = 4;
    equal(regexG.exec("123x567"), null, "Global regex starts match at lastIndex");

    equal(regexG.lastIndex, 0, "Global regex lastIndex reset to 0 after failure");

    var regexZeroLength = /^/g;
    regexZeroLength.exec("abc");
    equal(regexZeroLength.lastIndex, 0, "Global regex lastIndex is not incremented after zero-length match");

    regexG.lastIndex = "3";
    deepEqual(regexG.exec("123x567"), ["x"], "lastIndex converted to integer (test 1)");

    regexG.lastIndex = "4";
    deepEqual(regexG.exec("123x567"), null, "lastIndex converted to integer (test 2)");

    deepEqual(/1/.exec(1), ["1"], "Numeric argument converted to string (test 1)");
    deepEqual(/1()/.exec(1), ["1", ""], "Numeric argument converted to string (test 2)");
    deepEqual(/null/.exec(null), ["null"], "null argument converted to string");
    deepEqual(/NaN/.exec(NaN), ["NaN"], "NaN argument converted to string");
    // This is broken in old Firefox (tested v2.0; it works in v8+), but not for any fault of XRegExp.
    // Uncomment this test if future XRegExp fixes it for old Firefox.
    //deepEqual(/undefined/.exec(), ["undefined"], "undefined argument converted to string");
    raises(function () {RegExp.prototype.exec.call("\\d", "1");}, TypeError, "TypeError thrown when context is not type RegExp");

    XRegExp.uninstall("natives");
});

test("RegExp.prototype.test", function () {
    XRegExp.install("natives");

    deepEqual(/x/.test("a"), false, "Nonmatch returns false");
    deepEqual(/a/.test("a"), true, "Match returns true");

    var regex = /x/;
    regex.test("123x567");
    equal(regex.lastIndex, 0, "Nonglobal regex lastIndex is 0 after match");

    regex.lastIndex = 1;
    regex.test("123x567");
    equal(regex.lastIndex, 1, "Nonglobal regex lastIndex is unmodified after match");

    regex.test("abc");
    equal(regex.lastIndex, 1, "Nonglobal regex lastIndex is unmodified after failure");

    var regexG = /x/g;
    regexG.test("123x567");
    equal(regexG.lastIndex, 4, "Global regex lastIndex is updated after match");

    regexG.lastIndex = 4;
    equal(regexG.test("123x567"), false, "Global regex starts match at lastIndex");

    equal(regexG.lastIndex, 0, "Global regex lastIndex reset to 0 after failure");

    var regexZeroLength = /^/g;
    regexZeroLength.test("abc");
    equal(regexZeroLength.lastIndex, 0, "Global regex lastIndex is not incremented after zero-length match");

    regexG.lastIndex = "3";
    deepEqual(regexG.test("123x567"), true, "lastIndex converted to integer (test 1)");

    regexG.lastIndex = "4";
    deepEqual(regexG.test("123x567"), false, "lastIndex converted to integer (test 2)");

    deepEqual(/1/.test(1), true, "Argument converted to string");
    raises(function () {RegExp.prototype.test.call("\\d", "1");}, TypeError, "TypeError thrown when context is not type RegExp");

    XRegExp.uninstall("natives");
});

test("String.prototype.match", function () {
    XRegExp.install("natives");

    deepEqual("a".match(/x/), null, "Nonglobal regex: Nonmatch returns null");
    deepEqual("a".match(/a/), ["a"], "Nonglobal regex: Match returns array");
    deepEqual("a".match(/(a)/), ["a", "a"], "Nonglobal regex: Match returns array with backreferences");
    deepEqual("a".match(/()??/), ["", undefined], "Nonglobal regex: Backrefernces to nonparticipating capturing groups returned as undefined");
    equal("12a".match(/a/).index, 2, "Nonglobal regex: Match array has index set to match start");
    equal("12a".match(/a/).input, "12a", "Nonglobal regex: Match array has input set to target string");

    var regex = /x/;
    "123x567".match(regex);
    equal(regex.lastIndex, 0, "Nonglobal regex: lastIndex is 0 after match");

    regex.lastIndex = 1;
    "123x567".match(regex);
    equal(regex.lastIndex, 1, "Nonglobal regex: lastIndex is unmodified after match");

    "abc".match(regex);
    equal(regex.lastIndex, 1, "Nonglobal regex: lastIndex is unmodified after failure");

    var regexG = /x/g;
    "123x567".match(regexG);
    equal(regexG.lastIndex, 0, "Global regex: lastIndex is 0 after match");

    regexG.lastIndex = 4;
    deepEqual("123x567".match(regexG), ["x"], "Global regex: Search starts at pos zero despite lastIndex");

    regexG.lastIndex = 4;
    "abc".match(regexG);
    equal(regexG.lastIndex, 0, "Global regex: lastIndex reset to 0 after failure");

    deepEqual("1".match("^(1)"), ["1", "1"], "Argument converted to RegExp");
    deepEqual(String.prototype.match.call(1, /1/), ["1"], "Nonstring context is converted to string");

    XRegExp.uninstall("natives");
});

test("String.prototype.replace", function () {
    XRegExp.install("natives");

    equal("xaaa".replace(/a/, "b"), "xbaa", "Basic nonglobal regex search");
    equal("xaaa".replace(/a/g, "b"), "xbbb", "Basic global regex search");
    equal("xaaa".replace("a", "b"), "xbaa", "Basic string search");
    equal("xaaa".replace(/a(a)/, "$1b"), "xaba", "Backreference $1 in replacement string");
    equal("xaaa".replace(/a(a)/, "$01b"), "xaba", "Backreference $01 in replacement string");
    equal("xaaa".replace(/a()()()()()()()()()(a)/, "$10b"), "xaba", "Backreference $11 in replacement string");
    equal("xaaa".replace(/a()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()(a)/, "$99b"), "xaba", "Backreference $99 in replacement string");
    equal("xaaa".replace(/a()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()()(a)/, "$100b"), "x0ba", "$100 in replacement string");
    equal("xaaa".replace(/aa/, "$&b"), "xaaba", "Backreference $& in replacement string");
    equal("xaaa".replace(/aa/, "$'b"), "xaba", "Backreference $' in replacement string");
    equal("xaaa".replace(/aa/, "$`b"), "xxba", "Backreference $` in replacement string");
    equal("xaaa".replace(/aa/, "$$b"), "x$ba", "$$ in replacement string");
    equal("xaaa".replace("a(a)", "$1b"), "xaaa", "Parentheses in string search doesn't match");
    equal("xaaa".replace("aa", "$&b"), "xaaba", "Backreference $& in replacement string for string search");
    equal("xaaa".replace("aa", "$'b"), "xaba", "Backreference $' in replacement string for string search");
    equal("xaaa".replace("aa", "$`b"), "xxba", "Backreference $` in replacement string for string search");
    equal("xaaa".replace("aa", "$$b"), "x$ba", "$$ in replacement string for string search");
    equal("xaaa".replace(/a/, function () {return "b";}), "xbaa", "Nonglobal regex search with basic function replacement");
    equal("xaaa".replace(/a/g, function () {return "b";}), "xbbb", "Global regex search with basic function replacement");
    equal("xaaa".replace(/aa/, function ($0) {return $0 + "b";}), "xaaba", "Regex search with function replacement, using match");
    equal("xaaa".replace(/a(a)/, function ($0, $1) {return $1 + "b";}), "xaba", "Regex search with function replacement, using backreference 1");
    equal("xaaa".replace(/a(a)/, function ($0, $1) {return "$1b";}), "x$1ba", "Regex search with function replacement, using $1 in return string");
    equal("xaaa".replace(/a/, function () {return "$&b";}), "x$&baa", "Regex search with function replacement, using $& in return string");
    equal("xaaa".replace(/a/g, function ($0, pos) {return "" + pos;}), "x123", "Regex search with function replacement, using pos in return string");
    equal("xaaa".replace(/(a)/g, function ($0, $1, pos) {return "" + pos;}), "x123", "Regex (with capturing group) search with function replacement, using pos in return string");
    equal("xaaa".replace(/a/, function ($0, pos, str) {return str;}), "xxaaaaa", "Regex search with function replacement, using source string in return string");
    equal("xaaa".replace(/(a)/, function ($0, $1, pos, str) {return str;}), "xxaaaaa", "Regex (with capturing group) search with function replacement, using source string in return string");
    equal("xaaa".replace("a", function () {return "b";}), "xbaa", "String search with basic function replacement");
    equal("xaaa".replace("a", function ($0) {return $0;}), "xaaa", "String search with function replacement, using match");
    // This is broken in Safari (tested v5.1.2/7534.52.7), but not for any fault of XRegExp.
    // Uncomment this test if future XRegExp fixes it for Safari.
    //equal("xaaa".replace("a", function () {return "$&";}), "x$&aa", "String search with function replacement, using $& in return string");
    equal("xaaa".replace("a", function ($0, pos) {return "" + pos;}), "x1aa", "String search with function replacement, using pos in return string");
    equal("xaaa".replace("a", function ($0, pos, str) {return str;}), "xxaaaaa", "String search with function replacement, using source string in return string");
    equal(String.prototype.replace.call(100, /0/g, "x"), "1xx", "Number as context");
    equal(String.prototype.replace.call(100, /(0)/g, "$1x"), "10x0x", "Number as context with backreference $1 in replacement string");
    equal(String.prototype.replace.call(100, /0/g, function ($0) {return $0 + "x";}), "10x0x", "Number as context with function replacement");
    equal(String.prototype.replace.call(100, "0", "x"), "1x0", "String search with number as context");
    equal(String.prototype.replace.call(100, "0", "$&x"), "10x0", "String search with number as context, with backreference $& in replacement string");
    equal(String.prototype.replace.call(["a","b"], /,/g, "x"), "axb", "Array as context");
    equal("10x10".replace(10, "x"), "xx10", "Number as search (converted to string)");
    equal("xaaa,ba,b".replace(["a","b"], "x"), "xaaxa,b", "Array as search (converted to string)");
    equal("xaaa".replace(/a/g, 1.1), "x1.11.11.1", "Number as replacement (converted to string)");
    equal("xaaa".replace(/a/g, ["a","b"]), "xa,ba,ba,b", "Array as replacement (converted to string)");
    equal("100".replace(/0/, function ($0, pos, str) {return typeof str;}), "1string0", "typeof last argument in replacement function is string");
    equal(new String("100").replace(/0/, function ($0, pos, str) {return typeof str;}), "1string0", "typeof last argument in replacement function is string, when called on String as context");
    equal(String.prototype.replace.call(100, /0/, function ($0, pos, str) {return typeof str;}), "1string0", "typeof last argument in replacement function is string, when called on number as context");
    equal("xaaa".replace(/a/), "xundefinedaa", "Replacement string is 'undefined', when not provided");
    equal("x".replace(/x/, /x/), "/x/", "Regex search with RegExp replacement");
    equal("xaaa".replace(), "xaaa", "Source returned when no replacement provided");
    equal("test".replace(/t|(e)/g, "$1"), "es", "Numbered backreference to nonparticipating group");

    var regex = /x/;
    "123x567".replace(regex, "_");
    equal(regex.lastIndex, 0, "Unaltered nonglobal regex lastIndex is 0 after match");

    regex.lastIndex = 1;
    "123x567".replace(regex, "_");
    equal(regex.lastIndex, 1, "Nonglobal regex lastIndex is unmodified after match");

    "abc".replace(regex, "_");
    equal(regex.lastIndex, 1, "Nonglobal regex lastIndex is unmodified after failure");

    var regexG = /x/g;
    "123x567".replace(regexG, "_");
    equal(regexG.lastIndex, 0, "Unaltered global regex lastIndex is 0 after match");

    regexG.lastIndex = 5;
    equal("123x567".replace(regexG, "_"), "123_567", "Global regex ignores lastIndex as start position");

    regexG.lastIndex = 5;
    "123x567".replace(regexG, "_");
    equal(regexG.lastIndex, 0, "Global regex lastIndex reset to 0");

    var regex2 = /x/g;
    var interimLastIndex = 0;
    "1x2".replace(regex2, function () {
        interimLastIndex = regex2.lastIndex;
    });
    equal(interimLastIndex, 2, "Global regex lastIndex updated during replacement iterations");

    XRegExp.uninstall("natives");
});

test("String.prototype.split", function () {
    XRegExp.install("natives");

    expect(0);
    // TODO: Add tests (basic functionality tests, not the long list from
    // the cross-browser fixes module)

    XRegExp.uninstall("natives");
});

//-------------------------------------------------------------------
module("Overriden natives extensions");
//-------------------------------------------------------------------

test("RegExp.prototype.exec", function () {
    XRegExp.install("natives");

    equal(XRegExp("(?<name>a)").exec("a").name, "a", "Match array has named capture properties");

    XRegExp.uninstall("natives");
});

// RegExp.prototype.test is overridden but not extended by XRegExp
//test("RegExp.prototype.test", function () {});

test("String.prototype.match", function () {
    XRegExp.install("natives");

    equal("a".match(XRegExp("(?<name>a)")).name, "a", "Match array has named capture properties");

    XRegExp.uninstall("natives");
});

test("String.prototype.replace", function () {
    XRegExp.install("natives");

    equal("xaaa".replace(/aa/, "$0b"), "xaaba", "$0 in replacement string works like $&");
    equal("xaaa".replace(/aa/, "$00b"), "xaaba", "$00 in replacement string works like $&");
    equal("xaaa".replace(/aa/, "$000b"), "xaa0ba", "$000 in replacement string works like $&0");
    raises(function () {"xaaa".replace(/aa/, "$1b");}, SyntaxError, "$1 throws in replacement string for regex with no backreference");
    raises(function () {"xaaa".replace(/aa/, "$01b");}, SyntaxError, "$01 throws in replacement string for regex with no backreference");
    equal("xaaa".replace(/aa/, "$001b"), "xaa1ba", "$001 works like $&1 in replacement string for regex with no backreference");
    raises(function () {"xaaa".replace(/a(a)/, "$2b");}, SyntaxError, "$2 throws in replacement string for regex with less than 2 backreferences");
    raises(function () {"xa(a)a".replace("a(a)", "$1b");}, SyntaxError, "$1 throws in replacement string for string search with parentheses");
    equal("xaaa".replace("aa", "$0b"), "xaaba", "$0 in replacement string for string search works like $&");
    equal("test".replace(/t|(e)/g, "${1}"), "es", "Numbered backreference in curly brackets to nonparticipating group");
    raises(function () {"test".replace(/t/, "${1}");}, SyntaxError, "Numbered backreference to undefined group in replacement string");
    equal("test".replace(XRegExp("(?<test>t)", "g"), ":${test}:"), ":t:es:t:", "Named backreference in replacement string");
    raises(function () {"test".replace(XRegExp("(?<test>t)", "g"), ":${x}:");}, SyntaxError, "Named backreference to undefined group in replacement string");
    equal("test".replace(XRegExp("(?<a>.)(?<a>.)", "g"), "${a}"), "et", "Named backreference uses last of groups with the same name");

    function mul(str, num) {
        return Array(num + 1).join(str);
    }
    // IE <= 8 doesn't allow backrefs greater than \99 in regex syntax
    var lottaGroups = new RegExp(
        "^(a)\\1" + mul("()", 8) +
        "(b)\\10" + mul("()", 89) +
        "(c)" + mul("()", 899) +
        "(d)$"
    );
    equal("aabbcd".replace(lottaGroups, "$0 $01 $001 $0001 $1 $10 $100 $1000"), "aabbcd a aabbcd1 aabbcd01 a b b0 b00", "Regex with 1,000 capturing groups, without curly brackets for backreferences");
    equal("aabbcd".replace(lottaGroups, "${0} ${01} ${001} ${0001} ${1} ${10} ${100} ${1000}"), "aabbcd a a a a b c d", "Regex with 1,000 capturing groups, with curly brackets for backreferences");

    // TODO: Add tests

    XRegExp.uninstall("natives");
});

// String.prototype.split is overridden but not extended by XRegExp
//test("String.prototype.split", function () {});

//-------------------------------------------------------------------
module("New syntax and flags");
//-------------------------------------------------------------------

test("Named capture and backreferences", function () {
    expect(0);
    // TODO: Add tests
});

test("Inline comments", function () {
    ok(XRegExp("^a(?#)b$").test("ab"), "Comment is ignored");
    ok(XRegExp("^a(?#)+$").test("aaa"), "Quantifier following comment applies to preceding atom");
    ok(XRegExp("^(a)\\1(?#)2$").test("aa2"), "Comment separates atoms");

    // TODO: Add tests
});

test("Leading mode modifier", function () {
    expect(0);
    // TODO: Add tests
});

test("Enhanced error handling", function () {
    raises(function () {XRegExp("\\1");}, SyntaxError, "Octals throw");

    // TODO: Add tests

    // Python-style named capture syntax was added to XRegExp to avoid octal-related errors in Opera. Recent Opera supports (?P<name>..) and (?P=name) based on abandoned ES4 proposals
    equal(XRegExp("(?P<name>a)(b)\\2").test("abb"), true, "Numbered backreference to Python-style named capture not treated as octal (test 1)");
    equal(XRegExp("(?P<name>a)(b)\\1").test("aba"), true, "Numbered backreference to Python-style named capture not treated as octal (test 2)");
});

test("n flag (explicit capture mode)", function () {
    expect(0);
    // TODO: Add tests
});

test("s flag (dotall mode)", function () {
    expect(0);
    // TODO: Add tests
});

test("x flag (extended mode)", function () {
    ok(XRegExp("^a b$", "x").test("ab"), "Whitespace is ignored");
    ok(XRegExp("^a#comment\nb$", "x").test("ab"), "Line comment is ignored");
    ok(XRegExp("^a +$", "x").test("aaa"), "Quantifier following whitespace applies to preceding atom");
    ok(XRegExp("^(a)\\1 2$", "x").test("aa2"), "Whitespace separates atoms");
    ok(XRegExp("^ [ #]+ $", "x").test(" #"), "Character classes do not use free-spacing");

    // TODO: Add tests
});

//-------------------------------------------------------------------
module("Cross-browser fixes");
//-------------------------------------------------------------------

test("Nonparticipating capture values", function () {
    expect(0);
    // TODO: Add tests
});

test("RegExp.prototype.lastIndex", function () {
    expect(0);
    // TODO: Add tests
});

test("String.prototype.split with regex separator", function () {
    XRegExp.install("natives");

    // Some of these tests are not known to fail in any browser, but many fail in at least one
    // version of one browser.

    deepEqual("".split(), [""]);
    deepEqual("".split(/./), [""]);
    deepEqual("".split(/.?/), []);
    deepEqual("".split(/.??/), []);
    deepEqual("ab".split(/a*/), ["", "b"]);
    deepEqual("ab".split(/a*?/), ["a", "b"]);
    deepEqual("ab".split(/(?:ab)/), ["", ""]);
    deepEqual("ab".split(/(?:ab)*/), ["", ""]);
    deepEqual("ab".split(/(?:ab)*?/), ["a", "b"]);
    deepEqual("test".split(""), ["t", "e", "s", "t"]);
    deepEqual("test".split(), ["test"]);
    deepEqual("111".split(1), ["", "", "", ""]);
    deepEqual("test".split(/(?:)/, 2), ["t", "e"]);
    deepEqual("test".split(/(?:)/, -1), ["t", "e", "s", "t"]);
    deepEqual("test".split(/(?:)/, undefined), ["t", "e", "s", "t"]);
    deepEqual("test".split(/(?:)/, null), []);
    deepEqual("test".split(/(?:)/, NaN), []);
    deepEqual("test".split(/(?:)/, true), ["t"]);
    deepEqual("test".split(/(?:)/, "2"), ["t", "e"]);
    deepEqual("test".split(/(?:)/, "two"), []);
    deepEqual("a".split(/-/), ["a"]);
    deepEqual("a".split(/-?/), ["a"]);
    deepEqual("a".split(/-??/), ["a"]);
    deepEqual("a".split(/a/), ["", ""]);
    deepEqual("a".split(/a?/), ["", ""]);
    deepEqual("a".split(/a??/), ["a"]);
    deepEqual("ab".split(/-/), ["ab"]);
    deepEqual("ab".split(/-?/), ["a", "b"]);
    deepEqual("ab".split(/-??/), ["a", "b"]);
    deepEqual("a-b".split(/-/), ["a", "b"]);
    deepEqual("a-b".split(/-?/), ["a", "b"]);
    deepEqual("a-b".split(/-??/), ["a", "-", "b"]);
    deepEqual("a--b".split(/-/), ["a", "", "b"]);
    deepEqual("a--b".split(/-?/), ["a", "", "b"]);
    deepEqual("a--b".split(/-??/), ["a", "-", "-", "b"]);
    deepEqual("".split(/()()/), []);
    deepEqual(".".split(/()()/), ["."]);
    deepEqual(".".split(/(.?)(.?)/), ["", ".", "", ""]);
    deepEqual(".".split(/(.??)(.??)/), ["."]);
    deepEqual(".".split(/(.)?(.)?/), ["", ".", undefined, ""]);
    deepEqual("A<B>bold</B>and<CODE>coded</CODE>".split(/<(\/)?([^<>]+)>/), ["A", undefined, "B", "bold", "/", "B", "and", undefined, "CODE", "coded", "/", "CODE", ""]);
    deepEqual("test".split(/(.?)/), ["","t","","e","","s","","t",""]);
    deepEqual("tesst".split(/(s)*/), ["t", undefined, "e", "s", "t"]);
    deepEqual("tesst".split(/(s)*?/), ["t", undefined, "e", undefined, "s", undefined, "s", undefined, "t"]);
    deepEqual("tesst".split(/(s*)/), ["t", "", "e", "ss", "t"]);
    deepEqual("tesst".split(/(s*?)/), ["t", "", "e", "", "s", "", "s", "", "t"]);
    deepEqual("tesst".split(/(?:s)*/), ["t", "e", "t"]);
    deepEqual("tesst".split(/(?=s+)/), ["te", "s", "st"]);
    deepEqual("test".split("t"), ["", "es", ""]);
    deepEqual("test".split("es"), ["t", "t"]);
    deepEqual("test".split(/t/), ["", "es", ""]);
    deepEqual("test".split(/es/), ["t", "t"]);
    deepEqual("test".split(/(t)/), ["", "t", "es", "t", ""]);
    deepEqual("test".split(/(es)/), ["t", "es", "t"]);
    deepEqual("test".split(/(t)(e)(s)(t)/), ["", "t", "e", "s", "t", ""]);
    deepEqual(".".split(/(((.((.??)))))/), ["", ".", ".", ".", "", "", ""]);
    deepEqual(".".split(/(((((.??)))))/), ["."]);
    deepEqual("a b c d".split(/ /, -(Math.pow(2, 32) - 1)), ["a"]); // very large negative number test by Brian O
    deepEqual("a b c d".split(/ /, Math.pow(2, 32) + 1), ["a"]);
    deepEqual("a b c d".split(/ /, Infinity), []);

    XRegExp.uninstall("natives");
});

test("Regular expression syntax", function () {
    expect(0);
    // TODO: Add tests
});

test("Replacement text syntax", function () {
    expect(0);
    // TODO: Add tests
});

test("Type conversion", function () {
    XRegExp.install("natives");

    // these are duplicated from String.prototype.replace tests in the overridden natives module
    equal(new String("100").replace(/0/, function ($0, pos, str) {return typeof str;}), "1string0", "String.prototype.replace: typeof last argument in replacement function is string, when called on String as context");
    equal(String.prototype.replace.call(100, /0/, function ($0, pos, str) {return typeof str;}), "1string0", "String.prototype.replace: typeof last argument in replacement function is string, when called on number as context");

    // TODO: Add tests

    XRegExp.uninstall("natives");
});

//-------------------------------------------------------------------
module("Addons");
//-------------------------------------------------------------------

test("Unicode base", function () {
    expect(0);
    // TODO: Add tests
});

test("Unicode categories", function () {
    expect(0);
    // TODO: Add tests
});

test("Unicode scripts", function () {
    expect(0);
    // TODO: Add tests
});

test("Unicode blocks", function () {
    expect(0);
    // TODO: Add tests
});

test("Unicode properties", function () {
    expect(0);
    // TODO: Add tests
});

test("XRegExp.matchRecursive", function () {
    ok(XRegExp.matchRecursive, "XRegExp.matchRecursive exists");

    // TODO: Add tests
});

test("XRegExp.build", function () {
    ok(XRegExp.build, "XRegExp.build exists");

    var built = XRegExp.build("({{n1}})\\1(?<nX>{{n2}})\\2()\\3\\1\\2\\k<nX>", {
        n1: XRegExp("(?<yo>a)\\1"),
        n2: XRegExp("(?<yo>b)\\1")
    }); // Equivalent to XRegExp("(?<n1>(?<yo>a)\\2)\\1(?<nX>(?<yo>b)\\4)\\3()\\5\\1\\3\\k<nX>")
    var match = XRegExp.exec("aaaabbbbaabbbb", built);

    ok(match);
    equal(match.n1, "aa");
    equal(match.n2, undefined);
    equal(match.nX, "bb");
    equal(match.yo, "b");

    // IE v7-8 (not v6 or v9) throws an Error rather than SyntaxError
    raises(function () {var r = XRegExp.build('(?x)({{a}})', {a: /#/});}, Error, "Mode modifier in outer pattern applies to full regex with interpolated values (test 1)");
    equal(XRegExp.build("(?x){{a}}", {a: /1 2/}).test("12"), true, "Mode modifier in outer pattern applies to full regex with interpolated values (test 2)");
    equal(XRegExp.build("(?m){{a}}", {a: /a/}).multiline, true, "Mode modifier with native flag in outer pattern is applied to the final result");

    equal(XRegExp.build("^[{{a}}]$", {a: "x"}).test("x"), false, "Named subpattern not interpolated within character class (test 1)");
    equal(XRegExp.build("^{{a}}[{{a}}]$", {a: "x"}).test("x{"), true, "Named subpattern not interpolated within character class (test 2)");

    // TODO: Add tests
});

test("XRegExp.prototype.apply", function () {
    var regex = XRegExp("x");

    ok(XRegExp.prototype.apply, "XRegExp.prototype.apply exists");
    deepEqual(regex.apply(null, ["x"]), regex.test("x"), "Apply with match same as test");
    deepEqual(regex.apply(null, ["y"]), regex.test("y"), "Apply without match same as test");
});

test("XRegExp.prototype.call", function () {
    var regex = XRegExp("x");

    ok(XRegExp.prototype.call, "XRegExp.prototype.call exists");
    deepEqual(regex.call(null, "x"), regex.test("x"), "Call with match same as test");
    deepEqual(regex.call(null, "y"), regex.test("y"), "Call without match same as test");
});

test("XRegExp.prototype.forEach", function () {
    ok(XRegExp.prototype.forEach, "XRegExp.prototype.forEach exists");

    // TODO: Add tests
});

test("XRegExp.prototype.globalize", function () {
    ok(XRegExp.prototype.globalize, "XRegExp.prototype.globalize exists");

    // TODO: Add tests
});

test("XRegExp.prototype.xexec", function () {
    ok(XRegExp.prototype.xexec, "XRegExp.prototype.xexec exists");

    // TODO: Add tests
});

test("XRegExp.prototype.xtest", function () {
    ok(XRegExp.prototype.xtest, "XRegExp.prototype.xtest exists");

    // TODO: Add tests
});

