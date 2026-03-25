'use strict';

const libmime = require('libmime');

/**
 * Class Headers to parse and handle message headers. Headers instance allows to
 * check existing, delete or add new headers
 */
class Headers {
    constructor(headers, config) {
        config = config || {};

        if (Array.isArray(headers)) {
            // already using parsed headers
            this.changed = true;
            this.headers = false;
            this.parsed = true;
            this.lines = headers;
        } else {
            // using original string/buffer headers
            this.changed = false;
            this.headers = headers;
            this.parsed = false;
            this.lines = false;
        }
        this.mbox = false;
        this.http = false;

        this.libmime = new libmime.Libmime({ Iconv: config.Iconv });
    }

    hasHeader(key) {
        if (!this.parsed) {
            this._parseHeaders();
        }
        key = this._normalizeHeader(key);
        return typeof this.lines.find(line => line.key === key) === 'object';
    }

    get(key) {
        if (!this.parsed) {
            this._parseHeaders();
        }
        key = this._normalizeHeader(key);
        let lines = this.lines.filter(line => line.key === key).map(line => line.line);

        return lines;
    }

    getDecoded(key) {
        return this.get(key)
            .map(line => this.libmime.decodeHeader(line))
            .filter(line => line && line.value);
    }

    getFirst(key) {
        if (!this.parsed) {
            this._parseHeaders();
        }
        key = this._normalizeHeader(key);
        let header = this.lines.find(line => line.key === key);
        if (!header) {
            return '';
        }
        return ((this.libmime.decodeHeader(header.line) || {}).value || '').toString().trim();
    }

    getList() {
        if (!this.parsed) {
            this._parseHeaders();
        }
        return this.lines;
    }

    add(key, value, index) {
        if (typeof value === 'undefined') {
            return;
        }

        if (typeof value === 'number') {
            value = value.toString();
        }

        if (typeof value === 'string') {
            value = Buffer.from(value);
        }

        value = value.toString('binary');
        this.addFormatted(key, this.libmime.foldLines(key + ': ' + value.replace(/\r?\n/g, ''), 76, false), index);
    }

    addFormatted(key, line, index) {
        if (!this.parsed) {
            this._parseHeaders();
        }
        index = index || 0;
        this.changed = true;

        if (!line) {
            return;
        }

        if (typeof line !== 'string') {
            line = line.toString('binary');
        }

        let header = {
            key: this._normalizeHeader(key),
            line
        };

        if (index < 1) {
            this.lines.unshift(header);
        } else if (index >= this.lines.length) {
            this.lines.push(header);
        } else {
            this.lines.splice(index, 0, header);
        }
    }

    remove(key) {
        if (!this.parsed) {
            this._parseHeaders();
        }
        key = this._normalizeHeader(key);
        for (let i = this.lines.length - 1; i >= 0; i--) {
            if (this.lines[i].key === key) {
                this.changed = true;
                this.lines.splice(i, 1);
            }
        }
    }

    update(key, value, relativeIndex) {
        if (!this.parsed) {
            this._parseHeaders();
        }
        let keyName = key;
        let index = 0;
        key = this._normalizeHeader(key);
        let relativeIndexCount = 0;
        let relativeMatchFound = false;
        for (let i = this.lines.length - 1; i >= 0; i--) {
            if (this.lines[i].key === key) {
                if (relativeIndex && relativeIndex !== relativeIndexCount) {
                    relativeIndexCount++;
                    continue;
                }
                index = i;
                this.changed = true;
                this.lines.splice(i, 1);
                if (relativeIndex) {
                    relativeMatchFound = true;
                    break;
                }
            }
        }

        if (relativeIndex && !relativeMatchFound) {
            return;
        }

        this.add(keyName, value, index);
    }

    build(lineEnd) {
        if (!this.changed && !lineEnd) {
            return typeof this.headers === 'string' ? Buffer.from(this.headers, 'binary') : this.headers;
        }

        if (!this.parsed) {
            this._parseHeaders();
        }

        lineEnd = lineEnd || '\r\n';

        let headers = this.lines.map(line => line.line.replace(/\r?\n/g, lineEnd)).join(lineEnd) + `${lineEnd}${lineEnd}`;

        if (this.mbox) {
            headers = this.mbox + lineEnd + headers;
        }

        if (this.http) {
            headers = this.http + lineEnd + headers;
        }

        return Buffer.from(headers, 'binary');
    }

    _normalizeHeader(key) {
        return (key || '').toLowerCase().trim();
    }

    _parseHeaders() {
        if (!this.headers) {
            this.lines = [];
            this.parsed = true;
            return;
        }

        let lines = this.headers
            .toString('binary')
            .replace(/[\r\n]+$/, '')
            .split(/\r?\n/);

        for (let i = lines.length - 1; i >= 0; i--) {
            let chr = lines[i].charAt(0);
            if (i && (chr === ' ' || chr === '\t')) {
                lines[i - 1] += '\r\n' + lines[i];
                lines.splice(i, 1);
            } else {
                let line = lines[i];
                if (!i && /^From /i.test(line)) {
                    // mbox file
                    this.mbox = line;
                    lines.splice(i, 1);
                    continue;
                } else if (!i && /^POST /i.test(line)) {
                    // HTTP POST request
                    this.http = line;
                    lines.splice(i, 1);
                    continue;
                }
                let key = this._normalizeHeader(line.substr(0, line.indexOf(':')));
                lines[i] = {
                    key,
                    line
                };
            }
        }

        this.lines = lines;
        this.parsed = true;
    }
}

// expose to the world
module.exports = Headers;
