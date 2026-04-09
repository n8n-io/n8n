"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Binary min-heap implementation used for priority queue.
// Implementation is stable, i.e. push time is considered for equal priorities
class Heap {
    constructor() {
        this.heap = [];
        this.pushCount = Number.MIN_SAFE_INTEGER;
    }

    get length() {
        return this.heap.length;
    }

    empty() {
        this.heap = [];
        return this;
    }

    percUp(index) {
        let p;

        while (index > 0 && smaller(this.heap[index], this.heap[p = parent(index)])) {
            let t = this.heap[index];
            this.heap[index] = this.heap[p];
            this.heap[p] = t;

            index = p;
        }
    }

    percDown(index) {
        let l;

        while ((l = leftChi(index)) < this.heap.length) {
            if (l + 1 < this.heap.length && smaller(this.heap[l + 1], this.heap[l])) {
                l = l + 1;
            }

            if (smaller(this.heap[index], this.heap[l])) {
                break;
            }

            let t = this.heap[index];
            this.heap[index] = this.heap[l];
            this.heap[l] = t;

            index = l;
        }
    }

    push(node) {
        node.pushCount = ++this.pushCount;
        this.heap.push(node);
        this.percUp(this.heap.length - 1);
    }

    unshift(node) {
        return this.heap.push(node);
    }

    shift() {
        let [top] = this.heap;

        this.heap[0] = this.heap[this.heap.length - 1];
        this.heap.pop();
        this.percDown(0);

        return top;
    }

    toArray() {
        return [...this];
    }

    *[Symbol.iterator]() {
        for (let i = 0; i < this.heap.length; i++) {
            yield this.heap[i].data;
        }
    }

    remove(testFn) {
        let j = 0;
        for (let i = 0; i < this.heap.length; i++) {
            if (!testFn(this.heap[i])) {
                this.heap[j] = this.heap[i];
                j++;
            }
        }

        this.heap.splice(j);

        for (let i = parent(this.heap.length - 1); i >= 0; i--) {
            this.percDown(i);
        }

        return this;
    }
}

exports.default = Heap;
function leftChi(i) {
    return (i << 1) + 1;
}

function parent(i) {
    return (i + 1 >> 1) - 1;
}

function smaller(x, y) {
    if (x.priority !== y.priority) {
        return x.priority < y.priority;
    } else {
        return x.pushCount < y.pushCount;
    }
}
module.exports = exports.default;