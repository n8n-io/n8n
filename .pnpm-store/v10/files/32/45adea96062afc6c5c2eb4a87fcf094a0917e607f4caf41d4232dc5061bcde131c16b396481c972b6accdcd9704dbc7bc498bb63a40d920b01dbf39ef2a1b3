"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = exports.Yallist = void 0;
class Yallist {
    tail;
    head;
    length = 0;
    static create(list = []) {
        return new Yallist(list);
    }
    constructor(list = []) {
        for (const item of list) {
            this.push(item);
        }
    }
    *[Symbol.iterator]() {
        for (let walker = this.head; walker; walker = walker.next) {
            yield walker.value;
        }
    }
    removeNode(node) {
        if (node.list !== this) {
            throw new Error('removing node which does not belong to this list');
        }
        const next = node.next;
        const prev = node.prev;
        if (next) {
            next.prev = prev;
        }
        if (prev) {
            prev.next = next;
        }
        if (node === this.head) {
            this.head = next;
        }
        if (node === this.tail) {
            this.tail = prev;
        }
        this.length--;
        node.next = undefined;
        node.prev = undefined;
        node.list = undefined;
        return next;
    }
    unshiftNode(node) {
        if (node === this.head) {
            return;
        }
        if (node.list) {
            node.list.removeNode(node);
        }
        const head = this.head;
        node.list = this;
        node.next = head;
        if (head) {
            head.prev = node;
        }
        this.head = node;
        if (!this.tail) {
            this.tail = node;
        }
        this.length++;
    }
    pushNode(node) {
        if (node === this.tail) {
            return;
        }
        if (node.list) {
            node.list.removeNode(node);
        }
        const tail = this.tail;
        node.list = this;
        node.prev = tail;
        if (tail) {
            tail.next = node;
        }
        this.tail = node;
        if (!this.head) {
            this.head = node;
        }
        this.length++;
    }
    push(...args) {
        for (let i = 0, l = args.length; i < l; i++) {
            push(this, args[i]);
        }
        return this.length;
    }
    unshift(...args) {
        for (var i = 0, l = args.length; i < l; i++) {
            unshift(this, args[i]);
        }
        return this.length;
    }
    pop() {
        if (!this.tail) {
            return undefined;
        }
        const res = this.tail.value;
        const t = this.tail;
        this.tail = this.tail.prev;
        if (this.tail) {
            this.tail.next = undefined;
        }
        else {
            this.head = undefined;
        }
        t.list = undefined;
        this.length--;
        return res;
    }
    shift() {
        if (!this.head) {
            return undefined;
        }
        const res = this.head.value;
        const h = this.head;
        this.head = this.head.next;
        if (this.head) {
            this.head.prev = undefined;
        }
        else {
            this.tail = undefined;
        }
        h.list = undefined;
        this.length--;
        return res;
    }
    forEach(fn, thisp) {
        thisp = thisp || this;
        for (let walker = this.head, i = 0; !!walker; i++) {
            fn.call(thisp, walker.value, i, this);
            walker = walker.next;
        }
    }
    forEachReverse(fn, thisp) {
        thisp = thisp || this;
        for (let walker = this.tail, i = this.length - 1; !!walker; i--) {
            fn.call(thisp, walker.value, i, this);
            walker = walker.prev;
        }
    }
    get(n) {
        let i = 0;
        let walker = this.head;
        for (; !!walker && i < n; i++) {
            walker = walker.next;
        }
        if (i === n && !!walker) {
            return walker.value;
        }
    }
    getReverse(n) {
        let i = 0;
        let walker = this.tail;
        for (; !!walker && i < n; i++) {
            // abort out of the list early if we hit a cycle
            walker = walker.prev;
        }
        if (i === n && !!walker) {
            return walker.value;
        }
    }
    map(fn, thisp) {
        thisp = thisp || this;
        const res = new Yallist();
        for (let walker = this.head; !!walker;) {
            res.push(fn.call(thisp, walker.value, this));
            walker = walker.next;
        }
        return res;
    }
    mapReverse(fn, thisp) {
        thisp = thisp || this;
        var res = new Yallist();
        for (let walker = this.tail; !!walker;) {
            res.push(fn.call(thisp, walker.value, this));
            walker = walker.prev;
        }
        return res;
    }
    reduce(fn, initial) {
        let acc;
        let walker = this.head;
        if (arguments.length > 1) {
            acc = initial;
        }
        else if (this.head) {
            walker = this.head.next;
            acc = this.head.value;
        }
        else {
            throw new TypeError('Reduce of empty list with no initial value');
        }
        for (var i = 0; !!walker; i++) {
            acc = fn(acc, walker.value, i);
            walker = walker.next;
        }
        return acc;
    }
    reduceReverse(fn, initial) {
        let acc;
        let walker = this.tail;
        if (arguments.length > 1) {
            acc = initial;
        }
        else if (this.tail) {
            walker = this.tail.prev;
            acc = this.tail.value;
        }
        else {
            throw new TypeError('Reduce of empty list with no initial value');
        }
        for (let i = this.length - 1; !!walker; i--) {
            acc = fn(acc, walker.value, i);
            walker = walker.prev;
        }
        return acc;
    }
    toArray() {
        const arr = new Array(this.length);
        for (let i = 0, walker = this.head; !!walker; i++) {
            arr[i] = walker.value;
            walker = walker.next;
        }
        return arr;
    }
    toArrayReverse() {
        const arr = new Array(this.length);
        for (let i = 0, walker = this.tail; !!walker; i++) {
            arr[i] = walker.value;
            walker = walker.prev;
        }
        return arr;
    }
    slice(from = 0, to = this.length) {
        if (to < 0) {
            to += this.length;
        }
        if (from < 0) {
            from += this.length;
        }
        const ret = new Yallist();
        if (to < from || to < 0) {
            return ret;
        }
        if (from < 0) {
            from = 0;
        }
        if (to > this.length) {
            to = this.length;
        }
        let walker = this.head;
        let i = 0;
        for (i = 0; !!walker && i < from; i++) {
            walker = walker.next;
        }
        for (; !!walker && i < to; i++, walker = walker.next) {
            ret.push(walker.value);
        }
        return ret;
    }
    sliceReverse(from = 0, to = this.length) {
        if (to < 0) {
            to += this.length;
        }
        if (from < 0) {
            from += this.length;
        }
        const ret = new Yallist();
        if (to < from || to < 0) {
            return ret;
        }
        if (from < 0) {
            from = 0;
        }
        if (to > this.length) {
            to = this.length;
        }
        let i = this.length;
        let walker = this.tail;
        for (; !!walker && i > to; i--) {
            walker = walker.prev;
        }
        for (; !!walker && i > from; i--, walker = walker.prev) {
            ret.push(walker.value);
        }
        return ret;
    }
    splice(start, deleteCount = 0, ...nodes) {
        if (start > this.length) {
            start = this.length - 1;
        }
        if (start < 0) {
            start = this.length + start;
        }
        let walker = this.head;
        for (let i = 0; !!walker && i < start; i++) {
            walker = walker.next;
        }
        const ret = [];
        for (let i = 0; !!walker && i < deleteCount; i++) {
            ret.push(walker.value);
            walker = this.removeNode(walker);
        }
        if (!walker) {
            walker = this.tail;
        }
        else if (walker !== this.tail) {
            walker = walker.prev;
        }
        for (const v of nodes) {
            walker = insertAfter(this, walker, v);
        }
        return ret;
    }
    reverse() {
        const head = this.head;
        const tail = this.tail;
        for (let walker = head; !!walker; walker = walker.prev) {
            const p = walker.prev;
            walker.prev = walker.next;
            walker.next = p;
        }
        this.head = tail;
        this.tail = head;
        return this;
    }
}
exports.Yallist = Yallist;
// insertAfter undefined means "make the node the new head of list"
function insertAfter(self, node, value) {
    const prev = node;
    const next = node ? node.next : self.head;
    const inserted = new Node(value, prev, next, self);
    if (inserted.next === undefined) {
        self.tail = inserted;
    }
    if (inserted.prev === undefined) {
        self.head = inserted;
    }
    self.length++;
    return inserted;
}
function push(self, item) {
    self.tail = new Node(item, self.tail, undefined, self);
    if (!self.head) {
        self.head = self.tail;
    }
    self.length++;
}
function unshift(self, item) {
    self.head = new Node(item, undefined, self.head, self);
    if (!self.tail) {
        self.tail = self.head;
    }
    self.length++;
}
class Node {
    list;
    next;
    prev;
    value;
    constructor(value, prev, next, list) {
        this.list = list;
        this.value = value;
        if (prev) {
            prev.next = this;
            this.prev = prev;
        }
        else {
            this.prev = undefined;
        }
        if (next) {
            next.prev = this;
            this.next = next;
        }
        else {
            this.next = undefined;
        }
    }
}
exports.Node = Node;
//# sourceMappingURL=index.js.map