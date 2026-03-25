var assert = require("assert");

var _ = require("underscore");

var documents = require("../lib/documents");
var transforms = require("../lib/transforms");
var test = require("./test")(module);


test("paragraph()", {
    "paragraph is transformed": function() {
        var paragraph = documents.paragraph([]);
        var result = transforms.paragraph(function() {
            return documents.tab();
        })(paragraph);
        assert.deepEqual(result, documents.tab());
    },
    
    "non-paragraph elements are not transformed": function() {
        var run = documents.run([]);
        var result = transforms.paragraph(function() {
            return documents.tab();
        })(run);
        assert.deepEqual(result, documents.run([]));
    }
});


test("run()", {
    "run is transformed": function() {
        var run = documents.run([]);
        var result = transforms.run(function() {
            return documents.tab();
        })(run);
        assert.deepEqual(result, documents.tab());
    },
    
    "non-run elements are not transformed": function() {
        var paragraph = documents.paragraph([]);
        var result = transforms.run(function() {
            return documents.tab();
        })(paragraph);
        assert.deepEqual(result, documents.paragraph([]));
    }
});


test("elements()", {
    "all descendants are transformed": function() {
        var root = {
            children: [
                {
                    children: [
                        {}
                    ]
                }
            ]
        };
        var currentCount = 0;
        function setCount(node) {
            currentCount++;
            return _.extend(node, {count: currentCount});
        }
        
        var result = transforms._elements(setCount)(root);
        
        assert.deepEqual(result, {
            count: 3,
            children: [
                {
                    count: 2,
                    children: [
                        {count: 1}
                    ]
                }
            ]
        });
    }
});


test("getDescendants()", {
    "returns nothing if element has no children property": function() {
        assert.deepEqual(transforms.getDescendants({}), []);
    },
    
    "returns nothing if element has empty children": function() {
        assert.deepEqual(transforms.getDescendants({children: []}), []);
    },
    
    "includes children": function() {
        var element = {
            children: [{name: "child 1"}, {name: "child 2"}]
        };
        assert.deepEqual(
            transforms.getDescendants(element),
            [{name: "child 1"}, {name: "child 2"}]
        );
    },
    
    "includes indirect descendants": function() {
        var grandchild = {name: "grandchild"};
        var child = {name: "child", children: [grandchild]};
        var element = {children: [child]};
        assert.deepEqual(
            transforms.getDescendants(element),
            [grandchild, child]
        );
    }
});


test("getDescendantsOfType()", {
    "filters descendants to type": function() {
        var paragraph = {type: "paragraph"};
        var run = {type: "run"};
        var element = {
            children: [paragraph, run]
        };
        assert.deepEqual(
            transforms.getDescendantsOfType(element, "run"),
            [run]
        );
    }
});
