var fs = require('fs');
var _ = require('underscore');

function load(filename) {
    var ret = [];
    var nums = fs.readFileSync(filename, 'ascii').split('\n');
    nums.forEach(function(s) {
        if(s.length) {
            var n = s*1;
            ret.push(n);
        }
    });

    return ret;
}

function get_inserts(tests) {
    return _.select(tests, function(n) { return n > 0; });
}

function get_removes(tests) {
    return _.select(tests, function(n) { return n < 0; });
}

function new_tree(tree_type) {
    return new tree_type(function(a,b) { return a - b });
}

function build_tree(tree_type, inserts) {
    var tree = new_tree(tree_type);
    
    inserts.forEach(function(n) {
        tree.insert(n);
    });

    return tree;
}

function load_tree(tree_type, filename) {
    var tests = load(filename);
    var inserts = get_inserts(tests);
    return build_tree(tree_type, inserts);
}

module.exports = {
    load: load,
    get_inserts: get_inserts,
    get_removes: get_removes,
    new_tree: new_tree,
    build_tree: build_tree,
    load_tree: load_tree
};
