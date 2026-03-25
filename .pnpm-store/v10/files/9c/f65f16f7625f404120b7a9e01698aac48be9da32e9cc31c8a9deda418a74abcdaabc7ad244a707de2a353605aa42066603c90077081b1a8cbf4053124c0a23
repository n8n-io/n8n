"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CollectionMode;
(function (CollectionMode) {
    CollectionMode[CollectionMode["key"] = 0] = "key";
    CollectionMode[CollectionMode["value"] = 1] = "value";
})(CollectionMode || (CollectionMode = {}));
const CONFIG = Object.freeze({
    key: {
        terminator: '=',
        quotes: {},
    },
    value: {
        terminator: ';',
        quotes: {
            '"': '"',
            "'": "'",
            '{': '}',
        },
    },
});
function connectionStringParser(connectionString, parserConfig = CONFIG) {
    const parsed = {};
    let collectionMode = CollectionMode.key;
    let started = false;
    let finished = false;
    let quoted = false;
    let quote = '';
    let buffer = '';
    let currentKey = '';
    let pointer = 0;
    function start() {
        started = true;
    }
    function finish() {
        finished = true;
    }
    function reset() {
        started = false;
        finished = false;
        quoted = false;
        quote = '';
        buffer = '';
    }
    function config() {
        return collectionMode === CollectionMode.key ? parserConfig.key : parserConfig.value;
    }
    function isTerminator(char) {
        return config().terminator === char;
    }
    function isStartQuote(char) {
        return Object.keys(config().quotes).some((val) => char === val);
    }
    function isEndQuote(char) {
        return quoted && char === config().quotes[quote];
    }
    function push(char) {
        buffer += char;
    }
    function collect() {
        if (!quoted) {
            buffer = buffer.trim();
        }
        switch (collectionMode) {
            case CollectionMode.key:
                currentKey = buffer.toLowerCase();
                collectionMode = CollectionMode.value;
                break;
            case CollectionMode.value:
                collectionMode = CollectionMode.key;
                parsed[currentKey] = buffer;
                currentKey = '';
                break;
        }
        reset();
    }
    while (pointer < connectionString.length) {
        const current = connectionString.charAt(pointer);
        if (!finished) {
            if (!started) {
                if (current.trim()) {
                    start();
                    if (isStartQuote(current)) {
                        quoted = true;
                        quote = current;
                    }
                    else {
                        push(current);
                    }
                }
            }
            else {
                if (quoted && isEndQuote(current)) {
                    const next = connectionString.charAt(pointer + 1);
                    if (current === next) {
                        push(current);
                        pointer++;
                    }
                    else {
                        finish();
                    }
                }
                else if (!quoted && isTerminator(current)) {
                    const next = connectionString.charAt(pointer + 1);
                    if (current === next) {
                        push(current);
                        pointer++;
                    }
                    else {
                        collect();
                    }
                }
                else {
                    push(current);
                }
            }
        }
        else if (isTerminator(current)) {
            collect();
        }
        else if (current.trim()) {
            throw new Error('Malformed connection string');
        }
        pointer++;
    }
    if (quoted && !finished) {
        throw new Error('Connection string terminated unexpectedly');
    }
    else {
        collect();
    }
    return parsed;
}
exports.default = connectionStringParser;
//# sourceMappingURL=connection-string.js.map