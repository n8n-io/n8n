/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var Stack = function() {
    this.errors   = [];
    this.finished = 0;
    this.results  = [];
    this.total    = 0;
};

Stack.prototype = {
    add: function(fn) {
        var self  = this,
            index = self.total;

        self.total += 1;

        return function(err) {
            if (err) { self.errors[index] = err; }

            self.finished += 1;
            self.results[index] = fn.apply(null, arguments);
            self.test();
        };
    },

    test: function() {
        if (this.finished >= this.total && this.callback) {
            this.callback.call(null, this.errors.length ? this.errors : null,
                this.results, this.data);
        }
    },

    done: function(callback, data) {
        this.callback = callback;
        this.data     = data;
        this.test();
    }
};

exports.Stack = Stack;
