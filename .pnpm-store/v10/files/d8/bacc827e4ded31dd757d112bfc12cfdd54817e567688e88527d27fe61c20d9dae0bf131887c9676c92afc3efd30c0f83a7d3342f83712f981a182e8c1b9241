import { EventEmitter } from 'eventemitter3';
export class List extends EventEmitter {
    [Symbol.toStringTag] = 'List';
    constructor(values) {
        super();
        if (values) {
            this.push(...values);
        }
    }
    data = new Set();
    toSet() {
        return new Set(this.data);
    }
    toArray() {
        return Array.from(this.data);
    }
    toJSON() {
        return JSON.stringify(Array.from(this.data));
    }
    toString() {
        return this.join(',');
    }
    _set(index, value, _delete = false) {
        if (Math.abs(index) > this.data.size) {
            throw new ReferenceError('Can not set an element outside the bounds of the list');
        }
        const data = Array.from(this.data);
        data.splice(index, +_delete, value);
        this.data = new Set(data);
        this.emit('update');
    }
    set(index, value) {
        this._set(index, value, true);
    }
    deleteAt(index) {
        if (Math.abs(index) > this.data.size) {
            throw new ReferenceError('Can not delete an element outside the bounds of the list');
        }
        this.delete(Array.from(this.data).at(index));
    }
    insert(value, index = this.data.size) {
        this._set(index, value, false);
    }
    // Array methods
    at(index) {
        if (Math.abs(index) > this.data.size) {
            throw new ReferenceError('Can not access an element outside the bounds of the list');
        }
        return Array.from(this.data).at(index);
    }
    pop() {
        const item = Array.from(this.data).pop();
        if (item !== undefined) {
            this.delete(item);
        }
        return item;
    }
    push(...items) {
        for (const item of items) {
            this.add(item);
        }
        return this.data.size;
    }
    join(separator) {
        return Array.from(this.data).join(separator);
    }
    splice(start, deleteCount, ...items) {
        if (Math.abs(start) > this.data.size) {
            throw new ReferenceError('Can not splice elements outside the bounds of the list');
        }
        const data = Array.from(this.data);
        const deleted = data.splice(start, deleteCount, ...items);
        this.data = new Set(data);
        this.emit('update');
        return deleted;
    }
    // Set methods
    add(value) {
        this.data.add(value);
        this.emit('update');
        this.emit('add', value);
        return this;
    }
    clear() {
        this.data.clear();
        this.emit('update');
    }
    delete(value) {
        const success = this.data.delete(value);
        this.emit('update');
        return success;
    }
    has(value) {
        return this.data.has(value);
    }
    get size() {
        return this.data.size;
    }
    // Iteration
    entries() {
        return this.toArray().entries();
    }
    keys() {
        return this.toArray().keys();
    }
    values() {
        return this.data.values();
    }
    [Symbol.iterator]() {
        return this.data[Symbol.iterator]();
    }
}
