"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonableValue = void 0;
const json_1 = require("./json");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class JsonableValue {
    _serialized;
    _value;
    constructor(value) {
        this.value = value;
    }
    set value(value) {
        this._value = value;
        this._serialized = (0, json_1.stringify)(value);
    }
    get value() {
        return this._value;
    }
    get serialized() {
        return this._serialized;
    }
    valueOf() {
        return this._value;
    }
    toString() {
        return this._serialized;
    }
}
exports.JsonableValue = JsonableValue;
