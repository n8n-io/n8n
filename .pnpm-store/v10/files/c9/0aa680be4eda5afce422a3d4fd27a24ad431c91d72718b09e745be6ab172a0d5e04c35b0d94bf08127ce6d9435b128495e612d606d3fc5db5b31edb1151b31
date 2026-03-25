"use strict";
var utils = require('./utils');

var LinkedList = module.exports = {
    // basic validity tests on a circular linked list a
    valid: function(a) {
        utils.assert(a, "list falsy");
        utils.assert(a._previousSibling, "previous falsy");
        utils.assert(a._nextSibling, "next falsy");
        // xxx check that list is actually circular
        return true;
    },
    // insert a before b
    insertBefore: function(a, b) {
        utils.assert(LinkedList.valid(a) && LinkedList.valid(b));
        var a_first = a, a_last = a._previousSibling;
        var b_first = b, b_last = b._previousSibling;
        a_first._previousSibling = b_last;
        a_last._nextSibling = b_first;
        b_last._nextSibling = a_first;
        b_first._previousSibling = a_last;
        utils.assert(LinkedList.valid(a) && LinkedList.valid(b));
    },
    // replace a single node a with a list b (which could be null)
    replace: function(a, b) {
        utils.assert(LinkedList.valid(a) && (b===null || LinkedList.valid(b)));
        if (b!==null) {
            LinkedList.insertBefore(b, a);
        }
        LinkedList.remove(a);
        utils.assert(LinkedList.valid(a) && (b===null || LinkedList.valid(b)));
    },
    // remove single node a from its list
    remove: function(a) {
        utils.assert(LinkedList.valid(a));
        var prev = a._previousSibling;
        if (prev === a) { return; }
        var next = a._nextSibling;
        prev._nextSibling = next;
        next._previousSibling = prev;
        a._previousSibling = a._nextSibling = a;
        utils.assert(LinkedList.valid(a));
    }
};
