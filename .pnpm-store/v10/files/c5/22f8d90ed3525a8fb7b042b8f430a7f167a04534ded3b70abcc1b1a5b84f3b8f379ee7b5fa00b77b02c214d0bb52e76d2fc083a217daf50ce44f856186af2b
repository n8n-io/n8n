var path = require("path");


var root = path.dirname(__dirname);
    
module.exports = function(testModule) {
    var tests = testModule.exports[path.relative(root, testModule.filename)] = {};
    return function(name, func) {
        tests[name] = func;
    };
};
