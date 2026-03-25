var fs = require('fs');

var loader = require('./loader');

var NUM_TIMES = 10;
var BASE_DIR = __dirname + '/perf';
var TREES = ['../test/arrtree', 'rbtree', 'bintree'];

function mean(arr) {
    var sum = 0;
    arr.forEach(function(n) {
        sum += n;
    });
    return sum/arr.length;
}

function timeit(f) {
    var diffs = [];
    for(var i=0; i < NUM_TIMES; i++) {
        var start = Date.now();
        f();
        var end = Date.now();

        var diff = (end - start)/1000;
        diffs.push(diff);
    }
    return diffs;
}

function print_times(arr) {
    console.log('Mean: ', mean(arr));
}

function build(tree_class, test_path) {
    var tests = loader.load(test_path);
    var inserts = loader.get_inserts(tests);

    console.log('build tree...');
    print_times(timeit(function(){
        loader.build_tree(tree_class, inserts);
    }));
}

function build_destroy(tree_class, test_path) {
    var tests = loader.load(test_path);
    var inserts = loader.get_inserts(tests);
    var removes = loader.get_removes(tests);

    console.log('build/destroy tree...');
    print_times(timeit(function() {
        var tree = loader.build_tree(tree_class, inserts);
        removes.forEach(function(n) {
            tree.remove(n);
        });
    }));
}

function find(tree_class, test_path) {
    var tests = loader.load(test_path);
    var inserts = loader.get_inserts(tests);

    var tree = loader.build_tree(tree_class, inserts);
    console.log('find all nodes...');
    print_times(timeit(function() {
        inserts.forEach(function(n) {
            tree.find(n);
        });
    }));
}


function interleaved(tree_class, test_path) {
    var tests = loader.load(test_path);

    console.log('interleaved build/destroy...');
    print_times(timeit(function() {
        var tree = new tree_class(function(a,b) { return a - b });
        tests.forEach(function(n) {
            if(n > 0)
                tree.insert(n);
            else
                tree.remove(n);
        });
    }));
}

var tests = fs.readdirSync(BASE_DIR);

var test_funcs = {};
TREES.forEach(function(tree) {
    var tree_class = require('../lib/' + tree);
    tests.forEach(function(test) {
       var test_path = BASE_DIR + "/" + test;
       test_funcs[tree + "_" + test + "_build"] = function(assert) {
          build(tree_class, test_path);
          assert.done();
       };
       test_funcs[tree + "_" + test + "_build_destroy"] = function(assert) {
          build_destroy(tree_class, test_path);
          assert.done();
       };
       test_funcs[tree + "_" + test + "_find"] = function(assert) {
          find(tree_class, test_path);
          assert.done();
       };
       test_funcs[tree + "_" + test + "_interleaved"] = function(assert) {
          interleaved(tree_class, test_path);
          assert.done();
       };
    });
});

exports.performance = test_funcs;
