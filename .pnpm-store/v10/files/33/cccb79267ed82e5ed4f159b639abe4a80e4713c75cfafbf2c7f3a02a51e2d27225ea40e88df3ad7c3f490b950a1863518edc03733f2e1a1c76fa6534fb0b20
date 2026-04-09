"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeJsonObject = exports.ObjectWriter = void 0;
class ObjectWriter {
    #output;
    #isFirst;
    constructor(output) {
        this.#output = output;
        this.#isFirst = false;
    }
    begin() {
        this.#output.push('{');
        this.#isFirst = true;
    }
    end() {
        this.#output.push('}');
        this.#isFirst = false;
    }
    #key(name) {
        if (this.#isFirst) {
            this.#output.push('"');
            this.#isFirst = false;
        }
        else {
            this.#output.push(',"');
        }
        this.#output.push(name);
        this.#output.push('":');
    }
    string(name, value) {
        this.#key(name);
        this.#output.push(JSON.stringify(value));
    }
    stringRaw(name, value) {
        this.#key(name);
        this.#output.push('"');
        this.#output.push(value);
        this.#output.push('"');
    }
    number(name, value) {
        this.#key(name);
        this.#output.push("" + value);
    }
    boolean(name, value) {
        this.#key(name);
        this.#output.push(value ? "true" : "false");
    }
    object(name, value, valueFun) {
        this.#key(name);
        this.begin();
        valueFun(this, value);
        this.end();
    }
    arrayObjects(name, values, valueFun) {
        this.#key(name);
        this.#output.push('[');
        for (let i = 0; i < values.length; ++i) {
            if (i !== 0) {
                this.#output.push(',');
            }
            this.begin();
            valueFun(this, values[i]);
            this.end();
        }
        this.#output.push(']');
    }
}
exports.ObjectWriter = ObjectWriter;
function writeJsonObject(value, fun) {
    const output = [];
    const writer = new ObjectWriter(output);
    writer.begin();
    fun(writer, value);
    writer.end();
    return output.join("");
}
exports.writeJsonObject = writeJsonObject;
