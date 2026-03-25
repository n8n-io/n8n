var fs = require('fs');
var assert = require('assert');

var loader = require('./loader');

var BASE_DIR = __dirname + '/samples';
var TREES = ['rbtree', 'bintree'];

function bt_assert(root, comparator) {
    if(root === null) {
        return true;
    }
    else {
        var ln = root.left;
        var rn = root.right;

        // invalid binary search tree
        assert.equal((ln !== null && comparator(ln.data, root.data) >= 0) ||
                         (rn !== null && comparator(rn.data, root.data) <= 0),
                     false,
                     "binary tree violation");

        return bt_assert(ln, comparator) && bt_assert(rn, comparator);
    }
}

function is_red(node) {
    return node !== null && node.red;
}

function rb_assert(root, comparator) {
    if(root === null) {
        return 1;
    }
    else {
        var ln = root.left;
        var rn = root.right;

        // red violation
        if(is_red(root)) {
            assert.equal(is_red(ln) || is_red(rn), false, "red violation");
        }

        var lh = rb_assert(ln, comparator);
        var rh = rb_assert(rn, comparator);

        // invalid binary search tree
        assert.equal((ln !== null && comparator(ln.data, root.data) >= 0) ||
                         (rn !== null && comparator(rn.data, root.data) <= 0),
                     false,
                     "binary tree violation");

        // black height mismatch
        assert.equal(lh !== 0 && rh !== 0 && lh !== rh, false, "black violation");

        // count black links
        if(lh !== 0 && rh !== 0) {
            return is_red(root) ? lh : lh + 1;
        }
        else {
            return 0;
        }
    }
}

var assert_func = {
    rbtree: rb_assert,
    bintree: bt_assert
};

function tree_assert(tree_name) {
    return function(tree) {
        return assert_func[tree_name](tree._root, tree._comparator) !== 0;
    }
}

function run_test(assert, tree_assert, tree_class, test_path) {
    var tree = loader.new_tree(tree_class);

    var tests = loader.load(test_path);

    var elems = 0;
    tests.forEach(function(n) {
        if(n > 0) {
            // insert
            assert.ok(tree.insert(n));
            assert.equal(tree.find(n), n);
            elems++;
        }
        else {
            // remove
            n = -n;
            assert.ok(tree.remove(n));
            assert.equal(tree.find(n), null);
            elems--;
        }
        assert.equal(tree.size, elems);
        assert.ok(tree_assert(tree));
    });
}

var tests = fs.readdirSync(BASE_DIR);

var test_funcs = {};
TREES.forEach(function(tree) {
    var tree_class = require('../lib/' + tree);

    tests.forEach(function(test) {
       var test_path = BASE_DIR + "/" + test;
       test_funcs[tree + "_" + test] = function(assert) {
          run_test(assert, tree_assert(tree), tree_class, test_path);
          assert.done();
       };
    });
});

exports.correctness = test_funcs;
