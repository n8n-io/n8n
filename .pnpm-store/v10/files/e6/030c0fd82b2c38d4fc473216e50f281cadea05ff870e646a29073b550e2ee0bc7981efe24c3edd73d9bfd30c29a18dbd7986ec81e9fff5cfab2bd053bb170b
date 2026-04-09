"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
class Queue {
    #pushStack;
    #shiftStack;
    constructor() {
        this.#pushStack = [];
        this.#shiftStack = [];
    }
    get length() {
        return this.#pushStack.length + this.#shiftStack.length;
    }
    push(elem) {
        this.#pushStack.push(elem);
    }
    shift() {
        if (this.#shiftStack.length === 0 && this.#pushStack.length > 0) {
            this.#shiftStack = this.#pushStack.reverse();
            this.#pushStack = [];
        }
        return this.#shiftStack.pop();
    }
    first() {
        return this.#shiftStack.length !== 0
            ? this.#shiftStack[this.#shiftStack.length - 1]
            : this.#pushStack[0];
    }
}
exports.Queue = Queue;
