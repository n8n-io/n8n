/*
  @license
	Rollup.js v2.79.2
	Thu, 26 Sep 2024 18:44:14 GMT - commit 48aef33cf2f2a6dfb175afb3bcd6a977c81f1d5c

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
import require$$0, { resolve, basename, extname, dirname, relative as relative$1, win32, posix, isAbsolute as isAbsolute$1 } from 'path';
import process$1 from 'process';
import { performance } from 'perf_hooks';
import { createHash as createHash$1 } from 'crypto';
import { promises } from 'fs';
import { EventEmitter } from 'events';

var version$1 = "2.79.2";

var charToInteger = {};
var chars$1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
for (var i$1 = 0; i$1 < chars$1.length; i$1++) {
    charToInteger[chars$1.charCodeAt(i$1)] = i$1;
}
function decode(mappings) {
    var decoded = [];
    var line = [];
    var segment = [
        0,
        0,
        0,
        0,
        0,
    ];
    var j = 0;
    for (var i = 0, shift = 0, value = 0; i < mappings.length; i++) {
        var c = mappings.charCodeAt(i);
        if (c === 44) { // ","
            segmentify(line, segment, j);
            j = 0;
        }
        else if (c === 59) { // ";"
            segmentify(line, segment, j);
            j = 0;
            decoded.push(line);
            line = [];
            segment[0] = 0;
        }
        else {
            var integer = charToInteger[c];
            if (integer === undefined) {
                throw new Error('Invalid character (' + String.fromCharCode(c) + ')');
            }
            var hasContinuationBit = integer & 32;
            integer &= 31;
            value += integer << shift;
            if (hasContinuationBit) {
                shift += 5;
            }
            else {
                var shouldNegate = value & 1;
                value >>>= 1;
                if (shouldNegate) {
                    value = value === 0 ? -0x80000000 : -value;
                }
                segment[j] += value;
                j++;
                value = shift = 0; // reset
            }
        }
    }
    segmentify(line, segment, j);
    decoded.push(line);
    return decoded;
}
function segmentify(line, segment, j) {
    // This looks ugly, but we're creating specialized arrays with a specific
    // length. This is much faster than creating a new array (which v8 expands to
    // a capacity of 17 after pushing the first item), or slicing out a subarray
    // (which is slow). Length 4 is assumed to be the most frequent, followed by
    // length 5 (since not everything will have an associated name), followed by
    // length 1 (it's probably rare for a source substring to not have an
    // associated segment data).
    if (j === 4)
        line.push([segment[0], segment[1], segment[2], segment[3]]);
    else if (j === 5)
        line.push([segment[0], segment[1], segment[2], segment[3], segment[4]]);
    else if (j === 1)
        line.push([segment[0]]);
}
function encode(decoded) {
    var sourceFileIndex = 0; // second field
    var sourceCodeLine = 0; // third field
    var sourceCodeColumn = 0; // fourth field
    var nameIndex = 0; // fifth field
    var mappings = '';
    for (var i = 0; i < decoded.length; i++) {
        var line = decoded[i];
        if (i > 0)
            mappings += ';';
        if (line.length === 0)
            continue;
        var generatedCodeColumn = 0; // first field
        var lineMappings = [];
        for (var _i = 0, line_1 = line; _i < line_1.length; _i++) {
            var segment = line_1[_i];
            var segmentMappings = encodeInteger(segment[0] - generatedCodeColumn);
            generatedCodeColumn = segment[0];
            if (segment.length > 1) {
                segmentMappings +=
                    encodeInteger(segment[1] - sourceFileIndex) +
                        encodeInteger(segment[2] - sourceCodeLine) +
                        encodeInteger(segment[3] - sourceCodeColumn);
                sourceFileIndex = segment[1];
                sourceCodeLine = segment[2];
                sourceCodeColumn = segment[3];
            }
            if (segment.length === 5) {
                segmentMappings += encodeInteger(segment[4] - nameIndex);
                nameIndex = segment[4];
            }
            lineMappings.push(segmentMappings);
        }
        mappings += lineMappings.join(',');
    }
    return mappings;
}
function encodeInteger(num) {
    var result = '';
    num = num < 0 ? (-num << 1) | 1 : num << 1;
    do {
        var clamped = num & 31;
        num >>>= 5;
        if (num > 0) {
            clamped |= 32;
        }
        result += chars$1[clamped];
    } while (num > 0);
    return result;
}

class BitSet {
	constructor(arg) {
		this.bits = arg instanceof BitSet ? arg.bits.slice() : [];
	}

	add(n) {
		this.bits[n >> 5] |= 1 << (n & 31);
	}

	has(n) {
		return !!(this.bits[n >> 5] & (1 << (n & 31)));
	}
}

class Chunk$1 {
	constructor(start, end, content) {
		this.start = start;
		this.end = end;
		this.original = content;

		this.intro = '';
		this.outro = '';

		this.content = content;
		this.storeName = false;
		this.edited = false;

		// we make these non-enumerable, for sanity while debugging
		Object.defineProperties(this, {
			previous: { writable: true, value: null },
			next: { writable: true, value: null },
		});
	}

	appendLeft(content) {
		this.outro += content;
	}

	appendRight(content) {
		this.intro = this.intro + content;
	}

	clone() {
		const chunk = new Chunk$1(this.start, this.end, this.original);

		chunk.intro = this.intro;
		chunk.outro = this.outro;
		chunk.content = this.content;
		chunk.storeName = this.storeName;
		chunk.edited = this.edited;

		return chunk;
	}

	contains(index) {
		return this.start < index && index < this.end;
	}

	eachNext(fn) {
		let chunk = this;
		while (chunk) {
			fn(chunk);
			chunk = chunk.next;
		}
	}

	eachPrevious(fn) {
		let chunk = this;
		while (chunk) {
			fn(chunk);
			chunk = chunk.previous;
		}
	}

	edit(content, storeName, contentOnly) {
		this.content = content;
		if (!contentOnly) {
			this.intro = '';
			this.outro = '';
		}
		this.storeName = storeName;

		this.edited = true;

		return this;
	}

	prependLeft(content) {
		this.outro = content + this.outro;
	}

	prependRight(content) {
		this.intro = content + this.intro;
	}

	split(index) {
		const sliceIndex = index - this.start;

		const originalBefore = this.original.slice(0, sliceIndex);
		const originalAfter = this.original.slice(sliceIndex);

		this.original = originalBefore;

		const newChunk = new Chunk$1(index, this.end, originalAfter);
		newChunk.outro = this.outro;
		this.outro = '';

		this.end = index;

		if (this.edited) {
			// TODO is this block necessary?...
			newChunk.edit('', false);
			this.content = '';
		} else {
			this.content = originalBefore;
		}

		newChunk.next = this.next;
		if (newChunk.next) newChunk.next.previous = newChunk;
		newChunk.previous = this;
		this.next = newChunk;

		return newChunk;
	}

	toString() {
		return this.intro + this.content + this.outro;
	}

	trimEnd(rx) {
		this.outro = this.outro.replace(rx, '');
		if (this.outro.length) return true;

		const trimmed = this.content.replace(rx, '');

		if (trimmed.length) {
			if (trimmed !== this.content) {
				this.split(this.start + trimmed.length).edit('', undefined, true);
			}
			return true;
		} else {
			this.edit('', undefined, true);

			this.intro = this.intro.replace(rx, '');
			if (this.intro.length) return true;
		}
	}

	trimStart(rx) {
		this.intro = this.intro.replace(rx, '');
		if (this.intro.length) return true;

		const trimmed = this.content.replace(rx, '');

		if (trimmed.length) {
			if (trimmed !== this.content) {
				this.split(this.end - trimmed.length);
				this.edit('', undefined, true);
			}
			return true;
		} else {
			this.edit('', undefined, true);

			this.outro = this.outro.replace(rx, '');
			if (this.outro.length) return true;
		}
	}
}

let btoa = () => {
	throw new Error('Unsupported environment: `window.btoa` or `Buffer` should be supported.');
};
if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
	btoa = (str) => window.btoa(unescape(encodeURIComponent(str)));
} else if (typeof Buffer === 'function') {
	btoa = (str) => Buffer.from(str, 'utf-8').toString('base64');
}

class SourceMap {
	constructor(properties) {
		this.version = 3;
		this.file = properties.file;
		this.sources = properties.sources;
		this.sourcesContent = properties.sourcesContent;
		this.names = properties.names;
		this.mappings = encode(properties.mappings);
	}

	toString() {
		return JSON.stringify(this);
	}

	toUrl() {
		return 'data:application/json;charset=utf-8;base64,' + btoa(this.toString());
	}
}

function guessIndent(code) {
	const lines = code.split('\n');

	const tabbed = lines.filter((line) => /^\t+/.test(line));
	const spaced = lines.filter((line) => /^ {2,}/.test(line));

	if (tabbed.length === 0 && spaced.length === 0) {
		return null;
	}

	// More lines tabbed than spaced? Assume tabs, and
	// default to tabs in the case of a tie (or nothing
	// to go on)
	if (tabbed.length >= spaced.length) {
		return '\t';
	}

	// Otherwise, we need to guess the multiple
	const min = spaced.reduce((previous, current) => {
		const numSpaces = /^ +/.exec(current)[0].length;
		return Math.min(numSpaces, previous);
	}, Infinity);

	return new Array(min + 1).join(' ');
}

function getRelativePath(from, to) {
	const fromParts = from.split(/[/\\]/);
	const toParts = to.split(/[/\\]/);

	fromParts.pop(); // get dirname

	while (fromParts[0] === toParts[0]) {
		fromParts.shift();
		toParts.shift();
	}

	if (fromParts.length) {
		let i = fromParts.length;
		while (i--) fromParts[i] = '..';
	}

	return fromParts.concat(toParts).join('/');
}

const toString$1 = Object.prototype.toString;

function isObject$1(thing) {
	return toString$1.call(thing) === '[object Object]';
}

function getLocator$1(source) {
	const originalLines = source.split('\n');
	const lineOffsets = [];

	for (let i = 0, pos = 0; i < originalLines.length; i++) {
		lineOffsets.push(pos);
		pos += originalLines[i].length + 1;
	}

	return function locate(index) {
		let i = 0;
		let j = lineOffsets.length;
		while (i < j) {
			const m = (i + j) >> 1;
			if (index < lineOffsets[m]) {
				j = m;
			} else {
				i = m + 1;
			}
		}
		const line = i - 1;
		const column = index - lineOffsets[line];
		return { line, column };
	};
}

class Mappings {
	constructor(hires) {
		this.hires = hires;
		this.generatedCodeLine = 0;
		this.generatedCodeColumn = 0;
		this.raw = [];
		this.rawSegments = this.raw[this.generatedCodeLine] = [];
		this.pending = null;
	}

	addEdit(sourceIndex, content, loc, nameIndex) {
		if (content.length) {
			const segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
			if (nameIndex >= 0) {
				segment.push(nameIndex);
			}
			this.rawSegments.push(segment);
		} else if (this.pending) {
			this.rawSegments.push(this.pending);
		}

		this.advance(content);
		this.pending = null;
	}

	addUneditedChunk(sourceIndex, chunk, original, loc, sourcemapLocations) {
		let originalCharIndex = chunk.start;
		let first = true;

		while (originalCharIndex < chunk.end) {
			if (this.hires || first || sourcemapLocations.has(originalCharIndex)) {
				this.rawSegments.push([this.generatedCodeColumn, sourceIndex, loc.line, loc.column]);
			}

			if (original[originalCharIndex] === '\n') {
				loc.line += 1;
				loc.column = 0;
				this.generatedCodeLine += 1;
				this.raw[this.generatedCodeLine] = this.rawSegments = [];
				this.generatedCodeColumn = 0;
				first = true;
			} else {
				loc.column += 1;
				this.generatedCodeColumn += 1;
				first = false;
			}

			originalCharIndex += 1;
		}

		this.pending = null;
	}

	advance(str) {
		if (!str) return;

		const lines = str.split('\n');

		if (lines.length > 1) {
			for (let i = 0; i < lines.length - 1; i++) {
				this.generatedCodeLine++;
				this.raw[this.generatedCodeLine] = this.rawSegments = [];
			}
			this.generatedCodeColumn = 0;
		}

		this.generatedCodeColumn += lines[lines.length - 1].length;
	}
}

const n = '\n';

const warned = {
	insertLeft: false,
	insertRight: false,
	storeName: false,
};

class MagicString {
	constructor(string, options = {}) {
		const chunk = new Chunk$1(0, string.length, string);

		Object.defineProperties(this, {
			original: { writable: true, value: string },
			outro: { writable: true, value: '' },
			intro: { writable: true, value: '' },
			firstChunk: { writable: true, value: chunk },
			lastChunk: { writable: true, value: chunk },
			lastSearchedChunk: { writable: true, value: chunk },
			byStart: { writable: true, value: {} },
			byEnd: { writable: true, value: {} },
			filename: { writable: true, value: options.filename },
			indentExclusionRanges: { writable: true, value: options.indentExclusionRanges },
			sourcemapLocations: { writable: true, value: new BitSet() },
			storedNames: { writable: true, value: {} },
			indentStr: { writable: true, value: guessIndent(string) },
		});

		this.byStart[0] = chunk;
		this.byEnd[string.length] = chunk;
	}

	addSourcemapLocation(char) {
		this.sourcemapLocations.add(char);
	}

	append(content) {
		if (typeof content !== 'string') throw new TypeError('outro content must be a string');

		this.outro += content;
		return this;
	}

	appendLeft(index, content) {
		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byEnd[index];

		if (chunk) {
			chunk.appendLeft(content);
		} else {
			this.intro += content;
		}
		return this;
	}

	appendRight(index, content) {
		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byStart[index];

		if (chunk) {
			chunk.appendRight(content);
		} else {
			this.outro += content;
		}
		return this;
	}

	clone() {
		const cloned = new MagicString(this.original, { filename: this.filename });

		let originalChunk = this.firstChunk;
		let clonedChunk = (cloned.firstChunk = cloned.lastSearchedChunk = originalChunk.clone());

		while (originalChunk) {
			cloned.byStart[clonedChunk.start] = clonedChunk;
			cloned.byEnd[clonedChunk.end] = clonedChunk;

			const nextOriginalChunk = originalChunk.next;
			const nextClonedChunk = nextOriginalChunk && nextOriginalChunk.clone();

			if (nextClonedChunk) {
				clonedChunk.next = nextClonedChunk;
				nextClonedChunk.previous = clonedChunk;

				clonedChunk = nextClonedChunk;
			}

			originalChunk = nextOriginalChunk;
		}

		cloned.lastChunk = clonedChunk;

		if (this.indentExclusionRanges) {
			cloned.indentExclusionRanges = this.indentExclusionRanges.slice();
		}

		cloned.sourcemapLocations = new BitSet(this.sourcemapLocations);

		cloned.intro = this.intro;
		cloned.outro = this.outro;

		return cloned;
	}

	generateDecodedMap(options) {
		options = options || {};

		const sourceIndex = 0;
		const names = Object.keys(this.storedNames);
		const mappings = new Mappings(options.hires);

		const locate = getLocator$1(this.original);

		if (this.intro) {
			mappings.advance(this.intro);
		}

		this.firstChunk.eachNext((chunk) => {
			const loc = locate(chunk.start);

			if (chunk.intro.length) mappings.advance(chunk.intro);

			if (chunk.edited) {
				mappings.addEdit(
					sourceIndex,
					chunk.content,
					loc,
					chunk.storeName ? names.indexOf(chunk.original) : -1
				);
			} else {
				mappings.addUneditedChunk(sourceIndex, chunk, this.original, loc, this.sourcemapLocations);
			}

			if (chunk.outro.length) mappings.advance(chunk.outro);
		});

		return {
			file: options.file ? options.file.split(/[/\\]/).pop() : null,
			sources: [options.source ? getRelativePath(options.file || '', options.source) : null],
			sourcesContent: options.includeContent ? [this.original] : [null],
			names,
			mappings: mappings.raw,
		};
	}

	generateMap(options) {
		return new SourceMap(this.generateDecodedMap(options));
	}

	getIndentString() {
		return this.indentStr === null ? '\t' : this.indentStr;
	}

	indent(indentStr, options) {
		const pattern = /^[^\r\n]/gm;

		if (isObject$1(indentStr)) {
			options = indentStr;
			indentStr = undefined;
		}

		indentStr = indentStr !== undefined ? indentStr : this.indentStr || '\t';

		if (indentStr === '') return this; // noop

		options = options || {};

		// Process exclusion ranges
		const isExcluded = {};

		if (options.exclude) {
			const exclusions =
				typeof options.exclude[0] === 'number' ? [options.exclude] : options.exclude;
			exclusions.forEach((exclusion) => {
				for (let i = exclusion[0]; i < exclusion[1]; i += 1) {
					isExcluded[i] = true;
				}
			});
		}

		let shouldIndentNextCharacter = options.indentStart !== false;
		const replacer = (match) => {
			if (shouldIndentNextCharacter) return `${indentStr}${match}`;
			shouldIndentNextCharacter = true;
			return match;
		};

		this.intro = this.intro.replace(pattern, replacer);

		let charIndex = 0;
		let chunk = this.firstChunk;

		while (chunk) {
			const end = chunk.end;

			if (chunk.edited) {
				if (!isExcluded[charIndex]) {
					chunk.content = chunk.content.replace(pattern, replacer);

					if (chunk.content.length) {
						shouldIndentNextCharacter = chunk.content[chunk.content.length - 1] === '\n';
					}
				}
			} else {
				charIndex = chunk.start;

				while (charIndex < end) {
					if (!isExcluded[charIndex]) {
						const char = this.original[charIndex];

						if (char === '\n') {
							shouldIndentNextCharacter = true;
						} else if (char !== '\r' && shouldIndentNextCharacter) {
							shouldIndentNextCharacter = false;

							if (charIndex === chunk.start) {
								chunk.prependRight(indentStr);
							} else {
								this._splitChunk(chunk, charIndex);
								chunk = chunk.next;
								chunk.prependRight(indentStr);
							}
						}
					}

					charIndex += 1;
				}
			}

			charIndex = chunk.end;
			chunk = chunk.next;
		}

		this.outro = this.outro.replace(pattern, replacer);

		return this;
	}

	insert() {
		throw new Error(
			'magicString.insert(...) is deprecated. Use prependRight(...) or appendLeft(...)'
		);
	}

	insertLeft(index, content) {
		if (!warned.insertLeft) {
			console.warn(
				'magicString.insertLeft(...) is deprecated. Use magicString.appendLeft(...) instead'
			); // eslint-disable-line no-console
			warned.insertLeft = true;
		}

		return this.appendLeft(index, content);
	}

	insertRight(index, content) {
		if (!warned.insertRight) {
			console.warn(
				'magicString.insertRight(...) is deprecated. Use magicString.prependRight(...) instead'
			); // eslint-disable-line no-console
			warned.insertRight = true;
		}

		return this.prependRight(index, content);
	}

	move(start, end, index) {
		if (index >= start && index <= end) throw new Error('Cannot move a selection inside itself');

		this._split(start);
		this._split(end);
		this._split(index);

		const first = this.byStart[start];
		const last = this.byEnd[end];

		const oldLeft = first.previous;
		const oldRight = last.next;

		const newRight = this.byStart[index];
		if (!newRight && last === this.lastChunk) return this;
		const newLeft = newRight ? newRight.previous : this.lastChunk;

		if (oldLeft) oldLeft.next = oldRight;
		if (oldRight) oldRight.previous = oldLeft;

		if (newLeft) newLeft.next = first;
		if (newRight) newRight.previous = last;

		if (!first.previous) this.firstChunk = last.next;
		if (!last.next) {
			this.lastChunk = first.previous;
			this.lastChunk.next = null;
		}

		first.previous = newLeft;
		last.next = newRight || null;

		if (!newLeft) this.firstChunk = first;
		if (!newRight) this.lastChunk = last;
		return this;
	}

	overwrite(start, end, content, options) {
		if (typeof content !== 'string') throw new TypeError('replacement content must be a string');

		while (start < 0) start += this.original.length;
		while (end < 0) end += this.original.length;

		if (end > this.original.length) throw new Error('end is out of bounds');
		if (start === end)
			throw new Error(
				'Cannot overwrite a zero-length range – use appendLeft or prependRight instead'
			);

		this._split(start);
		this._split(end);

		if (options === true) {
			if (!warned.storeName) {
				console.warn(
					'The final argument to magicString.overwrite(...) should be an options object. See https://github.com/rich-harris/magic-string'
				); // eslint-disable-line no-console
				warned.storeName = true;
			}

			options = { storeName: true };
		}
		const storeName = options !== undefined ? options.storeName : false;
		const contentOnly = options !== undefined ? options.contentOnly : false;

		if (storeName) {
			const original = this.original.slice(start, end);
			Object.defineProperty(this.storedNames, original, {
				writable: true,
				value: true,
				enumerable: true,
			});
		}

		const first = this.byStart[start];
		const last = this.byEnd[end];

		if (first) {
			let chunk = first;
			while (chunk !== last) {
				if (chunk.next !== this.byStart[chunk.end]) {
					throw new Error('Cannot overwrite across a split point');
				}
				chunk = chunk.next;
				chunk.edit('', false);
			}

			first.edit(content, storeName, contentOnly);
		} else {
			// must be inserting at the end
			const newChunk = new Chunk$1(start, end, '').edit(content, storeName);

			// TODO last chunk in the array may not be the last chunk, if it's moved...
			last.next = newChunk;
			newChunk.previous = last;
		}
		return this;
	}

	prepend(content) {
		if (typeof content !== 'string') throw new TypeError('outro content must be a string');

		this.intro = content + this.intro;
		return this;
	}

	prependLeft(index, content) {
		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byEnd[index];

		if (chunk) {
			chunk.prependLeft(content);
		} else {
			this.intro = content + this.intro;
		}
		return this;
	}

	prependRight(index, content) {
		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byStart[index];

		if (chunk) {
			chunk.prependRight(content);
		} else {
			this.outro = content + this.outro;
		}
		return this;
	}

	remove(start, end) {
		while (start < 0) start += this.original.length;
		while (end < 0) end += this.original.length;

		if (start === end) return this;

		if (start < 0 || end > this.original.length) throw new Error('Character is out of bounds');
		if (start > end) throw new Error('end must be greater than start');

		this._split(start);
		this._split(end);

		let chunk = this.byStart[start];

		while (chunk) {
			chunk.intro = '';
			chunk.outro = '';
			chunk.edit('');

			chunk = end > chunk.end ? this.byStart[chunk.end] : null;
		}
		return this;
	}

	lastChar() {
		if (this.outro.length) return this.outro[this.outro.length - 1];
		let chunk = this.lastChunk;
		do {
			if (chunk.outro.length) return chunk.outro[chunk.outro.length - 1];
			if (chunk.content.length) return chunk.content[chunk.content.length - 1];
			if (chunk.intro.length) return chunk.intro[chunk.intro.length - 1];
		} while ((chunk = chunk.previous));
		if (this.intro.length) return this.intro[this.intro.length - 1];
		return '';
	}

	lastLine() {
		let lineIndex = this.outro.lastIndexOf(n);
		if (lineIndex !== -1) return this.outro.substr(lineIndex + 1);
		let lineStr = this.outro;
		let chunk = this.lastChunk;
		do {
			if (chunk.outro.length > 0) {
				lineIndex = chunk.outro.lastIndexOf(n);
				if (lineIndex !== -1) return chunk.outro.substr(lineIndex + 1) + lineStr;
				lineStr = chunk.outro + lineStr;
			}

			if (chunk.content.length > 0) {
				lineIndex = chunk.content.lastIndexOf(n);
				if (lineIndex !== -1) return chunk.content.substr(lineIndex + 1) + lineStr;
				lineStr = chunk.content + lineStr;
			}

			if (chunk.intro.length > 0) {
				lineIndex = chunk.intro.lastIndexOf(n);
				if (lineIndex !== -1) return chunk.intro.substr(lineIndex + 1) + lineStr;
				lineStr = chunk.intro + lineStr;
			}
		} while ((chunk = chunk.previous));
		lineIndex = this.intro.lastIndexOf(n);
		if (lineIndex !== -1) return this.intro.substr(lineIndex + 1) + lineStr;
		return this.intro + lineStr;
	}

	slice(start = 0, end = this.original.length) {
		while (start < 0) start += this.original.length;
		while (end < 0) end += this.original.length;

		let result = '';

		// find start chunk
		let chunk = this.firstChunk;
		while (chunk && (chunk.start > start || chunk.end <= start)) {
			// found end chunk before start
			if (chunk.start < end && chunk.end >= end) {
				return result;
			}

			chunk = chunk.next;
		}

		if (chunk && chunk.edited && chunk.start !== start)
			throw new Error(`Cannot use replaced character ${start} as slice start anchor.`);

		const startChunk = chunk;
		while (chunk) {
			if (chunk.intro && (startChunk !== chunk || chunk.start === start)) {
				result += chunk.intro;
			}

			const containsEnd = chunk.start < end && chunk.end >= end;
			if (containsEnd && chunk.edited && chunk.end !== end)
				throw new Error(`Cannot use replaced character ${end} as slice end anchor.`);

			const sliceStart = startChunk === chunk ? start - chunk.start : 0;
			const sliceEnd = containsEnd ? chunk.content.length + end - chunk.end : chunk.content.length;

			result += chunk.content.slice(sliceStart, sliceEnd);

			if (chunk.outro && (!containsEnd || chunk.end === end)) {
				result += chunk.outro;
			}

			if (containsEnd) {
				break;
			}

			chunk = chunk.next;
		}

		return result;
	}

	// TODO deprecate this? not really very useful
	snip(start, end) {
		const clone = this.clone();
		clone.remove(0, start);
		clone.remove(end, clone.original.length);

		return clone;
	}

	_split(index) {
		if (this.byStart[index] || this.byEnd[index]) return;

		let chunk = this.lastSearchedChunk;
		const searchForward = index > chunk.end;

		while (chunk) {
			if (chunk.contains(index)) return this._splitChunk(chunk, index);

			chunk = searchForward ? this.byStart[chunk.end] : this.byEnd[chunk.start];
		}
	}

	_splitChunk(chunk, index) {
		if (chunk.edited && chunk.content.length) {
			// zero-length edited chunks are a special case (overlapping replacements)
			const loc = getLocator$1(this.original)(index);
			throw new Error(
				`Cannot split a chunk that has already been edited (${loc.line}:${loc.column} – "${chunk.original}")`
			);
		}

		const newChunk = chunk.split(index);

		this.byEnd[index] = chunk;
		this.byStart[index] = newChunk;
		this.byEnd[newChunk.end] = newChunk;

		if (chunk === this.lastChunk) this.lastChunk = newChunk;

		this.lastSearchedChunk = chunk;
		return true;
	}

	toString() {
		let str = this.intro;

		let chunk = this.firstChunk;
		while (chunk) {
			str += chunk.toString();
			chunk = chunk.next;
		}

		return str + this.outro;
	}

	isEmpty() {
		let chunk = this.firstChunk;
		do {
			if (
				(chunk.intro.length && chunk.intro.trim()) ||
				(chunk.content.length && chunk.content.trim()) ||
				(chunk.outro.length && chunk.outro.trim())
			)
				return false;
		} while ((chunk = chunk.next));
		return true;
	}

	length() {
		let chunk = this.firstChunk;
		let length = 0;
		do {
			length += chunk.intro.length + chunk.content.length + chunk.outro.length;
		} while ((chunk = chunk.next));
		return length;
	}

	trimLines() {
		return this.trim('[\\r\\n]');
	}

	trim(charType) {
		return this.trimStart(charType).trimEnd(charType);
	}

	trimEndAborted(charType) {
		const rx = new RegExp((charType || '\\s') + '+$');

		this.outro = this.outro.replace(rx, '');
		if (this.outro.length) return true;

		let chunk = this.lastChunk;

		do {
			const end = chunk.end;
			const aborted = chunk.trimEnd(rx);

			// if chunk was trimmed, we have a new lastChunk
			if (chunk.end !== end) {
				if (this.lastChunk === chunk) {
					this.lastChunk = chunk.next;
				}

				this.byEnd[chunk.end] = chunk;
				this.byStart[chunk.next.start] = chunk.next;
				this.byEnd[chunk.next.end] = chunk.next;
			}

			if (aborted) return true;
			chunk = chunk.previous;
		} while (chunk);

		return false;
	}

	trimEnd(charType) {
		this.trimEndAborted(charType);
		return this;
	}
	trimStartAborted(charType) {
		const rx = new RegExp('^' + (charType || '\\s') + '+');

		this.intro = this.intro.replace(rx, '');
		if (this.intro.length) return true;

		let chunk = this.firstChunk;

		do {
			const end = chunk.end;
			const aborted = chunk.trimStart(rx);

			if (chunk.end !== end) {
				// special case...
				if (chunk === this.lastChunk) this.lastChunk = chunk.next;

				this.byEnd[chunk.end] = chunk;
				this.byStart[chunk.next.start] = chunk.next;
				this.byEnd[chunk.next.end] = chunk.next;
			}

			if (aborted) return true;
			chunk = chunk.next;
		} while (chunk);

		return false;
	}

	trimStart(charType) {
		this.trimStartAborted(charType);
		return this;
	}

	hasChanged() {
		return this.original !== this.toString();
	}

	replace(searchValue, replacement) {
		function getReplacement(match, str) {
			if (typeof replacement === 'string') {
				return replacement.replace(/\$(\$|&|\d+)/g, (_, i) => {
					// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter
					if (i === '$') return '$';
					if (i === '&') return match[0];
					const num = +i;
					if (num < match.length) return match[+i];
					return `$${i}`;
				});
			} else {
				return replacement(...match, match.index, str, match.groups);
			}
		}
		function matchAll(re, str) {
			let match;
			const matches = [];
			while ((match = re.exec(str))) {
				matches.push(match);
			}
			return matches;
		}
		if (typeof searchValue !== 'string' && searchValue.global) {
			const matches = matchAll(searchValue, this.original);
			matches.forEach((match) => {
				if (match.index != null)
					this.overwrite(
						match.index,
						match.index + match[0].length,
						getReplacement(match, this.original)
					);
			});
		} else {
			const match = this.original.match(searchValue);
			if (match && match.index != null)
				this.overwrite(
					match.index,
					match.index + match[0].length,
					getReplacement(match, this.original)
				);
		}
		return this;
	}
}

const hasOwnProp = Object.prototype.hasOwnProperty;

class Bundle$1 {
	constructor(options = {}) {
		this.intro = options.intro || '';
		this.separator = options.separator !== undefined ? options.separator : '\n';
		this.sources = [];
		this.uniqueSources = [];
		this.uniqueSourceIndexByFilename = {};
	}

	addSource(source) {
		if (source instanceof MagicString) {
			return this.addSource({
				content: source,
				filename: source.filename,
				separator: this.separator,
			});
		}

		if (!isObject$1(source) || !source.content) {
			throw new Error(
				'bundle.addSource() takes an object with a `content` property, which should be an instance of MagicString, and an optional `filename`'
			);
		}

		['filename', 'indentExclusionRanges', 'separator'].forEach((option) => {
			if (!hasOwnProp.call(source, option)) source[option] = source.content[option];
		});

		if (source.separator === undefined) {
			// TODO there's a bunch of this sort of thing, needs cleaning up
			source.separator = this.separator;
		}

		if (source.filename) {
			if (!hasOwnProp.call(this.uniqueSourceIndexByFilename, source.filename)) {
				this.uniqueSourceIndexByFilename[source.filename] = this.uniqueSources.length;
				this.uniqueSources.push({ filename: source.filename, content: source.content.original });
			} else {
				const uniqueSource = this.uniqueSources[this.uniqueSourceIndexByFilename[source.filename]];
				if (source.content.original !== uniqueSource.content) {
					throw new Error(`Illegal source: same filename (${source.filename}), different contents`);
				}
			}
		}

		this.sources.push(source);
		return this;
	}

	append(str, options) {
		this.addSource({
			content: new MagicString(str),
			separator: (options && options.separator) || '',
		});

		return this;
	}

	clone() {
		const bundle = new Bundle$1({
			intro: this.intro,
			separator: this.separator,
		});

		this.sources.forEach((source) => {
			bundle.addSource({
				filename: source.filename,
				content: source.content.clone(),
				separator: source.separator,
			});
		});

		return bundle;
	}

	generateDecodedMap(options = {}) {
		const names = [];
		this.sources.forEach((source) => {
			Object.keys(source.content.storedNames).forEach((name) => {
				if (!~names.indexOf(name)) names.push(name);
			});
		});

		const mappings = new Mappings(options.hires);

		if (this.intro) {
			mappings.advance(this.intro);
		}

		this.sources.forEach((source, i) => {
			if (i > 0) {
				mappings.advance(this.separator);
			}

			const sourceIndex = source.filename ? this.uniqueSourceIndexByFilename[source.filename] : -1;
			const magicString = source.content;
			const locate = getLocator$1(magicString.original);

			if (magicString.intro) {
				mappings.advance(magicString.intro);
			}

			magicString.firstChunk.eachNext((chunk) => {
				const loc = locate(chunk.start);

				if (chunk.intro.length) mappings.advance(chunk.intro);

				if (source.filename) {
					if (chunk.edited) {
						mappings.addEdit(
							sourceIndex,
							chunk.content,
							loc,
							chunk.storeName ? names.indexOf(chunk.original) : -1
						);
					} else {
						mappings.addUneditedChunk(
							sourceIndex,
							chunk,
							magicString.original,
							loc,
							magicString.sourcemapLocations
						);
					}
				} else {
					mappings.advance(chunk.content);
				}

				if (chunk.outro.length) mappings.advance(chunk.outro);
			});

			if (magicString.outro) {
				mappings.advance(magicString.outro);
			}
		});

		return {
			file: options.file ? options.file.split(/[/\\]/).pop() : null,
			sources: this.uniqueSources.map((source) => {
				return options.file ? getRelativePath(options.file, source.filename) : source.filename;
			}),
			sourcesContent: this.uniqueSources.map((source) => {
				return options.includeContent ? source.content : null;
			}),
			names,
			mappings: mappings.raw,
		};
	}

	generateMap(options) {
		return new SourceMap(this.generateDecodedMap(options));
	}

	getIndentString() {
		const indentStringCounts = {};

		this.sources.forEach((source) => {
			const indentStr = source.content.indentStr;

			if (indentStr === null) return;

			if (!indentStringCounts[indentStr]) indentStringCounts[indentStr] = 0;
			indentStringCounts[indentStr] += 1;
		});

		return (
			Object.keys(indentStringCounts).sort((a, b) => {
				return indentStringCounts[a] - indentStringCounts[b];
			})[0] || '\t'
		);
	}

	indent(indentStr) {
		if (!arguments.length) {
			indentStr = this.getIndentString();
		}

		if (indentStr === '') return this; // noop

		let trailingNewline = !this.intro || this.intro.slice(-1) === '\n';

		this.sources.forEach((source, i) => {
			const separator = source.separator !== undefined ? source.separator : this.separator;
			const indentStart = trailingNewline || (i > 0 && /\r?\n$/.test(separator));

			source.content.indent(indentStr, {
				exclude: source.indentExclusionRanges,
				indentStart, //: trailingNewline || /\r?\n$/.test( separator )  //true///\r?\n/.test( separator )
			});

			trailingNewline = source.content.lastChar() === '\n';
		});

		if (this.intro) {
			this.intro =
				indentStr +
				this.intro.replace(/^[^\n]/gm, (match, index) => {
					return index > 0 ? indentStr + match : match;
				});
		}

		return this;
	}

	prepend(str) {
		this.intro = str + this.intro;
		return this;
	}

	toString() {
		const body = this.sources
			.map((source, i) => {
				const separator = source.separator !== undefined ? source.separator : this.separator;
				const str = (i > 0 ? separator : '') + source.content.toString();

				return str;
			})
			.join('');

		return this.intro + body;
	}

	isEmpty() {
		if (this.intro.length && this.intro.trim()) return false;
		if (this.sources.some((source) => !source.content.isEmpty())) return false;
		return true;
	}

	length() {
		return this.sources.reduce(
			(length, source) => length + source.content.length(),
			this.intro.length
		);
	}

	trimLines() {
		return this.trim('[\\r\\n]');
	}

	trim(charType) {
		return this.trimStart(charType).trimEnd(charType);
	}

	trimStart(charType) {
		const rx = new RegExp('^' + (charType || '\\s') + '+');
		this.intro = this.intro.replace(rx, '');

		if (!this.intro) {
			let source;
			let i = 0;

			do {
				source = this.sources[i++];
				if (!source) {
					break;
				}
			} while (!source.content.trimStartAborted(charType));
		}

		return this;
	}

	trimEnd(charType) {
		const rx = new RegExp((charType || '\\s') + '+$');

		let source;
		let i = this.sources.length - 1;

		do {
			source = this.sources[i--];
			if (!source) {
				this.intro = this.intro.replace(rx, '');
				break;
			}
		} while (!source.content.trimEndAborted(charType));

		return this;
	}
}

const ANY_SLASH_REGEX = /[/\\]/;
function relative(from, to) {
    const fromParts = from.split(ANY_SLASH_REGEX).filter(Boolean);
    const toParts = to.split(ANY_SLASH_REGEX).filter(Boolean);
    if (fromParts[0] === '.')
        fromParts.shift();
    if (toParts[0] === '.')
        toParts.shift();
    while (fromParts[0] && toParts[0] && fromParts[0] === toParts[0]) {
        fromParts.shift();
        toParts.shift();
    }
    while (toParts[0] === '..' && fromParts.length > 0) {
        toParts.shift();
        fromParts.pop();
    }
    while (fromParts.pop()) {
        toParts.unshift('..');
    }
    return toParts.join('/');
}

function getOrCreate(map, key, init) {
    const existing = map.get(key);
    if (existing) {
        return existing;
    }
    const value = init();
    map.set(key, value);
    return value;
}

const UnknownKey = Symbol('Unknown Key');
const UnknownNonAccessorKey = Symbol('Unknown Non-Accessor Key');
const UnknownInteger = Symbol('Unknown Integer');
const EMPTY_PATH = [];
const UNKNOWN_PATH = [UnknownKey];
// For deoptimizations, this means we are modifying an unknown property but did
// not lose track of the object or are creating a setter/getter;
// For assignment effects it means we do not check for setter/getter effects
// but only if something is mutated that is included, which is relevant for
// Object.defineProperty
const UNKNOWN_NON_ACCESSOR_PATH = [UnknownNonAccessorKey];
const UNKNOWN_INTEGER_PATH = [UnknownInteger];
const EntitiesKey = Symbol('Entities');
class PathTracker {
    constructor() {
        this.entityPaths = Object.create(null, {
            [EntitiesKey]: { value: new Set() }
        });
    }
    trackEntityAtPathAndGetIfTracked(path, entity) {
        const trackedEntities = this.getEntities(path);
        if (trackedEntities.has(entity))
            return true;
        trackedEntities.add(entity);
        return false;
    }
    withTrackedEntityAtPath(path, entity, onUntracked, returnIfTracked) {
        const trackedEntities = this.getEntities(path);
        if (trackedEntities.has(entity))
            return returnIfTracked;
        trackedEntities.add(entity);
        const result = onUntracked();
        trackedEntities.delete(entity);
        return result;
    }
    getEntities(path) {
        let currentPaths = this.entityPaths;
        for (const pathSegment of path) {
            currentPaths = currentPaths[pathSegment] =
                currentPaths[pathSegment] ||
                    Object.create(null, { [EntitiesKey]: { value: new Set() } });
        }
        return currentPaths[EntitiesKey];
    }
}
const SHARED_RECURSION_TRACKER = new PathTracker();
class DiscriminatedPathTracker {
    constructor() {
        this.entityPaths = Object.create(null, {
            [EntitiesKey]: { value: new Map() }
        });
    }
    trackEntityAtPathAndGetIfTracked(path, discriminator, entity) {
        let currentPaths = this.entityPaths;
        for (const pathSegment of path) {
            currentPaths = currentPaths[pathSegment] =
                currentPaths[pathSegment] ||
                    Object.create(null, { [EntitiesKey]: { value: new Map() } });
        }
        const trackedEntities = getOrCreate(currentPaths[EntitiesKey], discriminator, () => new Set());
        if (trackedEntities.has(entity))
            return true;
        trackedEntities.add(entity);
        return false;
    }
}

const UnknownValue = Symbol('Unknown Value');
const UnknownTruthyValue = Symbol('Unknown Truthy Value');
class ExpressionEntity {
    constructor() {
        this.included = false;
    }
    deoptimizePath(_path) { }
    deoptimizeThisOnInteractionAtPath({ thisArg }, _path, _recursionTracker) {
        thisArg.deoptimizePath(UNKNOWN_PATH);
    }
    /**
     * If possible it returns a stringifyable literal value for this node that can be used
     * for inlining or comparing values.
     * Otherwise it should return UnknownValue.
     */
    getLiteralValueAtPath(_path, _recursionTracker, _origin) {
        return UnknownValue;
    }
    getReturnExpressionWhenCalledAtPath(_path, _interaction, _recursionTracker, _origin) {
        return UNKNOWN_EXPRESSION;
    }
    hasEffectsOnInteractionAtPath(_path, _interaction, _context) {
        return true;
    }
    include(_context, _includeChildrenRecursively, _options) {
        this.included = true;
    }
    includeCallArguments(context, args) {
        for (const arg of args) {
            arg.include(context, false);
        }
    }
    shouldBeIncluded(_context) {
        return true;
    }
}
const UNKNOWN_EXPRESSION = new (class UnknownExpression extends ExpressionEntity {
})();

const INTERACTION_ACCESSED = 0;
const INTERACTION_ASSIGNED = 1;
const INTERACTION_CALLED = 2;
const NODE_INTERACTION_UNKNOWN_ACCESS = {
    thisArg: null,
    type: INTERACTION_ACCESSED
};
const UNKNOWN_ARG = [UNKNOWN_EXPRESSION];
const NODE_INTERACTION_UNKNOWN_ASSIGNMENT = {
    args: UNKNOWN_ARG,
    thisArg: null,
    type: INTERACTION_ASSIGNED
};
const NO_ARGS = [];
// While this is technically a call without arguments, we can compare against
// this reference in places where precise values or thisArg would make a
// difference
const NODE_INTERACTION_UNKNOWN_CALL = {
    args: NO_ARGS,
    thisArg: null,
    type: INTERACTION_CALLED,
    withNew: false
};

class Variable extends ExpressionEntity {
    constructor(name) {
        super();
        this.name = name;
        this.alwaysRendered = false;
        this.initReached = false;
        this.isId = false;
        this.isReassigned = false;
        this.kind = null;
        this.renderBaseName = null;
        this.renderName = null;
    }
    /**
     * Binds identifiers that reference this variable to this variable.
     * Necessary to be able to change variable names.
     */
    addReference(_identifier) { }
    getBaseVariableName() {
        return this.renderBaseName || this.renderName || this.name;
    }
    getName(getPropertyAccess) {
        const name = this.renderName || this.name;
        return this.renderBaseName ? `${this.renderBaseName}${getPropertyAccess(name)}` : name;
    }
    hasEffectsOnInteractionAtPath(path, { type }, _context) {
        return type !== INTERACTION_ACCESSED || path.length > 0;
    }
    /**
     * Marks this variable as being part of the bundle, which is usually the case when one of
     * its identifiers becomes part of the bundle. Returns true if it has not been included
     * previously.
     * Once a variable is included, it should take care all its declarations are included.
     */
    include() {
        this.included = true;
    }
    markCalledFromTryStatement() { }
    setRenderNames(baseName, name) {
        this.renderBaseName = baseName;
        this.renderName = name;
    }
}

class ExternalVariable extends Variable {
    constructor(module, name) {
        super(name);
        this.referenced = false;
        this.module = module;
        this.isNamespace = name === '*';
    }
    addReference(identifier) {
        this.referenced = true;
        if (this.name === 'default' || this.name === '*') {
            this.module.suggestName(identifier.name);
        }
    }
    hasEffectsOnInteractionAtPath(path, { type }) {
        return type !== INTERACTION_ACCESSED || path.length > (this.isNamespace ? 1 : 0);
    }
    include() {
        if (!this.included) {
            this.included = true;
            this.module.used = true;
        }
    }
}

const BLANK = Object.freeze(Object.create(null));
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

function getLocator(source, options) {
    if (options === void 0) { options = {}; }
    var offsetLine = options.offsetLine || 0;
    var offsetColumn = options.offsetColumn || 0;
    var originalLines = source.split('\n');
    var start = 0;
    var lineRanges = originalLines.map(function (line, i) {
        var end = start + line.length + 1;
        var range = { start: start, end: end, line: i };
        start = end;
        return range;
    });
    var i = 0;
    function rangeContains(range, index) {
        return range.start <= index && index < range.end;
    }
    function getLocation(range, index) {
        return { line: offsetLine + range.line, column: offsetColumn + index - range.start, character: index };
    }
    function locate(search, startIndex) {
        if (typeof search === 'string') {
            search = source.indexOf(search, startIndex || 0);
        }
        var range = lineRanges[i];
        var d = search >= range.end ? 1 : -1;
        while (range) {
            if (rangeContains(range, search))
                return getLocation(range, search);
            i += d;
            range = lineRanges[i];
        }
    }
    return locate;
}
function locate(source, search, options) {
    if (typeof options === 'number') {
        throw new Error('locate takes a { startIndex, offsetLine, offsetColumn } object as the third argument');
    }
    return getLocator(source, options)(search, options && options.startIndex);
}

function spaces(i) {
    let result = '';
    while (i--)
        result += ' ';
    return result;
}
function tabsToSpaces(str) {
    return str.replace(/^\t+/, match => match.split('\t').join('  '));
}
function getCodeFrame(source, line, column) {
    let lines = source.split('\n');
    const frameStart = Math.max(0, line - 3);
    let frameEnd = Math.min(line + 2, lines.length);
    lines = lines.slice(frameStart, frameEnd);
    while (!/\S/.test(lines[lines.length - 1])) {
        lines.pop();
        frameEnd -= 1;
    }
    const digits = String(frameEnd).length;
    return lines
        .map((str, i) => {
        const isErrorLine = frameStart + i + 1 === line;
        let lineNum = String(i + frameStart + 1);
        while (lineNum.length < digits)
            lineNum = ` ${lineNum}`;
        if (isErrorLine) {
            const indicator = spaces(digits + 2 + tabsToSpaces(str.slice(0, column)).length) + '^';
            return `${lineNum}: ${tabsToSpaces(str)}\n${indicator}`;
        }
        return `${lineNum}: ${tabsToSpaces(str)}`;
    })
        .join('\n');
}

function printQuotedStringList(list, verbs) {
    const isSingleItem = list.length <= 1;
    const quotedList = list.map(item => `"${item}"`);
    let output = isSingleItem
        ? quotedList[0]
        : `${quotedList.slice(0, -1).join(', ')} and ${quotedList.slice(-1)[0]}`;
    if (verbs) {
        output += ` ${isSingleItem ? verbs[0] : verbs[1]}`;
    }
    return output;
}

const ABSOLUTE_PATH_REGEX = /^(?:\/|(?:[A-Za-z]:)?[\\|/])/;
const RELATIVE_PATH_REGEX = /^\.?\.(\/|$)/;
function isAbsolute(path) {
    return ABSOLUTE_PATH_REGEX.test(path);
}
function isRelative(path) {
    return RELATIVE_PATH_REGEX.test(path);
}
const BACKSLASH_REGEX = /\\/g;
function normalize(path) {
    return path.replace(BACKSLASH_REGEX, '/');
}

function getAliasName(id) {
    const base = basename(id);
    return base.substring(0, base.length - extname(id).length);
}
function relativeId(id) {
    if (!isAbsolute(id))
        return id;
    return relative(resolve(), id);
}
function isPathFragment(name) {
    // starting with "/", "./", "../", "C:/"
    return (name[0] === '/' || (name[0] === '.' && (name[1] === '/' || name[1] === '.')) || isAbsolute(name));
}
const UPPER_DIR_REGEX = /^(\.\.\/)*\.\.$/;
function getImportPath(importerId, targetPath, stripJsExtension, ensureFileName) {
    let relativePath = normalize(relative(dirname(importerId), targetPath));
    if (stripJsExtension && relativePath.endsWith('.js')) {
        relativePath = relativePath.slice(0, -3);
    }
    if (ensureFileName) {
        if (relativePath === '')
            return '../' + basename(targetPath);
        if (UPPER_DIR_REGEX.test(relativePath)) {
            return relativePath
                .split('/')
                .concat(['..', basename(targetPath)])
                .join('/');
        }
    }
    return !relativePath ? '.' : relativePath.startsWith('..') ? relativePath : './' + relativePath;
}

function error(base) {
    if (!(base instanceof Error))
        base = Object.assign(new Error(base.message), base);
    throw base;
}
function augmentCodeLocation(props, pos, source, id) {
    if (typeof pos === 'object') {
        const { line, column } = pos;
        props.loc = { column, file: id, line };
    }
    else {
        props.pos = pos;
        const { line, column } = locate(source, pos, { offsetLine: 1 });
        props.loc = { column, file: id, line };
    }
    if (props.frame === undefined) {
        const { line, column } = props.loc;
        props.frame = getCodeFrame(source, line, column);
    }
}
var Errors;
(function (Errors) {
    Errors["ALREADY_CLOSED"] = "ALREADY_CLOSED";
    Errors["ASSET_NOT_FINALISED"] = "ASSET_NOT_FINALISED";
    Errors["ASSET_NOT_FOUND"] = "ASSET_NOT_FOUND";
    Errors["ASSET_SOURCE_ALREADY_SET"] = "ASSET_SOURCE_ALREADY_SET";
    Errors["ASSET_SOURCE_MISSING"] = "ASSET_SOURCE_MISSING";
    Errors["BAD_LOADER"] = "BAD_LOADER";
    Errors["CANNOT_EMIT_FROM_OPTIONS_HOOK"] = "CANNOT_EMIT_FROM_OPTIONS_HOOK";
    Errors["CHUNK_NOT_GENERATED"] = "CHUNK_NOT_GENERATED";
    Errors["CHUNK_INVALID"] = "CHUNK_INVALID";
    Errors["CIRCULAR_REEXPORT"] = "CIRCULAR_REEXPORT";
    Errors["CYCLIC_CROSS_CHUNK_REEXPORT"] = "CYCLIC_CROSS_CHUNK_REEXPORT";
    Errors["DEPRECATED_FEATURE"] = "DEPRECATED_FEATURE";
    Errors["EXTERNAL_SYNTHETIC_EXPORTS"] = "EXTERNAL_SYNTHETIC_EXPORTS";
    Errors["FILE_NAME_CONFLICT"] = "FILE_NAME_CONFLICT";
    Errors["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
    Errors["INPUT_HOOK_IN_OUTPUT_PLUGIN"] = "INPUT_HOOK_IN_OUTPUT_PLUGIN";
    Errors["INVALID_CHUNK"] = "INVALID_CHUNK";
    Errors["INVALID_EXPORT_OPTION"] = "INVALID_EXPORT_OPTION";
    Errors["INVALID_EXTERNAL_ID"] = "INVALID_EXTERNAL_ID";
    Errors["INVALID_OPTION"] = "INVALID_OPTION";
    Errors["INVALID_PLUGIN_HOOK"] = "INVALID_PLUGIN_HOOK";
    Errors["INVALID_ROLLUP_PHASE"] = "INVALID_ROLLUP_PHASE";
    Errors["MISSING_EXPORT"] = "MISSING_EXPORT";
    Errors["MISSING_IMPLICIT_DEPENDANT"] = "MISSING_IMPLICIT_DEPENDANT";
    Errors["MIXED_EXPORTS"] = "MIXED_EXPORTS";
    Errors["NAMESPACE_CONFLICT"] = "NAMESPACE_CONFLICT";
    Errors["AMBIGUOUS_EXTERNAL_NAMESPACES"] = "AMBIGUOUS_EXTERNAL_NAMESPACES";
    Errors["NO_TRANSFORM_MAP_OR_AST_WITHOUT_CODE"] = "NO_TRANSFORM_MAP_OR_AST_WITHOUT_CODE";
    Errors["PLUGIN_ERROR"] = "PLUGIN_ERROR";
    Errors["PREFER_NAMED_EXPORTS"] = "PREFER_NAMED_EXPORTS";
    Errors["SYNTHETIC_NAMED_EXPORTS_NEED_NAMESPACE_EXPORT"] = "SYNTHETIC_NAMED_EXPORTS_NEED_NAMESPACE_EXPORT";
    Errors["UNEXPECTED_NAMED_IMPORT"] = "UNEXPECTED_NAMED_IMPORT";
    Errors["UNRESOLVED_ENTRY"] = "UNRESOLVED_ENTRY";
    Errors["UNRESOLVED_IMPORT"] = "UNRESOLVED_IMPORT";
    Errors["VALIDATION_ERROR"] = "VALIDATION_ERROR";
})(Errors || (Errors = {}));
function errAssetNotFinalisedForFileName(name) {
    return {
        code: Errors.ASSET_NOT_FINALISED,
        message: `Plugin error - Unable to get file name for asset "${name}". Ensure that the source is set and that generate is called first.`
    };
}
function errCannotEmitFromOptionsHook() {
    return {
        code: Errors.CANNOT_EMIT_FROM_OPTIONS_HOOK,
        message: `Cannot emit files or set asset sources in the "outputOptions" hook, use the "renderStart" hook instead.`
    };
}
function errChunkNotGeneratedForFileName(name) {
    return {
        code: Errors.CHUNK_NOT_GENERATED,
        message: `Plugin error - Unable to get file name for chunk "${name}". Ensure that generate is called first.`
    };
}
function errChunkInvalid({ fileName, code }, exception) {
    const errorProps = {
        code: Errors.CHUNK_INVALID,
        message: `Chunk "${fileName}" is not valid JavaScript: ${exception.message}.`
    };
    augmentCodeLocation(errorProps, exception.loc, code, fileName);
    return errorProps;
}
function errCircularReexport(exportName, importedModule) {
    return {
        code: Errors.CIRCULAR_REEXPORT,
        id: importedModule,
        message: `"${exportName}" cannot be exported from ${relativeId(importedModule)} as it is a reexport that references itself.`
    };
}
function errCyclicCrossChunkReexport(exportName, exporter, reexporter, importer) {
    return {
        code: Errors.CYCLIC_CROSS_CHUNK_REEXPORT,
        exporter,
        importer,
        message: `Export "${exportName}" of module ${relativeId(exporter)} was reexported through module ${relativeId(reexporter)} while both modules are dependencies of each other and will end up in different chunks by current Rollup settings. This scenario is not well supported at the moment as it will produce a circular dependency between chunks and will likely lead to broken execution order.\nEither change the import in ${relativeId(importer)} to point directly to the exporting module or do not use "preserveModules" to ensure these modules end up in the same chunk.`,
        reexporter
    };
}
function errAssetReferenceIdNotFoundForSetSource(assetReferenceId) {
    return {
        code: Errors.ASSET_NOT_FOUND,
        message: `Plugin error - Unable to set the source for unknown asset "${assetReferenceId}".`
    };
}
function errAssetSourceAlreadySet(name) {
    return {
        code: Errors.ASSET_SOURCE_ALREADY_SET,
        message: `Unable to set the source for asset "${name}", source already set.`
    };
}
function errNoAssetSourceSet(assetName) {
    return {
        code: Errors.ASSET_SOURCE_MISSING,
        message: `Plugin error creating asset "${assetName}" - no asset source set.`
    };
}
function errBadLoader(id) {
    return {
        code: Errors.BAD_LOADER,
        message: `Error loading ${relativeId(id)}: plugin load hook should return a string, a { code, map } object, or nothing/null`
    };
}
function errDeprecation(deprecation) {
    return {
        code: Errors.DEPRECATED_FEATURE,
        ...(typeof deprecation === 'string' ? { message: deprecation } : deprecation)
    };
}
function errFileReferenceIdNotFoundForFilename(assetReferenceId) {
    return {
        code: Errors.FILE_NOT_FOUND,
        message: `Plugin error - Unable to get file name for unknown file "${assetReferenceId}".`
    };
}
function errFileNameConflict(fileName) {
    return {
        code: Errors.FILE_NAME_CONFLICT,
        message: `The emitted file "${fileName}" overwrites a previously emitted file of the same name.`
    };
}
function errInputHookInOutputPlugin(pluginName, hookName) {
    return {
        code: Errors.INPUT_HOOK_IN_OUTPUT_PLUGIN,
        message: `The "${hookName}" hook used by the output plugin ${pluginName} is a build time hook and will not be run for that plugin. Either this plugin cannot be used as an output plugin, or it should have an option to configure it as an output plugin.`
    };
}
function errCannotAssignModuleToChunk(moduleId, assignToAlias, currentAlias) {
    return {
        code: Errors.INVALID_CHUNK,
        message: `Cannot assign ${relativeId(moduleId)} to the "${assignToAlias}" chunk as it is already in the "${currentAlias}" chunk.`
    };
}
function errInvalidExportOptionValue(optionValue) {
    return {
        code: Errors.INVALID_EXPORT_OPTION,
        message: `"output.exports" must be "default", "named", "none", "auto", or left unspecified (defaults to "auto"), received "${optionValue}"`,
        url: `https://rollupjs.org/guide/en/#outputexports`
    };
}
function errIncompatibleExportOptionValue(optionValue, keys, entryModule) {
    return {
        code: 'INVALID_EXPORT_OPTION',
        message: `"${optionValue}" was specified for "output.exports", but entry module "${relativeId(entryModule)}" has the following exports: ${keys.join(', ')}`
    };
}
function errInternalIdCannotBeExternal(source, importer) {
    return {
        code: Errors.INVALID_EXTERNAL_ID,
        message: `'${source}' is imported as an external by ${relativeId(importer)}, but is already an existing non-external module id.`
    };
}
function errInvalidOption(option, urlHash, explanation, value) {
    return {
        code: Errors.INVALID_OPTION,
        message: `Invalid value ${value !== undefined ? `${JSON.stringify(value)} ` : ''}for option "${option}" - ${explanation}.`,
        url: `https://rollupjs.org/guide/en/#${urlHash}`
    };
}
function errInvalidAddonPluginHook(hook, plugin) {
    return {
        code: Errors.INVALID_PLUGIN_HOOK,
        hook,
        message: `Error running plugin hook ${hook} for plugin ${plugin}, expected a string, a function hook or an object with a "handler" string or function.`,
        plugin
    };
}
function errInvalidFunctionPluginHook(hook, plugin) {
    return {
        code: Errors.INVALID_PLUGIN_HOOK,
        hook,
        message: `Error running plugin hook ${hook} for plugin ${plugin}, expected a function hook or an object with a "handler" function.`,
        plugin
    };
}
function errInvalidRollupPhaseForAddWatchFile() {
    return {
        code: Errors.INVALID_ROLLUP_PHASE,
        message: `Cannot call addWatchFile after the build has finished.`
    };
}
function errInvalidRollupPhaseForChunkEmission() {
    return {
        code: Errors.INVALID_ROLLUP_PHASE,
        message: `Cannot emit chunks after module loading has finished.`
    };
}
function errMissingExport(exportName, importingModule, importedModule) {
    return {
        code: Errors.MISSING_EXPORT,
        message: `'${exportName}' is not exported by ${relativeId(importedModule)}, imported by ${relativeId(importingModule)}`,
        url: `https://rollupjs.org/guide/en/#error-name-is-not-exported-by-module`
    };
}
function errImplicitDependantCannotBeExternal(unresolvedId, implicitlyLoadedBefore) {
    return {
        code: Errors.MISSING_IMPLICIT_DEPENDANT,
        message: `Module "${relativeId(unresolvedId)}" that should be implicitly loaded before "${relativeId(implicitlyLoadedBefore)}" cannot be external.`
    };
}
function errUnresolvedImplicitDependant(unresolvedId, implicitlyLoadedBefore) {
    return {
        code: Errors.MISSING_IMPLICIT_DEPENDANT,
        message: `Module "${relativeId(unresolvedId)}" that should be implicitly loaded before "${relativeId(implicitlyLoadedBefore)}" could not be resolved.`
    };
}
function errImplicitDependantIsNotIncluded(module) {
    const implicitDependencies = Array.from(module.implicitlyLoadedBefore, dependency => relativeId(dependency.id)).sort();
    return {
        code: Errors.MISSING_IMPLICIT_DEPENDANT,
        message: `Module "${relativeId(module.id)}" that should be implicitly loaded before ${printQuotedStringList(implicitDependencies)} is not included in the module graph. Either it was not imported by an included module or only via a tree-shaken dynamic import, or no imported bindings were used and it had otherwise no side-effects.`
    };
}
function errMixedExport(facadeModuleId, name) {
    return {
        code: Errors.MIXED_EXPORTS,
        id: facadeModuleId,
        message: `Entry module "${relativeId(facadeModuleId)}" is using named and default exports together. Consumers of your bundle will have to use \`${name || 'chunk'}["default"]\` to access the default export, which may not be what you want. Use \`output.exports: "named"\` to disable this warning`,
        url: `https://rollupjs.org/guide/en/#outputexports`
    };
}
function errNamespaceConflict(name, reexportingModuleId, sources) {
    return {
        code: Errors.NAMESPACE_CONFLICT,
        message: `Conflicting namespaces: "${relativeId(reexportingModuleId)}" re-exports "${name}" from one of the modules ${printQuotedStringList(sources.map(moduleId => relativeId(moduleId)))} (will be ignored)`,
        name,
        reexporter: reexportingModuleId,
        sources
    };
}
function errAmbiguousExternalNamespaces(name, reexportingModule, usedModule, sources) {
    return {
        code: Errors.AMBIGUOUS_EXTERNAL_NAMESPACES,
        message: `Ambiguous external namespace resolution: "${relativeId(reexportingModule)}" re-exports "${name}" from one of the external modules ${printQuotedStringList(sources.map(module => relativeId(module)))}, guessing "${relativeId(usedModule)}".`,
        name,
        reexporter: reexportingModule,
        sources
    };
}
function errNoTransformMapOrAstWithoutCode(pluginName) {
    return {
        code: Errors.NO_TRANSFORM_MAP_OR_AST_WITHOUT_CODE,
        message: `The plugin "${pluginName}" returned a "map" or "ast" without returning ` +
            'a "code". This will be ignored.'
    };
}
function errPreferNamedExports(facadeModuleId) {
    const file = relativeId(facadeModuleId);
    return {
        code: Errors.PREFER_NAMED_EXPORTS,
        id: facadeModuleId,
        message: `Entry module "${file}" is implicitly using "default" export mode, which means for CommonJS output that its default export is assigned to "module.exports". For many tools, such CommonJS output will not be interchangeable with the original ES module. If this is intended, explicitly set "output.exports" to either "auto" or "default", otherwise you might want to consider changing the signature of "${file}" to use named exports only.`,
        url: `https://rollupjs.org/guide/en/#outputexports`
    };
}
function errSyntheticNamedExportsNeedNamespaceExport(id, syntheticNamedExportsOption) {
    return {
        code: Errors.SYNTHETIC_NAMED_EXPORTS_NEED_NAMESPACE_EXPORT,
        id,
        message: `Module "${relativeId(id)}" that is marked with 'syntheticNamedExports: ${JSON.stringify(syntheticNamedExportsOption)}' needs ${typeof syntheticNamedExportsOption === 'string' && syntheticNamedExportsOption !== 'default'
            ? `an explicit export named "${syntheticNamedExportsOption}"`
            : 'a default export'} that does not reexport an unresolved named export of the same module.`
    };
}
function errUnexpectedNamedImport(id, imported, isReexport) {
    const importType = isReexport ? 'reexport' : 'import';
    return {
        code: Errors.UNEXPECTED_NAMED_IMPORT,
        id,
        message: `The named export "${imported}" was ${importType}ed from the external module ${relativeId(id)} even though its interop type is "defaultOnly". Either remove or change this ${importType} or change the value of the "output.interop" option.`,
        url: 'https://rollupjs.org/guide/en/#outputinterop'
    };
}
function errUnexpectedNamespaceReexport(id) {
    return {
        code: Errors.UNEXPECTED_NAMED_IMPORT,
        id,
        message: `There was a namespace "*" reexport from the external module ${relativeId(id)} even though its interop type is "defaultOnly". This will be ignored as namespace reexports only reexport named exports. If this is not intended, either remove or change this reexport or change the value of the "output.interop" option.`,
        url: 'https://rollupjs.org/guide/en/#outputinterop'
    };
}
function errEntryCannotBeExternal(unresolvedId) {
    return {
        code: Errors.UNRESOLVED_ENTRY,
        message: `Entry module cannot be external (${relativeId(unresolvedId)}).`
    };
}
function errUnresolvedEntry(unresolvedId) {
    return {
        code: Errors.UNRESOLVED_ENTRY,
        message: `Could not resolve entry module (${relativeId(unresolvedId)}).`
    };
}
function errUnresolvedImport(source, importer) {
    return {
        code: Errors.UNRESOLVED_IMPORT,
        message: `Could not resolve '${source}' from ${relativeId(importer)}`
    };
}
function errUnresolvedImportTreatedAsExternal(source, importer) {
    return {
        code: Errors.UNRESOLVED_IMPORT,
        importer: relativeId(importer),
        message: `'${source}' is imported by ${relativeId(importer)}, but could not be resolved – treating it as an external dependency`,
        source,
        url: 'https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency'
    };
}
function errExternalSyntheticExports(source, importer) {
    return {
        code: Errors.EXTERNAL_SYNTHETIC_EXPORTS,
        importer: relativeId(importer),
        message: `External '${source}' can not have 'syntheticNamedExports' enabled.`,
        source
    };
}
function errFailedValidation(message) {
    return {
        code: Errors.VALIDATION_ERROR,
        message
    };
}
function errAlreadyClosed() {
    return {
        code: Errors.ALREADY_CLOSED,
        message: 'Bundle is already closed, no more calls to "generate" or "write" are allowed.'
    };
}
function warnDeprecation(deprecation, activeDeprecation, options) {
    warnDeprecationWithOptions(deprecation, activeDeprecation, options.onwarn, options.strictDeprecations);
}
function warnDeprecationWithOptions(deprecation, activeDeprecation, warn, strictDeprecations) {
    if (activeDeprecation || strictDeprecations) {
        const warning = errDeprecation(deprecation);
        if (strictDeprecations) {
            return error(warning);
        }
        warn(warning);
    }
}

const RESERVED_NAMES = new Set([
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'eval',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'implements',
    'import',
    'in',
    'instanceof',
    'interface',
    'let',
    'NaN',
    'new',
    'null',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'undefined',
    'var',
    'void',
    'while',
    'with',
    'yield'
]);
const RESERVED_NAMES$1 = RESERVED_NAMES;

const illegalCharacters = /[^$_a-zA-Z0-9]/g;
const startsWithDigit = (str) => /\d/.test(str[0]);
const needsEscape = (str) => startsWithDigit(str) || RESERVED_NAMES$1.has(str) || str === 'arguments';
function isLegal(str) {
    if (needsEscape(str)) {
        return false;
    }
    return !illegalCharacters.test(str);
}
function makeLegal(str) {
    str = str.replace(/-(\w)/g, (_, letter) => letter.toUpperCase()).replace(illegalCharacters, '_');
    if (needsEscape(str))
        str = `_${str}`;
    return str || '_';
}

class ExternalModule {
    constructor(options, id, moduleSideEffects, meta, renormalizeRenderPath) {
        this.options = options;
        this.id = id;
        this.renormalizeRenderPath = renormalizeRenderPath;
        this.declarations = new Map();
        this.defaultVariableName = '';
        this.dynamicImporters = [];
        this.execIndex = Infinity;
        this.exportedVariables = new Map();
        this.importers = [];
        this.mostCommonSuggestion = 0;
        this.nameSuggestions = new Map();
        this.namespaceVariableName = '';
        this.reexported = false;
        this.renderPath = undefined;
        this.used = false;
        this.variableName = '';
        this.suggestedVariableName = makeLegal(id.split(/[\\/]/).pop());
        const { importers, dynamicImporters } = this;
        const info = (this.info = {
            ast: null,
            code: null,
            dynamicallyImportedIdResolutions: EMPTY_ARRAY,
            dynamicallyImportedIds: EMPTY_ARRAY,
            get dynamicImporters() {
                return dynamicImporters.sort();
            },
            hasDefaultExport: null,
            get hasModuleSideEffects() {
                warnDeprecation('Accessing ModuleInfo.hasModuleSideEffects from plugins is deprecated. Please use ModuleInfo.moduleSideEffects instead.', false, options);
                return info.moduleSideEffects;
            },
            id,
            implicitlyLoadedAfterOneOf: EMPTY_ARRAY,
            implicitlyLoadedBefore: EMPTY_ARRAY,
            importedIdResolutions: EMPTY_ARRAY,
            importedIds: EMPTY_ARRAY,
            get importers() {
                return importers.sort();
            },
            isEntry: false,
            isExternal: true,
            isIncluded: null,
            meta,
            moduleSideEffects,
            syntheticNamedExports: false
        });
        // Hide the deprecated key so that it only warns when accessed explicitly
        Object.defineProperty(this.info, 'hasModuleSideEffects', {
            enumerable: false
        });
    }
    getVariableForExportName(name) {
        const declaration = this.declarations.get(name);
        if (declaration)
            return [declaration];
        const externalVariable = new ExternalVariable(this, name);
        this.declarations.set(name, externalVariable);
        this.exportedVariables.set(externalVariable, name);
        return [externalVariable];
    }
    setRenderPath(options, inputBase) {
        this.renderPath =
            typeof options.paths === 'function' ? options.paths(this.id) : options.paths[this.id];
        if (!this.renderPath) {
            this.renderPath = this.renormalizeRenderPath
                ? normalize(relative$1(inputBase, this.id))
                : this.id;
        }
    }
    suggestName(name) {
        var _a;
        const value = ((_a = this.nameSuggestions.get(name)) !== null && _a !== void 0 ? _a : 0) + 1;
        this.nameSuggestions.set(name, value);
        if (value > this.mostCommonSuggestion) {
            this.mostCommonSuggestion = value;
            this.suggestedVariableName = name;
        }
    }
    warnUnusedImports() {
        const unused = Array.from(this.declarations)
            .filter(([name, declaration]) => name !== '*' && !declaration.included && !this.reexported && !declaration.referenced)
            .map(([name]) => name);
        if (unused.length === 0)
            return;
        const importersSet = new Set();
        for (const name of unused) {
            for (const importer of this.declarations.get(name).module.importers) {
                importersSet.add(importer);
            }
        }
        const importersArray = [...importersSet];
        this.options.onwarn({
            code: 'UNUSED_EXTERNAL_IMPORT',
            message: `${printQuotedStringList(unused, ['is', 'are'])} imported from external module "${this.id}" but never used in ${printQuotedStringList(importersArray.map(importer => relativeId(importer)))}.`,
            names: unused,
            source: this.id,
            sources: importersArray
        });
    }
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getAugmentedNamespace(n) {
  var f = n.default;
	if (typeof f == "function") {
		var a = function () {
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var picomatch$1 = {exports: {}};

var utils$3 = {};

const path$1 = require$$0;
const WIN_SLASH = '\\\\/';
const WIN_NO_SLASH = `[^${WIN_SLASH}]`;

/**
 * Posix glob regex
 */

const DOT_LITERAL = '\\.';
const PLUS_LITERAL = '\\+';
const QMARK_LITERAL = '\\?';
const SLASH_LITERAL = '\\/';
const ONE_CHAR = '(?=.)';
const QMARK = '[^/]';
const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
const NO_DOT = `(?!${DOT_LITERAL})`;
const NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
const NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
const NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
const QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
const STAR = `${QMARK}*?`;

const POSIX_CHARS = {
  DOT_LITERAL,
  PLUS_LITERAL,
  QMARK_LITERAL,
  SLASH_LITERAL,
  ONE_CHAR,
  QMARK,
  END_ANCHOR,
  DOTS_SLASH,
  NO_DOT,
  NO_DOTS,
  NO_DOT_SLASH,
  NO_DOTS_SLASH,
  QMARK_NO_DOT,
  STAR,
  START_ANCHOR
};

/**
 * Windows glob regex
 */

const WINDOWS_CHARS = {
  ...POSIX_CHARS,

  SLASH_LITERAL: `[${WIN_SLASH}]`,
  QMARK: WIN_NO_SLASH,
  STAR: `${WIN_NO_SLASH}*?`,
  DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
  NO_DOT: `(?!${DOT_LITERAL})`,
  NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
  NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
  START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
  END_ANCHOR: `(?:[${WIN_SLASH}]|$)`
};

/**
 * POSIX Bracket Regex
 */

const POSIX_REGEX_SOURCE$1 = {
  alnum: 'a-zA-Z0-9',
  alpha: 'a-zA-Z',
  ascii: '\\x00-\\x7F',
  blank: ' \\t',
  cntrl: '\\x00-\\x1F\\x7F',
  digit: '0-9',
  graph: '\\x21-\\x7E',
  lower: 'a-z',
  print: '\\x20-\\x7E ',
  punct: '\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~',
  space: ' \\t\\r\\n\\v\\f',
  upper: 'A-Z',
  word: 'A-Za-z0-9_',
  xdigit: 'A-Fa-f0-9'
};

var constants$2 = {
  MAX_LENGTH: 1024 * 64,
  POSIX_REGEX_SOURCE: POSIX_REGEX_SOURCE$1,

  // regular expressions
  REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
  REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
  REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
  REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
  REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
  REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,

  // Replace globs with equivalent patterns to reduce parsing time.
  REPLACEMENTS: {
    '***': '*',
    '**/**': '**',
    '**/**/**': '**'
  },

  // Digits
  CHAR_0: 48, /* 0 */
  CHAR_9: 57, /* 9 */

  // Alphabet chars.
  CHAR_UPPERCASE_A: 65, /* A */
  CHAR_LOWERCASE_A: 97, /* a */
  CHAR_UPPERCASE_Z: 90, /* Z */
  CHAR_LOWERCASE_Z: 122, /* z */

  CHAR_LEFT_PARENTHESES: 40, /* ( */
  CHAR_RIGHT_PARENTHESES: 41, /* ) */

  CHAR_ASTERISK: 42, /* * */

  // Non-alphabetic chars.
  CHAR_AMPERSAND: 38, /* & */
  CHAR_AT: 64, /* @ */
  CHAR_BACKWARD_SLASH: 92, /* \ */
  CHAR_CARRIAGE_RETURN: 13, /* \r */
  CHAR_CIRCUMFLEX_ACCENT: 94, /* ^ */
  CHAR_COLON: 58, /* : */
  CHAR_COMMA: 44, /* , */
  CHAR_DOT: 46, /* . */
  CHAR_DOUBLE_QUOTE: 34, /* " */
  CHAR_EQUAL: 61, /* = */
  CHAR_EXCLAMATION_MARK: 33, /* ! */
  CHAR_FORM_FEED: 12, /* \f */
  CHAR_FORWARD_SLASH: 47, /* / */
  CHAR_GRAVE_ACCENT: 96, /* ` */
  CHAR_HASH: 35, /* # */
  CHAR_HYPHEN_MINUS: 45, /* - */
  CHAR_LEFT_ANGLE_BRACKET: 60, /* < */
  CHAR_LEFT_CURLY_BRACE: 123, /* { */
  CHAR_LEFT_SQUARE_BRACKET: 91, /* [ */
  CHAR_LINE_FEED: 10, /* \n */
  CHAR_NO_BREAK_SPACE: 160, /* \u00A0 */
  CHAR_PERCENT: 37, /* % */
  CHAR_PLUS: 43, /* + */
  CHAR_QUESTION_MARK: 63, /* ? */
  CHAR_RIGHT_ANGLE_BRACKET: 62, /* > */
  CHAR_RIGHT_CURLY_BRACE: 125, /* } */
  CHAR_RIGHT_SQUARE_BRACKET: 93, /* ] */
  CHAR_SEMICOLON: 59, /* ; */
  CHAR_SINGLE_QUOTE: 39, /* ' */
  CHAR_SPACE: 32, /*   */
  CHAR_TAB: 9, /* \t */
  CHAR_UNDERSCORE: 95, /* _ */
  CHAR_VERTICAL_LINE: 124, /* | */
  CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279, /* \uFEFF */

  SEP: path$1.sep,

  /**
   * Create EXTGLOB_CHARS
   */

  extglobChars(chars) {
    return {
      '!': { type: 'negate', open: '(?:(?!(?:', close: `))${chars.STAR})` },
      '?': { type: 'qmark', open: '(?:', close: ')?' },
      '+': { type: 'plus', open: '(?:', close: ')+' },
      '*': { type: 'star', open: '(?:', close: ')*' },
      '@': { type: 'at', open: '(?:', close: ')' }
    };
  },

  /**
   * Create GLOB_CHARS
   */

  globChars(win32) {
    return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
  }
};

(function (exports) {

	const path = require$$0;
	const win32 = process.platform === 'win32';
	const {
	  REGEX_BACKSLASH,
	  REGEX_REMOVE_BACKSLASH,
	  REGEX_SPECIAL_CHARS,
	  REGEX_SPECIAL_CHARS_GLOBAL
	} = constants$2;

	exports.isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
	exports.hasRegexChars = str => REGEX_SPECIAL_CHARS.test(str);
	exports.isRegexChar = str => str.length === 1 && exports.hasRegexChars(str);
	exports.escapeRegex = str => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, '\\$1');
	exports.toPosixSlashes = str => str.replace(REGEX_BACKSLASH, '/');

	exports.removeBackslashes = str => {
	  return str.replace(REGEX_REMOVE_BACKSLASH, match => {
	    return match === '\\' ? '' : match;
	  });
	};

	exports.supportsLookbehinds = () => {
	  const segs = process.version.slice(1).split('.').map(Number);
	  if (segs.length === 3 && segs[0] >= 9 || (segs[0] === 8 && segs[1] >= 10)) {
	    return true;
	  }
	  return false;
	};

	exports.isWindows = options => {
	  if (options && typeof options.windows === 'boolean') {
	    return options.windows;
	  }
	  return win32 === true || path.sep === '\\';
	};

	exports.escapeLast = (input, char, lastIdx) => {
	  const idx = input.lastIndexOf(char, lastIdx);
	  if (idx === -1) return input;
	  if (input[idx - 1] === '\\') return exports.escapeLast(input, char, idx - 1);
	  return `${input.slice(0, idx)}\\${input.slice(idx)}`;
	};

	exports.removePrefix = (input, state = {}) => {
	  let output = input;
	  if (output.startsWith('./')) {
	    output = output.slice(2);
	    state.prefix = './';
	  }
	  return output;
	};

	exports.wrapOutput = (input, state = {}, options = {}) => {
	  const prepend = options.contains ? '' : '^';
	  const append = options.contains ? '' : '$';

	  let output = `${prepend}(?:${input})${append}`;
	  if (state.negated === true) {
	    output = `(?:^(?!${output}).*$)`;
	  }
	  return output;
	};
} (utils$3));

const utils$2 = utils$3;
const {
  CHAR_ASTERISK,             /* * */
  CHAR_AT,                   /* @ */
  CHAR_BACKWARD_SLASH,       /* \ */
  CHAR_COMMA,                /* , */
  CHAR_DOT,                  /* . */
  CHAR_EXCLAMATION_MARK,     /* ! */
  CHAR_FORWARD_SLASH,        /* / */
  CHAR_LEFT_CURLY_BRACE,     /* { */
  CHAR_LEFT_PARENTHESES,     /* ( */
  CHAR_LEFT_SQUARE_BRACKET,  /* [ */
  CHAR_PLUS,                 /* + */
  CHAR_QUESTION_MARK,        /* ? */
  CHAR_RIGHT_CURLY_BRACE,    /* } */
  CHAR_RIGHT_PARENTHESES,    /* ) */
  CHAR_RIGHT_SQUARE_BRACKET  /* ] */
} = constants$2;

const isPathSeparator = code => {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
};

const depth = token => {
  if (token.isPrefix !== true) {
    token.depth = token.isGlobstar ? Infinity : 1;
  }
};

/**
 * Quickly scans a glob pattern and returns an object with a handful of
 * useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
 * `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
 * with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
 *
 * ```js
 * const pm = require('picomatch');
 * console.log(pm.scan('foo/bar/*.js'));
 * { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
 * ```
 * @param {String} `str`
 * @param {Object} `options`
 * @return {Object} Returns an object with tokens and regex source string.
 * @api public
 */

const scan$1 = (input, options) => {
  const opts = options || {};

  const length = input.length - 1;
  const scanToEnd = opts.parts === true || opts.scanToEnd === true;
  const slashes = [];
  const tokens = [];
  const parts = [];

  let str = input;
  let index = -1;
  let start = 0;
  let lastIndex = 0;
  let isBrace = false;
  let isBracket = false;
  let isGlob = false;
  let isExtglob = false;
  let isGlobstar = false;
  let braceEscaped = false;
  let backslashes = false;
  let negated = false;
  let negatedExtglob = false;
  let finished = false;
  let braces = 0;
  let prev;
  let code;
  let token = { value: '', depth: 0, isGlob: false };

  const eos = () => index >= length;
  const peek = () => str.charCodeAt(index + 1);
  const advance = () => {
    prev = code;
    return str.charCodeAt(++index);
  };

  while (index < length) {
    code = advance();
    let next;

    if (code === CHAR_BACKWARD_SLASH) {
      backslashes = token.backslashes = true;
      code = advance();

      if (code === CHAR_LEFT_CURLY_BRACE) {
        braceEscaped = true;
      }
      continue;
    }

    if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
      braces++;

      while (eos() !== true && (code = advance())) {
        if (code === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }

        if (code === CHAR_LEFT_CURLY_BRACE) {
          braces++;
          continue;
        }

        if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;

          if (scanToEnd === true) {
            continue;
          }

          break;
        }

        if (braceEscaped !== true && code === CHAR_COMMA) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;

          if (scanToEnd === true) {
            continue;
          }

          break;
        }

        if (code === CHAR_RIGHT_CURLY_BRACE) {
          braces--;

          if (braces === 0) {
            braceEscaped = false;
            isBrace = token.isBrace = true;
            finished = true;
            break;
          }
        }
      }

      if (scanToEnd === true) {
        continue;
      }

      break;
    }

    if (code === CHAR_FORWARD_SLASH) {
      slashes.push(index);
      tokens.push(token);
      token = { value: '', depth: 0, isGlob: false };

      if (finished === true) continue;
      if (prev === CHAR_DOT && index === (start + 1)) {
        start += 2;
        continue;
      }

      lastIndex = index + 1;
      continue;
    }

    if (opts.noext !== true) {
      const isExtglobChar = code === CHAR_PLUS
        || code === CHAR_AT
        || code === CHAR_ASTERISK
        || code === CHAR_QUESTION_MARK
        || code === CHAR_EXCLAMATION_MARK;

      if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
        isGlob = token.isGlob = true;
        isExtglob = token.isExtglob = true;
        finished = true;
        if (code === CHAR_EXCLAMATION_MARK && index === start) {
          negatedExtglob = true;
        }

        if (scanToEnd === true) {
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = true;
              code = advance();
              continue;
            }

            if (code === CHAR_RIGHT_PARENTHESES) {
              isGlob = token.isGlob = true;
              finished = true;
              break;
            }
          }
          continue;
        }
        break;
      }
    }

    if (code === CHAR_ASTERISK) {
      if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
      isGlob = token.isGlob = true;
      finished = true;

      if (scanToEnd === true) {
        continue;
      }
      break;
    }

    if (code === CHAR_QUESTION_MARK) {
      isGlob = token.isGlob = true;
      finished = true;

      if (scanToEnd === true) {
        continue;
      }
      break;
    }

    if (code === CHAR_LEFT_SQUARE_BRACKET) {
      while (eos() !== true && (next = advance())) {
        if (next === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }

        if (next === CHAR_RIGHT_SQUARE_BRACKET) {
          isBracket = token.isBracket = true;
          isGlob = token.isGlob = true;
          finished = true;
          break;
        }
      }

      if (scanToEnd === true) {
        continue;
      }

      break;
    }

    if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
      negated = token.negated = true;
      start++;
      continue;
    }

    if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
      isGlob = token.isGlob = true;

      if (scanToEnd === true) {
        while (eos() !== true && (code = advance())) {
          if (code === CHAR_LEFT_PARENTHESES) {
            backslashes = token.backslashes = true;
            code = advance();
            continue;
          }

          if (code === CHAR_RIGHT_PARENTHESES) {
            finished = true;
            break;
          }
        }
        continue;
      }
      break;
    }

    if (isGlob === true) {
      finished = true;

      if (scanToEnd === true) {
        continue;
      }

      break;
    }
  }

  if (opts.noext === true) {
    isExtglob = false;
    isGlob = false;
  }

  let base = str;
  let prefix = '';
  let glob = '';

  if (start > 0) {
    prefix = str.slice(0, start);
    str = str.slice(start);
    lastIndex -= start;
  }

  if (base && isGlob === true && lastIndex > 0) {
    base = str.slice(0, lastIndex);
    glob = str.slice(lastIndex);
  } else if (isGlob === true) {
    base = '';
    glob = str;
  } else {
    base = str;
  }

  if (base && base !== '' && base !== '/' && base !== str) {
    if (isPathSeparator(base.charCodeAt(base.length - 1))) {
      base = base.slice(0, -1);
    }
  }

  if (opts.unescape === true) {
    if (glob) glob = utils$2.removeBackslashes(glob);

    if (base && backslashes === true) {
      base = utils$2.removeBackslashes(base);
    }
  }

  const state = {
    prefix,
    input,
    start,
    base,
    glob,
    isBrace,
    isBracket,
    isGlob,
    isExtglob,
    isGlobstar,
    negated,
    negatedExtglob
  };

  if (opts.tokens === true) {
    state.maxDepth = 0;
    if (!isPathSeparator(code)) {
      tokens.push(token);
    }
    state.tokens = tokens;
  }

  if (opts.parts === true || opts.tokens === true) {
    let prevIndex;

    for (let idx = 0; idx < slashes.length; idx++) {
      const n = prevIndex ? prevIndex + 1 : start;
      const i = slashes[idx];
      const value = input.slice(n, i);
      if (opts.tokens) {
        if (idx === 0 && start !== 0) {
          tokens[idx].isPrefix = true;
          tokens[idx].value = prefix;
        } else {
          tokens[idx].value = value;
        }
        depth(tokens[idx]);
        state.maxDepth += tokens[idx].depth;
      }
      if (idx !== 0 || value !== '') {
        parts.push(value);
      }
      prevIndex = i;
    }

    if (prevIndex && prevIndex + 1 < input.length) {
      const value = input.slice(prevIndex + 1);
      parts.push(value);

      if (opts.tokens) {
        tokens[tokens.length - 1].value = value;
        depth(tokens[tokens.length - 1]);
        state.maxDepth += tokens[tokens.length - 1].depth;
      }
    }

    state.slashes = slashes;
    state.parts = parts;
  }

  return state;
};

var scan_1 = scan$1;

const constants$1 = constants$2;
const utils$1 = utils$3;

/**
 * Constants
 */

const {
  MAX_LENGTH,
  POSIX_REGEX_SOURCE,
  REGEX_NON_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_BACKREF,
  REPLACEMENTS
} = constants$1;

/**
 * Helpers
 */

const expandRange = (args, options) => {
  if (typeof options.expandRange === 'function') {
    return options.expandRange(...args, options);
  }

  args.sort();
  const value = `[${args.join('-')}]`;

  return value;
};

/**
 * Create the message for a syntax error
 */

const syntaxError = (type, char) => {
  return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
};

/**
 * Parse the given input string.
 * @param {String} input
 * @param {Object} options
 * @return {Object}
 */

const parse$1 = (input, options) => {
  if (typeof input !== 'string') {
    throw new TypeError('Expected a string');
  }

  input = REPLACEMENTS[input] || input;

  const opts = { ...options };
  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;

  let len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }

  const bos = { type: 'bos', value: '', output: opts.prepend || '' };
  const tokens = [bos];

  const capture = opts.capture ? '' : '?:';
  const win32 = utils$1.isWindows(options);

  // create constants based on platform, for windows or posix
  const PLATFORM_CHARS = constants$1.globChars(win32);
  const EXTGLOB_CHARS = constants$1.extglobChars(PLATFORM_CHARS);

  const {
    DOT_LITERAL,
    PLUS_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOT_SLASH,
    NO_DOTS_SLASH,
    QMARK,
    QMARK_NO_DOT,
    STAR,
    START_ANCHOR
  } = PLATFORM_CHARS;

  const globstar = opts => {
    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
  };

  const nodot = opts.dot ? '' : NO_DOT;
  const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
  let star = opts.bash === true ? globstar(opts) : STAR;

  if (opts.capture) {
    star = `(${star})`;
  }

  // minimatch options support
  if (typeof opts.noext === 'boolean') {
    opts.noextglob = opts.noext;
  }

  const state = {
    input,
    index: -1,
    start: 0,
    dot: opts.dot === true,
    consumed: '',
    output: '',
    prefix: '',
    backtrack: false,
    negated: false,
    brackets: 0,
    braces: 0,
    parens: 0,
    quotes: 0,
    globstar: false,
    tokens
  };

  input = utils$1.removePrefix(input, state);
  len = input.length;

  const extglobs = [];
  const braces = [];
  const stack = [];
  let prev = bos;
  let value;

  /**
   * Tokenizing helpers
   */

  const eos = () => state.index === len - 1;
  const peek = state.peek = (n = 1) => input[state.index + n];
  const advance = state.advance = () => input[++state.index] || '';
  const remaining = () => input.slice(state.index + 1);
  const consume = (value = '', num = 0) => {
    state.consumed += value;
    state.index += num;
  };

  const append = token => {
    state.output += token.output != null ? token.output : token.value;
    consume(token.value);
  };

  const negate = () => {
    let count = 1;

    while (peek() === '!' && (peek(2) !== '(' || peek(3) === '?')) {
      advance();
      state.start++;
      count++;
    }

    if (count % 2 === 0) {
      return false;
    }

    state.negated = true;
    state.start++;
    return true;
  };

  const increment = type => {
    state[type]++;
    stack.push(type);
  };

  const decrement = type => {
    state[type]--;
    stack.pop();
  };

  /**
   * Push tokens onto the tokens array. This helper speeds up
   * tokenizing by 1) helping us avoid backtracking as much as possible,
   * and 2) helping us avoid creating extra tokens when consecutive
   * characters are plain text. This improves performance and simplifies
   * lookbehinds.
   */

  const push = tok => {
    if (prev.type === 'globstar') {
      const isBrace = state.braces > 0 && (tok.type === 'comma' || tok.type === 'brace');
      const isExtglob = tok.extglob === true || (extglobs.length && (tok.type === 'pipe' || tok.type === 'paren'));

      if (tok.type !== 'slash' && tok.type !== 'paren' && !isBrace && !isExtglob) {
        state.output = state.output.slice(0, -prev.output.length);
        prev.type = 'star';
        prev.value = '*';
        prev.output = star;
        state.output += prev.output;
      }
    }

    if (extglobs.length && tok.type !== 'paren') {
      extglobs[extglobs.length - 1].inner += tok.value;
    }

    if (tok.value || tok.output) append(tok);
    if (prev && prev.type === 'text' && tok.type === 'text') {
      prev.value += tok.value;
      prev.output = (prev.output || '') + tok.value;
      return;
    }

    tok.prev = prev;
    tokens.push(tok);
    prev = tok;
  };

  const extglobOpen = (type, value) => {
    const token = { ...EXTGLOB_CHARS[value], conditions: 1, inner: '' };

    token.prev = prev;
    token.parens = state.parens;
    token.output = state.output;
    const output = (opts.capture ? '(' : '') + token.open;

    increment('parens');
    push({ type, value, output: state.output ? '' : ONE_CHAR });
    push({ type: 'paren', extglob: true, value: advance(), output });
    extglobs.push(token);
  };

  const extglobClose = token => {
    let output = token.close + (opts.capture ? ')' : '');
    let rest;

    if (token.type === 'negate') {
      let extglobStar = star;

      if (token.inner && token.inner.length > 1 && token.inner.includes('/')) {
        extglobStar = globstar(opts);
      }

      if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
        output = token.close = `)$))${extglobStar}`;
      }

      if (token.inner.includes('*') && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
        // Any non-magical string (`.ts`) or even nested expression (`.{ts,tsx}`) can follow after the closing parenthesis.
        // In this case, we need to parse the string and use it in the output of the original pattern.
        // Suitable patterns: `/!(*.d).ts`, `/!(*.d).{ts,tsx}`, `**/!(*-dbg).@(js)`.
        //
        // Disabling the `fastpaths` option due to a problem with parsing strings as `.ts` in the pattern like `**/!(*.d).ts`.
        const expression = parse$1(rest, { ...options, fastpaths: false }).output;

        output = token.close = `)${expression})${extglobStar})`;
      }

      if (token.prev.type === 'bos') {
        state.negatedExtglob = true;
      }
    }

    push({ type: 'paren', extglob: true, value, output });
    decrement('parens');
  };

  /**
   * Fast paths
   */

  if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
    let backslashes = false;

    let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
      if (first === '\\') {
        backslashes = true;
        return m;
      }

      if (first === '?') {
        if (esc) {
          return esc + first + (rest ? QMARK.repeat(rest.length) : '');
        }
        if (index === 0) {
          return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : '');
        }
        return QMARK.repeat(chars.length);
      }

      if (first === '.') {
        return DOT_LITERAL.repeat(chars.length);
      }

      if (first === '*') {
        if (esc) {
          return esc + first + (rest ? star : '');
        }
        return star;
      }
      return esc ? m : `\\${m}`;
    });

    if (backslashes === true) {
      if (opts.unescape === true) {
        output = output.replace(/\\/g, '');
      } else {
        output = output.replace(/\\+/g, m => {
          return m.length % 2 === 0 ? '\\\\' : (m ? '\\' : '');
        });
      }
    }

    if (output === input && opts.contains === true) {
      state.output = input;
      return state;
    }

    state.output = utils$1.wrapOutput(output, state, options);
    return state;
  }

  /**
   * Tokenize input until we reach end-of-string
   */

  while (!eos()) {
    value = advance();

    if (value === '\u0000') {
      continue;
    }

    /**
     * Escaped characters
     */

    if (value === '\\') {
      const next = peek();

      if (next === '/' && opts.bash !== true) {
        continue;
      }

      if (next === '.' || next === ';') {
        continue;
      }

      if (!next) {
        value += '\\';
        push({ type: 'text', value });
        continue;
      }

      // collapse slashes to reduce potential for exploits
      const match = /^\\+/.exec(remaining());
      let slashes = 0;

      if (match && match[0].length > 2) {
        slashes = match[0].length;
        state.index += slashes;
        if (slashes % 2 !== 0) {
          value += '\\';
        }
      }

      if (opts.unescape === true) {
        value = advance();
      } else {
        value += advance();
      }

      if (state.brackets === 0) {
        push({ type: 'text', value });
        continue;
      }
    }

    /**
     * If we're inside a regex character class, continue
     * until we reach the closing bracket.
     */

    if (state.brackets > 0 && (value !== ']' || prev.value === '[' || prev.value === '[^')) {
      if (opts.posix !== false && value === ':') {
        const inner = prev.value.slice(1);
        if (inner.includes('[')) {
          prev.posix = true;

          if (inner.includes(':')) {
            const idx = prev.value.lastIndexOf('[');
            const pre = prev.value.slice(0, idx);
            const rest = prev.value.slice(idx + 2);
            const posix = POSIX_REGEX_SOURCE[rest];
            if (posix) {
              prev.value = pre + posix;
              state.backtrack = true;
              advance();

              if (!bos.output && tokens.indexOf(prev) === 1) {
                bos.output = ONE_CHAR;
              }
              continue;
            }
          }
        }
      }

      if ((value === '[' && peek() !== ':') || (value === '-' && peek() === ']')) {
        value = `\\${value}`;
      }

      if (value === ']' && (prev.value === '[' || prev.value === '[^')) {
        value = `\\${value}`;
      }

      if (opts.posix === true && value === '!' && prev.value === '[') {
        value = '^';
      }

      prev.value += value;
      append({ value });
      continue;
    }

    /**
     * If we're inside a quoted string, continue
     * until we reach the closing double quote.
     */

    if (state.quotes === 1 && value !== '"') {
      value = utils$1.escapeRegex(value);
      prev.value += value;
      append({ value });
      continue;
    }

    /**
     * Double quotes
     */

    if (value === '"') {
      state.quotes = state.quotes === 1 ? 0 : 1;
      if (opts.keepQuotes === true) {
        push({ type: 'text', value });
      }
      continue;
    }

    /**
     * Parentheses
     */

    if (value === '(') {
      increment('parens');
      push({ type: 'paren', value });
      continue;
    }

    if (value === ')') {
      if (state.parens === 0 && opts.strictBrackets === true) {
        throw new SyntaxError(syntaxError('opening', '('));
      }

      const extglob = extglobs[extglobs.length - 1];
      if (extglob && state.parens === extglob.parens + 1) {
        extglobClose(extglobs.pop());
        continue;
      }

      push({ type: 'paren', value, output: state.parens ? ')' : '\\)' });
      decrement('parens');
      continue;
    }

    /**
     * Square brackets
     */

    if (value === '[') {
      if (opts.nobracket === true || !remaining().includes(']')) {
        if (opts.nobracket !== true && opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError('closing', ']'));
        }

        value = `\\${value}`;
      } else {
        increment('brackets');
      }

      push({ type: 'bracket', value });
      continue;
    }

    if (value === ']') {
      if (opts.nobracket === true || (prev && prev.type === 'bracket' && prev.value.length === 1)) {
        push({ type: 'text', value, output: `\\${value}` });
        continue;
      }

      if (state.brackets === 0) {
        if (opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError('opening', '['));
        }

        push({ type: 'text', value, output: `\\${value}` });
        continue;
      }

      decrement('brackets');

      const prevValue = prev.value.slice(1);
      if (prev.posix !== true && prevValue[0] === '^' && !prevValue.includes('/')) {
        value = `/${value}`;
      }

      prev.value += value;
      append({ value });

      // when literal brackets are explicitly disabled
      // assume we should match with a regex character class
      if (opts.literalBrackets === false || utils$1.hasRegexChars(prevValue)) {
        continue;
      }

      const escaped = utils$1.escapeRegex(prev.value);
      state.output = state.output.slice(0, -prev.value.length);

      // when literal brackets are explicitly enabled
      // assume we should escape the brackets to match literal characters
      if (opts.literalBrackets === true) {
        state.output += escaped;
        prev.value = escaped;
        continue;
      }

      // when the user specifies nothing, try to match both
      prev.value = `(${capture}${escaped}|${prev.value})`;
      state.output += prev.value;
      continue;
    }

    /**
     * Braces
     */

    if (value === '{' && opts.nobrace !== true) {
      increment('braces');

      const open = {
        type: 'brace',
        value,
        output: '(',
        outputIndex: state.output.length,
        tokensIndex: state.tokens.length
      };

      braces.push(open);
      push(open);
      continue;
    }

    if (value === '}') {
      const brace = braces[braces.length - 1];

      if (opts.nobrace === true || !brace) {
        push({ type: 'text', value, output: value });
        continue;
      }

      let output = ')';

      if (brace.dots === true) {
        const arr = tokens.slice();
        const range = [];

        for (let i = arr.length - 1; i >= 0; i--) {
          tokens.pop();
          if (arr[i].type === 'brace') {
            break;
          }
          if (arr[i].type !== 'dots') {
            range.unshift(arr[i].value);
          }
        }

        output = expandRange(range, opts);
        state.backtrack = true;
      }

      if (brace.comma !== true && brace.dots !== true) {
        const out = state.output.slice(0, brace.outputIndex);
        const toks = state.tokens.slice(brace.tokensIndex);
        brace.value = brace.output = '\\{';
        value = output = '\\}';
        state.output = out;
        for (const t of toks) {
          state.output += (t.output || t.value);
        }
      }

      push({ type: 'brace', value, output });
      decrement('braces');
      braces.pop();
      continue;
    }

    /**
     * Pipes
     */

    if (value === '|') {
      if (extglobs.length > 0) {
        extglobs[extglobs.length - 1].conditions++;
      }
      push({ type: 'text', value });
      continue;
    }

    /**
     * Commas
     */

    if (value === ',') {
      let output = value;

      const brace = braces[braces.length - 1];
      if (brace && stack[stack.length - 1] === 'braces') {
        brace.comma = true;
        output = '|';
      }

      push({ type: 'comma', value, output });
      continue;
    }

    /**
     * Slashes
     */

    if (value === '/') {
      // if the beginning of the glob is "./", advance the start
      // to the current index, and don't add the "./" characters
      // to the state. This greatly simplifies lookbehinds when
      // checking for BOS characters like "!" and "." (not "./")
      if (prev.type === 'dot' && state.index === state.start + 1) {
        state.start = state.index + 1;
        state.consumed = '';
        state.output = '';
        tokens.pop();
        prev = bos; // reset "prev" to the first token
        continue;
      }

      push({ type: 'slash', value, output: SLASH_LITERAL });
      continue;
    }

    /**
     * Dots
     */

    if (value === '.') {
      if (state.braces > 0 && prev.type === 'dot') {
        if (prev.value === '.') prev.output = DOT_LITERAL;
        const brace = braces[braces.length - 1];
        prev.type = 'dots';
        prev.output += value;
        prev.value += value;
        brace.dots = true;
        continue;
      }

      if ((state.braces + state.parens) === 0 && prev.type !== 'bos' && prev.type !== 'slash') {
        push({ type: 'text', value, output: DOT_LITERAL });
        continue;
      }

      push({ type: 'dot', value, output: DOT_LITERAL });
      continue;
    }

    /**
     * Question marks
     */

    if (value === '?') {
      const isGroup = prev && prev.value === '(';
      if (!isGroup && opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        extglobOpen('qmark', value);
        continue;
      }

      if (prev && prev.type === 'paren') {
        const next = peek();
        let output = value;

        if (next === '<' && !utils$1.supportsLookbehinds()) {
          throw new Error('Node.js v10 or higher is required for regex lookbehinds');
        }

        if ((prev.value === '(' && !/[!=<:]/.test(next)) || (next === '<' && !/<([!=]|\w+>)/.test(remaining()))) {
          output = `\\${value}`;
        }

        push({ type: 'text', value, output });
        continue;
      }

      if (opts.dot !== true && (prev.type === 'slash' || prev.type === 'bos')) {
        push({ type: 'qmark', value, output: QMARK_NO_DOT });
        continue;
      }

      push({ type: 'qmark', value, output: QMARK });
      continue;
    }

    /**
     * Exclamation
     */

    if (value === '!') {
      if (opts.noextglob !== true && peek() === '(') {
        if (peek(2) !== '?' || !/[!=<:]/.test(peek(3))) {
          extglobOpen('negate', value);
          continue;
        }
      }

      if (opts.nonegate !== true && state.index === 0) {
        negate();
        continue;
      }
    }

    /**
     * Plus
     */

    if (value === '+') {
      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        extglobOpen('plus', value);
        continue;
      }

      if ((prev && prev.value === '(') || opts.regex === false) {
        push({ type: 'plus', value, output: PLUS_LITERAL });
        continue;
      }

      if ((prev && (prev.type === 'bracket' || prev.type === 'paren' || prev.type === 'brace')) || state.parens > 0) {
        push({ type: 'plus', value });
        continue;
      }

      push({ type: 'plus', value: PLUS_LITERAL });
      continue;
    }

    /**
     * Plain text
     */

    if (value === '@') {
      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        push({ type: 'at', extglob: true, value, output: '' });
        continue;
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Plain text
     */

    if (value !== '*') {
      if (value === '$' || value === '^') {
        value = `\\${value}`;
      }

      const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
      if (match) {
        value += match[0];
        state.index += match[0].length;
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Stars
     */

    if (prev && (prev.type === 'globstar' || prev.star === true)) {
      prev.type = 'star';
      prev.star = true;
      prev.value += value;
      prev.output = star;
      state.backtrack = true;
      state.globstar = true;
      consume(value);
      continue;
    }

    let rest = remaining();
    if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
      extglobOpen('star', value);
      continue;
    }

    if (prev.type === 'star') {
      if (opts.noglobstar === true) {
        consume(value);
        continue;
      }

      const prior = prev.prev;
      const before = prior.prev;
      const isStart = prior.type === 'slash' || prior.type === 'bos';
      const afterStar = before && (before.type === 'star' || before.type === 'globstar');

      if (opts.bash === true && (!isStart || (rest[0] && rest[0] !== '/'))) {
        push({ type: 'star', value, output: '' });
        continue;
      }

      const isBrace = state.braces > 0 && (prior.type === 'comma' || prior.type === 'brace');
      const isExtglob = extglobs.length && (prior.type === 'pipe' || prior.type === 'paren');
      if (!isStart && prior.type !== 'paren' && !isBrace && !isExtglob) {
        push({ type: 'star', value, output: '' });
        continue;
      }

      // strip consecutive `/**/`
      while (rest.slice(0, 3) === '/**') {
        const after = input[state.index + 4];
        if (after && after !== '/') {
          break;
        }
        rest = rest.slice(3);
        consume('/**', 3);
      }

      if (prior.type === 'bos' && eos()) {
        prev.type = 'globstar';
        prev.value += value;
        prev.output = globstar(opts);
        state.output = prev.output;
        state.globstar = true;
        consume(value);
        continue;
      }

      if (prior.type === 'slash' && prior.prev.type !== 'bos' && !afterStar && eos()) {
        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;

        prev.type = 'globstar';
        prev.output = globstar(opts) + (opts.strictSlashes ? ')' : '|$)');
        prev.value += value;
        state.globstar = true;
        state.output += prior.output + prev.output;
        consume(value);
        continue;
      }

      if (prior.type === 'slash' && prior.prev.type !== 'bos' && rest[0] === '/') {
        const end = rest[1] !== void 0 ? '|$' : '';

        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;

        prev.type = 'globstar';
        prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
        prev.value += value;

        state.output += prior.output + prev.output;
        state.globstar = true;

        consume(value + advance());

        push({ type: 'slash', value: '/', output: '' });
        continue;
      }

      if (prior.type === 'bos' && rest[0] === '/') {
        prev.type = 'globstar';
        prev.value += value;
        prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
        state.output = prev.output;
        state.globstar = true;
        consume(value + advance());
        push({ type: 'slash', value: '/', output: '' });
        continue;
      }

      // remove single star from output
      state.output = state.output.slice(0, -prev.output.length);

      // reset previous token to globstar
      prev.type = 'globstar';
      prev.output = globstar(opts);
      prev.value += value;

      // reset output with globstar
      state.output += prev.output;
      state.globstar = true;
      consume(value);
      continue;
    }

    const token = { type: 'star', value, output: star };

    if (opts.bash === true) {
      token.output = '.*?';
      if (prev.type === 'bos' || prev.type === 'slash') {
        token.output = nodot + token.output;
      }
      push(token);
      continue;
    }

    if (prev && (prev.type === 'bracket' || prev.type === 'paren') && opts.regex === true) {
      token.output = value;
      push(token);
      continue;
    }

    if (state.index === state.start || prev.type === 'slash' || prev.type === 'dot') {
      if (prev.type === 'dot') {
        state.output += NO_DOT_SLASH;
        prev.output += NO_DOT_SLASH;

      } else if (opts.dot === true) {
        state.output += NO_DOTS_SLASH;
        prev.output += NO_DOTS_SLASH;

      } else {
        state.output += nodot;
        prev.output += nodot;
      }

      if (peek() !== '*') {
        state.output += ONE_CHAR;
        prev.output += ONE_CHAR;
      }
    }

    push(token);
  }

  while (state.brackets > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ']'));
    state.output = utils$1.escapeLast(state.output, '[');
    decrement('brackets');
  }

  while (state.parens > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ')'));
    state.output = utils$1.escapeLast(state.output, '(');
    decrement('parens');
  }

  while (state.braces > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', '}'));
    state.output = utils$1.escapeLast(state.output, '{');
    decrement('braces');
  }

  if (opts.strictSlashes !== true && (prev.type === 'star' || prev.type === 'bracket')) {
    push({ type: 'maybe_slash', value: '', output: `${SLASH_LITERAL}?` });
  }

  // rebuild the output if we had to backtrack at any point
  if (state.backtrack === true) {
    state.output = '';

    for (const token of state.tokens) {
      state.output += token.output != null ? token.output : token.value;

      if (token.suffix) {
        state.output += token.suffix;
      }
    }
  }

  return state;
};

/**
 * Fast paths for creating regular expressions for common glob patterns.
 * This can significantly speed up processing and has very little downside
 * impact when none of the fast paths match.
 */

parse$1.fastpaths = (input, options) => {
  const opts = { ...options };
  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
  const len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }

  input = REPLACEMENTS[input] || input;
  const win32 = utils$1.isWindows(options);

  // create constants based on platform, for windows or posix
  const {
    DOT_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOTS,
    NO_DOTS_SLASH,
    STAR,
    START_ANCHOR
  } = constants$1.globChars(win32);

  const nodot = opts.dot ? NO_DOTS : NO_DOT;
  const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
  const capture = opts.capture ? '' : '?:';
  const state = { negated: false, prefix: '' };
  let star = opts.bash === true ? '.*?' : STAR;

  if (opts.capture) {
    star = `(${star})`;
  }

  const globstar = opts => {
    if (opts.noglobstar === true) return star;
    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
  };

  const create = str => {
    switch (str) {
      case '*':
        return `${nodot}${ONE_CHAR}${star}`;

      case '.*':
        return `${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '*.*':
        return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '*/*':
        return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;

      case '**':
        return nodot + globstar(opts);

      case '**/*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;

      case '**/*.*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '**/.*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;

      default: {
        const match = /^(.*?)\.(\w+)$/.exec(str);
        if (!match) return;

        const source = create(match[1]);
        if (!source) return;

        return source + DOT_LITERAL + match[2];
      }
    }
  };

  const output = utils$1.removePrefix(input, state);
  let source = create(output);

  if (source && opts.strictSlashes !== true) {
    source += `${SLASH_LITERAL}?`;
  }

  return source;
};

var parse_1 = parse$1;

const path = require$$0;
const scan = scan_1;
const parse = parse_1;
const utils = utils$3;
const constants = constants$2;
const isObject = val => val && typeof val === 'object' && !Array.isArray(val);

/**
 * Creates a matcher function from one or more glob patterns. The
 * returned function takes a string to match as its first argument,
 * and returns true if the string is a match. The returned matcher
 * function also takes a boolean as the second argument that, when true,
 * returns an object with additional information.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch(glob[, options]);
 *
 * const isMatch = picomatch('*.!(*a)');
 * console.log(isMatch('a.a')); //=> false
 * console.log(isMatch('a.b')); //=> true
 * ```
 * @name picomatch
 * @param {String|Array} `globs` One or more glob patterns.
 * @param {Object=} `options`
 * @return {Function=} Returns a matcher function.
 * @api public
 */

const picomatch = (glob, options, returnState = false) => {
  if (Array.isArray(glob)) {
    const fns = glob.map(input => picomatch(input, options, returnState));
    const arrayMatcher = str => {
      for (const isMatch of fns) {
        const state = isMatch(str);
        if (state) return state;
      }
      return false;
    };
    return arrayMatcher;
  }

  const isState = isObject(glob) && glob.tokens && glob.input;

  if (glob === '' || (typeof glob !== 'string' && !isState)) {
    throw new TypeError('Expected pattern to be a non-empty string');
  }

  const opts = options || {};
  const posix = utils.isWindows(options);
  const regex = isState
    ? picomatch.compileRe(glob, options)
    : picomatch.makeRe(glob, options, false, true);

  const state = regex.state;
  delete regex.state;

  let isIgnored = () => false;
  if (opts.ignore) {
    const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
    isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
  }

  const matcher = (input, returnObject = false) => {
    const { isMatch, match, output } = picomatch.test(input, regex, options, { glob, posix });
    const result = { glob, state, regex, posix, input, output, match, isMatch };

    if (typeof opts.onResult === 'function') {
      opts.onResult(result);
    }

    if (isMatch === false) {
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (isIgnored(input)) {
      if (typeof opts.onIgnore === 'function') {
        opts.onIgnore(result);
      }
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (typeof opts.onMatch === 'function') {
      opts.onMatch(result);
    }
    return returnObject ? result : true;
  };

  if (returnState) {
    matcher.state = state;
  }

  return matcher;
};

/**
 * Test `input` with the given `regex`. This is used by the main
 * `picomatch()` function to test the input string.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.test(input, regex[, options]);
 *
 * console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
 * // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp} `regex`
 * @return {Object} Returns an object with matching info.
 * @api public
 */

picomatch.test = (input, regex, options, { glob, posix } = {}) => {
  if (typeof input !== 'string') {
    throw new TypeError('Expected input to be a string');
  }

  if (input === '') {
    return { isMatch: false, output: '' };
  }

  const opts = options || {};
  const format = opts.format || (posix ? utils.toPosixSlashes : null);
  let match = input === glob;
  let output = (match && format) ? format(input) : input;

  if (match === false) {
    output = format ? format(input) : input;
    match = output === glob;
  }

  if (match === false || opts.capture === true) {
    if (opts.matchBase === true || opts.basename === true) {
      match = picomatch.matchBase(input, regex, options, posix);
    } else {
      match = regex.exec(output);
    }
  }

  return { isMatch: Boolean(match), match, output };
};

/**
 * Match the basename of a filepath.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.matchBase(input, glob[, options]);
 * console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
 * @return {Boolean}
 * @api public
 */

picomatch.matchBase = (input, glob, options, posix = utils.isWindows(options)) => {
  const regex = glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
  return regex.test(path.basename(input));
};

/**
 * Returns true if **any** of the given glob `patterns` match the specified `string`.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.isMatch(string, patterns[, options]);
 *
 * console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
 * console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
 * ```
 * @param {String|Array} str The string to test.
 * @param {String|Array} patterns One or more glob patterns to use for matching.
 * @param {Object} [options] See available [options](#options).
 * @return {Boolean} Returns true if any patterns match `str`
 * @api public
 */

picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);

/**
 * Parse a glob pattern to create the source string for a regular
 * expression.
 *
 * ```js
 * const picomatch = require('picomatch');
 * const result = picomatch.parse(pattern[, options]);
 * ```
 * @param {String} `pattern`
 * @param {Object} `options`
 * @return {Object} Returns an object with useful properties and output to be used as a regex source string.
 * @api public
 */

picomatch.parse = (pattern, options) => {
  if (Array.isArray(pattern)) return pattern.map(p => picomatch.parse(p, options));
  return parse(pattern, { ...options, fastpaths: false });
};

/**
 * Scan a glob pattern to separate the pattern into segments.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.scan(input[, options]);
 *
 * const result = picomatch.scan('!./foo/*.js');
 * console.log(result);
 * { prefix: '!./',
 *   input: '!./foo/*.js',
 *   start: 3,
 *   base: 'foo',
 *   glob: '*.js',
 *   isBrace: false,
 *   isBracket: false,
 *   isGlob: true,
 *   isExtglob: false,
 *   isGlobstar: false,
 *   negated: true }
 * ```
 * @param {String} `input` Glob pattern to scan.
 * @param {Object} `options`
 * @return {Object} Returns an object with
 * @api public
 */

picomatch.scan = (input, options) => scan(input, options);

/**
 * Compile a regular expression from the `state` object returned by the
 * [parse()](#parse) method.
 *
 * @param {Object} `state`
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
 * @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
 * @return {RegExp}
 * @api public
 */

picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
  if (returnOutput === true) {
    return state.output;
  }

  const opts = options || {};
  const prepend = opts.contains ? '' : '^';
  const append = opts.contains ? '' : '$';

  let source = `${prepend}(?:${state.output})${append}`;
  if (state && state.negated === true) {
    source = `^(?!${source}).*$`;
  }

  const regex = picomatch.toRegex(source, options);
  if (returnState === true) {
    regex.state = state;
  }

  return regex;
};

/**
 * Create a regular expression from a parsed glob pattern.
 *
 * ```js
 * const picomatch = require('picomatch');
 * const state = picomatch.parse('*.js');
 * // picomatch.compileRe(state[, options]);
 *
 * console.log(picomatch.compileRe(state));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `state` The object returned from the `.parse` method.
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
 * @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
 * @return {RegExp} Returns a regex created from the given pattern.
 * @api public
 */

picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
  if (!input || typeof input !== 'string') {
    throw new TypeError('Expected a non-empty string');
  }

  let parsed = { negated: false, fastpaths: true };

  if (options.fastpaths !== false && (input[0] === '.' || input[0] === '*')) {
    parsed.output = parse.fastpaths(input, options);
  }

  if (!parsed.output) {
    parsed = parse(input, options);
  }

  return picomatch.compileRe(parsed, options, returnOutput, returnState);
};

/**
 * Create a regular expression from the given regex source string.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.toRegex(source[, options]);
 *
 * const { output } = picomatch.parse('*.js');
 * console.log(picomatch.toRegex(output));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `source` Regular expression source string.
 * @param {Object} `options`
 * @return {RegExp}
 * @api public
 */

picomatch.toRegex = (source, options) => {
  try {
    const opts = options || {};
    return new RegExp(source, opts.flags || (opts.nocase ? 'i' : ''));
  } catch (err) {
    if (options && options.debug === true) throw err;
    return /$^/;
  }
};

/**
 * Picomatch constants.
 * @return {Object}
 */

picomatch.constants = constants;

/**
 * Expose "picomatch"
 */

var picomatch_1 = picomatch;

(function (module) {

	module.exports = picomatch_1;
} (picomatch$1));

const pm = /*@__PURE__*/getDefaultExportFromCjs(picomatch$1.exports);

const extractors = {
    ArrayPattern(names, param) {
        for (const element of param.elements) {
            if (element)
                extractors[element.type](names, element);
        }
    },
    AssignmentPattern(names, param) {
        extractors[param.left.type](names, param.left);
    },
    Identifier(names, param) {
        names.push(param.name);
    },
    MemberExpression() { },
    ObjectPattern(names, param) {
        for (const prop of param.properties) {
            // @ts-ignore Typescript reports that this is not a valid type
            if (prop.type === 'RestElement') {
                extractors.RestElement(names, prop);
            }
            else {
                extractors[prop.value.type](names, prop.value);
            }
        }
    },
    RestElement(names, param) {
        extractors[param.argument.type](names, param.argument);
    }
};
const extractAssignedNames = function extractAssignedNames(param) {
    const names = [];
    extractors[param.type](names, param);
    return names;
};

// Helper since Typescript can't detect readonly arrays with Array.isArray
function isArray$1(arg) {
    return Array.isArray(arg);
}
function ensureArray$1(thing) {
    if (isArray$1(thing))
        return thing;
    if (thing == null)
        return [];
    return [thing];
}

const normalizePath = function normalizePath(filename) {
    return filename.split(win32.sep).join(posix.sep);
};

function getMatcherString(id, resolutionBase) {
    if (resolutionBase === false || isAbsolute$1(id) || id.startsWith('*')) {
        return normalizePath(id);
    }
    // resolve('') is valid and will default to process.cwd()
    const basePath = normalizePath(resolve(resolutionBase || ''))
        // escape all possible (posix + win) path characters that might interfere with regex
        .replace(/[-^$*+?.()|[\]{}]/g, '\\$&');
    // Note that we use posix.join because:
    // 1. the basePath has been normalized to use /
    // 2. the incoming glob (id) matcher, also uses /
    // otherwise Node will force backslash (\) on windows
    return posix.join(basePath, normalizePath(id));
}
const createFilter = function createFilter(include, exclude, options) {
    const resolutionBase = options && options.resolve;
    const getMatcher = (id) => id instanceof RegExp
        ? id
        : {
            test: (what) => {
                // this refactor is a tad overly verbose but makes for easy debugging
                const pattern = getMatcherString(id, resolutionBase);
                const fn = pm(pattern, { dot: true });
                const result = fn(what);
                return result;
            }
        };
    const includeMatchers = ensureArray$1(include).map(getMatcher);
    const excludeMatchers = ensureArray$1(exclude).map(getMatcher);
    return function result(id) {
        if (typeof id !== 'string')
            return false;
        if (/\0/.test(id))
            return false;
        const pathId = normalizePath(id);
        for (let i = 0; i < excludeMatchers.length; ++i) {
            const matcher = excludeMatchers[i];
            if (matcher.test(pathId))
                return false;
        }
        for (let i = 0; i < includeMatchers.length; ++i) {
            const matcher = includeMatchers[i];
            if (matcher.test(pathId))
                return true;
        }
        return !includeMatchers.length;
    };
};

const reservedWords$1 = 'break case class catch const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield enum await implements package protected static interface private public';
const builtins$1 = 'arguments Infinity NaN undefined null true false eval uneval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Symbol Error EvalError InternalError RangeError ReferenceError SyntaxError TypeError URIError Number Math Date String RegExp Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array Map Set WeakMap WeakSet SIMD ArrayBuffer DataView JSON Promise Generator GeneratorFunction Reflect Proxy Intl';
const forbiddenIdentifiers = new Set(`${reservedWords$1} ${builtins$1}`.split(' '));
forbiddenIdentifiers.add('');

const BROKEN_FLOW_NONE = 0;
const BROKEN_FLOW_BREAK_CONTINUE = 1;
const BROKEN_FLOW_ERROR_RETURN_LABEL = 2;
function createInclusionContext() {
    return {
        brokenFlow: BROKEN_FLOW_NONE,
        includedCallArguments: new Set(),
        includedLabels: new Set()
    };
}
function createHasEffectsContext() {
    return {
        accessed: new PathTracker(),
        assigned: new PathTracker(),
        brokenFlow: BROKEN_FLOW_NONE,
        called: new DiscriminatedPathTracker(),
        ignore: {
            breaks: false,
            continues: false,
            labels: new Set(),
            returnYield: false
        },
        includedLabels: new Set(),
        instantiated: new DiscriminatedPathTracker(),
        replacedVariableInits: new Map()
    };
}

function assembleMemberDescriptions(memberDescriptions, inheritedDescriptions = null) {
    return Object.create(inheritedDescriptions, memberDescriptions);
}
const UNDEFINED_EXPRESSION = new (class UndefinedExpression extends ExpressionEntity {
    getLiteralValueAtPath() {
        return undefined;
    }
})();
const returnsUnknown = {
    value: {
        hasEffectsWhenCalled: null,
        returns: UNKNOWN_EXPRESSION
    }
};
const UNKNOWN_LITERAL_BOOLEAN = new (class UnknownBoolean extends ExpressionEntity {
    getReturnExpressionWhenCalledAtPath(path) {
        if (path.length === 1) {
            return getMemberReturnExpressionWhenCalled(literalBooleanMembers, path[0]);
        }
        return UNKNOWN_EXPRESSION;
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (interaction.type === INTERACTION_ACCESSED) {
            return path.length > 1;
        }
        if (interaction.type === INTERACTION_CALLED && path.length === 1) {
            return hasMemberEffectWhenCalled(literalBooleanMembers, path[0], interaction, context);
        }
        return true;
    }
})();
const returnsBoolean = {
    value: {
        hasEffectsWhenCalled: null,
        returns: UNKNOWN_LITERAL_BOOLEAN
    }
};
const UNKNOWN_LITERAL_NUMBER = new (class UnknownNumber extends ExpressionEntity {
    getReturnExpressionWhenCalledAtPath(path) {
        if (path.length === 1) {
            return getMemberReturnExpressionWhenCalled(literalNumberMembers, path[0]);
        }
        return UNKNOWN_EXPRESSION;
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (interaction.type === INTERACTION_ACCESSED) {
            return path.length > 1;
        }
        if (interaction.type === INTERACTION_CALLED && path.length === 1) {
            return hasMemberEffectWhenCalled(literalNumberMembers, path[0], interaction, context);
        }
        return true;
    }
})();
const returnsNumber = {
    value: {
        hasEffectsWhenCalled: null,
        returns: UNKNOWN_LITERAL_NUMBER
    }
};
const UNKNOWN_LITERAL_STRING = new (class UnknownString extends ExpressionEntity {
    getReturnExpressionWhenCalledAtPath(path) {
        if (path.length === 1) {
            return getMemberReturnExpressionWhenCalled(literalStringMembers, path[0]);
        }
        return UNKNOWN_EXPRESSION;
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (interaction.type === INTERACTION_ACCESSED) {
            return path.length > 1;
        }
        if (interaction.type === INTERACTION_CALLED && path.length === 1) {
            return hasMemberEffectWhenCalled(literalStringMembers, path[0], interaction, context);
        }
        return true;
    }
})();
const returnsString = {
    value: {
        hasEffectsWhenCalled: null,
        returns: UNKNOWN_LITERAL_STRING
    }
};
const stringReplace = {
    value: {
        hasEffectsWhenCalled({ args }, context) {
            const arg1 = args[1];
            return (args.length < 2 ||
                (typeof arg1.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, {
                    deoptimizeCache() { }
                }) === 'symbol' &&
                    arg1.hasEffectsOnInteractionAtPath(EMPTY_PATH, NODE_INTERACTION_UNKNOWN_CALL, context)));
        },
        returns: UNKNOWN_LITERAL_STRING
    }
};
const objectMembers = assembleMemberDescriptions({
    hasOwnProperty: returnsBoolean,
    isPrototypeOf: returnsBoolean,
    propertyIsEnumerable: returnsBoolean,
    toLocaleString: returnsString,
    toString: returnsString,
    valueOf: returnsUnknown
});
const literalBooleanMembers = assembleMemberDescriptions({
    valueOf: returnsBoolean
}, objectMembers);
const literalNumberMembers = assembleMemberDescriptions({
    toExponential: returnsString,
    toFixed: returnsString,
    toLocaleString: returnsString,
    toPrecision: returnsString,
    valueOf: returnsNumber
}, objectMembers);
const literalStringMembers = assembleMemberDescriptions({
    anchor: returnsString,
    at: returnsUnknown,
    big: returnsString,
    blink: returnsString,
    bold: returnsString,
    charAt: returnsString,
    charCodeAt: returnsNumber,
    codePointAt: returnsUnknown,
    concat: returnsString,
    endsWith: returnsBoolean,
    fixed: returnsString,
    fontcolor: returnsString,
    fontsize: returnsString,
    includes: returnsBoolean,
    indexOf: returnsNumber,
    italics: returnsString,
    lastIndexOf: returnsNumber,
    link: returnsString,
    localeCompare: returnsNumber,
    match: returnsUnknown,
    matchAll: returnsUnknown,
    normalize: returnsString,
    padEnd: returnsString,
    padStart: returnsString,
    repeat: returnsString,
    replace: stringReplace,
    replaceAll: stringReplace,
    search: returnsNumber,
    slice: returnsString,
    small: returnsString,
    split: returnsUnknown,
    startsWith: returnsBoolean,
    strike: returnsString,
    sub: returnsString,
    substr: returnsString,
    substring: returnsString,
    sup: returnsString,
    toLocaleLowerCase: returnsString,
    toLocaleUpperCase: returnsString,
    toLowerCase: returnsString,
    toString: returnsString,
    toUpperCase: returnsString,
    trim: returnsString,
    trimEnd: returnsString,
    trimLeft: returnsString,
    trimRight: returnsString,
    trimStart: returnsString,
    valueOf: returnsString
}, objectMembers);
function getLiteralMembersForValue(value) {
    switch (typeof value) {
        case 'boolean':
            return literalBooleanMembers;
        case 'number':
            return literalNumberMembers;
        case 'string':
            return literalStringMembers;
    }
    return Object.create(null);
}
function hasMemberEffectWhenCalled(members, memberName, interaction, context) {
    var _a, _b;
    if (typeof memberName !== 'string' || !members[memberName]) {
        return true;
    }
    return ((_b = (_a = members[memberName]).hasEffectsWhenCalled) === null || _b === void 0 ? void 0 : _b.call(_a, interaction, context)) || false;
}
function getMemberReturnExpressionWhenCalled(members, memberName) {
    if (typeof memberName !== 'string' || !members[memberName])
        return UNKNOWN_EXPRESSION;
    return members[memberName].returns;
}

// AST walker module for Mozilla Parser API compatible trees

function skipThrough(node, st, c) { c(node, st); }
function ignore(_node, _st, _c) {}

// Node walkers.

var base$1 = {};

base$1.Program = base$1.BlockStatement = base$1.StaticBlock = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var stmt = list[i];

    c(stmt, st, "Statement");
  }
};
base$1.Statement = skipThrough;
base$1.EmptyStatement = ignore;
base$1.ExpressionStatement = base$1.ParenthesizedExpression = base$1.ChainExpression =
  function (node, st, c) { return c(node.expression, st, "Expression"); };
base$1.IfStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Statement");
  if (node.alternate) { c(node.alternate, st, "Statement"); }
};
base$1.LabeledStatement = function (node, st, c) { return c(node.body, st, "Statement"); };
base$1.BreakStatement = base$1.ContinueStatement = ignore;
base$1.WithStatement = function (node, st, c) {
  c(node.object, st, "Expression");
  c(node.body, st, "Statement");
};
base$1.SwitchStatement = function (node, st, c) {
  c(node.discriminant, st, "Expression");
  for (var i$1 = 0, list$1 = node.cases; i$1 < list$1.length; i$1 += 1) {
    var cs = list$1[i$1];

    if (cs.test) { c(cs.test, st, "Expression"); }
    for (var i = 0, list = cs.consequent; i < list.length; i += 1)
      {
      var cons = list[i];

      c(cons, st, "Statement");
    }
  }
};
base$1.SwitchCase = function (node, st, c) {
  if (node.test) { c(node.test, st, "Expression"); }
  for (var i = 0, list = node.consequent; i < list.length; i += 1)
    {
    var cons = list[i];

    c(cons, st, "Statement");
  }
};
base$1.ReturnStatement = base$1.YieldExpression = base$1.AwaitExpression = function (node, st, c) {
  if (node.argument) { c(node.argument, st, "Expression"); }
};
base$1.ThrowStatement = base$1.SpreadElement =
  function (node, st, c) { return c(node.argument, st, "Expression"); };
base$1.TryStatement = function (node, st, c) {
  c(node.block, st, "Statement");
  if (node.handler) { c(node.handler, st); }
  if (node.finalizer) { c(node.finalizer, st, "Statement"); }
};
base$1.CatchClause = function (node, st, c) {
  if (node.param) { c(node.param, st, "Pattern"); }
  c(node.body, st, "Statement");
};
base$1.WhileStatement = base$1.DoWhileStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.body, st, "Statement");
};
base$1.ForStatement = function (node, st, c) {
  if (node.init) { c(node.init, st, "ForInit"); }
  if (node.test) { c(node.test, st, "Expression"); }
  if (node.update) { c(node.update, st, "Expression"); }
  c(node.body, st, "Statement");
};
base$1.ForInStatement = base$1.ForOfStatement = function (node, st, c) {
  c(node.left, st, "ForInit");
  c(node.right, st, "Expression");
  c(node.body, st, "Statement");
};
base$1.ForInit = function (node, st, c) {
  if (node.type === "VariableDeclaration") { c(node, st); }
  else { c(node, st, "Expression"); }
};
base$1.DebuggerStatement = ignore;

base$1.FunctionDeclaration = function (node, st, c) { return c(node, st, "Function"); };
base$1.VariableDeclaration = function (node, st, c) {
  for (var i = 0, list = node.declarations; i < list.length; i += 1)
    {
    var decl = list[i];

    c(decl, st);
  }
};
base$1.VariableDeclarator = function (node, st, c) {
  c(node.id, st, "Pattern");
  if (node.init) { c(node.init, st, "Expression"); }
};

base$1.Function = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    c(param, st, "Pattern");
  }
  c(node.body, st, node.expression ? "Expression" : "Statement");
};

base$1.Pattern = function (node, st, c) {
  if (node.type === "Identifier")
    { c(node, st, "VariablePattern"); }
  else if (node.type === "MemberExpression")
    { c(node, st, "MemberPattern"); }
  else
    { c(node, st); }
};
base$1.VariablePattern = ignore;
base$1.MemberPattern = skipThrough;
base$1.RestElement = function (node, st, c) { return c(node.argument, st, "Pattern"); };
base$1.ArrayPattern = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Pattern"); }
  }
};
base$1.ObjectPattern = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1) {
    var prop = list[i];

    if (prop.type === "Property") {
      if (prop.computed) { c(prop.key, st, "Expression"); }
      c(prop.value, st, "Pattern");
    } else if (prop.type === "RestElement") {
      c(prop.argument, st, "Pattern");
    }
  }
};

base$1.Expression = skipThrough;
base$1.ThisExpression = base$1.Super = base$1.MetaProperty = ignore;
base$1.ArrayExpression = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Expression"); }
  }
};
base$1.ObjectExpression = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1)
    {
    var prop = list[i];

    c(prop, st);
  }
};
base$1.FunctionExpression = base$1.ArrowFunctionExpression = base$1.FunctionDeclaration;
base$1.SequenceExpression = function (node, st, c) {
  for (var i = 0, list = node.expressions; i < list.length; i += 1)
    {
    var expr = list[i];

    c(expr, st, "Expression");
  }
};
base$1.TemplateLiteral = function (node, st, c) {
  for (var i = 0, list = node.quasis; i < list.length; i += 1)
    {
    var quasi = list[i];

    c(quasi, st);
  }

  for (var i$1 = 0, list$1 = node.expressions; i$1 < list$1.length; i$1 += 1)
    {
    var expr = list$1[i$1];

    c(expr, st, "Expression");
  }
};
base$1.TemplateElement = ignore;
base$1.UnaryExpression = base$1.UpdateExpression = function (node, st, c) {
  c(node.argument, st, "Expression");
};
base$1.BinaryExpression = base$1.LogicalExpression = function (node, st, c) {
  c(node.left, st, "Expression");
  c(node.right, st, "Expression");
};
base$1.AssignmentExpression = base$1.AssignmentPattern = function (node, st, c) {
  c(node.left, st, "Pattern");
  c(node.right, st, "Expression");
};
base$1.ConditionalExpression = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Expression");
  c(node.alternate, st, "Expression");
};
base$1.NewExpression = base$1.CallExpression = function (node, st, c) {
  c(node.callee, st, "Expression");
  if (node.arguments)
    { for (var i = 0, list = node.arguments; i < list.length; i += 1)
      {
        var arg = list[i];

        c(arg, st, "Expression");
      } }
};
base$1.MemberExpression = function (node, st, c) {
  c(node.object, st, "Expression");
  if (node.computed) { c(node.property, st, "Expression"); }
};
base$1.ExportNamedDeclaration = base$1.ExportDefaultDeclaration = function (node, st, c) {
  if (node.declaration)
    { c(node.declaration, st, node.type === "ExportNamedDeclaration" || node.declaration.id ? "Statement" : "Expression"); }
  if (node.source) { c(node.source, st, "Expression"); }
};
base$1.ExportAllDeclaration = function (node, st, c) {
  if (node.exported)
    { c(node.exported, st); }
  c(node.source, st, "Expression");
};
base$1.ImportDeclaration = function (node, st, c) {
  for (var i = 0, list = node.specifiers; i < list.length; i += 1)
    {
    var spec = list[i];

    c(spec, st);
  }
  c(node.source, st, "Expression");
};
base$1.ImportExpression = function (node, st, c) {
  c(node.source, st, "Expression");
};
base$1.ImportSpecifier = base$1.ImportDefaultSpecifier = base$1.ImportNamespaceSpecifier = base$1.Identifier = base$1.PrivateIdentifier = base$1.Literal = ignore;

base$1.TaggedTemplateExpression = function (node, st, c) {
  c(node.tag, st, "Expression");
  c(node.quasi, st, "Expression");
};
base$1.ClassDeclaration = base$1.ClassExpression = function (node, st, c) { return c(node, st, "Class"); };
base$1.Class = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  if (node.superClass) { c(node.superClass, st, "Expression"); }
  c(node.body, st);
};
base$1.ClassBody = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var elt = list[i];

    c(elt, st);
  }
};
base$1.MethodDefinition = base$1.PropertyDefinition = base$1.Property = function (node, st, c) {
  if (node.computed) { c(node.key, st, "Expression"); }
  if (node.value) { c(node.value, st, "Expression"); }
};

const ArrowFunctionExpression$1 = 'ArrowFunctionExpression';
const BinaryExpression$1 = 'BinaryExpression';
const BlockStatement$1 = 'BlockStatement';
const CallExpression$1 = 'CallExpression';
const ChainExpression$1 = 'ChainExpression';
const ConditionalExpression$1 = 'ConditionalExpression';
const ExpressionStatement$1 = 'ExpressionStatement';
const Identifier$1 = 'Identifier';
const ImportDefaultSpecifier$1 = 'ImportDefaultSpecifier';
const ImportNamespaceSpecifier$1 = 'ImportNamespaceSpecifier';
const LogicalExpression$1 = 'LogicalExpression';
const NewExpression$1 = 'NewExpression';
const Program$1 = 'Program';
const Property$1 = 'Property';
const ReturnStatement$1 = 'ReturnStatement';
const SequenceExpression$1 = 'SequenceExpression';

// this looks ridiculous, but it prevents sourcemap tooling from mistaking
// this for an actual sourceMappingURL
let SOURCEMAPPING_URL = 'sourceMa';
SOURCEMAPPING_URL += 'ppingURL';
const whiteSpaceNoNewline = '[ \\f\\r\\t\\v\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]';
const SOURCEMAPPING_URL_RE = new RegExp(`^#${whiteSpaceNoNewline}+${SOURCEMAPPING_URL}=.+`);

const ANNOTATION_KEY = '_rollupAnnotations';
const INVALID_COMMENT_KEY = '_rollupRemoved';
function handlePureAnnotationsOfNode(node, state, type = node.type) {
    const { annotations } = state;
    let comment = annotations[state.annotationIndex];
    while (comment && node.start >= comment.end) {
        markPureNode(node, comment, state.code);
        comment = annotations[++state.annotationIndex];
    }
    if (comment && comment.end <= node.end) {
        base$1[type](node, state, handlePureAnnotationsOfNode);
        while ((comment = annotations[state.annotationIndex]) && comment.end <= node.end) {
            ++state.annotationIndex;
            annotateNode(node, comment, false);
        }
    }
}
const neitherWithespaceNorBrackets = /[^\s(]/g;
const noWhitespace = /\S/g;
function markPureNode(node, comment, code) {
    const annotatedNodes = [];
    let invalidAnnotation;
    const codeInBetween = code.slice(comment.end, node.start);
    if (doesNotMatchOutsideComment(codeInBetween, neitherWithespaceNorBrackets)) {
        const parentStart = node.start;
        while (true) {
            annotatedNodes.push(node);
            switch (node.type) {
                case ExpressionStatement$1:
                case ChainExpression$1:
                    node = node.expression;
                    continue;
                case SequenceExpression$1:
                    // if there are parentheses, the annotation would apply to the entire expression
                    if (doesNotMatchOutsideComment(code.slice(parentStart, node.start), noWhitespace)) {
                        node = node.expressions[0];
                        continue;
                    }
                    invalidAnnotation = true;
                    break;
                case ConditionalExpression$1:
                    // if there are parentheses, the annotation would apply to the entire expression
                    if (doesNotMatchOutsideComment(code.slice(parentStart, node.start), noWhitespace)) {
                        node = node.test;
                        continue;
                    }
                    invalidAnnotation = true;
                    break;
                case LogicalExpression$1:
                case BinaryExpression$1:
                    // if there are parentheses, the annotation would apply to the entire expression
                    if (doesNotMatchOutsideComment(code.slice(parentStart, node.start), noWhitespace)) {
                        node = node.left;
                        continue;
                    }
                    invalidAnnotation = true;
                    break;
                case CallExpression$1:
                case NewExpression$1:
                    break;
                default:
                    invalidAnnotation = true;
            }
            break;
        }
    }
    else {
        invalidAnnotation = true;
    }
    if (invalidAnnotation) {
        annotateNode(node, comment, false);
    }
    else {
        for (const node of annotatedNodes) {
            annotateNode(node, comment, true);
        }
    }
}
function doesNotMatchOutsideComment(code, forbiddenChars) {
    let nextMatch;
    while ((nextMatch = forbiddenChars.exec(code)) !== null) {
        if (nextMatch[0] === '/') {
            const charCodeAfterSlash = code.charCodeAt(forbiddenChars.lastIndex);
            if (charCodeAfterSlash === 42 /*"*"*/) {
                forbiddenChars.lastIndex = code.indexOf('*/', forbiddenChars.lastIndex + 1) + 2;
                continue;
            }
            else if (charCodeAfterSlash === 47 /*"/"*/) {
                forbiddenChars.lastIndex = code.indexOf('\n', forbiddenChars.lastIndex + 1) + 1;
                continue;
            }
        }
        forbiddenChars.lastIndex = 0;
        return false;
    }
    return true;
}
const pureCommentRegex = /[@#]__PURE__/;
function addAnnotations(comments, esTreeAst, code) {
    const annotations = [];
    const sourceMappingComments = [];
    for (const comment of comments) {
        if (pureCommentRegex.test(comment.value)) {
            annotations.push(comment);
        }
        else if (SOURCEMAPPING_URL_RE.test(comment.value)) {
            sourceMappingComments.push(comment);
        }
    }
    for (const comment of sourceMappingComments) {
        annotateNode(esTreeAst, comment, false);
    }
    handlePureAnnotationsOfNode(esTreeAst, {
        annotationIndex: 0,
        annotations,
        code
    });
}
function annotateNode(node, comment, valid) {
    const key = valid ? ANNOTATION_KEY : INVALID_COMMENT_KEY;
    const property = node[key];
    if (property) {
        property.push(comment);
    }
    else {
        node[key] = [comment];
    }
}

const keys = {
    Literal: [],
    Program: ['body']
};
function getAndCreateKeys(esTreeNode) {
    keys[esTreeNode.type] = Object.keys(esTreeNode).filter(key => typeof esTreeNode[key] === 'object' && key.charCodeAt(0) !== 95 /* _ */);
    return keys[esTreeNode.type];
}

const INCLUDE_PARAMETERS = 'variables';
class NodeBase extends ExpressionEntity {
    constructor(esTreeNode, parent, parentScope) {
        super();
        /**
         * Nodes can apply custom deoptimizations once they become part of the
         * executed code. To do this, they must initialize this as false, implement
         * applyDeoptimizations and call this from include and hasEffects if they have
         * custom handlers
         */
        this.deoptimized = false;
        this.esTreeNode = esTreeNode;
        this.keys = keys[esTreeNode.type] || getAndCreateKeys(esTreeNode);
        this.parent = parent;
        this.context = parent.context;
        this.createScope(parentScope);
        this.parseNode(esTreeNode);
        this.initialise();
        this.context.magicString.addSourcemapLocation(this.start);
        this.context.magicString.addSourcemapLocation(this.end);
    }
    addExportedVariables(_variables, _exportNamesByVariable) { }
    /**
     * Override this to bind assignments to variables and do any initialisations that
     * require the scopes to be populated with variables.
     */
    bind() {
        for (const key of this.keys) {
            const value = this[key];
            if (value === null)
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    child === null || child === void 0 ? void 0 : child.bind();
                }
            }
            else {
                value.bind();
            }
        }
    }
    /**
     * Override if this node should receive a different scope than the parent scope.
     */
    createScope(parentScope) {
        this.scope = parentScope;
    }
    hasEffects(context) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        for (const key of this.keys) {
            const value = this[key];
            if (value === null)
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child === null || child === void 0 ? void 0 : child.hasEffects(context))
                        return true;
                }
            }
            else if (value.hasEffects(context))
                return true;
        }
        return false;
    }
    hasEffectsAsAssignmentTarget(context, _checkAccess) {
        return (this.hasEffects(context) ||
            this.hasEffectsOnInteractionAtPath(EMPTY_PATH, this.assignmentInteraction, context));
    }
    include(context, includeChildrenRecursively, _options) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        this.included = true;
        for (const key of this.keys) {
            const value = this[key];
            if (value === null)
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    child === null || child === void 0 ? void 0 : child.include(context, includeChildrenRecursively);
                }
            }
            else {
                value.include(context, includeChildrenRecursively);
            }
        }
    }
    includeAsAssignmentTarget(context, includeChildrenRecursively, _deoptimizeAccess) {
        this.include(context, includeChildrenRecursively);
    }
    /**
     * Override to perform special initialisation steps after the scope is initialised
     */
    initialise() { }
    insertSemicolon(code) {
        if (code.original[this.end - 1] !== ';') {
            code.appendLeft(this.end, ';');
        }
    }
    parseNode(esTreeNode) {
        for (const [key, value] of Object.entries(esTreeNode)) {
            // That way, we can override this function to add custom initialisation and then call super.parseNode
            if (this.hasOwnProperty(key))
                continue;
            if (key.charCodeAt(0) === 95 /* _ */) {
                if (key === ANNOTATION_KEY) {
                    this.annotations = value;
                }
                else if (key === INVALID_COMMENT_KEY) {
                    for (const { start, end } of value)
                        this.context.magicString.remove(start, end);
                }
            }
            else if (typeof value !== 'object' || value === null) {
                this[key] = value;
            }
            else if (Array.isArray(value)) {
                this[key] = [];
                for (const child of value) {
                    this[key].push(child === null
                        ? null
                        : new (this.context.getNodeConstructor(child.type))(child, this, this.scope));
                }
            }
            else {
                this[key] = new (this.context.getNodeConstructor(value.type))(value, this, this.scope);
            }
        }
    }
    render(code, options) {
        for (const key of this.keys) {
            const value = this[key];
            if (value === null)
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    child === null || child === void 0 ? void 0 : child.render(code, options);
                }
            }
            else {
                value.render(code, options);
            }
        }
    }
    setAssignedValue(value) {
        this.assignmentInteraction = { args: [value], thisArg: null, type: INTERACTION_ASSIGNED };
    }
    shouldBeIncluded(context) {
        return this.included || (!context.brokenFlow && this.hasEffects(createHasEffectsContext()));
    }
    /**
     * Just deoptimize everything by default so that when e.g. we do not track
     * something properly, it is deoptimized.
     * @protected
     */
    applyDeoptimizations() {
        this.deoptimized = true;
        for (const key of this.keys) {
            const value = this[key];
            if (value === null)
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    child === null || child === void 0 ? void 0 : child.deoptimizePath(UNKNOWN_PATH);
                }
            }
            else {
                value.deoptimizePath(UNKNOWN_PATH);
            }
        }
        this.context.requestTreeshakingPass();
    }
}

class SpreadElement extends NodeBase {
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        if (path.length > 0) {
            this.argument.deoptimizeThisOnInteractionAtPath(interaction, [UnknownKey, ...path], recursionTracker);
        }
    }
    hasEffects(context) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        const { propertyReadSideEffects } = this.context.options
            .treeshake;
        return (this.argument.hasEffects(context) ||
            (propertyReadSideEffects &&
                (propertyReadSideEffects === 'always' ||
                    this.argument.hasEffectsOnInteractionAtPath(UNKNOWN_PATH, NODE_INTERACTION_UNKNOWN_ACCESS, context))));
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        // Only properties of properties of the argument could become subject to reassignment
        // This will also reassign the return values of iterators
        this.argument.deoptimizePath([UnknownKey, UnknownKey]);
        this.context.requestTreeshakingPass();
    }
}

class Method extends ExpressionEntity {
    constructor(description) {
        super();
        this.description = description;
    }
    deoptimizeThisOnInteractionAtPath({ type, thisArg }, path) {
        if (type === INTERACTION_CALLED && path.length === 0 && this.description.mutatesSelfAsArray) {
            thisArg.deoptimizePath(UNKNOWN_INTEGER_PATH);
        }
    }
    getReturnExpressionWhenCalledAtPath(path, { thisArg }) {
        if (path.length > 0) {
            return UNKNOWN_EXPRESSION;
        }
        return (this.description.returnsPrimitive ||
            (this.description.returns === 'self'
                ? thisArg || UNKNOWN_EXPRESSION
                : this.description.returns()));
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        var _a, _b;
        const { type } = interaction;
        if (path.length > (type === INTERACTION_ACCESSED ? 1 : 0)) {
            return true;
        }
        if (type === INTERACTION_CALLED) {
            if (this.description.mutatesSelfAsArray === true &&
                ((_a = interaction.thisArg) === null || _a === void 0 ? void 0 : _a.hasEffectsOnInteractionAtPath(UNKNOWN_INTEGER_PATH, NODE_INTERACTION_UNKNOWN_ASSIGNMENT, context))) {
                return true;
            }
            if (this.description.callsArgs) {
                for (const argIndex of this.description.callsArgs) {
                    if ((_b = interaction.args[argIndex]) === null || _b === void 0 ? void 0 : _b.hasEffectsOnInteractionAtPath(EMPTY_PATH, NODE_INTERACTION_UNKNOWN_CALL, context)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
const METHOD_RETURNS_BOOLEAN = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: false,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_BOOLEAN
    })
];
const METHOD_RETURNS_STRING = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: false,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_STRING
    })
];
const METHOD_RETURNS_NUMBER = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: false,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_NUMBER
    })
];
const METHOD_RETURNS_UNKNOWN = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: false,
        returns: null,
        returnsPrimitive: UNKNOWN_EXPRESSION
    })
];

const INTEGER_REG_EXP = /^\d+$/;
class ObjectEntity extends ExpressionEntity {
    // If a PropertyMap is used, this will be taken as propertiesAndGettersByKey
    // and we assume there are no setters or getters
    constructor(properties, prototypeExpression, immutable = false) {
        super();
        this.prototypeExpression = prototypeExpression;
        this.immutable = immutable;
        this.allProperties = [];
        this.deoptimizedPaths = Object.create(null);
        this.expressionsToBeDeoptimizedByKey = Object.create(null);
        this.gettersByKey = Object.create(null);
        this.hasLostTrack = false;
        this.hasUnknownDeoptimizedInteger = false;
        this.hasUnknownDeoptimizedProperty = false;
        this.propertiesAndGettersByKey = Object.create(null);
        this.propertiesAndSettersByKey = Object.create(null);
        this.settersByKey = Object.create(null);
        this.thisParametersToBeDeoptimized = new Set();
        this.unknownIntegerProps = [];
        this.unmatchableGetters = [];
        this.unmatchablePropertiesAndGetters = [];
        this.unmatchableSetters = [];
        if (Array.isArray(properties)) {
            this.buildPropertyMaps(properties);
        }
        else {
            this.propertiesAndGettersByKey = this.propertiesAndSettersByKey = properties;
            for (const propertiesForKey of Object.values(properties)) {
                this.allProperties.push(...propertiesForKey);
            }
        }
    }
    deoptimizeAllProperties(noAccessors) {
        var _a;
        const isDeoptimized = this.hasLostTrack || this.hasUnknownDeoptimizedProperty;
        if (noAccessors) {
            this.hasUnknownDeoptimizedProperty = true;
        }
        else {
            this.hasLostTrack = true;
        }
        if (isDeoptimized) {
            return;
        }
        for (const properties of Object.values(this.propertiesAndGettersByKey).concat(Object.values(this.settersByKey))) {
            for (const property of properties) {
                property.deoptimizePath(UNKNOWN_PATH);
            }
        }
        // While the prototype itself cannot be mutated, each property can
        (_a = this.prototypeExpression) === null || _a === void 0 ? void 0 : _a.deoptimizePath([UnknownKey, UnknownKey]);
        this.deoptimizeCachedEntities();
    }
    deoptimizeIntegerProperties() {
        if (this.hasLostTrack ||
            this.hasUnknownDeoptimizedProperty ||
            this.hasUnknownDeoptimizedInteger) {
            return;
        }
        this.hasUnknownDeoptimizedInteger = true;
        for (const [key, propertiesAndGetters] of Object.entries(this.propertiesAndGettersByKey)) {
            if (INTEGER_REG_EXP.test(key)) {
                for (const property of propertiesAndGetters) {
                    property.deoptimizePath(UNKNOWN_PATH);
                }
            }
        }
        this.deoptimizeCachedIntegerEntities();
    }
    // Assumption: If only a specific path is deoptimized, no accessors are created
    deoptimizePath(path) {
        var _a;
        if (this.hasLostTrack || this.immutable) {
            return;
        }
        const key = path[0];
        if (path.length === 1) {
            if (typeof key !== 'string') {
                if (key === UnknownInteger) {
                    return this.deoptimizeIntegerProperties();
                }
                return this.deoptimizeAllProperties(key === UnknownNonAccessorKey);
            }
            if (!this.deoptimizedPaths[key]) {
                this.deoptimizedPaths[key] = true;
                // we only deoptimizeCache exact matches as in all other cases,
                // we do not return a literal value or return expression
                const expressionsToBeDeoptimized = this.expressionsToBeDeoptimizedByKey[key];
                if (expressionsToBeDeoptimized) {
                    for (const expression of expressionsToBeDeoptimized) {
                        expression.deoptimizeCache();
                    }
                }
            }
        }
        const subPath = path.length === 1 ? UNKNOWN_PATH : path.slice(1);
        for (const property of typeof key === 'string'
            ? (this.propertiesAndGettersByKey[key] || this.unmatchablePropertiesAndGetters).concat(this.settersByKey[key] || this.unmatchableSetters)
            : this.allProperties) {
            property.deoptimizePath(subPath);
        }
        (_a = this.prototypeExpression) === null || _a === void 0 ? void 0 : _a.deoptimizePath(path.length === 1 ? [...path, UnknownKey] : path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        var _a;
        const [key, ...subPath] = path;
        if (this.hasLostTrack ||
            // single paths that are deoptimized will not become getters or setters
            ((interaction.type === INTERACTION_CALLED || path.length > 1) &&
                (this.hasUnknownDeoptimizedProperty ||
                    (typeof key === 'string' && this.deoptimizedPaths[key])))) {
            interaction.thisArg.deoptimizePath(UNKNOWN_PATH);
            return;
        }
        const [propertiesForExactMatchByKey, relevantPropertiesByKey, relevantUnmatchableProperties] = interaction.type === INTERACTION_CALLED || path.length > 1
            ? [
                this.propertiesAndGettersByKey,
                this.propertiesAndGettersByKey,
                this.unmatchablePropertiesAndGetters
            ]
            : interaction.type === INTERACTION_ACCESSED
                ? [this.propertiesAndGettersByKey, this.gettersByKey, this.unmatchableGetters]
                : [this.propertiesAndSettersByKey, this.settersByKey, this.unmatchableSetters];
        if (typeof key === 'string') {
            if (propertiesForExactMatchByKey[key]) {
                const properties = relevantPropertiesByKey[key];
                if (properties) {
                    for (const property of properties) {
                        property.deoptimizeThisOnInteractionAtPath(interaction, subPath, recursionTracker);
                    }
                }
                if (!this.immutable) {
                    this.thisParametersToBeDeoptimized.add(interaction.thisArg);
                }
                return;
            }
            for (const property of relevantUnmatchableProperties) {
                property.deoptimizeThisOnInteractionAtPath(interaction, subPath, recursionTracker);
            }
            if (INTEGER_REG_EXP.test(key)) {
                for (const property of this.unknownIntegerProps) {
                    property.deoptimizeThisOnInteractionAtPath(interaction, subPath, recursionTracker);
                }
            }
        }
        else {
            for (const properties of Object.values(relevantPropertiesByKey).concat([
                relevantUnmatchableProperties
            ])) {
                for (const property of properties) {
                    property.deoptimizeThisOnInteractionAtPath(interaction, subPath, recursionTracker);
                }
            }
            for (const property of this.unknownIntegerProps) {
                property.deoptimizeThisOnInteractionAtPath(interaction, subPath, recursionTracker);
            }
        }
        if (!this.immutable) {
            this.thisParametersToBeDeoptimized.add(interaction.thisArg);
        }
        (_a = this.prototypeExpression) === null || _a === void 0 ? void 0 : _a.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (path.length === 0) {
            return UnknownTruthyValue;
        }
        const key = path[0];
        const expressionAtPath = this.getMemberExpressionAndTrackDeopt(key, origin);
        if (expressionAtPath) {
            return expressionAtPath.getLiteralValueAtPath(path.slice(1), recursionTracker, origin);
        }
        if (this.prototypeExpression) {
            return this.prototypeExpression.getLiteralValueAtPath(path, recursionTracker, origin);
        }
        if (path.length === 1) {
            return undefined;
        }
        return UnknownValue;
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        if (path.length === 0) {
            return UNKNOWN_EXPRESSION;
        }
        const [key, ...subPath] = path;
        const expressionAtPath = this.getMemberExpressionAndTrackDeopt(key, origin);
        if (expressionAtPath) {
            return expressionAtPath.getReturnExpressionWhenCalledAtPath(subPath, interaction, recursionTracker, origin);
        }
        if (this.prototypeExpression) {
            return this.prototypeExpression.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
        }
        return UNKNOWN_EXPRESSION;
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        const [key, ...subPath] = path;
        if (subPath.length || interaction.type === INTERACTION_CALLED) {
            const expressionAtPath = this.getMemberExpression(key);
            if (expressionAtPath) {
                return expressionAtPath.hasEffectsOnInteractionAtPath(subPath, interaction, context);
            }
            if (this.prototypeExpression) {
                return this.prototypeExpression.hasEffectsOnInteractionAtPath(path, interaction, context);
            }
            return true;
        }
        if (key === UnknownNonAccessorKey)
            return false;
        if (this.hasLostTrack)
            return true;
        const [propertiesAndAccessorsByKey, accessorsByKey, unmatchableAccessors] = interaction.type === INTERACTION_ACCESSED
            ? [this.propertiesAndGettersByKey, this.gettersByKey, this.unmatchableGetters]
            : [this.propertiesAndSettersByKey, this.settersByKey, this.unmatchableSetters];
        if (typeof key === 'string') {
            if (propertiesAndAccessorsByKey[key]) {
                const accessors = accessorsByKey[key];
                if (accessors) {
                    for (const accessor of accessors) {
                        if (accessor.hasEffectsOnInteractionAtPath(subPath, interaction, context))
                            return true;
                    }
                }
                return false;
            }
            for (const accessor of unmatchableAccessors) {
                if (accessor.hasEffectsOnInteractionAtPath(subPath, interaction, context)) {
                    return true;
                }
            }
        }
        else {
            for (const accessors of Object.values(accessorsByKey).concat([unmatchableAccessors])) {
                for (const accessor of accessors) {
                    if (accessor.hasEffectsOnInteractionAtPath(subPath, interaction, context))
                        return true;
                }
            }
        }
        if (this.prototypeExpression) {
            return this.prototypeExpression.hasEffectsOnInteractionAtPath(path, interaction, context);
        }
        return false;
    }
    buildPropertyMaps(properties) {
        const { allProperties, propertiesAndGettersByKey, propertiesAndSettersByKey, settersByKey, gettersByKey, unknownIntegerProps, unmatchablePropertiesAndGetters, unmatchableGetters, unmatchableSetters } = this;
        const unmatchablePropertiesAndSetters = [];
        for (let index = properties.length - 1; index >= 0; index--) {
            const { key, kind, property } = properties[index];
            allProperties.push(property);
            if (typeof key !== 'string') {
                if (key === UnknownInteger) {
                    unknownIntegerProps.push(property);
                    continue;
                }
                if (kind === 'set')
                    unmatchableSetters.push(property);
                if (kind === 'get')
                    unmatchableGetters.push(property);
                if (kind !== 'get')
                    unmatchablePropertiesAndSetters.push(property);
                if (kind !== 'set')
                    unmatchablePropertiesAndGetters.push(property);
            }
            else {
                if (kind === 'set') {
                    if (!propertiesAndSettersByKey[key]) {
                        propertiesAndSettersByKey[key] = [property, ...unmatchablePropertiesAndSetters];
                        settersByKey[key] = [property, ...unmatchableSetters];
                    }
                }
                else if (kind === 'get') {
                    if (!propertiesAndGettersByKey[key]) {
                        propertiesAndGettersByKey[key] = [property, ...unmatchablePropertiesAndGetters];
                        gettersByKey[key] = [property, ...unmatchableGetters];
                    }
                }
                else {
                    if (!propertiesAndSettersByKey[key]) {
                        propertiesAndSettersByKey[key] = [property, ...unmatchablePropertiesAndSetters];
                    }
                    if (!propertiesAndGettersByKey[key]) {
                        propertiesAndGettersByKey[key] = [property, ...unmatchablePropertiesAndGetters];
                    }
                }
            }
        }
    }
    deoptimizeCachedEntities() {
        for (const expressionsToBeDeoptimized of Object.values(this.expressionsToBeDeoptimizedByKey)) {
            for (const expression of expressionsToBeDeoptimized) {
                expression.deoptimizeCache();
            }
        }
        for (const expression of this.thisParametersToBeDeoptimized) {
            expression.deoptimizePath(UNKNOWN_PATH);
        }
    }
    deoptimizeCachedIntegerEntities() {
        for (const [key, expressionsToBeDeoptimized] of Object.entries(this.expressionsToBeDeoptimizedByKey)) {
            if (INTEGER_REG_EXP.test(key)) {
                for (const expression of expressionsToBeDeoptimized) {
                    expression.deoptimizeCache();
                }
            }
        }
        for (const expression of this.thisParametersToBeDeoptimized) {
            expression.deoptimizePath(UNKNOWN_INTEGER_PATH);
        }
    }
    getMemberExpression(key) {
        if (this.hasLostTrack ||
            this.hasUnknownDeoptimizedProperty ||
            typeof key !== 'string' ||
            (this.hasUnknownDeoptimizedInteger && INTEGER_REG_EXP.test(key)) ||
            this.deoptimizedPaths[key]) {
            return UNKNOWN_EXPRESSION;
        }
        const properties = this.propertiesAndGettersByKey[key];
        if ((properties === null || properties === void 0 ? void 0 : properties.length) === 1) {
            return properties[0];
        }
        if (properties ||
            this.unmatchablePropertiesAndGetters.length > 0 ||
            (this.unknownIntegerProps.length && INTEGER_REG_EXP.test(key))) {
            return UNKNOWN_EXPRESSION;
        }
        return null;
    }
    getMemberExpressionAndTrackDeopt(key, origin) {
        if (typeof key !== 'string') {
            return UNKNOWN_EXPRESSION;
        }
        const expression = this.getMemberExpression(key);
        if (!(expression === UNKNOWN_EXPRESSION || this.immutable)) {
            const expressionsToBeDeoptimized = (this.expressionsToBeDeoptimizedByKey[key] =
                this.expressionsToBeDeoptimizedByKey[key] || []);
            expressionsToBeDeoptimized.push(origin);
        }
        return expression;
    }
}

const isInteger = (prop) => typeof prop === 'string' && /^\d+$/.test(prop);
// This makes sure unknown properties are not handled as "undefined" but as
// "unknown" but without access side effects. An exception is done for numeric
// properties as we do not expect new builtin properties to be numbers, this
// will improve tree-shaking for out-of-bounds array properties
const OBJECT_PROTOTYPE_FALLBACK = new (class ObjectPrototypeFallbackExpression extends ExpressionEntity {
    deoptimizeThisOnInteractionAtPath({ type, thisArg }, path) {
        if (type === INTERACTION_CALLED && path.length === 1 && !isInteger(path[0])) {
            thisArg.deoptimizePath(UNKNOWN_PATH);
        }
    }
    getLiteralValueAtPath(path) {
        // We ignore number properties as we do not expect new properties to be
        // numbers and also want to keep handling out-of-bound array elements as
        // "undefined"
        return path.length === 1 && isInteger(path[0]) ? undefined : UnknownValue;
    }
    hasEffectsOnInteractionAtPath(path, { type }) {
        return path.length > 1 || type === INTERACTION_CALLED;
    }
})();
const OBJECT_PROTOTYPE = new ObjectEntity({
    __proto__: null,
    hasOwnProperty: METHOD_RETURNS_BOOLEAN,
    isPrototypeOf: METHOD_RETURNS_BOOLEAN,
    propertyIsEnumerable: METHOD_RETURNS_BOOLEAN,
    toLocaleString: METHOD_RETURNS_STRING,
    toString: METHOD_RETURNS_STRING,
    valueOf: METHOD_RETURNS_UNKNOWN
}, OBJECT_PROTOTYPE_FALLBACK, true);

const NEW_ARRAY_PROPERTIES = [
    { key: UnknownInteger, kind: 'init', property: UNKNOWN_EXPRESSION },
    { key: 'length', kind: 'init', property: UNKNOWN_LITERAL_NUMBER }
];
const METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_BOOLEAN = [
    new Method({
        callsArgs: [0],
        mutatesSelfAsArray: 'deopt-only',
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_BOOLEAN
    })
];
const METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_NUMBER = [
    new Method({
        callsArgs: [0],
        mutatesSelfAsArray: 'deopt-only',
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_NUMBER
    })
];
const METHOD_MUTATES_SELF_RETURNS_NEW_ARRAY = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: true,
        returns: () => new ObjectEntity(NEW_ARRAY_PROPERTIES, ARRAY_PROTOTYPE),
        returnsPrimitive: null
    })
];
const METHOD_DEOPTS_SELF_RETURNS_NEW_ARRAY = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: 'deopt-only',
        returns: () => new ObjectEntity(NEW_ARRAY_PROPERTIES, ARRAY_PROTOTYPE),
        returnsPrimitive: null
    })
];
const METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_NEW_ARRAY = [
    new Method({
        callsArgs: [0],
        mutatesSelfAsArray: 'deopt-only',
        returns: () => new ObjectEntity(NEW_ARRAY_PROPERTIES, ARRAY_PROTOTYPE),
        returnsPrimitive: null
    })
];
const METHOD_MUTATES_SELF_RETURNS_NUMBER = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: true,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_NUMBER
    })
];
const METHOD_MUTATES_SELF_RETURNS_UNKNOWN = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: true,
        returns: null,
        returnsPrimitive: UNKNOWN_EXPRESSION
    })
];
const METHOD_DEOPTS_SELF_RETURNS_UNKNOWN = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: 'deopt-only',
        returns: null,
        returnsPrimitive: UNKNOWN_EXPRESSION
    })
];
const METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_UNKNOWN = [
    new Method({
        callsArgs: [0],
        mutatesSelfAsArray: 'deopt-only',
        returns: null,
        returnsPrimitive: UNKNOWN_EXPRESSION
    })
];
const METHOD_MUTATES_SELF_RETURNS_SELF = [
    new Method({
        callsArgs: null,
        mutatesSelfAsArray: true,
        returns: 'self',
        returnsPrimitive: null
    })
];
const METHOD_CALLS_ARG_MUTATES_SELF_RETURNS_SELF = [
    new Method({
        callsArgs: [0],
        mutatesSelfAsArray: true,
        returns: 'self',
        returnsPrimitive: null
    })
];
const ARRAY_PROTOTYPE = new ObjectEntity({
    __proto__: null,
    // We assume that accessors have effects as we do not track the accessed value afterwards
    at: METHOD_DEOPTS_SELF_RETURNS_UNKNOWN,
    concat: METHOD_DEOPTS_SELF_RETURNS_NEW_ARRAY,
    copyWithin: METHOD_MUTATES_SELF_RETURNS_SELF,
    entries: METHOD_DEOPTS_SELF_RETURNS_NEW_ARRAY,
    every: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_BOOLEAN,
    fill: METHOD_MUTATES_SELF_RETURNS_SELF,
    filter: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_NEW_ARRAY,
    find: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_UNKNOWN,
    findIndex: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_NUMBER,
    findLast: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_UNKNOWN,
    findLastIndex: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_NUMBER,
    flat: METHOD_DEOPTS_SELF_RETURNS_NEW_ARRAY,
    flatMap: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_NEW_ARRAY,
    forEach: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_UNKNOWN,
    group: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_UNKNOWN,
    groupToMap: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_UNKNOWN,
    includes: METHOD_RETURNS_BOOLEAN,
    indexOf: METHOD_RETURNS_NUMBER,
    join: METHOD_RETURNS_STRING,
    keys: METHOD_RETURNS_UNKNOWN,
    lastIndexOf: METHOD_RETURNS_NUMBER,
    map: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_NEW_ARRAY,
    pop: METHOD_MUTATES_SELF_RETURNS_UNKNOWN,
    push: METHOD_MUTATES_SELF_RETURNS_NUMBER,
    reduce: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_UNKNOWN,
    reduceRight: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_UNKNOWN,
    reverse: METHOD_MUTATES_SELF_RETURNS_SELF,
    shift: METHOD_MUTATES_SELF_RETURNS_UNKNOWN,
    slice: METHOD_DEOPTS_SELF_RETURNS_NEW_ARRAY,
    some: METHOD_CALLS_ARG_DEOPTS_SELF_RETURNS_BOOLEAN,
    sort: METHOD_CALLS_ARG_MUTATES_SELF_RETURNS_SELF,
    splice: METHOD_MUTATES_SELF_RETURNS_NEW_ARRAY,
    toLocaleString: METHOD_RETURNS_STRING,
    toString: METHOD_RETURNS_STRING,
    unshift: METHOD_MUTATES_SELF_RETURNS_NUMBER,
    values: METHOD_DEOPTS_SELF_RETURNS_UNKNOWN
}, OBJECT_PROTOTYPE, true);

class ArrayExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.objectEntity = null;
    }
    deoptimizePath(path) {
        this.getObjectEntity().deoptimizePath(path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        this.getObjectEntity().deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.getObjectEntity().getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        return this.getObjectEntity().getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        return this.getObjectEntity().hasEffectsOnInteractionAtPath(path, interaction, context);
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        let hasSpread = false;
        for (let index = 0; index < this.elements.length; index++) {
            const element = this.elements[index];
            if (element) {
                if (hasSpread || element instanceof SpreadElement) {
                    hasSpread = true;
                    element.deoptimizePath(UNKNOWN_PATH);
                }
            }
        }
        this.context.requestTreeshakingPass();
    }
    getObjectEntity() {
        if (this.objectEntity !== null) {
            return this.objectEntity;
        }
        const properties = [
            { key: 'length', kind: 'init', property: UNKNOWN_LITERAL_NUMBER }
        ];
        let hasSpread = false;
        for (let index = 0; index < this.elements.length; index++) {
            const element = this.elements[index];
            if (hasSpread || element instanceof SpreadElement) {
                if (element) {
                    hasSpread = true;
                    properties.unshift({ key: UnknownInteger, kind: 'init', property: element });
                }
            }
            else if (!element) {
                properties.push({ key: String(index), kind: 'init', property: UNDEFINED_EXPRESSION });
            }
            else {
                properties.push({ key: String(index), kind: 'init', property: element });
            }
        }
        return (this.objectEntity = new ObjectEntity(properties, ARRAY_PROTOTYPE));
    }
}

class ArrayPattern extends NodeBase {
    addExportedVariables(variables, exportNamesByVariable) {
        for (const element of this.elements) {
            element === null || element === void 0 ? void 0 : element.addExportedVariables(variables, exportNamesByVariable);
        }
    }
    declare(kind) {
        const variables = [];
        for (const element of this.elements) {
            if (element !== null) {
                variables.push(...element.declare(kind, UNKNOWN_EXPRESSION));
            }
        }
        return variables;
    }
    // Patterns can only be deoptimized at the empty path at the moment
    deoptimizePath() {
        for (const element of this.elements) {
            element === null || element === void 0 ? void 0 : element.deoptimizePath(EMPTY_PATH);
        }
    }
    // Patterns are only checked at the emtpy path at the moment
    hasEffectsOnInteractionAtPath(_path, interaction, context) {
        for (const element of this.elements) {
            if (element === null || element === void 0 ? void 0 : element.hasEffectsOnInteractionAtPath(EMPTY_PATH, interaction, context))
                return true;
        }
        return false;
    }
    markDeclarationReached() {
        for (const element of this.elements) {
            element === null || element === void 0 ? void 0 : element.markDeclarationReached();
        }
    }
}

class LocalVariable extends Variable {
    constructor(name, declarator, init, context) {
        super(name);
        this.calledFromTryStatement = false;
        this.additionalInitializers = null;
        this.expressionsToBeDeoptimized = [];
        this.declarations = declarator ? [declarator] : [];
        this.init = init;
        this.deoptimizationTracker = context.deoptimizationTracker;
        this.module = context.module;
    }
    addDeclaration(identifier, init) {
        this.declarations.push(identifier);
        const additionalInitializers = this.markInitializersForDeoptimization();
        if (init !== null) {
            additionalInitializers.push(init);
        }
    }
    consolidateInitializers() {
        if (this.additionalInitializers !== null) {
            for (const initializer of this.additionalInitializers) {
                initializer.deoptimizePath(UNKNOWN_PATH);
            }
            this.additionalInitializers = null;
        }
    }
    deoptimizePath(path) {
        var _a, _b;
        if (this.isReassigned ||
            this.deoptimizationTracker.trackEntityAtPathAndGetIfTracked(path, this)) {
            return;
        }
        if (path.length === 0) {
            if (!this.isReassigned) {
                this.isReassigned = true;
                const expressionsToBeDeoptimized = this.expressionsToBeDeoptimized;
                this.expressionsToBeDeoptimized = [];
                for (const expression of expressionsToBeDeoptimized) {
                    expression.deoptimizeCache();
                }
                (_a = this.init) === null || _a === void 0 ? void 0 : _a.deoptimizePath(UNKNOWN_PATH);
            }
        }
        else {
            (_b = this.init) === null || _b === void 0 ? void 0 : _b.deoptimizePath(path);
        }
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        if (this.isReassigned || !this.init) {
            return interaction.thisArg.deoptimizePath(UNKNOWN_PATH);
        }
        recursionTracker.withTrackedEntityAtPath(path, this.init, () => this.init.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker), undefined);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (this.isReassigned || !this.init) {
            return UnknownValue;
        }
        return recursionTracker.withTrackedEntityAtPath(path, this.init, () => {
            this.expressionsToBeDeoptimized.push(origin);
            return this.init.getLiteralValueAtPath(path, recursionTracker, origin);
        }, UnknownValue);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        if (this.isReassigned || !this.init) {
            return UNKNOWN_EXPRESSION;
        }
        return recursionTracker.withTrackedEntityAtPath(path, this.init, () => {
            this.expressionsToBeDeoptimized.push(origin);
            return this.init.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
        }, UNKNOWN_EXPRESSION);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        switch (interaction.type) {
            case INTERACTION_ACCESSED:
                if (this.isReassigned)
                    return true;
                return (this.init &&
                    !context.accessed.trackEntityAtPathAndGetIfTracked(path, this) &&
                    this.init.hasEffectsOnInteractionAtPath(path, interaction, context));
            case INTERACTION_ASSIGNED:
                if (this.included)
                    return true;
                if (path.length === 0)
                    return false;
                if (this.isReassigned)
                    return true;
                return (this.init &&
                    !context.assigned.trackEntityAtPathAndGetIfTracked(path, this) &&
                    this.init.hasEffectsOnInteractionAtPath(path, interaction, context));
            case INTERACTION_CALLED:
                if (this.isReassigned)
                    return true;
                return (this.init &&
                    !(interaction.withNew ? context.instantiated : context.called).trackEntityAtPathAndGetIfTracked(path, interaction.args, this) &&
                    this.init.hasEffectsOnInteractionAtPath(path, interaction, context));
        }
    }
    include() {
        if (!this.included) {
            this.included = true;
            for (const declaration of this.declarations) {
                // If node is a default export, it can save a tree-shaking run to include the full declaration now
                if (!declaration.included)
                    declaration.include(createInclusionContext(), false);
                let node = declaration.parent;
                while (!node.included) {
                    // We do not want to properly include parents in case they are part of a dead branch
                    // in which case .include() might pull in more dead code
                    node.included = true;
                    if (node.type === Program$1)
                        break;
                    node = node.parent;
                }
            }
        }
    }
    includeCallArguments(context, args) {
        if (this.isReassigned || (this.init && context.includedCallArguments.has(this.init))) {
            for (const arg of args) {
                arg.include(context, false);
            }
        }
        else if (this.init) {
            context.includedCallArguments.add(this.init);
            this.init.includeCallArguments(context, args);
            context.includedCallArguments.delete(this.init);
        }
    }
    markCalledFromTryStatement() {
        this.calledFromTryStatement = true;
    }
    markInitializersForDeoptimization() {
        if (this.additionalInitializers === null) {
            this.additionalInitializers = this.init === null ? [] : [this.init];
            this.init = UNKNOWN_EXPRESSION;
            this.isReassigned = true;
        }
        return this.additionalInitializers;
    }
}

const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$';
const base = 64;
function toBase64(num) {
    let outStr = '';
    do {
        const curDigit = num % base;
        num = Math.floor(num / base);
        outStr = chars[curDigit] + outStr;
    } while (num !== 0);
    return outStr;
}

function getSafeName(baseName, usedNames) {
    let safeName = baseName;
    let count = 1;
    while (usedNames.has(safeName) || RESERVED_NAMES$1.has(safeName)) {
        safeName = `${baseName}$${toBase64(count++)}`;
    }
    usedNames.add(safeName);
    return safeName;
}

class Scope$1 {
    constructor() {
        this.children = [];
        this.variables = new Map();
    }
    addDeclaration(identifier, context, init, _isHoisted) {
        const name = identifier.name;
        let variable = this.variables.get(name);
        if (variable) {
            variable.addDeclaration(identifier, init);
        }
        else {
            variable = new LocalVariable(identifier.name, identifier, init || UNDEFINED_EXPRESSION, context);
            this.variables.set(name, variable);
        }
        return variable;
    }
    contains(name) {
        return this.variables.has(name);
    }
    findVariable(_name) {
        throw new Error('Internal Error: findVariable needs to be implemented by a subclass');
    }
}

class ChildScope extends Scope$1 {
    constructor(parent) {
        super();
        this.accessedOutsideVariables = new Map();
        this.parent = parent;
        parent.children.push(this);
    }
    addAccessedDynamicImport(importExpression) {
        (this.accessedDynamicImports || (this.accessedDynamicImports = new Set())).add(importExpression);
        if (this.parent instanceof ChildScope) {
            this.parent.addAccessedDynamicImport(importExpression);
        }
    }
    addAccessedGlobals(globals, accessedGlobalsByScope) {
        const accessedGlobals = accessedGlobalsByScope.get(this) || new Set();
        for (const name of globals) {
            accessedGlobals.add(name);
        }
        accessedGlobalsByScope.set(this, accessedGlobals);
        if (this.parent instanceof ChildScope) {
            this.parent.addAccessedGlobals(globals, accessedGlobalsByScope);
        }
    }
    addNamespaceMemberAccess(name, variable) {
        this.accessedOutsideVariables.set(name, variable);
        this.parent.addNamespaceMemberAccess(name, variable);
    }
    addReturnExpression(expression) {
        this.parent instanceof ChildScope && this.parent.addReturnExpression(expression);
    }
    addUsedOutsideNames(usedNames, format, exportNamesByVariable, accessedGlobalsByScope) {
        for (const variable of this.accessedOutsideVariables.values()) {
            if (variable.included) {
                usedNames.add(variable.getBaseVariableName());
                if (format === 'system' && exportNamesByVariable.has(variable)) {
                    usedNames.add('exports');
                }
            }
        }
        const accessedGlobals = accessedGlobalsByScope.get(this);
        if (accessedGlobals) {
            for (const name of accessedGlobals) {
                usedNames.add(name);
            }
        }
    }
    contains(name) {
        return this.variables.has(name) || this.parent.contains(name);
    }
    deconflict(format, exportNamesByVariable, accessedGlobalsByScope) {
        const usedNames = new Set();
        this.addUsedOutsideNames(usedNames, format, exportNamesByVariable, accessedGlobalsByScope);
        if (this.accessedDynamicImports) {
            for (const importExpression of this.accessedDynamicImports) {
                if (importExpression.inlineNamespace) {
                    usedNames.add(importExpression.inlineNamespace.getBaseVariableName());
                }
            }
        }
        for (const [name, variable] of this.variables) {
            if (variable.included || variable.alwaysRendered) {
                variable.setRenderNames(null, getSafeName(name, usedNames));
            }
        }
        for (const scope of this.children) {
            scope.deconflict(format, exportNamesByVariable, accessedGlobalsByScope);
        }
    }
    findLexicalBoundary() {
        return this.parent.findLexicalBoundary();
    }
    findVariable(name) {
        const knownVariable = this.variables.get(name) || this.accessedOutsideVariables.get(name);
        if (knownVariable) {
            return knownVariable;
        }
        const variable = this.parent.findVariable(name);
        this.accessedOutsideVariables.set(name, variable);
        return variable;
    }
}

class ParameterScope extends ChildScope {
    constructor(parent, context) {
        super(parent);
        this.parameters = [];
        this.hasRest = false;
        this.context = context;
        this.hoistedBodyVarScope = new ChildScope(this);
    }
    /**
     * Adds a parameter to this scope. Parameters must be added in the correct
     * order, e.g. from left to right.
     */
    addParameterDeclaration(identifier) {
        const name = identifier.name;
        let variable = this.hoistedBodyVarScope.variables.get(name);
        if (variable) {
            variable.addDeclaration(identifier, null);
        }
        else {
            variable = new LocalVariable(name, identifier, UNKNOWN_EXPRESSION, this.context);
        }
        this.variables.set(name, variable);
        return variable;
    }
    addParameterVariables(parameters, hasRest) {
        this.parameters = parameters;
        for (const parameterList of parameters) {
            for (const parameter of parameterList) {
                parameter.alwaysRendered = true;
            }
        }
        this.hasRest = hasRest;
    }
    includeCallArguments(context, args) {
        let calledFromTryStatement = false;
        let argIncluded = false;
        const restParam = this.hasRest && this.parameters[this.parameters.length - 1];
        for (const checkedArg of args) {
            if (checkedArg instanceof SpreadElement) {
                for (const arg of args) {
                    arg.include(context, false);
                }
                break;
            }
        }
        for (let index = args.length - 1; index >= 0; index--) {
            const paramVars = this.parameters[index] || restParam;
            const arg = args[index];
            if (paramVars) {
                calledFromTryStatement = false;
                if (paramVars.length === 0) {
                    // handle empty destructuring
                    argIncluded = true;
                }
                else {
                    for (const variable of paramVars) {
                        if (variable.included) {
                            argIncluded = true;
                        }
                        if (variable.calledFromTryStatement) {
                            calledFromTryStatement = true;
                        }
                    }
                }
            }
            if (!argIncluded && arg.shouldBeIncluded(context)) {
                argIncluded = true;
            }
            if (argIncluded) {
                arg.include(context, calledFromTryStatement);
            }
        }
    }
}

class ReturnValueScope extends ParameterScope {
    constructor() {
        super(...arguments);
        this.returnExpression = null;
        this.returnExpressions = [];
    }
    addReturnExpression(expression) {
        this.returnExpressions.push(expression);
    }
    getReturnExpression() {
        if (this.returnExpression === null)
            this.updateReturnExpression();
        return this.returnExpression;
    }
    updateReturnExpression() {
        if (this.returnExpressions.length === 1) {
            this.returnExpression = this.returnExpressions[0];
        }
        else {
            this.returnExpression = UNKNOWN_EXPRESSION;
            for (const expression of this.returnExpressions) {
                expression.deoptimizePath(UNKNOWN_PATH);
            }
        }
    }
}

//@ts-check
/** @typedef { import('estree').Node} Node */
/** @typedef {Node | {
 *   type: 'PropertyDefinition';
 *   computed: boolean;
 *   value: Node
 * }} NodeWithPropertyDefinition */

/**
 *
 * @param {NodeWithPropertyDefinition} node
 * @param {NodeWithPropertyDefinition} parent
 * @returns boolean
 */
function is_reference (node, parent) {
	if (node.type === 'MemberExpression') {
		return !node.computed && is_reference(node.object, node);
	}

	if (node.type === 'Identifier') {
		if (!parent) return true;

		switch (parent.type) {
			// disregard `bar` in `foo.bar`
			case 'MemberExpression': return parent.computed || node === parent.object;

			// disregard the `foo` in `class {foo(){}}` but keep it in `class {[foo](){}}`
			case 'MethodDefinition': return parent.computed;

			// disregard the `foo` in `class {foo=bar}` but keep it in `class {[foo]=bar}` and `class {bar=foo}`
			case 'PropertyDefinition': return parent.computed || node === parent.value;

			// disregard the `bar` in `{ bar: foo }`, but keep it in `{ [bar]: foo }`
			case 'Property': return parent.computed || node === parent.value;

			// disregard the `bar` in `export { foo as bar }` or
			// the foo in `import { foo as bar }`
			case 'ExportSpecifier':
			case 'ImportSpecifier': return node === parent.local;

			// disregard the `foo` in `foo: while (...) { ... break foo; ... continue foo;}`
			case 'LabeledStatement':
			case 'BreakStatement':
			case 'ContinueStatement': return false;
			default: return true;
		}
	}

	return false;
}

/* eslint sort-keys: "off" */
const ValueProperties = Symbol('Value Properties');
const PURE = {
    hasEffectsWhenCalled() {
        return false;
    }
};
const IMPURE = {
    hasEffectsWhenCalled() {
        return true;
    }
};
// We use shortened variables to reduce file size here
/* OBJECT */
const O = {
    __proto__: null,
    [ValueProperties]: IMPURE
};
/* PURE FUNCTION */
const PF = {
    __proto__: null,
    [ValueProperties]: PURE
};
/* FUNCTION THAT MUTATES FIRST ARG WITHOUT TRIGGERING ACCESSORS */
const MUTATES_ARG_WITHOUT_ACCESSOR = {
    __proto__: null,
    [ValueProperties]: {
        hasEffectsWhenCalled({ args }, context) {
            return (!args.length ||
                args[0].hasEffectsOnInteractionAtPath(UNKNOWN_NON_ACCESSOR_PATH, NODE_INTERACTION_UNKNOWN_ASSIGNMENT, context));
        }
    }
};
/* CONSTRUCTOR */
const C = {
    __proto__: null,
    [ValueProperties]: IMPURE,
    prototype: O
};
/* PURE CONSTRUCTOR */
const PC = {
    __proto__: null,
    [ValueProperties]: PURE,
    prototype: O
};
const ARRAY_TYPE = {
    __proto__: null,
    [ValueProperties]: PURE,
    from: PF,
    of: PF,
    prototype: O
};
const INTL_MEMBER = {
    __proto__: null,
    [ValueProperties]: PURE,
    supportedLocalesOf: PC
};
const knownGlobals = {
    // Placeholders for global objects to avoid shape mutations
    global: O,
    globalThis: O,
    self: O,
    window: O,
    // Common globals
    __proto__: null,
    [ValueProperties]: IMPURE,
    Array: {
        __proto__: null,
        [ValueProperties]: IMPURE,
        from: O,
        isArray: PF,
        of: PF,
        prototype: O
    },
    ArrayBuffer: {
        __proto__: null,
        [ValueProperties]: PURE,
        isView: PF,
        prototype: O
    },
    Atomics: O,
    BigInt: C,
    BigInt64Array: C,
    BigUint64Array: C,
    Boolean: PC,
    constructor: C,
    DataView: PC,
    Date: {
        __proto__: null,
        [ValueProperties]: PURE,
        now: PF,
        parse: PF,
        prototype: O,
        UTC: PF
    },
    decodeURI: PF,
    decodeURIComponent: PF,
    encodeURI: PF,
    encodeURIComponent: PF,
    Error: PC,
    escape: PF,
    eval: O,
    EvalError: PC,
    Float32Array: ARRAY_TYPE,
    Float64Array: ARRAY_TYPE,
    Function: C,
    hasOwnProperty: O,
    Infinity: O,
    Int16Array: ARRAY_TYPE,
    Int32Array: ARRAY_TYPE,
    Int8Array: ARRAY_TYPE,
    isFinite: PF,
    isNaN: PF,
    isPrototypeOf: O,
    JSON: O,
    Map: PC,
    Math: {
        __proto__: null,
        [ValueProperties]: IMPURE,
        abs: PF,
        acos: PF,
        acosh: PF,
        asin: PF,
        asinh: PF,
        atan: PF,
        atan2: PF,
        atanh: PF,
        cbrt: PF,
        ceil: PF,
        clz32: PF,
        cos: PF,
        cosh: PF,
        exp: PF,
        expm1: PF,
        floor: PF,
        fround: PF,
        hypot: PF,
        imul: PF,
        log: PF,
        log10: PF,
        log1p: PF,
        log2: PF,
        max: PF,
        min: PF,
        pow: PF,
        random: PF,
        round: PF,
        sign: PF,
        sin: PF,
        sinh: PF,
        sqrt: PF,
        tan: PF,
        tanh: PF,
        trunc: PF
    },
    NaN: O,
    Number: {
        __proto__: null,
        [ValueProperties]: PURE,
        isFinite: PF,
        isInteger: PF,
        isNaN: PF,
        isSafeInteger: PF,
        parseFloat: PF,
        parseInt: PF,
        prototype: O
    },
    Object: {
        __proto__: null,
        [ValueProperties]: PURE,
        create: PF,
        // Technically those can throw in certain situations, but we ignore this as
        // code that relies on this will hopefully wrap this in a try-catch, which
        // deoptimizes everything anyway
        defineProperty: MUTATES_ARG_WITHOUT_ACCESSOR,
        defineProperties: MUTATES_ARG_WITHOUT_ACCESSOR,
        getOwnPropertyDescriptor: PF,
        getOwnPropertyNames: PF,
        getOwnPropertySymbols: PF,
        getPrototypeOf: PF,
        hasOwn: PF,
        is: PF,
        isExtensible: PF,
        isFrozen: PF,
        isSealed: PF,
        keys: PF,
        fromEntries: PF,
        entries: PF,
        prototype: O
    },
    parseFloat: PF,
    parseInt: PF,
    Promise: {
        __proto__: null,
        [ValueProperties]: IMPURE,
        all: O,
        prototype: O,
        race: O,
        reject: O,
        resolve: O
    },
    propertyIsEnumerable: O,
    Proxy: O,
    RangeError: PC,
    ReferenceError: PC,
    Reflect: O,
    RegExp: PC,
    Set: PC,
    SharedArrayBuffer: C,
    String: {
        __proto__: null,
        [ValueProperties]: PURE,
        fromCharCode: PF,
        fromCodePoint: PF,
        prototype: O,
        raw: PF
    },
    Symbol: {
        __proto__: null,
        [ValueProperties]: PURE,
        for: PF,
        keyFor: PF,
        prototype: O
    },
    SyntaxError: PC,
    toLocaleString: O,
    toString: O,
    TypeError: PC,
    Uint16Array: ARRAY_TYPE,
    Uint32Array: ARRAY_TYPE,
    Uint8Array: ARRAY_TYPE,
    Uint8ClampedArray: ARRAY_TYPE,
    // Technically, this is a global, but it needs special handling
    // undefined: ?,
    unescape: PF,
    URIError: PC,
    valueOf: O,
    WeakMap: PC,
    WeakSet: PC,
    // Additional globals shared by Node and Browser that are not strictly part of the language
    clearInterval: C,
    clearTimeout: C,
    console: O,
    Intl: {
        __proto__: null,
        [ValueProperties]: IMPURE,
        Collator: INTL_MEMBER,
        DateTimeFormat: INTL_MEMBER,
        ListFormat: INTL_MEMBER,
        NumberFormat: INTL_MEMBER,
        PluralRules: INTL_MEMBER,
        RelativeTimeFormat: INTL_MEMBER
    },
    setInterval: C,
    setTimeout: C,
    TextDecoder: C,
    TextEncoder: C,
    URL: C,
    URLSearchParams: C,
    // Browser specific globals
    AbortController: C,
    AbortSignal: C,
    addEventListener: O,
    alert: O,
    AnalyserNode: C,
    Animation: C,
    AnimationEvent: C,
    applicationCache: O,
    ApplicationCache: C,
    ApplicationCacheErrorEvent: C,
    atob: O,
    Attr: C,
    Audio: C,
    AudioBuffer: C,
    AudioBufferSourceNode: C,
    AudioContext: C,
    AudioDestinationNode: C,
    AudioListener: C,
    AudioNode: C,
    AudioParam: C,
    AudioProcessingEvent: C,
    AudioScheduledSourceNode: C,
    AudioWorkletNode: C,
    BarProp: C,
    BaseAudioContext: C,
    BatteryManager: C,
    BeforeUnloadEvent: C,
    BiquadFilterNode: C,
    Blob: C,
    BlobEvent: C,
    blur: O,
    BroadcastChannel: C,
    btoa: O,
    ByteLengthQueuingStrategy: C,
    Cache: C,
    caches: O,
    CacheStorage: C,
    cancelAnimationFrame: O,
    cancelIdleCallback: O,
    CanvasCaptureMediaStreamTrack: C,
    CanvasGradient: C,
    CanvasPattern: C,
    CanvasRenderingContext2D: C,
    ChannelMergerNode: C,
    ChannelSplitterNode: C,
    CharacterData: C,
    clientInformation: O,
    ClipboardEvent: C,
    close: O,
    closed: O,
    CloseEvent: C,
    Comment: C,
    CompositionEvent: C,
    confirm: O,
    ConstantSourceNode: C,
    ConvolverNode: C,
    CountQueuingStrategy: C,
    createImageBitmap: O,
    Credential: C,
    CredentialsContainer: C,
    crypto: O,
    Crypto: C,
    CryptoKey: C,
    CSS: C,
    CSSConditionRule: C,
    CSSFontFaceRule: C,
    CSSGroupingRule: C,
    CSSImportRule: C,
    CSSKeyframeRule: C,
    CSSKeyframesRule: C,
    CSSMediaRule: C,
    CSSNamespaceRule: C,
    CSSPageRule: C,
    CSSRule: C,
    CSSRuleList: C,
    CSSStyleDeclaration: C,
    CSSStyleRule: C,
    CSSStyleSheet: C,
    CSSSupportsRule: C,
    CustomElementRegistry: C,
    customElements: O,
    CustomEvent: C,
    DataTransfer: C,
    DataTransferItem: C,
    DataTransferItemList: C,
    defaultstatus: O,
    defaultStatus: O,
    DelayNode: C,
    DeviceMotionEvent: C,
    DeviceOrientationEvent: C,
    devicePixelRatio: O,
    dispatchEvent: O,
    document: O,
    Document: C,
    DocumentFragment: C,
    DocumentType: C,
    DOMError: C,
    DOMException: C,
    DOMImplementation: C,
    DOMMatrix: C,
    DOMMatrixReadOnly: C,
    DOMParser: C,
    DOMPoint: C,
    DOMPointReadOnly: C,
    DOMQuad: C,
    DOMRect: C,
    DOMRectReadOnly: C,
    DOMStringList: C,
    DOMStringMap: C,
    DOMTokenList: C,
    DragEvent: C,
    DynamicsCompressorNode: C,
    Element: C,
    ErrorEvent: C,
    Event: C,
    EventSource: C,
    EventTarget: C,
    external: O,
    fetch: O,
    File: C,
    FileList: C,
    FileReader: C,
    find: O,
    focus: O,
    FocusEvent: C,
    FontFace: C,
    FontFaceSetLoadEvent: C,
    FormData: C,
    frames: O,
    GainNode: C,
    Gamepad: C,
    GamepadButton: C,
    GamepadEvent: C,
    getComputedStyle: O,
    getSelection: O,
    HashChangeEvent: C,
    Headers: C,
    history: O,
    History: C,
    HTMLAllCollection: C,
    HTMLAnchorElement: C,
    HTMLAreaElement: C,
    HTMLAudioElement: C,
    HTMLBaseElement: C,
    HTMLBodyElement: C,
    HTMLBRElement: C,
    HTMLButtonElement: C,
    HTMLCanvasElement: C,
    HTMLCollection: C,
    HTMLContentElement: C,
    HTMLDataElement: C,
    HTMLDataListElement: C,
    HTMLDetailsElement: C,
    HTMLDialogElement: C,
    HTMLDirectoryElement: C,
    HTMLDivElement: C,
    HTMLDListElement: C,
    HTMLDocument: C,
    HTMLElement: C,
    HTMLEmbedElement: C,
    HTMLFieldSetElement: C,
    HTMLFontElement: C,
    HTMLFormControlsCollection: C,
    HTMLFormElement: C,
    HTMLFrameElement: C,
    HTMLFrameSetElement: C,
    HTMLHeadElement: C,
    HTMLHeadingElement: C,
    HTMLHRElement: C,
    HTMLHtmlElement: C,
    HTMLIFrameElement: C,
    HTMLImageElement: C,
    HTMLInputElement: C,
    HTMLLabelElement: C,
    HTMLLegendElement: C,
    HTMLLIElement: C,
    HTMLLinkElement: C,
    HTMLMapElement: C,
    HTMLMarqueeElement: C,
    HTMLMediaElement: C,
    HTMLMenuElement: C,
    HTMLMetaElement: C,
    HTMLMeterElement: C,
    HTMLModElement: C,
    HTMLObjectElement: C,
    HTMLOListElement: C,
    HTMLOptGroupElement: C,
    HTMLOptionElement: C,
    HTMLOptionsCollection: C,
    HTMLOutputElement: C,
    HTMLParagraphElement: C,
    HTMLParamElement: C,
    HTMLPictureElement: C,
    HTMLPreElement: C,
    HTMLProgressElement: C,
    HTMLQuoteElement: C,
    HTMLScriptElement: C,
    HTMLSelectElement: C,
    HTMLShadowElement: C,
    HTMLSlotElement: C,
    HTMLSourceElement: C,
    HTMLSpanElement: C,
    HTMLStyleElement: C,
    HTMLTableCaptionElement: C,
    HTMLTableCellElement: C,
    HTMLTableColElement: C,
    HTMLTableElement: C,
    HTMLTableRowElement: C,
    HTMLTableSectionElement: C,
    HTMLTemplateElement: C,
    HTMLTextAreaElement: C,
    HTMLTimeElement: C,
    HTMLTitleElement: C,
    HTMLTrackElement: C,
    HTMLUListElement: C,
    HTMLUnknownElement: C,
    HTMLVideoElement: C,
    IDBCursor: C,
    IDBCursorWithValue: C,
    IDBDatabase: C,
    IDBFactory: C,
    IDBIndex: C,
    IDBKeyRange: C,
    IDBObjectStore: C,
    IDBOpenDBRequest: C,
    IDBRequest: C,
    IDBTransaction: C,
    IDBVersionChangeEvent: C,
    IdleDeadline: C,
    IIRFilterNode: C,
    Image: C,
    ImageBitmap: C,
    ImageBitmapRenderingContext: C,
    ImageCapture: C,
    ImageData: C,
    indexedDB: O,
    innerHeight: O,
    innerWidth: O,
    InputEvent: C,
    IntersectionObserver: C,
    IntersectionObserverEntry: C,
    isSecureContext: O,
    KeyboardEvent: C,
    KeyframeEffect: C,
    length: O,
    localStorage: O,
    location: O,
    Location: C,
    locationbar: O,
    matchMedia: O,
    MediaDeviceInfo: C,
    MediaDevices: C,
    MediaElementAudioSourceNode: C,
    MediaEncryptedEvent: C,
    MediaError: C,
    MediaKeyMessageEvent: C,
    MediaKeySession: C,
    MediaKeyStatusMap: C,
    MediaKeySystemAccess: C,
    MediaList: C,
    MediaQueryList: C,
    MediaQueryListEvent: C,
    MediaRecorder: C,
    MediaSettingsRange: C,
    MediaSource: C,
    MediaStream: C,
    MediaStreamAudioDestinationNode: C,
    MediaStreamAudioSourceNode: C,
    MediaStreamEvent: C,
    MediaStreamTrack: C,
    MediaStreamTrackEvent: C,
    menubar: O,
    MessageChannel: C,
    MessageEvent: C,
    MessagePort: C,
    MIDIAccess: C,
    MIDIConnectionEvent: C,
    MIDIInput: C,
    MIDIInputMap: C,
    MIDIMessageEvent: C,
    MIDIOutput: C,
    MIDIOutputMap: C,
    MIDIPort: C,
    MimeType: C,
    MimeTypeArray: C,
    MouseEvent: C,
    moveBy: O,
    moveTo: O,
    MutationEvent: C,
    MutationObserver: C,
    MutationRecord: C,
    name: O,
    NamedNodeMap: C,
    NavigationPreloadManager: C,
    navigator: O,
    Navigator: C,
    NetworkInformation: C,
    Node: C,
    NodeFilter: O,
    NodeIterator: C,
    NodeList: C,
    Notification: C,
    OfflineAudioCompletionEvent: C,
    OfflineAudioContext: C,
    offscreenBuffering: O,
    OffscreenCanvas: C,
    open: O,
    openDatabase: O,
    Option: C,
    origin: O,
    OscillatorNode: C,
    outerHeight: O,
    outerWidth: O,
    PageTransitionEvent: C,
    pageXOffset: O,
    pageYOffset: O,
    PannerNode: C,
    parent: O,
    Path2D: C,
    PaymentAddress: C,
    PaymentRequest: C,
    PaymentRequestUpdateEvent: C,
    PaymentResponse: C,
    performance: O,
    Performance: C,
    PerformanceEntry: C,
    PerformanceLongTaskTiming: C,
    PerformanceMark: C,
    PerformanceMeasure: C,
    PerformanceNavigation: C,
    PerformanceNavigationTiming: C,
    PerformanceObserver: C,
    PerformanceObserverEntryList: C,
    PerformancePaintTiming: C,
    PerformanceResourceTiming: C,
    PerformanceTiming: C,
    PeriodicWave: C,
    Permissions: C,
    PermissionStatus: C,
    personalbar: O,
    PhotoCapabilities: C,
    Plugin: C,
    PluginArray: C,
    PointerEvent: C,
    PopStateEvent: C,
    postMessage: O,
    Presentation: C,
    PresentationAvailability: C,
    PresentationConnection: C,
    PresentationConnectionAvailableEvent: C,
    PresentationConnectionCloseEvent: C,
    PresentationConnectionList: C,
    PresentationReceiver: C,
    PresentationRequest: C,
    print: O,
    ProcessingInstruction: C,
    ProgressEvent: C,
    PromiseRejectionEvent: C,
    prompt: O,
    PushManager: C,
    PushSubscription: C,
    PushSubscriptionOptions: C,
    queueMicrotask: O,
    RadioNodeList: C,
    Range: C,
    ReadableStream: C,
    RemotePlayback: C,
    removeEventListener: O,
    Request: C,
    requestAnimationFrame: O,
    requestIdleCallback: O,
    resizeBy: O,
    ResizeObserver: C,
    ResizeObserverEntry: C,
    resizeTo: O,
    Response: C,
    RTCCertificate: C,
    RTCDataChannel: C,
    RTCDataChannelEvent: C,
    RTCDtlsTransport: C,
    RTCIceCandidate: C,
    RTCIceTransport: C,
    RTCPeerConnection: C,
    RTCPeerConnectionIceEvent: C,
    RTCRtpReceiver: C,
    RTCRtpSender: C,
    RTCSctpTransport: C,
    RTCSessionDescription: C,
    RTCStatsReport: C,
    RTCTrackEvent: C,
    screen: O,
    Screen: C,
    screenLeft: O,
    ScreenOrientation: C,
    screenTop: O,
    screenX: O,
    screenY: O,
    ScriptProcessorNode: C,
    scroll: O,
    scrollbars: O,
    scrollBy: O,
    scrollTo: O,
    scrollX: O,
    scrollY: O,
    SecurityPolicyViolationEvent: C,
    Selection: C,
    ServiceWorker: C,
    ServiceWorkerContainer: C,
    ServiceWorkerRegistration: C,
    sessionStorage: O,
    ShadowRoot: C,
    SharedWorker: C,
    SourceBuffer: C,
    SourceBufferList: C,
    speechSynthesis: O,
    SpeechSynthesisEvent: C,
    SpeechSynthesisUtterance: C,
    StaticRange: C,
    status: O,
    statusbar: O,
    StereoPannerNode: C,
    stop: O,
    Storage: C,
    StorageEvent: C,
    StorageManager: C,
    styleMedia: O,
    StyleSheet: C,
    StyleSheetList: C,
    SubtleCrypto: C,
    SVGAElement: C,
    SVGAngle: C,
    SVGAnimatedAngle: C,
    SVGAnimatedBoolean: C,
    SVGAnimatedEnumeration: C,
    SVGAnimatedInteger: C,
    SVGAnimatedLength: C,
    SVGAnimatedLengthList: C,
    SVGAnimatedNumber: C,
    SVGAnimatedNumberList: C,
    SVGAnimatedPreserveAspectRatio: C,
    SVGAnimatedRect: C,
    SVGAnimatedString: C,
    SVGAnimatedTransformList: C,
    SVGAnimateElement: C,
    SVGAnimateMotionElement: C,
    SVGAnimateTransformElement: C,
    SVGAnimationElement: C,
    SVGCircleElement: C,
    SVGClipPathElement: C,
    SVGComponentTransferFunctionElement: C,
    SVGDefsElement: C,
    SVGDescElement: C,
    SVGDiscardElement: C,
    SVGElement: C,
    SVGEllipseElement: C,
    SVGFEBlendElement: C,
    SVGFEColorMatrixElement: C,
    SVGFEComponentTransferElement: C,
    SVGFECompositeElement: C,
    SVGFEConvolveMatrixElement: C,
    SVGFEDiffuseLightingElement: C,
    SVGFEDisplacementMapElement: C,
    SVGFEDistantLightElement: C,
    SVGFEDropShadowElement: C,
    SVGFEFloodElement: C,
    SVGFEFuncAElement: C,
    SVGFEFuncBElement: C,
    SVGFEFuncGElement: C,
    SVGFEFuncRElement: C,
    SVGFEGaussianBlurElement: C,
    SVGFEImageElement: C,
    SVGFEMergeElement: C,
    SVGFEMergeNodeElement: C,
    SVGFEMorphologyElement: C,
    SVGFEOffsetElement: C,
    SVGFEPointLightElement: C,
    SVGFESpecularLightingElement: C,
    SVGFESpotLightElement: C,
    SVGFETileElement: C,
    SVGFETurbulenceElement: C,
    SVGFilterElement: C,
    SVGForeignObjectElement: C,
    SVGGElement: C,
    SVGGeometryElement: C,
    SVGGradientElement: C,
    SVGGraphicsElement: C,
    SVGImageElement: C,
    SVGLength: C,
    SVGLengthList: C,
    SVGLinearGradientElement: C,
    SVGLineElement: C,
    SVGMarkerElement: C,
    SVGMaskElement: C,
    SVGMatrix: C,
    SVGMetadataElement: C,
    SVGMPathElement: C,
    SVGNumber: C,
    SVGNumberList: C,
    SVGPathElement: C,
    SVGPatternElement: C,
    SVGPoint: C,
    SVGPointList: C,
    SVGPolygonElement: C,
    SVGPolylineElement: C,
    SVGPreserveAspectRatio: C,
    SVGRadialGradientElement: C,
    SVGRect: C,
    SVGRectElement: C,
    SVGScriptElement: C,
    SVGSetElement: C,
    SVGStopElement: C,
    SVGStringList: C,
    SVGStyleElement: C,
    SVGSVGElement: C,
    SVGSwitchElement: C,
    SVGSymbolElement: C,
    SVGTextContentElement: C,
    SVGTextElement: C,
    SVGTextPathElement: C,
    SVGTextPositioningElement: C,
    SVGTitleElement: C,
    SVGTransform: C,
    SVGTransformList: C,
    SVGTSpanElement: C,
    SVGUnitTypes: C,
    SVGUseElement: C,
    SVGViewElement: C,
    TaskAttributionTiming: C,
    Text: C,
    TextEvent: C,
    TextMetrics: C,
    TextTrack: C,
    TextTrackCue: C,
    TextTrackCueList: C,
    TextTrackList: C,
    TimeRanges: C,
    toolbar: O,
    top: O,
    Touch: C,
    TouchEvent: C,
    TouchList: C,
    TrackEvent: C,
    TransitionEvent: C,
    TreeWalker: C,
    UIEvent: C,
    ValidityState: C,
    visualViewport: O,
    VisualViewport: C,
    VTTCue: C,
    WaveShaperNode: C,
    WebAssembly: O,
    WebGL2RenderingContext: C,
    WebGLActiveInfo: C,
    WebGLBuffer: C,
    WebGLContextEvent: C,
    WebGLFramebuffer: C,
    WebGLProgram: C,
    WebGLQuery: C,
    WebGLRenderbuffer: C,
    WebGLRenderingContext: C,
    WebGLSampler: C,
    WebGLShader: C,
    WebGLShaderPrecisionFormat: C,
    WebGLSync: C,
    WebGLTexture: C,
    WebGLTransformFeedback: C,
    WebGLUniformLocation: C,
    WebGLVertexArrayObject: C,
    WebSocket: C,
    WheelEvent: C,
    Window: C,
    Worker: C,
    WritableStream: C,
    XMLDocument: C,
    XMLHttpRequest: C,
    XMLHttpRequestEventTarget: C,
    XMLHttpRequestUpload: C,
    XMLSerializer: C,
    XPathEvaluator: C,
    XPathExpression: C,
    XPathResult: C,
    XSLTProcessor: C
};
for (const global of ['window', 'global', 'self', 'globalThis']) {
    knownGlobals[global] = knownGlobals;
}
function getGlobalAtPath(path) {
    let currentGlobal = knownGlobals;
    for (const pathSegment of path) {
        if (typeof pathSegment !== 'string') {
            return null;
        }
        currentGlobal = currentGlobal[pathSegment];
        if (!currentGlobal) {
            return null;
        }
    }
    return currentGlobal[ValueProperties];
}

class GlobalVariable extends Variable {
    constructor() {
        super(...arguments);
        // Ensure we use live-bindings for globals as we do not know if they have
        // been reassigned
        this.isReassigned = true;
    }
    getLiteralValueAtPath(path, _recursionTracker, _origin) {
        return getGlobalAtPath([this.name, ...path]) ? UnknownTruthyValue : UnknownValue;
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        switch (interaction.type) {
            case INTERACTION_ACCESSED:
                if (path.length === 0) {
                    // Technically, "undefined" is a global variable of sorts
                    return this.name !== 'undefined' && !getGlobalAtPath([this.name]);
                }
                return !getGlobalAtPath([this.name, ...path].slice(0, -1));
            case INTERACTION_ASSIGNED:
                return true;
            case INTERACTION_CALLED: {
                const globalAtPath = getGlobalAtPath([this.name, ...path]);
                return !globalAtPath || globalAtPath.hasEffectsWhenCalled(interaction, context);
            }
        }
    }
}

const tdzVariableKinds = {
    __proto__: null,
    class: true,
    const: true,
    let: true,
    var: true
};
class Identifier extends NodeBase {
    constructor() {
        super(...arguments);
        this.variable = null;
        this.isTDZAccess = null;
    }
    addExportedVariables(variables, exportNamesByVariable) {
        if (exportNamesByVariable.has(this.variable)) {
            variables.push(this.variable);
        }
    }
    bind() {
        if (!this.variable && is_reference(this, this.parent)) {
            this.variable = this.scope.findVariable(this.name);
            this.variable.addReference(this);
        }
    }
    declare(kind, init) {
        let variable;
        const { treeshake } = this.context.options;
        switch (kind) {
            case 'var':
                variable = this.scope.addDeclaration(this, this.context, init, true);
                if (treeshake && treeshake.correctVarValueBeforeDeclaration) {
                    // Necessary to make sure the init is deoptimized. We cannot call deoptimizePath here.
                    variable.markInitializersForDeoptimization();
                }
                break;
            case 'function':
                // in strict mode, functions are only hoisted within a scope but not across block scopes
                variable = this.scope.addDeclaration(this, this.context, init, false);
                break;
            case 'let':
            case 'const':
            case 'class':
                variable = this.scope.addDeclaration(this, this.context, init, false);
                break;
            case 'parameter':
                variable = this.scope.addParameterDeclaration(this);
                break;
            /* istanbul ignore next */
            default:
                /* istanbul ignore next */
                throw new Error(`Internal Error: Unexpected identifier kind ${kind}.`);
        }
        variable.kind = kind;
        return [(this.variable = variable)];
    }
    deoptimizePath(path) {
        var _a;
        if (path.length === 0 && !this.scope.contains(this.name)) {
            this.disallowImportReassignment();
        }
        // We keep conditional chaining because an unknown Node could have an
        // Identifier as property that might be deoptimized by default
        (_a = this.variable) === null || _a === void 0 ? void 0 : _a.deoptimizePath(path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        this.variable.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.getVariableRespectingTDZ().getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        return this.getVariableRespectingTDZ().getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
    }
    hasEffects(context) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        if (this.isPossibleTDZ() && this.variable.kind !== 'var') {
            return true;
        }
        return (this.context.options.treeshake.unknownGlobalSideEffects &&
            this.variable instanceof GlobalVariable &&
            this.variable.hasEffectsOnInteractionAtPath(EMPTY_PATH, NODE_INTERACTION_UNKNOWN_ACCESS, context));
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        switch (interaction.type) {
            case INTERACTION_ACCESSED:
                return (this.variable !== null &&
                    this.getVariableRespectingTDZ().hasEffectsOnInteractionAtPath(path, interaction, context));
            case INTERACTION_ASSIGNED:
                return (path.length > 0 ? this.getVariableRespectingTDZ() : this.variable).hasEffectsOnInteractionAtPath(path, interaction, context);
            case INTERACTION_CALLED:
                return this.getVariableRespectingTDZ().hasEffectsOnInteractionAtPath(path, interaction, context);
        }
    }
    include() {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        if (!this.included) {
            this.included = true;
            if (this.variable !== null) {
                this.context.includeVariableInModule(this.variable);
            }
        }
    }
    includeCallArguments(context, args) {
        this.variable.includeCallArguments(context, args);
    }
    isPossibleTDZ() {
        // return cached value to avoid issues with the next tree-shaking pass
        if (this.isTDZAccess !== null)
            return this.isTDZAccess;
        if (!(this.variable instanceof LocalVariable) ||
            !this.variable.kind ||
            !(this.variable.kind in tdzVariableKinds)) {
            return (this.isTDZAccess = false);
        }
        let decl_id;
        if (this.variable.declarations &&
            this.variable.declarations.length === 1 &&
            (decl_id = this.variable.declarations[0]) &&
            this.start < decl_id.start &&
            closestParentFunctionOrProgram(this) === closestParentFunctionOrProgram(decl_id)) {
            // a variable accessed before its declaration
            // in the same function or at top level of module
            return (this.isTDZAccess = true);
        }
        if (!this.variable.initReached) {
            // Either a const/let TDZ violation or
            // var use before declaration was encountered.
            return (this.isTDZAccess = true);
        }
        return (this.isTDZAccess = false);
    }
    markDeclarationReached() {
        this.variable.initReached = true;
    }
    render(code, { snippets: { getPropertyAccess } }, { renderedParentType, isCalleeOfRenderedParent, isShorthandProperty } = BLANK) {
        if (this.variable) {
            const name = this.variable.getName(getPropertyAccess);
            if (name !== this.name) {
                code.overwrite(this.start, this.end, name, {
                    contentOnly: true,
                    storeName: true
                });
                if (isShorthandProperty) {
                    code.prependRight(this.start, `${this.name}: `);
                }
            }
            // In strict mode, any variable named "eval" must be the actual "eval" function
            if (name === 'eval' &&
                renderedParentType === CallExpression$1 &&
                isCalleeOfRenderedParent) {
                code.appendRight(this.start, '0, ');
            }
        }
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        if (this.variable instanceof LocalVariable) {
            this.variable.consolidateInitializers();
            this.context.requestTreeshakingPass();
        }
    }
    disallowImportReassignment() {
        return this.context.error({
            code: 'ILLEGAL_REASSIGNMENT',
            message: `Illegal reassignment to import '${this.name}'`
        }, this.start);
    }
    getVariableRespectingTDZ() {
        if (this.isPossibleTDZ()) {
            return UNKNOWN_EXPRESSION;
        }
        return this.variable;
    }
}
function closestParentFunctionOrProgram(node) {
    while (node && !/^Program|Function/.test(node.type)) {
        node = node.parent;
    }
    // one of: ArrowFunctionExpression, FunctionDeclaration, FunctionExpression or Program
    return node;
}

function treeshakeNode(node, code, start, end) {
    code.remove(start, end);
    if (node.annotations) {
        for (const annotation of node.annotations) {
            if (annotation.start < start) {
                code.remove(annotation.start, annotation.end);
            }
            else {
                return;
            }
        }
    }
}
function removeAnnotations(node, code) {
    if (!node.annotations && node.parent.type === ExpressionStatement$1) {
        node = node.parent;
    }
    if (node.annotations) {
        for (const annotation of node.annotations) {
            code.remove(annotation.start, annotation.end);
        }
    }
}

const NO_SEMICOLON = { isNoStatement: true };
// This assumes there are only white-space and comments between start and the string we are looking for
function findFirstOccurrenceOutsideComment(code, searchString, start = 0) {
    let searchPos, charCodeAfterSlash;
    searchPos = code.indexOf(searchString, start);
    while (true) {
        start = code.indexOf('/', start);
        if (start === -1 || start >= searchPos)
            return searchPos;
        charCodeAfterSlash = code.charCodeAt(++start);
        ++start;
        // With our assumption, '/' always starts a comment. Determine comment type:
        start =
            charCodeAfterSlash === 47 /*"/"*/
                ? code.indexOf('\n', start) + 1
                : code.indexOf('*/', start) + 2;
        if (start > searchPos) {
            searchPos = code.indexOf(searchString, start);
        }
    }
}
const NON_WHITESPACE = /\S/g;
function findNonWhiteSpace(code, index) {
    NON_WHITESPACE.lastIndex = index;
    const result = NON_WHITESPACE.exec(code);
    return result.index;
}
// This assumes "code" only contains white-space and comments
// Returns position of line-comment if applicable
function findFirstLineBreakOutsideComment(code) {
    let lineBreakPos, charCodeAfterSlash, start = 0;
    lineBreakPos = code.indexOf('\n', start);
    while (true) {
        start = code.indexOf('/', start);
        if (start === -1 || start > lineBreakPos)
            return [lineBreakPos, lineBreakPos + 1];
        // With our assumption, '/' always starts a comment. Determine comment type:
        charCodeAfterSlash = code.charCodeAt(start + 1);
        if (charCodeAfterSlash === 47 /*"/"*/)
            return [start, lineBreakPos + 1];
        start = code.indexOf('*/', start + 3) + 2;
        if (start > lineBreakPos) {
            lineBreakPos = code.indexOf('\n', start);
        }
    }
}
function renderStatementList(statements, code, start, end, options) {
    let currentNode, currentNodeStart, currentNodeNeedsBoundaries, nextNodeStart;
    let nextNode = statements[0];
    let nextNodeNeedsBoundaries = !nextNode.included || nextNode.needsBoundaries;
    if (nextNodeNeedsBoundaries) {
        nextNodeStart =
            start + findFirstLineBreakOutsideComment(code.original.slice(start, nextNode.start))[1];
    }
    for (let nextIndex = 1; nextIndex <= statements.length; nextIndex++) {
        currentNode = nextNode;
        currentNodeStart = nextNodeStart;
        currentNodeNeedsBoundaries = nextNodeNeedsBoundaries;
        nextNode = statements[nextIndex];
        nextNodeNeedsBoundaries =
            nextNode === undefined ? false : !nextNode.included || nextNode.needsBoundaries;
        if (currentNodeNeedsBoundaries || nextNodeNeedsBoundaries) {
            nextNodeStart =
                currentNode.end +
                    findFirstLineBreakOutsideComment(code.original.slice(currentNode.end, nextNode === undefined ? end : nextNode.start))[1];
            if (currentNode.included) {
                currentNodeNeedsBoundaries
                    ? currentNode.render(code, options, {
                        end: nextNodeStart,
                        start: currentNodeStart
                    })
                    : currentNode.render(code, options);
            }
            else {
                treeshakeNode(currentNode, code, currentNodeStart, nextNodeStart);
            }
        }
        else {
            currentNode.render(code, options);
        }
    }
}
// This assumes that the first character is not part of the first node
function getCommaSeparatedNodesWithBoundaries(nodes, code, start, end) {
    const splitUpNodes = [];
    let node, nextNode, nextNodeStart, contentEnd, char;
    let separator = start - 1;
    for (let nextIndex = 0; nextIndex < nodes.length; nextIndex++) {
        nextNode = nodes[nextIndex];
        if (node !== undefined) {
            separator =
                node.end +
                    findFirstOccurrenceOutsideComment(code.original.slice(node.end, nextNode.start), ',');
        }
        nextNodeStart = contentEnd =
            separator +
                1 +
                findFirstLineBreakOutsideComment(code.original.slice(separator + 1, nextNode.start))[1];
        while (((char = code.original.charCodeAt(nextNodeStart)),
            char === 32 /*" "*/ || char === 9 /*"\t"*/ || char === 10 /*"\n"*/ || char === 13) /*"\r"*/)
            nextNodeStart++;
        if (node !== undefined) {
            splitUpNodes.push({
                contentEnd,
                end: nextNodeStart,
                node,
                separator,
                start
            });
        }
        node = nextNode;
        start = nextNodeStart;
    }
    splitUpNodes.push({
        contentEnd: end,
        end,
        node: node,
        separator: null,
        start
    });
    return splitUpNodes;
}
// This assumes there are only white-space and comments between start and end
function removeLineBreaks(code, start, end) {
    while (true) {
        const [removeStart, removeEnd] = findFirstLineBreakOutsideComment(code.original.slice(start, end));
        if (removeStart === -1) {
            break;
        }
        code.remove(start + removeStart, (start += removeEnd));
    }
}

class BlockScope extends ChildScope {
    addDeclaration(identifier, context, init, isHoisted) {
        if (isHoisted) {
            const variable = this.parent.addDeclaration(identifier, context, init, isHoisted);
            // Necessary to make sure the init is deoptimized for conditional declarations.
            // We cannot call deoptimizePath here.
            variable.markInitializersForDeoptimization();
            return variable;
        }
        else {
            return super.addDeclaration(identifier, context, init, false);
        }
    }
}

class ExpressionStatement extends NodeBase {
    initialise() {
        if (this.directive &&
            this.directive !== 'use strict' &&
            this.parent.type === Program$1) {
            this.context.warn(
            // This is necessary, because either way (deleting or not) can lead to errors.
            {
                code: 'MODULE_LEVEL_DIRECTIVE',
                message: `Module level directives cause errors when bundled, '${this.directive}' was ignored.`
            }, this.start);
        }
    }
    render(code, options) {
        super.render(code, options);
        if (this.included)
            this.insertSemicolon(code);
    }
    shouldBeIncluded(context) {
        if (this.directive && this.directive !== 'use strict')
            return this.parent.type !== Program$1;
        return super.shouldBeIncluded(context);
    }
    applyDeoptimizations() { }
}

class BlockStatement extends NodeBase {
    constructor() {
        super(...arguments);
        this.directlyIncluded = false;
    }
    addImplicitReturnExpressionToScope() {
        const lastStatement = this.body[this.body.length - 1];
        if (!lastStatement || lastStatement.type !== ReturnStatement$1) {
            this.scope.addReturnExpression(UNKNOWN_EXPRESSION);
        }
    }
    createScope(parentScope) {
        this.scope = this.parent.preventChildBlockScope
            ? parentScope
            : new BlockScope(parentScope);
    }
    hasEffects(context) {
        if (this.deoptimizeBody)
            return true;
        for (const node of this.body) {
            if (context.brokenFlow)
                break;
            if (node.hasEffects(context))
                return true;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        if (!(this.deoptimizeBody && this.directlyIncluded)) {
            this.included = true;
            this.directlyIncluded = true;
            if (this.deoptimizeBody)
                includeChildrenRecursively = true;
            for (const node of this.body) {
                if (includeChildrenRecursively || node.shouldBeIncluded(context))
                    node.include(context, includeChildrenRecursively);
            }
        }
    }
    initialise() {
        const firstBodyStatement = this.body[0];
        this.deoptimizeBody =
            firstBodyStatement instanceof ExpressionStatement &&
                firstBodyStatement.directive === 'use asm';
    }
    render(code, options) {
        if (this.body.length) {
            renderStatementList(this.body, code, this.start + 1, this.end - 1, options);
        }
        else {
            super.render(code, options);
        }
    }
}

class RestElement extends NodeBase {
    constructor() {
        super(...arguments);
        this.declarationInit = null;
    }
    addExportedVariables(variables, exportNamesByVariable) {
        this.argument.addExportedVariables(variables, exportNamesByVariable);
    }
    declare(kind, init) {
        this.declarationInit = init;
        return this.argument.declare(kind, UNKNOWN_EXPRESSION);
    }
    deoptimizePath(path) {
        path.length === 0 && this.argument.deoptimizePath(EMPTY_PATH);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        return (path.length > 0 ||
            this.argument.hasEffectsOnInteractionAtPath(EMPTY_PATH, interaction, context));
    }
    markDeclarationReached() {
        this.argument.markDeclarationReached();
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        if (this.declarationInit !== null) {
            this.declarationInit.deoptimizePath([UnknownKey, UnknownKey]);
            this.context.requestTreeshakingPass();
        }
    }
}

class FunctionBase extends NodeBase {
    constructor() {
        super(...arguments);
        this.objectEntity = null;
        this.deoptimizedReturn = false;
    }
    deoptimizePath(path) {
        this.getObjectEntity().deoptimizePath(path);
        if (path.length === 1 && path[0] === UnknownKey) {
            // A reassignment of UNKNOWN_PATH is considered equivalent to having lost track
            // which means the return expression needs to be reassigned
            this.scope.getReturnExpression().deoptimizePath(UNKNOWN_PATH);
        }
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        if (path.length > 0) {
            this.getObjectEntity().deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.getObjectEntity().getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        if (path.length > 0) {
            return this.getObjectEntity().getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
        }
        if (this.async) {
            if (!this.deoptimizedReturn) {
                this.deoptimizedReturn = true;
                this.scope.getReturnExpression().deoptimizePath(UNKNOWN_PATH);
                this.context.requestTreeshakingPass();
            }
            return UNKNOWN_EXPRESSION;
        }
        return this.scope.getReturnExpression();
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (path.length > 0 || interaction.type !== INTERACTION_CALLED) {
            return this.getObjectEntity().hasEffectsOnInteractionAtPath(path, interaction, context);
        }
        if (this.async) {
            const { propertyReadSideEffects } = this.context.options
                .treeshake;
            const returnExpression = this.scope.getReturnExpression();
            if (returnExpression.hasEffectsOnInteractionAtPath(['then'], NODE_INTERACTION_UNKNOWN_CALL, context) ||
                (propertyReadSideEffects &&
                    (propertyReadSideEffects === 'always' ||
                        returnExpression.hasEffectsOnInteractionAtPath(['then'], NODE_INTERACTION_UNKNOWN_ACCESS, context)))) {
                return true;
            }
        }
        for (const param of this.params) {
            if (param.hasEffects(context))
                return true;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        this.included = true;
        const { brokenFlow } = context;
        context.brokenFlow = BROKEN_FLOW_NONE;
        this.body.include(context, includeChildrenRecursively);
        context.brokenFlow = brokenFlow;
    }
    includeCallArguments(context, args) {
        this.scope.includeCallArguments(context, args);
    }
    initialise() {
        this.scope.addParameterVariables(this.params.map(param => param.declare('parameter', UNKNOWN_EXPRESSION)), this.params[this.params.length - 1] instanceof RestElement);
        if (this.body instanceof BlockStatement) {
            this.body.addImplicitReturnExpressionToScope();
        }
        else {
            this.scope.addReturnExpression(this.body);
        }
    }
    parseNode(esTreeNode) {
        if (esTreeNode.body.type === BlockStatement$1) {
            this.body = new BlockStatement(esTreeNode.body, this, this.scope.hoistedBodyVarScope);
        }
        super.parseNode(esTreeNode);
    }
    applyDeoptimizations() { }
}
FunctionBase.prototype.preventChildBlockScope = true;

class ArrowFunctionExpression extends FunctionBase {
    constructor() {
        super(...arguments);
        this.objectEntity = null;
    }
    createScope(parentScope) {
        this.scope = new ReturnValueScope(parentScope, this.context);
    }
    hasEffects() {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        return false;
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (super.hasEffectsOnInteractionAtPath(path, interaction, context))
            return true;
        if (interaction.type === INTERACTION_CALLED) {
            const { ignore, brokenFlow } = context;
            context.ignore = {
                breaks: false,
                continues: false,
                labels: new Set(),
                returnYield: true
            };
            if (this.body.hasEffects(context))
                return true;
            context.ignore = ignore;
            context.brokenFlow = brokenFlow;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        super.include(context, includeChildrenRecursively);
        for (const param of this.params) {
            if (!(param instanceof Identifier)) {
                param.include(context, includeChildrenRecursively);
            }
        }
    }
    getObjectEntity() {
        if (this.objectEntity !== null) {
            return this.objectEntity;
        }
        return (this.objectEntity = new ObjectEntity([], OBJECT_PROTOTYPE));
    }
}

function getSystemExportStatement(exportedVariables, { exportNamesByVariable, snippets: { _, getObject, getPropertyAccess } }, modifier = '') {
    if (exportedVariables.length === 1 &&
        exportNamesByVariable.get(exportedVariables[0]).length === 1) {
        const variable = exportedVariables[0];
        return `exports('${exportNamesByVariable.get(variable)}',${_}${variable.getName(getPropertyAccess)}${modifier})`;
    }
    else {
        const fields = [];
        for (const variable of exportedVariables) {
            for (const exportName of exportNamesByVariable.get(variable)) {
                fields.push([exportName, variable.getName(getPropertyAccess) + modifier]);
            }
        }
        return `exports(${getObject(fields, { lineBreakIndent: null })})`;
    }
}
function renderSystemExportExpression(exportedVariable, expressionStart, expressionEnd, code, { exportNamesByVariable, snippets: { _ } }) {
    code.prependRight(expressionStart, `exports('${exportNamesByVariable.get(exportedVariable)}',${_}`);
    code.appendLeft(expressionEnd, ')');
}
function renderSystemExportFunction(exportedVariables, expressionStart, expressionEnd, needsParens, code, options) {
    const { _, getDirectReturnIifeLeft } = options.snippets;
    code.prependRight(expressionStart, getDirectReturnIifeLeft(['v'], `${getSystemExportStatement(exportedVariables, options)},${_}v`, { needsArrowReturnParens: true, needsWrappedFunction: needsParens }));
    code.appendLeft(expressionEnd, ')');
}
function renderSystemExportSequenceAfterExpression(exportedVariable, expressionStart, expressionEnd, needsParens, code, options) {
    const { _, getPropertyAccess } = options.snippets;
    code.appendLeft(expressionEnd, `,${_}${getSystemExportStatement([exportedVariable], options)},${_}${exportedVariable.getName(getPropertyAccess)}`);
    if (needsParens) {
        code.prependRight(expressionStart, '(');
        code.appendLeft(expressionEnd, ')');
    }
}
function renderSystemExportSequenceBeforeExpression(exportedVariable, expressionStart, expressionEnd, needsParens, code, options, modifier) {
    const { _ } = options.snippets;
    code.prependRight(expressionStart, `${getSystemExportStatement([exportedVariable], options, modifier)},${_}`);
    if (needsParens) {
        code.prependRight(expressionStart, '(');
        code.appendLeft(expressionEnd, ')');
    }
}

class ObjectPattern extends NodeBase {
    addExportedVariables(variables, exportNamesByVariable) {
        for (const property of this.properties) {
            if (property.type === Property$1) {
                property.value.addExportedVariables(variables, exportNamesByVariable);
            }
            else {
                property.argument.addExportedVariables(variables, exportNamesByVariable);
            }
        }
    }
    declare(kind, init) {
        const variables = [];
        for (const property of this.properties) {
            variables.push(...property.declare(kind, init));
        }
        return variables;
    }
    deoptimizePath(path) {
        if (path.length === 0) {
            for (const property of this.properties) {
                property.deoptimizePath(path);
            }
        }
    }
    hasEffectsOnInteractionAtPath(
    // At the moment, this is only triggered for assignment left-hand sides,
    // where the path is empty
    _path, interaction, context) {
        for (const property of this.properties) {
            if (property.hasEffectsOnInteractionAtPath(EMPTY_PATH, interaction, context))
                return true;
        }
        return false;
    }
    markDeclarationReached() {
        for (const property of this.properties) {
            property.markDeclarationReached();
        }
    }
}

class AssignmentExpression extends NodeBase {
    hasEffects(context) {
        const { deoptimized, left, right } = this;
        if (!deoptimized)
            this.applyDeoptimizations();
        // MemberExpressions do not access the property before assignments if the
        // operator is '='.
        return (right.hasEffects(context) || left.hasEffectsAsAssignmentTarget(context, this.operator !== '='));
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        return this.right.hasEffectsOnInteractionAtPath(path, interaction, context);
    }
    include(context, includeChildrenRecursively) {
        const { deoptimized, left, right, operator } = this;
        if (!deoptimized)
            this.applyDeoptimizations();
        this.included = true;
        if (includeChildrenRecursively ||
            operator !== '=' ||
            left.included ||
            left.hasEffectsAsAssignmentTarget(createHasEffectsContext(), false)) {
            left.includeAsAssignmentTarget(context, includeChildrenRecursively, operator !== '=');
        }
        right.include(context, includeChildrenRecursively);
    }
    initialise() {
        this.left.setAssignedValue(this.right);
    }
    render(code, options, { preventASI, renderedParentType, renderedSurroundingElement } = BLANK) {
        const { left, right, start, end, parent } = this;
        if (left.included) {
            left.render(code, options);
            right.render(code, options);
        }
        else {
            const inclusionStart = findNonWhiteSpace(code.original, findFirstOccurrenceOutsideComment(code.original, '=', left.end) + 1);
            code.remove(start, inclusionStart);
            if (preventASI) {
                removeLineBreaks(code, inclusionStart, right.start);
            }
            right.render(code, options, {
                renderedParentType: renderedParentType || parent.type,
                renderedSurroundingElement: renderedSurroundingElement || parent.type
            });
        }
        if (options.format === 'system') {
            if (left instanceof Identifier) {
                const variable = left.variable;
                const exportNames = options.exportNamesByVariable.get(variable);
                if (exportNames) {
                    if (exportNames.length === 1) {
                        renderSystemExportExpression(variable, start, end, code, options);
                    }
                    else {
                        renderSystemExportSequenceAfterExpression(variable, start, end, parent.type !== ExpressionStatement$1, code, options);
                    }
                    return;
                }
            }
            else {
                const systemPatternExports = [];
                left.addExportedVariables(systemPatternExports, options.exportNamesByVariable);
                if (systemPatternExports.length > 0) {
                    renderSystemExportFunction(systemPatternExports, start, end, renderedSurroundingElement === ExpressionStatement$1, code, options);
                    return;
                }
            }
        }
        if (left.included &&
            left instanceof ObjectPattern &&
            (renderedSurroundingElement === ExpressionStatement$1 ||
                renderedSurroundingElement === ArrowFunctionExpression$1)) {
            code.appendRight(start, '(');
            code.prependLeft(end, ')');
        }
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        this.left.deoptimizePath(EMPTY_PATH);
        this.right.deoptimizePath(UNKNOWN_PATH);
        this.context.requestTreeshakingPass();
    }
}

class AssignmentPattern extends NodeBase {
    addExportedVariables(variables, exportNamesByVariable) {
        this.left.addExportedVariables(variables, exportNamesByVariable);
    }
    declare(kind, init) {
        return this.left.declare(kind, init);
    }
    deoptimizePath(path) {
        path.length === 0 && this.left.deoptimizePath(path);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        return (path.length > 0 || this.left.hasEffectsOnInteractionAtPath(EMPTY_PATH, interaction, context));
    }
    markDeclarationReached() {
        this.left.markDeclarationReached();
    }
    render(code, options, { isShorthandProperty } = BLANK) {
        this.left.render(code, options, { isShorthandProperty });
        this.right.render(code, options);
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        this.left.deoptimizePath(EMPTY_PATH);
        this.right.deoptimizePath(UNKNOWN_PATH);
        this.context.requestTreeshakingPass();
    }
}

class ArgumentsVariable extends LocalVariable {
    constructor(context) {
        super('arguments', null, UNKNOWN_EXPRESSION, context);
    }
    hasEffectsOnInteractionAtPath(path, { type }) {
        return type !== INTERACTION_ACCESSED || path.length > 1;
    }
}

class ThisVariable extends LocalVariable {
    constructor(context) {
        super('this', null, null, context);
        this.deoptimizedPaths = [];
        this.entitiesToBeDeoptimized = new Set();
        this.thisDeoptimizationList = [];
        this.thisDeoptimizations = new DiscriminatedPathTracker();
    }
    addEntityToBeDeoptimized(entity) {
        for (const path of this.deoptimizedPaths) {
            entity.deoptimizePath(path);
        }
        for (const { interaction, path } of this.thisDeoptimizationList) {
            entity.deoptimizeThisOnInteractionAtPath(interaction, path, SHARED_RECURSION_TRACKER);
        }
        this.entitiesToBeDeoptimized.add(entity);
    }
    deoptimizePath(path) {
        if (path.length === 0 ||
            this.deoptimizationTracker.trackEntityAtPathAndGetIfTracked(path, this)) {
            return;
        }
        this.deoptimizedPaths.push(path);
        for (const entity of this.entitiesToBeDeoptimized) {
            entity.deoptimizePath(path);
        }
    }
    deoptimizeThisOnInteractionAtPath(interaction, path) {
        const thisDeoptimization = {
            interaction,
            path
        };
        if (!this.thisDeoptimizations.trackEntityAtPathAndGetIfTracked(path, interaction.type, interaction.thisArg)) {
            for (const entity of this.entitiesToBeDeoptimized) {
                entity.deoptimizeThisOnInteractionAtPath(interaction, path, SHARED_RECURSION_TRACKER);
            }
            this.thisDeoptimizationList.push(thisDeoptimization);
        }
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        return (this.getInit(context).hasEffectsOnInteractionAtPath(path, interaction, context) ||
            super.hasEffectsOnInteractionAtPath(path, interaction, context));
    }
    getInit(context) {
        return context.replacedVariableInits.get(this) || UNKNOWN_EXPRESSION;
    }
}

class FunctionScope extends ReturnValueScope {
    constructor(parent, context) {
        super(parent, context);
        this.variables.set('arguments', (this.argumentsVariable = new ArgumentsVariable(context)));
        this.variables.set('this', (this.thisVariable = new ThisVariable(context)));
    }
    findLexicalBoundary() {
        return this;
    }
    includeCallArguments(context, args) {
        super.includeCallArguments(context, args);
        if (this.argumentsVariable.included) {
            for (const arg of args) {
                if (!arg.included) {
                    arg.include(context, false);
                }
            }
        }
    }
}

class FunctionNode extends FunctionBase {
    constructor() {
        super(...arguments);
        this.objectEntity = null;
    }
    createScope(parentScope) {
        this.scope = new FunctionScope(parentScope, this.context);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        super.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
        if (interaction.type === INTERACTION_CALLED && path.length === 0) {
            this.scope.thisVariable.addEntityToBeDeoptimized(interaction.thisArg);
        }
    }
    hasEffects(context) {
        var _a;
        if (!this.deoptimized)
            this.applyDeoptimizations();
        return !!((_a = this.id) === null || _a === void 0 ? void 0 : _a.hasEffects(context));
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (super.hasEffectsOnInteractionAtPath(path, interaction, context))
            return true;
        if (interaction.type === INTERACTION_CALLED) {
            const thisInit = context.replacedVariableInits.get(this.scope.thisVariable);
            context.replacedVariableInits.set(this.scope.thisVariable, interaction.withNew
                ? new ObjectEntity(Object.create(null), OBJECT_PROTOTYPE)
                : UNKNOWN_EXPRESSION);
            const { brokenFlow, ignore } = context;
            context.ignore = {
                breaks: false,
                continues: false,
                labels: new Set(),
                returnYield: true
            };
            if (this.body.hasEffects(context))
                return true;
            context.brokenFlow = brokenFlow;
            if (thisInit) {
                context.replacedVariableInits.set(this.scope.thisVariable, thisInit);
            }
            else {
                context.replacedVariableInits.delete(this.scope.thisVariable);
            }
            context.ignore = ignore;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        var _a;
        super.include(context, includeChildrenRecursively);
        (_a = this.id) === null || _a === void 0 ? void 0 : _a.include();
        const hasArguments = this.scope.argumentsVariable.included;
        for (const param of this.params) {
            if (!(param instanceof Identifier) || hasArguments) {
                param.include(context, includeChildrenRecursively);
            }
        }
    }
    initialise() {
        var _a;
        super.initialise();
        (_a = this.id) === null || _a === void 0 ? void 0 : _a.declare('function', this);
    }
    getObjectEntity() {
        if (this.objectEntity !== null) {
            return this.objectEntity;
        }
        return (this.objectEntity = new ObjectEntity([
            {
                key: 'prototype',
                kind: 'init',
                property: new ObjectEntity([], OBJECT_PROTOTYPE)
            }
        ], OBJECT_PROTOTYPE));
    }
}

class AwaitExpression extends NodeBase {
    hasEffects() {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        return true;
    }
    include(context, includeChildrenRecursively) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        if (!this.included) {
            this.included = true;
            checkTopLevelAwait: if (!this.context.usesTopLevelAwait) {
                let parent = this.parent;
                do {
                    if (parent instanceof FunctionNode || parent instanceof ArrowFunctionExpression)
                        break checkTopLevelAwait;
                } while ((parent = parent.parent));
                this.context.usesTopLevelAwait = true;
            }
        }
        this.argument.include(context, includeChildrenRecursively);
    }
}

const binaryOperators = {
    '!=': (left, right) => left != right,
    '!==': (left, right) => left !== right,
    '%': (left, right) => left % right,
    '&': (left, right) => left & right,
    '*': (left, right) => left * right,
    // At the moment, "**" will be transpiled to Math.pow
    '**': (left, right) => left ** right,
    '+': (left, right) => left + right,
    '-': (left, right) => left - right,
    '/': (left, right) => left / right,
    '<': (left, right) => left < right,
    '<<': (left, right) => left << right,
    '<=': (left, right) => left <= right,
    '==': (left, right) => left == right,
    '===': (left, right) => left === right,
    '>': (left, right) => left > right,
    '>=': (left, right) => left >= right,
    '>>': (left, right) => left >> right,
    '>>>': (left, right) => left >>> right,
    '^': (left, right) => left ^ right,
    '|': (left, right) => left | right
    // We use the fallback for cases where we return something unknown
    // in: () => UnknownValue,
    // instanceof: () => UnknownValue,
};
class BinaryExpression extends NodeBase {
    deoptimizeCache() { }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (path.length > 0)
            return UnknownValue;
        const leftValue = this.left.getLiteralValueAtPath(EMPTY_PATH, recursionTracker, origin);
        if (typeof leftValue === 'symbol')
            return UnknownValue;
        const rightValue = this.right.getLiteralValueAtPath(EMPTY_PATH, recursionTracker, origin);
        if (typeof rightValue === 'symbol')
            return UnknownValue;
        const operatorFn = binaryOperators[this.operator];
        if (!operatorFn)
            return UnknownValue;
        return operatorFn(leftValue, rightValue);
    }
    hasEffects(context) {
        // support some implicit type coercion runtime errors
        if (this.operator === '+' &&
            this.parent instanceof ExpressionStatement &&
            this.left.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this) === '') {
            return true;
        }
        return super.hasEffects(context);
    }
    hasEffectsOnInteractionAtPath(path, { type }) {
        return type !== INTERACTION_ACCESSED || path.length > 1;
    }
    render(code, options, { renderedSurroundingElement } = BLANK) {
        this.left.render(code, options, { renderedSurroundingElement });
        this.right.render(code, options);
    }
}

class BreakStatement extends NodeBase {
    hasEffects(context) {
        if (this.label) {
            if (!context.ignore.labels.has(this.label.name))
                return true;
            context.includedLabels.add(this.label.name);
            context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
        }
        else {
            if (!context.ignore.breaks)
                return true;
            context.brokenFlow = BROKEN_FLOW_BREAK_CONTINUE;
        }
        return false;
    }
    include(context) {
        this.included = true;
        if (this.label) {
            this.label.include();
            context.includedLabels.add(this.label.name);
        }
        context.brokenFlow = this.label ? BROKEN_FLOW_ERROR_RETURN_LABEL : BROKEN_FLOW_BREAK_CONTINUE;
    }
}

function renderCallArguments(code, options, node) {
    if (node.arguments.length > 0) {
        if (node.arguments[node.arguments.length - 1].included) {
            for (const arg of node.arguments) {
                arg.render(code, options);
            }
        }
        else {
            let lastIncludedIndex = node.arguments.length - 2;
            while (lastIncludedIndex >= 0 && !node.arguments[lastIncludedIndex].included) {
                lastIncludedIndex--;
            }
            if (lastIncludedIndex >= 0) {
                for (let index = 0; index <= lastIncludedIndex; index++) {
                    node.arguments[index].render(code, options);
                }
                code.remove(findFirstOccurrenceOutsideComment(code.original, ',', node.arguments[lastIncludedIndex].end), node.end - 1);
            }
            else {
                code.remove(findFirstOccurrenceOutsideComment(code.original, '(', node.callee.end) + 1, node.end - 1);
            }
        }
    }
}

class Literal extends NodeBase {
    deoptimizeThisOnInteractionAtPath() { }
    getLiteralValueAtPath(path) {
        if (path.length > 0 ||
            // unknown literals can also be null but do not start with an "n"
            (this.value === null && this.context.code.charCodeAt(this.start) !== 110) ||
            typeof this.value === 'bigint' ||
            // to support shims for regular expressions
            this.context.code.charCodeAt(this.start) === 47) {
            return UnknownValue;
        }
        return this.value;
    }
    getReturnExpressionWhenCalledAtPath(path) {
        if (path.length !== 1)
            return UNKNOWN_EXPRESSION;
        return getMemberReturnExpressionWhenCalled(this.members, path[0]);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        switch (interaction.type) {
            case INTERACTION_ACCESSED:
                return path.length > (this.value === null ? 0 : 1);
            case INTERACTION_ASSIGNED:
                return true;
            case INTERACTION_CALLED:
                return (path.length !== 1 ||
                    hasMemberEffectWhenCalled(this.members, path[0], interaction, context));
        }
    }
    initialise() {
        this.members = getLiteralMembersForValue(this.value);
    }
    parseNode(esTreeNode) {
        this.value = esTreeNode.value;
        this.regex = esTreeNode.regex;
        super.parseNode(esTreeNode);
    }
    render(code) {
        if (typeof this.value === 'string') {
            code.indentExclusionRanges.push([this.start + 1, this.end - 1]);
        }
    }
}

// To avoid infinite recursions
const MAX_PATH_DEPTH = 7;
function getResolvablePropertyKey(memberExpression) {
    return memberExpression.computed
        ? getResolvableComputedPropertyKey(memberExpression.property)
        : memberExpression.property.name;
}
function getResolvableComputedPropertyKey(propertyKey) {
    if (propertyKey instanceof Literal) {
        return String(propertyKey.value);
    }
    return null;
}
function getPathIfNotComputed(memberExpression) {
    const nextPathKey = memberExpression.propertyKey;
    const object = memberExpression.object;
    if (typeof nextPathKey === 'string') {
        if (object instanceof Identifier) {
            return [
                { key: object.name, pos: object.start },
                { key: nextPathKey, pos: memberExpression.property.start }
            ];
        }
        if (object instanceof MemberExpression) {
            const parentPath = getPathIfNotComputed(object);
            return (parentPath && [...parentPath, { key: nextPathKey, pos: memberExpression.property.start }]);
        }
    }
    return null;
}
function getStringFromPath(path) {
    let pathString = path[0].key;
    for (let index = 1; index < path.length; index++) {
        pathString += '.' + path[index].key;
    }
    return pathString;
}
class MemberExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.variable = null;
        this.assignmentDeoptimized = false;
        this.bound = false;
        this.expressionsToBeDeoptimized = [];
        this.replacement = null;
    }
    bind() {
        this.bound = true;
        const path = getPathIfNotComputed(this);
        const baseVariable = path && this.scope.findVariable(path[0].key);
        if (baseVariable && baseVariable.isNamespace) {
            const resolvedVariable = resolveNamespaceVariables(baseVariable, path.slice(1), this.context);
            if (!resolvedVariable) {
                super.bind();
            }
            else if (typeof resolvedVariable === 'string') {
                this.replacement = resolvedVariable;
            }
            else {
                this.variable = resolvedVariable;
                this.scope.addNamespaceMemberAccess(getStringFromPath(path), resolvedVariable);
            }
        }
        else {
            super.bind();
        }
    }
    deoptimizeCache() {
        const expressionsToBeDeoptimized = this.expressionsToBeDeoptimized;
        this.expressionsToBeDeoptimized = [];
        this.propertyKey = UnknownKey;
        this.object.deoptimizePath(UNKNOWN_PATH);
        for (const expression of expressionsToBeDeoptimized) {
            expression.deoptimizeCache();
        }
    }
    deoptimizePath(path) {
        if (path.length === 0)
            this.disallowNamespaceReassignment();
        if (this.variable) {
            this.variable.deoptimizePath(path);
        }
        else if (!this.replacement) {
            if (path.length < MAX_PATH_DEPTH) {
                const propertyKey = this.getPropertyKey();
                this.object.deoptimizePath([
                    propertyKey === UnknownKey ? UnknownNonAccessorKey : propertyKey,
                    ...path
                ]);
            }
        }
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        if (this.variable) {
            this.variable.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
        }
        else if (!this.replacement) {
            if (path.length < MAX_PATH_DEPTH) {
                this.object.deoptimizeThisOnInteractionAtPath(interaction, [this.getPropertyKey(), ...path], recursionTracker);
            }
            else {
                interaction.thisArg.deoptimizePath(UNKNOWN_PATH);
            }
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (this.variable) {
            return this.variable.getLiteralValueAtPath(path, recursionTracker, origin);
        }
        if (this.replacement) {
            return UnknownValue;
        }
        this.expressionsToBeDeoptimized.push(origin);
        if (path.length < MAX_PATH_DEPTH) {
            return this.object.getLiteralValueAtPath([this.getPropertyKey(), ...path], recursionTracker, origin);
        }
        return UnknownValue;
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        if (this.variable) {
            return this.variable.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
        }
        if (this.replacement) {
            return UNKNOWN_EXPRESSION;
        }
        this.expressionsToBeDeoptimized.push(origin);
        if (path.length < MAX_PATH_DEPTH) {
            return this.object.getReturnExpressionWhenCalledAtPath([this.getPropertyKey(), ...path], interaction, recursionTracker, origin);
        }
        return UNKNOWN_EXPRESSION;
    }
    hasEffects(context) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        return (this.property.hasEffects(context) ||
            this.object.hasEffects(context) ||
            this.hasAccessEffect(context));
    }
    hasEffectsAsAssignmentTarget(context, checkAccess) {
        if (checkAccess && !this.deoptimized)
            this.applyDeoptimizations();
        if (!this.assignmentDeoptimized)
            this.applyAssignmentDeoptimization();
        return (this.property.hasEffects(context) ||
            this.object.hasEffects(context) ||
            (checkAccess && this.hasAccessEffect(context)) ||
            this.hasEffectsOnInteractionAtPath(EMPTY_PATH, this.assignmentInteraction, context));
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (this.variable) {
            return this.variable.hasEffectsOnInteractionAtPath(path, interaction, context);
        }
        if (this.replacement) {
            return true;
        }
        if (path.length < MAX_PATH_DEPTH) {
            return this.object.hasEffectsOnInteractionAtPath([this.getPropertyKey(), ...path], interaction, context);
        }
        return true;
    }
    include(context, includeChildrenRecursively) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        this.includeProperties(context, includeChildrenRecursively);
    }
    includeAsAssignmentTarget(context, includeChildrenRecursively, deoptimizeAccess) {
        if (!this.assignmentDeoptimized)
            this.applyAssignmentDeoptimization();
        if (deoptimizeAccess) {
            this.include(context, includeChildrenRecursively);
        }
        else {
            this.includeProperties(context, includeChildrenRecursively);
        }
    }
    includeCallArguments(context, args) {
        if (this.variable) {
            this.variable.includeCallArguments(context, args);
        }
        else {
            super.includeCallArguments(context, args);
        }
    }
    initialise() {
        this.propertyKey = getResolvablePropertyKey(this);
        this.accessInteraction = { thisArg: this.object, type: INTERACTION_ACCESSED };
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent, renderedSurroundingElement } = BLANK) {
        if (this.variable || this.replacement) {
            const { snippets: { getPropertyAccess } } = options;
            let replacement = this.variable ? this.variable.getName(getPropertyAccess) : this.replacement;
            if (renderedParentType && isCalleeOfRenderedParent)
                replacement = '0, ' + replacement;
            code.overwrite(this.start, this.end, replacement, {
                contentOnly: true,
                storeName: true
            });
        }
        else {
            if (renderedParentType && isCalleeOfRenderedParent) {
                code.appendRight(this.start, '0, ');
            }
            this.object.render(code, options, { renderedSurroundingElement });
            this.property.render(code, options);
        }
    }
    setAssignedValue(value) {
        this.assignmentInteraction = {
            args: [value],
            thisArg: this.object,
            type: INTERACTION_ASSIGNED
        };
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        const { propertyReadSideEffects } = this.context.options
            .treeshake;
        if (
        // Namespaces are not bound and should not be deoptimized
        this.bound &&
            propertyReadSideEffects &&
            !(this.variable || this.replacement)) {
            const propertyKey = this.getPropertyKey();
            this.object.deoptimizeThisOnInteractionAtPath(this.accessInteraction, [propertyKey], SHARED_RECURSION_TRACKER);
            this.context.requestTreeshakingPass();
        }
    }
    applyAssignmentDeoptimization() {
        this.assignmentDeoptimized = true;
        const { propertyReadSideEffects } = this.context.options
            .treeshake;
        if (
        // Namespaces are not bound and should not be deoptimized
        this.bound &&
            propertyReadSideEffects &&
            !(this.variable || this.replacement)) {
            this.object.deoptimizeThisOnInteractionAtPath(this.assignmentInteraction, [this.getPropertyKey()], SHARED_RECURSION_TRACKER);
            this.context.requestTreeshakingPass();
        }
    }
    disallowNamespaceReassignment() {
        if (this.object instanceof Identifier) {
            const variable = this.scope.findVariable(this.object.name);
            if (variable.isNamespace) {
                if (this.variable) {
                    this.context.includeVariableInModule(this.variable);
                }
                this.context.warn({
                    code: 'ILLEGAL_NAMESPACE_REASSIGNMENT',
                    message: `Illegal reassignment to import '${this.object.name}'`
                }, this.start);
            }
        }
    }
    getPropertyKey() {
        if (this.propertyKey === null) {
            this.propertyKey = UnknownKey;
            const value = this.property.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this);
            return (this.propertyKey = typeof value === 'symbol' ? UnknownKey : String(value));
        }
        return this.propertyKey;
    }
    hasAccessEffect(context) {
        const { propertyReadSideEffects } = this.context.options
            .treeshake;
        return (!(this.variable || this.replacement) &&
            propertyReadSideEffects &&
            (propertyReadSideEffects === 'always' ||
                this.object.hasEffectsOnInteractionAtPath([this.getPropertyKey()], this.accessInteraction, context)));
    }
    includeProperties(context, includeChildrenRecursively) {
        if (!this.included) {
            this.included = true;
            if (this.variable) {
                this.context.includeVariableInModule(this.variable);
            }
        }
        this.object.include(context, includeChildrenRecursively);
        this.property.include(context, includeChildrenRecursively);
    }
}
function resolveNamespaceVariables(baseVariable, path, astContext) {
    if (path.length === 0)
        return baseVariable;
    if (!baseVariable.isNamespace || baseVariable instanceof ExternalVariable)
        return null;
    const exportName = path[0].key;
    const variable = baseVariable.context.traceExport(exportName);
    if (!variable) {
        const fileName = baseVariable.context.fileName;
        astContext.warn({
            code: 'MISSING_EXPORT',
            exporter: relativeId(fileName),
            importer: relativeId(astContext.fileName),
            message: `'${exportName}' is not exported by '${relativeId(fileName)}'`,
            missing: exportName,
            url: `https://rollupjs.org/guide/en/#error-name-is-not-exported-by-module`
        }, path[0].pos);
        return 'undefined';
    }
    return resolveNamespaceVariables(variable, path.slice(1), astContext);
}

class CallExpressionBase extends NodeBase {
    constructor() {
        super(...arguments);
        this.returnExpression = null;
        this.deoptimizableDependentExpressions = [];
        this.expressionsToBeDeoptimized = new Set();
    }
    deoptimizeCache() {
        if (this.returnExpression !== UNKNOWN_EXPRESSION) {
            this.returnExpression = UNKNOWN_EXPRESSION;
            for (const expression of this.deoptimizableDependentExpressions) {
                expression.deoptimizeCache();
            }
            for (const expression of this.expressionsToBeDeoptimized) {
                expression.deoptimizePath(UNKNOWN_PATH);
            }
        }
    }
    deoptimizePath(path) {
        if (path.length === 0 ||
            this.context.deoptimizationTracker.trackEntityAtPathAndGetIfTracked(path, this)) {
            return;
        }
        const returnExpression = this.getReturnExpression();
        if (returnExpression !== UNKNOWN_EXPRESSION) {
            returnExpression.deoptimizePath(path);
        }
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        const returnExpression = this.getReturnExpression(recursionTracker);
        if (returnExpression === UNKNOWN_EXPRESSION) {
            interaction.thisArg.deoptimizePath(UNKNOWN_PATH);
        }
        else {
            recursionTracker.withTrackedEntityAtPath(path, returnExpression, () => {
                this.expressionsToBeDeoptimized.add(interaction.thisArg);
                returnExpression.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
            }, undefined);
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        const returnExpression = this.getReturnExpression(recursionTracker);
        if (returnExpression === UNKNOWN_EXPRESSION) {
            return UnknownValue;
        }
        return recursionTracker.withTrackedEntityAtPath(path, returnExpression, () => {
            this.deoptimizableDependentExpressions.push(origin);
            return returnExpression.getLiteralValueAtPath(path, recursionTracker, origin);
        }, UnknownValue);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        const returnExpression = this.getReturnExpression(recursionTracker);
        if (this.returnExpression === UNKNOWN_EXPRESSION) {
            return UNKNOWN_EXPRESSION;
        }
        return recursionTracker.withTrackedEntityAtPath(path, returnExpression, () => {
            this.deoptimizableDependentExpressions.push(origin);
            return returnExpression.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
        }, UNKNOWN_EXPRESSION);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        const { type } = interaction;
        if (type === INTERACTION_CALLED) {
            if ((interaction.withNew
                ? context.instantiated
                : context.called).trackEntityAtPathAndGetIfTracked(path, interaction.args, this)) {
                return false;
            }
        }
        else if ((type === INTERACTION_ASSIGNED
            ? context.assigned
            : context.accessed).trackEntityAtPathAndGetIfTracked(path, this)) {
            return false;
        }
        return this.getReturnExpression().hasEffectsOnInteractionAtPath(path, interaction, context);
    }
}

class CallExpression extends CallExpressionBase {
    bind() {
        super.bind();
        if (this.callee instanceof Identifier) {
            const variable = this.scope.findVariable(this.callee.name);
            if (variable.isNamespace) {
                this.context.warn({
                    code: 'CANNOT_CALL_NAMESPACE',
                    message: `Cannot call a namespace ('${this.callee.name}')`
                }, this.start);
            }
            if (this.callee.name === 'eval') {
                this.context.warn({
                    code: 'EVAL',
                    message: `Use of eval is strongly discouraged, as it poses security risks and may cause issues with minification`,
                    url: 'https://rollupjs.org/guide/en/#avoiding-eval'
                }, this.start);
            }
        }
        this.interaction = {
            args: this.arguments,
            thisArg: this.callee instanceof MemberExpression && !this.callee.variable
                ? this.callee.object
                : null,
            type: INTERACTION_CALLED,
            withNew: false
        };
    }
    hasEffects(context) {
        try {
            for (const argument of this.arguments) {
                if (argument.hasEffects(context))
                    return true;
            }
            if (this.context.options.treeshake.annotations &&
                this.annotations)
                return false;
            return (this.callee.hasEffects(context) ||
                this.callee.hasEffectsOnInteractionAtPath(EMPTY_PATH, this.interaction, context));
        }
        finally {
            if (!this.deoptimized)
                this.applyDeoptimizations();
        }
    }
    include(context, includeChildrenRecursively) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        if (includeChildrenRecursively) {
            super.include(context, includeChildrenRecursively);
            if (includeChildrenRecursively === INCLUDE_PARAMETERS &&
                this.callee instanceof Identifier &&
                this.callee.variable) {
                this.callee.variable.markCalledFromTryStatement();
            }
        }
        else {
            this.included = true;
            this.callee.include(context, false);
        }
        this.callee.includeCallArguments(context, this.arguments);
    }
    render(code, options, { renderedSurroundingElement } = BLANK) {
        this.callee.render(code, options, {
            isCalleeOfRenderedParent: true,
            renderedSurroundingElement
        });
        renderCallArguments(code, options, this);
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        if (this.interaction.thisArg) {
            this.callee.deoptimizeThisOnInteractionAtPath(this.interaction, EMPTY_PATH, SHARED_RECURSION_TRACKER);
        }
        for (const argument of this.arguments) {
            // This will make sure all properties of parameters behave as "unknown"
            argument.deoptimizePath(UNKNOWN_PATH);
        }
        this.context.requestTreeshakingPass();
    }
    getReturnExpression(recursionTracker = SHARED_RECURSION_TRACKER) {
        if (this.returnExpression === null) {
            this.returnExpression = UNKNOWN_EXPRESSION;
            return (this.returnExpression = this.callee.getReturnExpressionWhenCalledAtPath(EMPTY_PATH, this.interaction, recursionTracker, this));
        }
        return this.returnExpression;
    }
}

class CatchScope extends ParameterScope {
    addDeclaration(identifier, context, init, isHoisted) {
        const existingParameter = this.variables.get(identifier.name);
        if (existingParameter) {
            // While we still create a hoisted declaration, the initializer goes to
            // the parameter. Note that technically, the declaration now belongs to
            // two variables, which is not correct but should not cause issues.
            this.parent.addDeclaration(identifier, context, UNDEFINED_EXPRESSION, isHoisted);
            existingParameter.addDeclaration(identifier, init);
            return existingParameter;
        }
        return this.parent.addDeclaration(identifier, context, init, isHoisted);
    }
}

class CatchClause extends NodeBase {
    createScope(parentScope) {
        this.scope = new CatchScope(parentScope, this.context);
    }
    parseNode(esTreeNode) {
        // Parameters need to be declared first as the logic is that initializers
        // of hoisted body variables are associated with parameters of the same
        // name instead of the variable
        const { param } = esTreeNode;
        if (param) {
            this.param = new (this.context.getNodeConstructor(param.type))(param, this, this.scope);
            this.param.declare('parameter', UNKNOWN_EXPRESSION);
        }
        super.parseNode(esTreeNode);
    }
}

class ChainExpression extends NodeBase {
}

class ClassBodyScope extends ChildScope {
    constructor(parent, classNode, context) {
        super(parent);
        this.variables.set('this', (this.thisVariable = new LocalVariable('this', null, classNode, context)));
        this.instanceScope = new ChildScope(this);
        this.instanceScope.variables.set('this', new ThisVariable(context));
    }
    findLexicalBoundary() {
        return this;
    }
}

class ClassBody extends NodeBase {
    createScope(parentScope) {
        this.scope = new ClassBodyScope(parentScope, this.parent, this.context);
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.context.includeVariableInModule(this.scope.thisVariable);
        for (const definition of this.body) {
            definition.include(context, includeChildrenRecursively);
        }
    }
    parseNode(esTreeNode) {
        const body = (this.body = []);
        for (const definition of esTreeNode.body) {
            body.push(new (this.context.getNodeConstructor(definition.type))(definition, this, definition.static ? this.scope : this.scope.instanceScope));
        }
        super.parseNode(esTreeNode);
    }
    applyDeoptimizations() { }
}

class MethodBase extends NodeBase {
    constructor() {
        super(...arguments);
        this.accessedValue = null;
    }
    // As getter properties directly receive their values from fixed function
    // expressions, there is no known situation where a getter is deoptimized.
    deoptimizeCache() { }
    deoptimizePath(path) {
        this.getAccessedValue().deoptimizePath(path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        if (interaction.type === INTERACTION_ACCESSED && this.kind === 'get' && path.length === 0) {
            return this.value.deoptimizeThisOnInteractionAtPath({
                args: NO_ARGS,
                thisArg: interaction.thisArg,
                type: INTERACTION_CALLED,
                withNew: false
            }, EMPTY_PATH, recursionTracker);
        }
        if (interaction.type === INTERACTION_ASSIGNED && this.kind === 'set' && path.length === 0) {
            return this.value.deoptimizeThisOnInteractionAtPath({
                args: interaction.args,
                thisArg: interaction.thisArg,
                type: INTERACTION_CALLED,
                withNew: false
            }, EMPTY_PATH, recursionTracker);
        }
        this.getAccessedValue().deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.getAccessedValue().getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        return this.getAccessedValue().getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
    }
    hasEffects(context) {
        return this.key.hasEffects(context);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (this.kind === 'get' && interaction.type === INTERACTION_ACCESSED && path.length === 0) {
            return this.value.hasEffectsOnInteractionAtPath(EMPTY_PATH, {
                args: NO_ARGS,
                thisArg: interaction.thisArg,
                type: INTERACTION_CALLED,
                withNew: false
            }, context);
        }
        // setters are only called for empty paths
        if (this.kind === 'set' && interaction.type === INTERACTION_ASSIGNED) {
            return this.value.hasEffectsOnInteractionAtPath(EMPTY_PATH, {
                args: interaction.args,
                thisArg: interaction.thisArg,
                type: INTERACTION_CALLED,
                withNew: false
            }, context);
        }
        return this.getAccessedValue().hasEffectsOnInteractionAtPath(path, interaction, context);
    }
    applyDeoptimizations() { }
    getAccessedValue() {
        if (this.accessedValue === null) {
            if (this.kind === 'get') {
                this.accessedValue = UNKNOWN_EXPRESSION;
                return (this.accessedValue = this.value.getReturnExpressionWhenCalledAtPath(EMPTY_PATH, NODE_INTERACTION_UNKNOWN_CALL, SHARED_RECURSION_TRACKER, this));
            }
            else {
                return (this.accessedValue = this.value);
            }
        }
        return this.accessedValue;
    }
}

class MethodDefinition extends MethodBase {
    applyDeoptimizations() { }
}

class ObjectMember extends ExpressionEntity {
    constructor(object, key) {
        super();
        this.object = object;
        this.key = key;
    }
    deoptimizePath(path) {
        this.object.deoptimizePath([this.key, ...path]);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        this.object.deoptimizeThisOnInteractionAtPath(interaction, [this.key, ...path], recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.object.getLiteralValueAtPath([this.key, ...path], recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        return this.object.getReturnExpressionWhenCalledAtPath([this.key, ...path], interaction, recursionTracker, origin);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        return this.object.hasEffectsOnInteractionAtPath([this.key, ...path], interaction, context);
    }
}

class ClassNode extends NodeBase {
    constructor() {
        super(...arguments);
        this.objectEntity = null;
    }
    createScope(parentScope) {
        this.scope = new ChildScope(parentScope);
    }
    deoptimizeCache() {
        this.getObjectEntity().deoptimizeAllProperties();
    }
    deoptimizePath(path) {
        this.getObjectEntity().deoptimizePath(path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        this.getObjectEntity().deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.getObjectEntity().getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        return this.getObjectEntity().getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
    }
    hasEffects(context) {
        var _a, _b;
        if (!this.deoptimized)
            this.applyDeoptimizations();
        const initEffect = ((_a = this.superClass) === null || _a === void 0 ? void 0 : _a.hasEffects(context)) || this.body.hasEffects(context);
        (_b = this.id) === null || _b === void 0 ? void 0 : _b.markDeclarationReached();
        return initEffect || super.hasEffects(context);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        var _a;
        if (interaction.type === INTERACTION_CALLED && path.length === 0) {
            return (!interaction.withNew ||
                (this.classConstructor !== null
                    ? this.classConstructor.hasEffectsOnInteractionAtPath(path, interaction, context)
                    : (_a = this.superClass) === null || _a === void 0 ? void 0 : _a.hasEffectsOnInteractionAtPath(path, interaction, context)) ||
                false);
        }
        else {
            return this.getObjectEntity().hasEffectsOnInteractionAtPath(path, interaction, context);
        }
    }
    include(context, includeChildrenRecursively) {
        var _a;
        if (!this.deoptimized)
            this.applyDeoptimizations();
        this.included = true;
        (_a = this.superClass) === null || _a === void 0 ? void 0 : _a.include(context, includeChildrenRecursively);
        this.body.include(context, includeChildrenRecursively);
        if (this.id) {
            this.id.markDeclarationReached();
            this.id.include();
        }
    }
    initialise() {
        var _a;
        (_a = this.id) === null || _a === void 0 ? void 0 : _a.declare('class', this);
        for (const method of this.body.body) {
            if (method instanceof MethodDefinition && method.kind === 'constructor') {
                this.classConstructor = method;
                return;
            }
        }
        this.classConstructor = null;
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        for (const definition of this.body.body) {
            if (!(definition.static ||
                (definition instanceof MethodDefinition && definition.kind === 'constructor'))) {
                // Calls to methods are not tracked, ensure that the return value is deoptimized
                definition.deoptimizePath(UNKNOWN_PATH);
            }
        }
        this.context.requestTreeshakingPass();
    }
    getObjectEntity() {
        if (this.objectEntity !== null) {
            return this.objectEntity;
        }
        const staticProperties = [];
        const dynamicMethods = [];
        for (const definition of this.body.body) {
            const properties = definition.static ? staticProperties : dynamicMethods;
            const definitionKind = definition.kind;
            // Note that class fields do not end up on the prototype
            if (properties === dynamicMethods && !definitionKind)
                continue;
            const kind = definitionKind === 'set' || definitionKind === 'get' ? definitionKind : 'init';
            let key;
            if (definition.computed) {
                const keyValue = definition.key.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this);
                if (typeof keyValue === 'symbol') {
                    properties.push({ key: UnknownKey, kind, property: definition });
                    continue;
                }
                else {
                    key = String(keyValue);
                }
            }
            else {
                key =
                    definition.key instanceof Identifier
                        ? definition.key.name
                        : String(definition.key.value);
            }
            properties.push({ key, kind, property: definition });
        }
        staticProperties.unshift({
            key: 'prototype',
            kind: 'init',
            property: new ObjectEntity(dynamicMethods, this.superClass ? new ObjectMember(this.superClass, 'prototype') : OBJECT_PROTOTYPE)
        });
        return (this.objectEntity = new ObjectEntity(staticProperties, this.superClass || OBJECT_PROTOTYPE));
    }
}

class ClassDeclaration extends ClassNode {
    initialise() {
        super.initialise();
        if (this.id !== null) {
            this.id.variable.isId = true;
        }
    }
    parseNode(esTreeNode) {
        if (esTreeNode.id !== null) {
            this.id = new Identifier(esTreeNode.id, this, this.scope.parent);
        }
        super.parseNode(esTreeNode);
    }
    render(code, options) {
        const { exportNamesByVariable, format, snippets: { _ } } = options;
        if (format === 'system' && this.id && exportNamesByVariable.has(this.id.variable)) {
            code.appendLeft(this.end, `${_}${getSystemExportStatement([this.id.variable], options)};`);
        }
        super.render(code, options);
    }
}

class ClassExpression extends ClassNode {
    render(code, options, { renderedSurroundingElement } = BLANK) {
        super.render(code, options);
        if (renderedSurroundingElement === ExpressionStatement$1) {
            code.appendRight(this.start, '(');
            code.prependLeft(this.end, ')');
        }
    }
}

class MultiExpression extends ExpressionEntity {
    constructor(expressions) {
        super();
        this.expressions = expressions;
        this.included = false;
    }
    deoptimizePath(path) {
        for (const expression of this.expressions) {
            expression.deoptimizePath(path);
        }
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        return new MultiExpression(this.expressions.map(expression => expression.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin)));
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        for (const expression of this.expressions) {
            if (expression.hasEffectsOnInteractionAtPath(path, interaction, context))
                return true;
        }
        return false;
    }
}

class ConditionalExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.expressionsToBeDeoptimized = [];
        this.isBranchResolutionAnalysed = false;
        this.usedBranch = null;
    }
    deoptimizeCache() {
        if (this.usedBranch !== null) {
            const unusedBranch = this.usedBranch === this.consequent ? this.alternate : this.consequent;
            this.usedBranch = null;
            unusedBranch.deoptimizePath(UNKNOWN_PATH);
            for (const expression of this.expressionsToBeDeoptimized) {
                expression.deoptimizeCache();
            }
        }
    }
    deoptimizePath(path) {
        const usedBranch = this.getUsedBranch();
        if (!usedBranch) {
            this.consequent.deoptimizePath(path);
            this.alternate.deoptimizePath(path);
        }
        else {
            usedBranch.deoptimizePath(path);
        }
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        this.consequent.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
        this.alternate.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        const usedBranch = this.getUsedBranch();
        if (!usedBranch)
            return UnknownValue;
        this.expressionsToBeDeoptimized.push(origin);
        return usedBranch.getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        const usedBranch = this.getUsedBranch();
        if (!usedBranch)
            return new MultiExpression([
                this.consequent.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin),
                this.alternate.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin)
            ]);
        this.expressionsToBeDeoptimized.push(origin);
        return usedBranch.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
    }
    hasEffects(context) {
        if (this.test.hasEffects(context))
            return true;
        const usedBranch = this.getUsedBranch();
        if (!usedBranch) {
            return this.consequent.hasEffects(context) || this.alternate.hasEffects(context);
        }
        return usedBranch.hasEffects(context);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        const usedBranch = this.getUsedBranch();
        if (!usedBranch) {
            return (this.consequent.hasEffectsOnInteractionAtPath(path, interaction, context) ||
                this.alternate.hasEffectsOnInteractionAtPath(path, interaction, context));
        }
        return usedBranch.hasEffectsOnInteractionAtPath(path, interaction, context);
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        const usedBranch = this.getUsedBranch();
        if (includeChildrenRecursively || this.test.shouldBeIncluded(context) || usedBranch === null) {
            this.test.include(context, includeChildrenRecursively);
            this.consequent.include(context, includeChildrenRecursively);
            this.alternate.include(context, includeChildrenRecursively);
        }
        else {
            usedBranch.include(context, includeChildrenRecursively);
        }
    }
    includeCallArguments(context, args) {
        const usedBranch = this.getUsedBranch();
        if (!usedBranch) {
            this.consequent.includeCallArguments(context, args);
            this.alternate.includeCallArguments(context, args);
        }
        else {
            usedBranch.includeCallArguments(context, args);
        }
    }
    render(code, options, { isCalleeOfRenderedParent, preventASI, renderedParentType, renderedSurroundingElement } = BLANK) {
        const usedBranch = this.getUsedBranch();
        if (!this.test.included) {
            const colonPos = findFirstOccurrenceOutsideComment(code.original, ':', this.consequent.end);
            const inclusionStart = findNonWhiteSpace(code.original, (this.consequent.included
                ? findFirstOccurrenceOutsideComment(code.original, '?', this.test.end)
                : colonPos) + 1);
            if (preventASI) {
                removeLineBreaks(code, inclusionStart, usedBranch.start);
            }
            code.remove(this.start, inclusionStart);
            if (this.consequent.included) {
                code.remove(colonPos, this.end);
            }
            removeAnnotations(this, code);
            usedBranch.render(code, options, {
                isCalleeOfRenderedParent,
                preventASI: true,
                renderedParentType: renderedParentType || this.parent.type,
                renderedSurroundingElement: renderedSurroundingElement || this.parent.type
            });
        }
        else {
            this.test.render(code, options, { renderedSurroundingElement });
            this.consequent.render(code, options);
            this.alternate.render(code, options);
        }
    }
    getUsedBranch() {
        if (this.isBranchResolutionAnalysed) {
            return this.usedBranch;
        }
        this.isBranchResolutionAnalysed = true;
        const testValue = this.test.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this);
        return typeof testValue === 'symbol'
            ? null
            : (this.usedBranch = testValue ? this.consequent : this.alternate);
    }
}

class ContinueStatement extends NodeBase {
    hasEffects(context) {
        if (this.label) {
            if (!context.ignore.labels.has(this.label.name))
                return true;
            context.includedLabels.add(this.label.name);
            context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
        }
        else {
            if (!context.ignore.continues)
                return true;
            context.brokenFlow = BROKEN_FLOW_BREAK_CONTINUE;
        }
        return false;
    }
    include(context) {
        this.included = true;
        if (this.label) {
            this.label.include();
            context.includedLabels.add(this.label.name);
        }
        context.brokenFlow = this.label ? BROKEN_FLOW_ERROR_RETURN_LABEL : BROKEN_FLOW_BREAK_CONTINUE;
    }
}

class DoWhileStatement extends NodeBase {
    hasEffects(context) {
        if (this.test.hasEffects(context))
            return true;
        const { brokenFlow, ignore: { breaks, continues } } = context;
        context.ignore.breaks = true;
        context.ignore.continues = true;
        if (this.body.hasEffects(context))
            return true;
        context.ignore.breaks = breaks;
        context.ignore.continues = continues;
        context.brokenFlow = brokenFlow;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.test.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        this.body.include(context, includeChildrenRecursively, { asSingleStatement: true });
        context.brokenFlow = brokenFlow;
    }
}

class EmptyStatement extends NodeBase {
    hasEffects() {
        return false;
    }
}

class ExportAllDeclaration extends NodeBase {
    hasEffects() {
        return false;
    }
    initialise() {
        this.context.addExport(this);
    }
    render(code, _options, nodeRenderOptions) {
        code.remove(nodeRenderOptions.start, nodeRenderOptions.end);
    }
    applyDeoptimizations() { }
}
ExportAllDeclaration.prototype.needsBoundaries = true;

class FunctionDeclaration extends FunctionNode {
    initialise() {
        super.initialise();
        if (this.id !== null) {
            this.id.variable.isId = true;
        }
    }
    parseNode(esTreeNode) {
        if (esTreeNode.id !== null) {
            this.id = new Identifier(esTreeNode.id, this, this.scope.parent);
        }
        super.parseNode(esTreeNode);
    }
}

// The header ends at the first non-white-space after "default"
function getDeclarationStart(code, start) {
    return findNonWhiteSpace(code, findFirstOccurrenceOutsideComment(code, 'default', start) + 7);
}
function getIdInsertPosition(code, declarationKeyword, endMarker, start) {
    const declarationEnd = findFirstOccurrenceOutsideComment(code, declarationKeyword, start) + declarationKeyword.length;
    code = code.slice(declarationEnd, findFirstOccurrenceOutsideComment(code, endMarker, declarationEnd));
    const generatorStarPos = findFirstOccurrenceOutsideComment(code, '*');
    if (generatorStarPos === -1) {
        return declarationEnd;
    }
    return declarationEnd + generatorStarPos + 1;
}
class ExportDefaultDeclaration extends NodeBase {
    include(context, includeChildrenRecursively) {
        super.include(context, includeChildrenRecursively);
        if (includeChildrenRecursively) {
            this.context.includeVariableInModule(this.variable);
        }
    }
    initialise() {
        const declaration = this.declaration;
        this.declarationName =
            (declaration.id && declaration.id.name) || this.declaration.name;
        this.variable = this.scope.addExportDefaultDeclaration(this.declarationName || this.context.getModuleName(), this, this.context);
        this.context.addExport(this);
    }
    render(code, options, nodeRenderOptions) {
        const { start, end } = nodeRenderOptions;
        const declarationStart = getDeclarationStart(code.original, this.start);
        if (this.declaration instanceof FunctionDeclaration) {
            this.renderNamedDeclaration(code, declarationStart, 'function', '(', this.declaration.id === null, options);
        }
        else if (this.declaration instanceof ClassDeclaration) {
            this.renderNamedDeclaration(code, declarationStart, 'class', '{', this.declaration.id === null, options);
        }
        else if (this.variable.getOriginalVariable() !== this.variable) {
            // Remove altogether to prevent re-declaring the same variable
            treeshakeNode(this, code, start, end);
            return;
        }
        else if (this.variable.included) {
            this.renderVariableDeclaration(code, declarationStart, options);
        }
        else {
            code.remove(this.start, declarationStart);
            this.declaration.render(code, options, {
                renderedSurroundingElement: ExpressionStatement$1
            });
            if (code.original[this.end - 1] !== ';') {
                code.appendLeft(this.end, ';');
            }
            return;
        }
        this.declaration.render(code, options);
    }
    applyDeoptimizations() { }
    renderNamedDeclaration(code, declarationStart, declarationKeyword, endMarker, needsId, options) {
        const { exportNamesByVariable, format, snippets: { getPropertyAccess } } = options;
        const name = this.variable.getName(getPropertyAccess);
        // Remove `export default`
        code.remove(this.start, declarationStart);
        if (needsId) {
            code.appendLeft(getIdInsertPosition(code.original, declarationKeyword, endMarker, declarationStart), ` ${name}`);
        }
        if (format === 'system' &&
            this.declaration instanceof ClassDeclaration &&
            exportNamesByVariable.has(this.variable)) {
            code.appendLeft(this.end, ` ${getSystemExportStatement([this.variable], options)};`);
        }
    }
    renderVariableDeclaration(code, declarationStart, { format, exportNamesByVariable, snippets: { cnst, getPropertyAccess } }) {
        const hasTrailingSemicolon = code.original.charCodeAt(this.end - 1) === 59; /*";"*/
        const systemExportNames = format === 'system' && exportNamesByVariable.get(this.variable);
        if (systemExportNames) {
            code.overwrite(this.start, declarationStart, `${cnst} ${this.variable.getName(getPropertyAccess)} = exports('${systemExportNames[0]}', `);
            code.appendRight(hasTrailingSemicolon ? this.end - 1 : this.end, ')' + (hasTrailingSemicolon ? '' : ';'));
        }
        else {
            code.overwrite(this.start, declarationStart, `${cnst} ${this.variable.getName(getPropertyAccess)} = `);
            if (!hasTrailingSemicolon) {
                code.appendLeft(this.end, ';');
            }
        }
    }
}
ExportDefaultDeclaration.prototype.needsBoundaries = true;

class ExportNamedDeclaration extends NodeBase {
    bind() {
        var _a;
        // Do not bind specifiers
        (_a = this.declaration) === null || _a === void 0 ? void 0 : _a.bind();
    }
    hasEffects(context) {
        var _a;
        return !!((_a = this.declaration) === null || _a === void 0 ? void 0 : _a.hasEffects(context));
    }
    initialise() {
        this.context.addExport(this);
    }
    render(code, options, nodeRenderOptions) {
        const { start, end } = nodeRenderOptions;
        if (this.declaration === null) {
            code.remove(start, end);
        }
        else {
            code.remove(this.start, this.declaration.start);
            this.declaration.render(code, options, { end, start });
        }
    }
    applyDeoptimizations() { }
}
ExportNamedDeclaration.prototype.needsBoundaries = true;

class ExportSpecifier extends NodeBase {
    applyDeoptimizations() { }
}

class ForInStatement extends NodeBase {
    createScope(parentScope) {
        this.scope = new BlockScope(parentScope);
    }
    hasEffects(context) {
        const { deoptimized, left, right } = this;
        if (!deoptimized)
            this.applyDeoptimizations();
        if (left.hasEffectsAsAssignmentTarget(context, false) || right.hasEffects(context))
            return true;
        const { brokenFlow, ignore: { breaks, continues } } = context;
        context.ignore.breaks = true;
        context.ignore.continues = true;
        if (this.body.hasEffects(context))
            return true;
        context.ignore.breaks = breaks;
        context.ignore.continues = continues;
        context.brokenFlow = brokenFlow;
        return false;
    }
    include(context, includeChildrenRecursively) {
        const { body, deoptimized, left, right } = this;
        if (!deoptimized)
            this.applyDeoptimizations();
        this.included = true;
        left.includeAsAssignmentTarget(context, includeChildrenRecursively || true, false);
        right.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        body.include(context, includeChildrenRecursively, { asSingleStatement: true });
        context.brokenFlow = brokenFlow;
    }
    initialise() {
        this.left.setAssignedValue(UNKNOWN_EXPRESSION);
    }
    render(code, options) {
        this.left.render(code, options, NO_SEMICOLON);
        this.right.render(code, options, NO_SEMICOLON);
        // handle no space between "in" and the right side
        if (code.original.charCodeAt(this.right.start - 1) === 110 /* n */) {
            code.prependLeft(this.right.start, ' ');
        }
        this.body.render(code, options);
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        this.left.deoptimizePath(EMPTY_PATH);
        this.context.requestTreeshakingPass();
    }
}

class ForOfStatement extends NodeBase {
    createScope(parentScope) {
        this.scope = new BlockScope(parentScope);
    }
    hasEffects() {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        // Placeholder until proper Symbol.Iterator support
        return true;
    }
    include(context, includeChildrenRecursively) {
        const { body, deoptimized, left, right } = this;
        if (!deoptimized)
            this.applyDeoptimizations();
        this.included = true;
        left.includeAsAssignmentTarget(context, includeChildrenRecursively || true, false);
        right.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        body.include(context, includeChildrenRecursively, { asSingleStatement: true });
        context.brokenFlow = brokenFlow;
    }
    initialise() {
        this.left.setAssignedValue(UNKNOWN_EXPRESSION);
    }
    render(code, options) {
        this.left.render(code, options, NO_SEMICOLON);
        this.right.render(code, options, NO_SEMICOLON);
        // handle no space between "of" and the right side
        if (code.original.charCodeAt(this.right.start - 1) === 102 /* f */) {
            code.prependLeft(this.right.start, ' ');
        }
        this.body.render(code, options);
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        this.left.deoptimizePath(EMPTY_PATH);
        this.context.requestTreeshakingPass();
    }
}

class ForStatement extends NodeBase {
    createScope(parentScope) {
        this.scope = new BlockScope(parentScope);
    }
    hasEffects(context) {
        var _a, _b, _c;
        if (((_a = this.init) === null || _a === void 0 ? void 0 : _a.hasEffects(context)) ||
            ((_b = this.test) === null || _b === void 0 ? void 0 : _b.hasEffects(context)) ||
            ((_c = this.update) === null || _c === void 0 ? void 0 : _c.hasEffects(context)))
            return true;
        const { brokenFlow, ignore: { breaks, continues } } = context;
        context.ignore.breaks = true;
        context.ignore.continues = true;
        if (this.body.hasEffects(context))
            return true;
        context.ignore.breaks = breaks;
        context.ignore.continues = continues;
        context.brokenFlow = brokenFlow;
        return false;
    }
    include(context, includeChildrenRecursively) {
        var _a, _b, _c;
        this.included = true;
        (_a = this.init) === null || _a === void 0 ? void 0 : _a.include(context, includeChildrenRecursively, { asSingleStatement: true });
        (_b = this.test) === null || _b === void 0 ? void 0 : _b.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        (_c = this.update) === null || _c === void 0 ? void 0 : _c.include(context, includeChildrenRecursively);
        this.body.include(context, includeChildrenRecursively, { asSingleStatement: true });
        context.brokenFlow = brokenFlow;
    }
    render(code, options) {
        var _a, _b, _c;
        (_a = this.init) === null || _a === void 0 ? void 0 : _a.render(code, options, NO_SEMICOLON);
        (_b = this.test) === null || _b === void 0 ? void 0 : _b.render(code, options, NO_SEMICOLON);
        (_c = this.update) === null || _c === void 0 ? void 0 : _c.render(code, options, NO_SEMICOLON);
        this.body.render(code, options);
    }
}

class FunctionExpression extends FunctionNode {
    render(code, options, { renderedSurroundingElement } = BLANK) {
        super.render(code, options);
        if (renderedSurroundingElement === ExpressionStatement$1) {
            code.appendRight(this.start, '(');
            code.prependLeft(this.end, ')');
        }
    }
}

class TrackingScope extends BlockScope {
    constructor() {
        super(...arguments);
        this.hoistedDeclarations = [];
    }
    addDeclaration(identifier, context, init, isHoisted) {
        this.hoistedDeclarations.push(identifier);
        return super.addDeclaration(identifier, context, init, isHoisted);
    }
}

const unset = Symbol('unset');
class IfStatement extends NodeBase {
    constructor() {
        super(...arguments);
        this.testValue = unset;
    }
    deoptimizeCache() {
        this.testValue = UnknownValue;
    }
    hasEffects(context) {
        var _a;
        if (this.test.hasEffects(context)) {
            return true;
        }
        const testValue = this.getTestValue();
        if (typeof testValue === 'symbol') {
            const { brokenFlow } = context;
            if (this.consequent.hasEffects(context))
                return true;
            const consequentBrokenFlow = context.brokenFlow;
            context.brokenFlow = brokenFlow;
            if (this.alternate === null)
                return false;
            if (this.alternate.hasEffects(context))
                return true;
            context.brokenFlow =
                context.brokenFlow < consequentBrokenFlow ? context.brokenFlow : consequentBrokenFlow;
            return false;
        }
        return testValue ? this.consequent.hasEffects(context) : !!((_a = this.alternate) === null || _a === void 0 ? void 0 : _a.hasEffects(context));
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        if (includeChildrenRecursively) {
            this.includeRecursively(includeChildrenRecursively, context);
        }
        else {
            const testValue = this.getTestValue();
            if (typeof testValue === 'symbol') {
                this.includeUnknownTest(context);
            }
            else {
                this.includeKnownTest(context, testValue);
            }
        }
    }
    parseNode(esTreeNode) {
        this.consequentScope = new TrackingScope(this.scope);
        this.consequent = new (this.context.getNodeConstructor(esTreeNode.consequent.type))(esTreeNode.consequent, this, this.consequentScope);
        if (esTreeNode.alternate) {
            this.alternateScope = new TrackingScope(this.scope);
            this.alternate = new (this.context.getNodeConstructor(esTreeNode.alternate.type))(esTreeNode.alternate, this, this.alternateScope);
        }
        super.parseNode(esTreeNode);
    }
    render(code, options) {
        const { snippets: { getPropertyAccess } } = options;
        // Note that unknown test values are always included
        const testValue = this.getTestValue();
        const hoistedDeclarations = [];
        const includesIfElse = this.test.included;
        const noTreeshake = !this.context.options.treeshake;
        if (includesIfElse) {
            this.test.render(code, options);
        }
        else {
            code.remove(this.start, this.consequent.start);
        }
        if (this.consequent.included && (noTreeshake || typeof testValue === 'symbol' || testValue)) {
            this.consequent.render(code, options);
        }
        else {
            code.overwrite(this.consequent.start, this.consequent.end, includesIfElse ? ';' : '');
            hoistedDeclarations.push(...this.consequentScope.hoistedDeclarations);
        }
        if (this.alternate) {
            if (this.alternate.included && (noTreeshake || typeof testValue === 'symbol' || !testValue)) {
                if (includesIfElse) {
                    if (code.original.charCodeAt(this.alternate.start - 1) === 101) {
                        code.prependLeft(this.alternate.start, ' ');
                    }
                }
                else {
                    code.remove(this.consequent.end, this.alternate.start);
                }
                this.alternate.render(code, options);
            }
            else {
                if (includesIfElse && this.shouldKeepAlternateBranch()) {
                    code.overwrite(this.alternate.start, this.end, ';');
                }
                else {
                    code.remove(this.consequent.end, this.end);
                }
                hoistedDeclarations.push(...this.alternateScope.hoistedDeclarations);
            }
        }
        this.renderHoistedDeclarations(hoistedDeclarations, code, getPropertyAccess);
    }
    applyDeoptimizations() { }
    getTestValue() {
        if (this.testValue === unset) {
            return (this.testValue = this.test.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this));
        }
        return this.testValue;
    }
    includeKnownTest(context, testValue) {
        var _a;
        if (this.test.shouldBeIncluded(context)) {
            this.test.include(context, false);
        }
        if (testValue && this.consequent.shouldBeIncluded(context)) {
            this.consequent.include(context, false, { asSingleStatement: true });
        }
        if (!testValue && ((_a = this.alternate) === null || _a === void 0 ? void 0 : _a.shouldBeIncluded(context))) {
            this.alternate.include(context, false, { asSingleStatement: true });
        }
    }
    includeRecursively(includeChildrenRecursively, context) {
        var _a;
        this.test.include(context, includeChildrenRecursively);
        this.consequent.include(context, includeChildrenRecursively);
        (_a = this.alternate) === null || _a === void 0 ? void 0 : _a.include(context, includeChildrenRecursively);
    }
    includeUnknownTest(context) {
        var _a;
        this.test.include(context, false);
        const { brokenFlow } = context;
        let consequentBrokenFlow = BROKEN_FLOW_NONE;
        if (this.consequent.shouldBeIncluded(context)) {
            this.consequent.include(context, false, { asSingleStatement: true });
            consequentBrokenFlow = context.brokenFlow;
            context.brokenFlow = brokenFlow;
        }
        if ((_a = this.alternate) === null || _a === void 0 ? void 0 : _a.shouldBeIncluded(context)) {
            this.alternate.include(context, false, { asSingleStatement: true });
            context.brokenFlow =
                context.brokenFlow < consequentBrokenFlow ? context.brokenFlow : consequentBrokenFlow;
        }
    }
    renderHoistedDeclarations(hoistedDeclarations, code, getPropertyAccess) {
        const hoistedVars = [
            ...new Set(hoistedDeclarations.map(identifier => {
                const variable = identifier.variable;
                return variable.included ? variable.getName(getPropertyAccess) : '';
            }))
        ]
            .filter(Boolean)
            .join(', ');
        if (hoistedVars) {
            const parentType = this.parent.type;
            const needsBraces = parentType !== Program$1 && parentType !== BlockStatement$1;
            code.prependRight(this.start, `${needsBraces ? '{ ' : ''}var ${hoistedVars}; `);
            if (needsBraces) {
                code.appendLeft(this.end, ` }`);
            }
        }
    }
    shouldKeepAlternateBranch() {
        let currentParent = this.parent;
        do {
            if (currentParent instanceof IfStatement && currentParent.alternate) {
                return true;
            }
            if (currentParent instanceof BlockStatement) {
                return false;
            }
            currentParent = currentParent.parent;
        } while (currentParent);
        return false;
    }
}

class ImportDeclaration extends NodeBase {
    // Do not bind specifiers
    bind() { }
    hasEffects() {
        return false;
    }
    initialise() {
        this.context.addImport(this);
    }
    render(code, _options, nodeRenderOptions) {
        code.remove(nodeRenderOptions.start, nodeRenderOptions.end);
    }
    applyDeoptimizations() { }
}
ImportDeclaration.prototype.needsBoundaries = true;

class ImportDefaultSpecifier extends NodeBase {
    applyDeoptimizations() { }
}

const INTEROP_DEFAULT_VARIABLE = '_interopDefault';
const INTEROP_DEFAULT_LEGACY_VARIABLE = '_interopDefaultLegacy';
const INTEROP_NAMESPACE_VARIABLE = '_interopNamespace';
const INTEROP_NAMESPACE_DEFAULT_VARIABLE = '_interopNamespaceDefault';
const INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE = '_interopNamespaceDefaultOnly';
const MERGE_NAMESPACES_VARIABLE = '_mergeNamespaces';
const defaultInteropHelpersByInteropType = {
    auto: INTEROP_DEFAULT_VARIABLE,
    default: null,
    defaultOnly: null,
    esModule: null,
    false: null,
    true: INTEROP_DEFAULT_LEGACY_VARIABLE
};
const isDefaultAProperty = (interopType, externalLiveBindings) => interopType === 'esModule' ||
    (externalLiveBindings && (interopType === 'auto' || interopType === 'true'));
const namespaceInteropHelpersByInteropType = {
    auto: INTEROP_NAMESPACE_VARIABLE,
    default: INTEROP_NAMESPACE_DEFAULT_VARIABLE,
    defaultOnly: INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE,
    esModule: null,
    false: null,
    true: INTEROP_NAMESPACE_VARIABLE
};
const canDefaultBeTakenFromNamespace = (interopType, externalLiveBindings) => isDefaultAProperty(interopType, externalLiveBindings) &&
    defaultInteropHelpersByInteropType[interopType] === INTEROP_DEFAULT_VARIABLE;
const getHelpersBlock = (additionalHelpers, accessedGlobals, indent, snippets, liveBindings, freeze, namespaceToStringTag) => {
    const usedHelpers = new Set(additionalHelpers);
    for (const variable of HELPER_NAMES) {
        if (accessedGlobals.has(variable)) {
            usedHelpers.add(variable);
        }
    }
    return HELPER_NAMES.map(variable => usedHelpers.has(variable)
        ? HELPER_GENERATORS[variable](indent, snippets, liveBindings, freeze, namespaceToStringTag, usedHelpers)
        : '').join('');
};
const HELPER_GENERATORS = {
    [INTEROP_DEFAULT_LEGACY_VARIABLE](_t, snippets, liveBindings) {
        const { _, getDirectReturnFunction, n } = snippets;
        const [left, right] = getDirectReturnFunction(['e'], {
            functionReturn: true,
            lineBreakIndent: null,
            name: INTEROP_DEFAULT_LEGACY_VARIABLE
        });
        return (`${left}e${_}&&${_}typeof e${_}===${_}'object'${_}&&${_}'default'${_}in e${_}?${_}` +
            `${liveBindings ? getDefaultLiveBinding(snippets) : getDefaultStatic(snippets)}${right}${n}${n}`);
    },
    [INTEROP_DEFAULT_VARIABLE](_t, snippets, liveBindings) {
        const { _, getDirectReturnFunction, n } = snippets;
        const [left, right] = getDirectReturnFunction(['e'], {
            functionReturn: true,
            lineBreakIndent: null,
            name: INTEROP_DEFAULT_VARIABLE
        });
        return (`${left}e${_}&&${_}e.__esModule${_}?${_}` +
            `${liveBindings ? getDefaultLiveBinding(snippets) : getDefaultStatic(snippets)}${right}${n}${n}`);
    },
    [INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE](_t, snippets, _liveBindings, freeze, namespaceToStringTag) {
        const { getDirectReturnFunction, getObject, n } = snippets;
        const [left, right] = getDirectReturnFunction(['e'], {
            functionReturn: true,
            lineBreakIndent: null,
            name: INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE
        });
        return `${left}${getFrozen(freeze, getWithToStringTag(namespaceToStringTag, getObject([
            ['__proto__', 'null'],
            ['default', 'e']
        ], { lineBreakIndent: null }), snippets))}${right}${n}${n}`;
    },
    [INTEROP_NAMESPACE_DEFAULT_VARIABLE](t, snippets, liveBindings, freeze, namespaceToStringTag) {
        const { _, n } = snippets;
        return (`function ${INTEROP_NAMESPACE_DEFAULT_VARIABLE}(e)${_}{${n}` +
            createNamespaceObject(t, t, snippets, liveBindings, freeze, namespaceToStringTag) +
            `}${n}${n}`);
    },
    [INTEROP_NAMESPACE_VARIABLE](t, snippets, liveBindings, freeze, namespaceToStringTag, usedHelpers) {
        const { _, getDirectReturnFunction, n } = snippets;
        if (usedHelpers.has(INTEROP_NAMESPACE_DEFAULT_VARIABLE)) {
            const [left, right] = getDirectReturnFunction(['e'], {
                functionReturn: true,
                lineBreakIndent: null,
                name: INTEROP_NAMESPACE_VARIABLE
            });
            return `${left}e${_}&&${_}e.__esModule${_}?${_}e${_}:${_}${INTEROP_NAMESPACE_DEFAULT_VARIABLE}(e)${right}${n}${n}`;
        }
        return (`function ${INTEROP_NAMESPACE_VARIABLE}(e)${_}{${n}` +
            `${t}if${_}(e${_}&&${_}e.__esModule)${_}return e;${n}` +
            createNamespaceObject(t, t, snippets, liveBindings, freeze, namespaceToStringTag) +
            `}${n}${n}`);
    },
    [MERGE_NAMESPACES_VARIABLE](t, snippets, liveBindings, freeze, namespaceToStringTag) {
        const { _, cnst, n } = snippets;
        const useForEach = cnst === 'var' && liveBindings;
        return (`function ${MERGE_NAMESPACES_VARIABLE}(n, m)${_}{${n}` +
            `${t}${loopOverNamespaces(`{${n}` +
                `${t}${t}${t}if${_}(k${_}!==${_}'default'${_}&&${_}!(k in n))${_}{${n}` +
                (liveBindings
                    ? useForEach
                        ? copyOwnPropertyLiveBinding
                        : copyPropertyLiveBinding
                    : copyPropertyStatic)(t, t + t + t + t, snippets) +
                `${t}${t}${t}}${n}` +
                `${t}${t}}`, useForEach, t, snippets)}${n}` +
            `${t}return ${getFrozen(freeze, getWithToStringTag(namespaceToStringTag, 'n', snippets))};${n}` +
            `}${n}${n}`);
    }
};
const getDefaultLiveBinding = ({ _, getObject }) => `e${_}:${_}${getObject([['default', 'e']], { lineBreakIndent: null })}`;
const getDefaultStatic = ({ _, getPropertyAccess }) => `e${getPropertyAccess('default')}${_}:${_}e`;
const createNamespaceObject = (t, i, snippets, liveBindings, freeze, namespaceToStringTag) => {
    const { _, cnst, getObject, getPropertyAccess, n, s } = snippets;
    const copyProperty = `{${n}` +
        (liveBindings ? copyNonDefaultOwnPropertyLiveBinding : copyPropertyStatic)(t, i + t + t, snippets) +
        `${i}${t}}`;
    return (`${i}${cnst} n${_}=${_}Object.create(null${namespaceToStringTag
        ? `,${_}{${_}[Symbol.toStringTag]:${_}${getToStringTagValue(getObject)}${_}}`
        : ''});${n}` +
        `${i}if${_}(e)${_}{${n}` +
        `${i}${t}${loopOverKeys(copyProperty, !liveBindings, snippets)}${n}` +
        `${i}}${n}` +
        `${i}n${getPropertyAccess('default')}${_}=${_}e;${n}` +
        `${i}return ${getFrozen(freeze, 'n')}${s}${n}`);
};
const loopOverKeys = (body, allowVarLoopVariable, { _, cnst, getFunctionIntro, s }) => cnst !== 'var' || allowVarLoopVariable
    ? `for${_}(${cnst} k in e)${_}${body}`
    : `Object.keys(e).forEach(${getFunctionIntro(['k'], {
        isAsync: false,
        name: null
    })}${body})${s}`;
const loopOverNamespaces = (body, useForEach, t, { _, cnst, getDirectReturnFunction, getFunctionIntro, n }) => {
    if (useForEach) {
        const [left, right] = getDirectReturnFunction(['e'], {
            functionReturn: false,
            lineBreakIndent: { base: t, t },
            name: null
        });
        return (`m.forEach(${left}` +
            `e${_}&&${_}typeof e${_}!==${_}'string'${_}&&${_}!Array.isArray(e)${_}&&${_}Object.keys(e).forEach(${getFunctionIntro(['k'], {
                isAsync: false,
                name: null
            })}${body})${right});`);
    }
    return (`for${_}(var i${_}=${_}0;${_}i${_}<${_}m.length;${_}i++)${_}{${n}` +
        `${t}${t}${cnst} e${_}=${_}m[i];${n}` +
        `${t}${t}if${_}(typeof e${_}!==${_}'string'${_}&&${_}!Array.isArray(e))${_}{${_}for${_}(${cnst} k in e)${_}${body}${_}}${n}${t}}`);
};
const copyNonDefaultOwnPropertyLiveBinding = (t, i, snippets) => {
    const { _, n } = snippets;
    return (`${i}if${_}(k${_}!==${_}'default')${_}{${n}` +
        copyOwnPropertyLiveBinding(t, i + t, snippets) +
        `${i}}${n}`);
};
const copyOwnPropertyLiveBinding = (t, i, { _, cnst, getDirectReturnFunction, n }) => {
    const [left, right] = getDirectReturnFunction([], {
        functionReturn: true,
        lineBreakIndent: null,
        name: null
    });
    return (`${i}${cnst} d${_}=${_}Object.getOwnPropertyDescriptor(e,${_}k);${n}` +
        `${i}Object.defineProperty(n,${_}k,${_}d.get${_}?${_}d${_}:${_}{${n}` +
        `${i}${t}enumerable:${_}true,${n}` +
        `${i}${t}get:${_}${left}e[k]${right}${n}` +
        `${i}});${n}`);
};
const copyPropertyLiveBinding = (t, i, { _, cnst, getDirectReturnFunction, n }) => {
    const [left, right] = getDirectReturnFunction([], {
        functionReturn: true,
        lineBreakIndent: null,
        name: null
    });
    return (`${i}${cnst} d${_}=${_}Object.getOwnPropertyDescriptor(e,${_}k);${n}` +
        `${i}if${_}(d)${_}{${n}` +
        `${i}${t}Object.defineProperty(n,${_}k,${_}d.get${_}?${_}d${_}:${_}{${n}` +
        `${i}${t}${t}enumerable:${_}true,${n}` +
        `${i}${t}${t}get:${_}${left}e[k]${right}${n}` +
        `${i}${t}});${n}` +
        `${i}}${n}`);
};
const copyPropertyStatic = (_t, i, { _, n }) => `${i}n[k]${_}=${_}e[k];${n}`;
const getFrozen = (freeze, fragment) => freeze ? `Object.freeze(${fragment})` : fragment;
const getWithToStringTag = (namespaceToStringTag, fragment, { _, getObject }) => namespaceToStringTag
    ? `Object.defineProperty(${fragment},${_}Symbol.toStringTag,${_}${getToStringTagValue(getObject)})`
    : fragment;
const HELPER_NAMES = Object.keys(HELPER_GENERATORS);
function getToStringTagValue(getObject) {
    return getObject([['value', "'Module'"]], {
        lineBreakIndent: null
    });
}

class ImportExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.inlineNamespace = null;
        this.mechanism = null;
        this.resolution = null;
    }
    hasEffects() {
        return true;
    }
    include(context, includeChildrenRecursively) {
        if (!this.included) {
            this.included = true;
            this.context.includeDynamicImport(this);
            this.scope.addAccessedDynamicImport(this);
        }
        this.source.include(context, includeChildrenRecursively);
    }
    initialise() {
        this.context.addDynamicImport(this);
    }
    render(code, options) {
        if (this.inlineNamespace) {
            const { snippets: { getDirectReturnFunction, getPropertyAccess } } = options;
            const [left, right] = getDirectReturnFunction([], {
                functionReturn: true,
                lineBreakIndent: null,
                name: null
            });
            code.overwrite(this.start, this.end, `Promise.resolve().then(${left}${this.inlineNamespace.getName(getPropertyAccess)}${right})`, { contentOnly: true });
            return;
        }
        if (this.mechanism) {
            code.overwrite(this.start, findFirstOccurrenceOutsideComment(code.original, '(', this.start + 6) + 1, this.mechanism.left, { contentOnly: true });
            code.overwrite(this.end - 1, this.end, this.mechanism.right, { contentOnly: true });
        }
        this.source.render(code, options);
    }
    renderFinalResolution(code, resolution, namespaceExportName, { getDirectReturnFunction }) {
        code.overwrite(this.source.start, this.source.end, resolution);
        if (namespaceExportName) {
            const [left, right] = getDirectReturnFunction(['n'], {
                functionReturn: true,
                lineBreakIndent: null,
                name: null
            });
            code.prependLeft(this.end, `.then(${left}n.${namespaceExportName}${right})`);
        }
    }
    setExternalResolution(exportMode, resolution, options, snippets, pluginDriver, accessedGlobalsByScope) {
        const { format } = options;
        this.inlineNamespace = null;
        this.resolution = resolution;
        const accessedGlobals = [...(accessedImportGlobals[format] || [])];
        let helper;
        ({ helper, mechanism: this.mechanism } = this.getDynamicImportMechanismAndHelper(resolution, exportMode, options, snippets, pluginDriver));
        if (helper) {
            accessedGlobals.push(helper);
        }
        if (accessedGlobals.length > 0) {
            this.scope.addAccessedGlobals(accessedGlobals, accessedGlobalsByScope);
        }
    }
    setInternalResolution(inlineNamespace) {
        this.inlineNamespace = inlineNamespace;
    }
    applyDeoptimizations() { }
    getDynamicImportMechanismAndHelper(resolution, exportMode, { compact, dynamicImportFunction, format, generatedCode: { arrowFunctions }, interop }, { _, getDirectReturnFunction, getDirectReturnIifeLeft }, pluginDriver) {
        const mechanism = pluginDriver.hookFirstSync('renderDynamicImport', [
            {
                customResolution: typeof this.resolution === 'string' ? this.resolution : null,
                format,
                moduleId: this.context.module.id,
                targetModuleId: this.resolution && typeof this.resolution !== 'string' ? this.resolution.id : null
            }
        ]);
        if (mechanism) {
            return { helper: null, mechanism };
        }
        const hasDynamicTarget = !this.resolution || typeof this.resolution === 'string';
        switch (format) {
            case 'cjs': {
                const helper = getInteropHelper(resolution, exportMode, interop);
                let left = `require(`;
                let right = `)`;
                if (helper) {
                    left = `/*#__PURE__*/${helper}(${left}`;
                    right += ')';
                }
                const [functionLeft, functionRight] = getDirectReturnFunction([], {
                    functionReturn: true,
                    lineBreakIndent: null,
                    name: null
                });
                left = `Promise.resolve().then(${functionLeft}${left}`;
                right += `${functionRight})`;
                if (!arrowFunctions && hasDynamicTarget) {
                    left = getDirectReturnIifeLeft(['t'], `${left}t${right}`, {
                        needsArrowReturnParens: false,
                        needsWrappedFunction: true
                    });
                    right = ')';
                }
                return {
                    helper,
                    mechanism: { left, right }
                };
            }
            case 'amd': {
                const resolve = compact ? 'c' : 'resolve';
                const reject = compact ? 'e' : 'reject';
                const helper = getInteropHelper(resolution, exportMode, interop);
                const [resolveLeft, resolveRight] = getDirectReturnFunction(['m'], {
                    functionReturn: false,
                    lineBreakIndent: null,
                    name: null
                });
                const resolveNamespace = helper
                    ? `${resolveLeft}${resolve}(/*#__PURE__*/${helper}(m))${resolveRight}`
                    : resolve;
                const [handlerLeft, handlerRight] = getDirectReturnFunction([resolve, reject], {
                    functionReturn: false,
                    lineBreakIndent: null,
                    name: null
                });
                let left = `new Promise(${handlerLeft}require([`;
                let right = `],${_}${resolveNamespace},${_}${reject})${handlerRight})`;
                if (!arrowFunctions && hasDynamicTarget) {
                    left = getDirectReturnIifeLeft(['t'], `${left}t${right}`, {
                        needsArrowReturnParens: false,
                        needsWrappedFunction: true
                    });
                    right = ')';
                }
                return {
                    helper,
                    mechanism: { left, right }
                };
            }
            case 'system':
                return {
                    helper: null,
                    mechanism: {
                        left: 'module.import(',
                        right: ')'
                    }
                };
            case 'es':
                if (dynamicImportFunction) {
                    return {
                        helper: null,
                        mechanism: {
                            left: `${dynamicImportFunction}(`,
                            right: ')'
                        }
                    };
                }
        }
        return { helper: null, mechanism: null };
    }
}
function getInteropHelper(resolution, exportMode, interop) {
    return exportMode === 'external'
        ? namespaceInteropHelpersByInteropType[String(interop(resolution instanceof ExternalModule ? resolution.id : null))]
        : exportMode === 'default'
            ? INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE
            : null;
}
const accessedImportGlobals = {
    amd: ['require'],
    cjs: ['require'],
    system: ['module']
};

class ImportNamespaceSpecifier extends NodeBase {
    applyDeoptimizations() { }
}

class ImportSpecifier extends NodeBase {
    applyDeoptimizations() { }
}

class LabeledStatement extends NodeBase {
    hasEffects(context) {
        const brokenFlow = context.brokenFlow;
        context.ignore.labels.add(this.label.name);
        if (this.body.hasEffects(context))
            return true;
        context.ignore.labels.delete(this.label.name);
        if (context.includedLabels.has(this.label.name)) {
            context.includedLabels.delete(this.label.name);
            context.brokenFlow = brokenFlow;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        const brokenFlow = context.brokenFlow;
        this.body.include(context, includeChildrenRecursively);
        if (includeChildrenRecursively || context.includedLabels.has(this.label.name)) {
            this.label.include();
            context.includedLabels.delete(this.label.name);
            context.brokenFlow = brokenFlow;
        }
    }
    render(code, options) {
        if (this.label.included) {
            this.label.render(code, options);
        }
        else {
            code.remove(this.start, findNonWhiteSpace(code.original, findFirstOccurrenceOutsideComment(code.original, ':', this.label.end) + 1));
        }
        this.body.render(code, options);
    }
}

class LogicalExpression extends NodeBase {
    constructor() {
        super(...arguments);
        // We collect deoptimization information if usedBranch !== null
        this.expressionsToBeDeoptimized = [];
        this.isBranchResolutionAnalysed = false;
        this.usedBranch = null;
    }
    deoptimizeCache() {
        if (this.usedBranch) {
            const unusedBranch = this.usedBranch === this.left ? this.right : this.left;
            this.usedBranch = null;
            unusedBranch.deoptimizePath(UNKNOWN_PATH);
            for (const expression of this.expressionsToBeDeoptimized) {
                expression.deoptimizeCache();
            }
            // Request another pass because we need to ensure "include" runs again if
            // it is rendered
            this.context.requestTreeshakingPass();
        }
    }
    deoptimizePath(path) {
        const usedBranch = this.getUsedBranch();
        if (!usedBranch) {
            this.left.deoptimizePath(path);
            this.right.deoptimizePath(path);
        }
        else {
            usedBranch.deoptimizePath(path);
        }
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        this.left.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
        this.right.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        const usedBranch = this.getUsedBranch();
        if (!usedBranch)
            return UnknownValue;
        this.expressionsToBeDeoptimized.push(origin);
        return usedBranch.getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        const usedBranch = this.getUsedBranch();
        if (!usedBranch)
            return new MultiExpression([
                this.left.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin),
                this.right.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin)
            ]);
        this.expressionsToBeDeoptimized.push(origin);
        return usedBranch.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
    }
    hasEffects(context) {
        if (this.left.hasEffects(context)) {
            return true;
        }
        if (this.getUsedBranch() !== this.left) {
            return this.right.hasEffects(context);
        }
        return false;
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        const usedBranch = this.getUsedBranch();
        if (!usedBranch) {
            return (this.left.hasEffectsOnInteractionAtPath(path, interaction, context) ||
                this.right.hasEffectsOnInteractionAtPath(path, interaction, context));
        }
        return usedBranch.hasEffectsOnInteractionAtPath(path, interaction, context);
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        const usedBranch = this.getUsedBranch();
        if (includeChildrenRecursively ||
            (usedBranch === this.right && this.left.shouldBeIncluded(context)) ||
            !usedBranch) {
            this.left.include(context, includeChildrenRecursively);
            this.right.include(context, includeChildrenRecursively);
        }
        else {
            usedBranch.include(context, includeChildrenRecursively);
        }
    }
    render(code, options, { isCalleeOfRenderedParent, preventASI, renderedParentType, renderedSurroundingElement } = BLANK) {
        if (!this.left.included || !this.right.included) {
            const operatorPos = findFirstOccurrenceOutsideComment(code.original, this.operator, this.left.end);
            if (this.right.included) {
                const removePos = findNonWhiteSpace(code.original, operatorPos + 2);
                code.remove(this.start, removePos);
                if (preventASI) {
                    removeLineBreaks(code, removePos, this.right.start);
                }
            }
            else {
                code.remove(operatorPos, this.end);
            }
            removeAnnotations(this, code);
            this.getUsedBranch().render(code, options, {
                isCalleeOfRenderedParent,
                preventASI,
                renderedParentType: renderedParentType || this.parent.type,
                renderedSurroundingElement: renderedSurroundingElement || this.parent.type
            });
        }
        else {
            this.left.render(code, options, {
                preventASI,
                renderedSurroundingElement
            });
            this.right.render(code, options);
        }
    }
    getUsedBranch() {
        if (!this.isBranchResolutionAnalysed) {
            this.isBranchResolutionAnalysed = true;
            const leftValue = this.left.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this);
            if (typeof leftValue === 'symbol') {
                return null;
            }
            else {
                this.usedBranch =
                    (this.operator === '||' && leftValue) ||
                        (this.operator === '&&' && !leftValue) ||
                        (this.operator === '??' && leftValue != null)
                        ? this.left
                        : this.right;
            }
        }
        return this.usedBranch;
    }
}

const ASSET_PREFIX = 'ROLLUP_ASSET_URL_';
const CHUNK_PREFIX = 'ROLLUP_CHUNK_URL_';
const FILE_PREFIX = 'ROLLUP_FILE_URL_';
class MetaProperty extends NodeBase {
    addAccessedGlobals(format, accessedGlobalsByScope) {
        const metaProperty = this.metaProperty;
        const accessedGlobals = (metaProperty &&
            (metaProperty.startsWith(FILE_PREFIX) ||
                metaProperty.startsWith(ASSET_PREFIX) ||
                metaProperty.startsWith(CHUNK_PREFIX))
            ? accessedFileUrlGlobals
            : accessedMetaUrlGlobals)[format];
        if (accessedGlobals.length > 0) {
            this.scope.addAccessedGlobals(accessedGlobals, accessedGlobalsByScope);
        }
    }
    getReferencedFileName(outputPluginDriver) {
        const metaProperty = this.metaProperty;
        if (metaProperty && metaProperty.startsWith(FILE_PREFIX)) {
            return outputPluginDriver.getFileName(metaProperty.substring(FILE_PREFIX.length));
        }
        return null;
    }
    hasEffects() {
        return false;
    }
    hasEffectsOnInteractionAtPath(path, { type }) {
        return path.length > 1 || type !== INTERACTION_ACCESSED;
    }
    include() {
        if (!this.included) {
            this.included = true;
            if (this.meta.name === 'import') {
                this.context.addImportMeta(this);
                const parent = this.parent;
                this.metaProperty =
                    parent instanceof MemberExpression && typeof parent.propertyKey === 'string'
                        ? parent.propertyKey
                        : null;
            }
        }
    }
    renderFinalMechanism(code, chunkId, format, snippets, outputPluginDriver) {
        var _a;
        const parent = this.parent;
        const metaProperty = this.metaProperty;
        if (metaProperty &&
            (metaProperty.startsWith(FILE_PREFIX) ||
                metaProperty.startsWith(ASSET_PREFIX) ||
                metaProperty.startsWith(CHUNK_PREFIX))) {
            let referenceId = null;
            let assetReferenceId = null;
            let chunkReferenceId = null;
            let fileName;
            if (metaProperty.startsWith(FILE_PREFIX)) {
                referenceId = metaProperty.substring(FILE_PREFIX.length);
                fileName = outputPluginDriver.getFileName(referenceId);
            }
            else if (metaProperty.startsWith(ASSET_PREFIX)) {
                warnDeprecation(`Using the "${ASSET_PREFIX}" prefix to reference files is deprecated. Use the "${FILE_PREFIX}" prefix instead.`, true, this.context.options);
                assetReferenceId = metaProperty.substring(ASSET_PREFIX.length);
                fileName = outputPluginDriver.getFileName(assetReferenceId);
            }
            else {
                warnDeprecation(`Using the "${CHUNK_PREFIX}" prefix to reference files is deprecated. Use the "${FILE_PREFIX}" prefix instead.`, true, this.context.options);
                chunkReferenceId = metaProperty.substring(CHUNK_PREFIX.length);
                fileName = outputPluginDriver.getFileName(chunkReferenceId);
            }
            const relativePath = normalize(relative$1(dirname(chunkId), fileName));
            let replacement;
            if (assetReferenceId !== null) {
                replacement = outputPluginDriver.hookFirstSync('resolveAssetUrl', [
                    {
                        assetFileName: fileName,
                        chunkId,
                        format,
                        moduleId: this.context.module.id,
                        relativeAssetPath: relativePath
                    }
                ]);
            }
            if (!replacement) {
                replacement =
                    outputPluginDriver.hookFirstSync('resolveFileUrl', [
                        {
                            assetReferenceId,
                            chunkId,
                            chunkReferenceId,
                            fileName,
                            format,
                            moduleId: this.context.module.id,
                            referenceId: referenceId || assetReferenceId || chunkReferenceId,
                            relativePath
                        }
                    ]) || relativeUrlMechanisms[format](relativePath);
            }
            code.overwrite(parent.start, parent.end, replacement, { contentOnly: true });
            return;
        }
        const replacement = outputPluginDriver.hookFirstSync('resolveImportMeta', [
            metaProperty,
            {
                chunkId,
                format,
                moduleId: this.context.module.id
            }
        ]) || ((_a = importMetaMechanisms[format]) === null || _a === void 0 ? void 0 : _a.call(importMetaMechanisms, metaProperty, { chunkId, snippets }));
        if (typeof replacement === 'string') {
            if (parent instanceof MemberExpression) {
                code.overwrite(parent.start, parent.end, replacement, { contentOnly: true });
            }
            else {
                code.overwrite(this.start, this.end, replacement, { contentOnly: true });
            }
        }
    }
}
const accessedMetaUrlGlobals = {
    amd: ['document', 'module', 'URL'],
    cjs: ['document', 'require', 'URL'],
    es: [],
    iife: ['document', 'URL'],
    system: ['module'],
    umd: ['document', 'require', 'URL']
};
const accessedFileUrlGlobals = {
    amd: ['document', 'require', 'URL'],
    cjs: ['document', 'require', 'URL'],
    es: [],
    iife: ['document', 'URL'],
    system: ['module', 'URL'],
    umd: ['document', 'require', 'URL']
};
const getResolveUrl = (path, URL = 'URL') => `new ${URL}(${path}).href`;
const getRelativeUrlFromDocument = (relativePath, umd = false) => getResolveUrl(`'${relativePath}', ${umd ? `typeof document === 'undefined' ? location.href : ` : ''}document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT' && document.currentScript.src || document.baseURI`);
const getGenericImportMetaMechanism = (getUrl) => (prop, { chunkId }) => {
    const urlMechanism = getUrl(chunkId);
    return prop === null
        ? `({ url: ${urlMechanism} })`
        : prop === 'url'
            ? urlMechanism
            : 'undefined';
};
const getUrlFromDocument = (chunkId, umd = false) => `${umd ? `typeof document === 'undefined' ? location.href : ` : ''}(document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT' && document.currentScript.src || new URL('${chunkId}', document.baseURI).href)`;
const relativeUrlMechanisms = {
    amd: relativePath => {
        if (relativePath[0] !== '.')
            relativePath = './' + relativePath;
        return getResolveUrl(`require.toUrl('${relativePath}'), document.baseURI`);
    },
    cjs: relativePath => `(typeof document === 'undefined' ? ${getResolveUrl(`'file:' + __dirname + '/${relativePath}'`, `(require('u' + 'rl').URL)`)} : ${getRelativeUrlFromDocument(relativePath)})`,
    es: relativePath => getResolveUrl(`'${relativePath}', import.meta.url`),
    iife: relativePath => getRelativeUrlFromDocument(relativePath),
    system: relativePath => getResolveUrl(`'${relativePath}', module.meta.url`),
    umd: relativePath => `(typeof document === 'undefined' && typeof location === 'undefined' ? ${getResolveUrl(`'file:' + __dirname + '/${relativePath}'`, `(require('u' + 'rl').URL)`)} : ${getRelativeUrlFromDocument(relativePath, true)})`
};
const importMetaMechanisms = {
    amd: getGenericImportMetaMechanism(() => getResolveUrl(`module.uri, document.baseURI`)),
    cjs: getGenericImportMetaMechanism(chunkId => `(typeof document === 'undefined' ? ${getResolveUrl(`'file:' + __filename`, `(require('u' + 'rl').URL)`)} : ${getUrlFromDocument(chunkId)})`),
    iife: getGenericImportMetaMechanism(chunkId => getUrlFromDocument(chunkId)),
    system: (prop, { snippets: { getPropertyAccess } }) => prop === null ? `module.meta` : `module.meta${getPropertyAccess(prop)}`,
    umd: getGenericImportMetaMechanism(chunkId => `(typeof document === 'undefined' && typeof location === 'undefined' ? ${getResolveUrl(`'file:' + __filename`, `(require('u' + 'rl').URL)`)} : ${getUrlFromDocument(chunkId, true)})`)
};

class NewExpression extends NodeBase {
    hasEffects(context) {
        try {
            for (const argument of this.arguments) {
                if (argument.hasEffects(context))
                    return true;
            }
            if (this.context.options.treeshake.annotations &&
                this.annotations) {
                return false;
            }
            return (this.callee.hasEffects(context) ||
                this.callee.hasEffectsOnInteractionAtPath(EMPTY_PATH, this.interaction, context));
        }
        finally {
            if (!this.deoptimized)
                this.applyDeoptimizations();
        }
    }
    hasEffectsOnInteractionAtPath(path, { type }) {
        return path.length > 0 || type !== INTERACTION_ACCESSED;
    }
    include(context, includeChildrenRecursively) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        if (includeChildrenRecursively) {
            super.include(context, includeChildrenRecursively);
        }
        else {
            this.included = true;
            this.callee.include(context, false);
        }
        this.callee.includeCallArguments(context, this.arguments);
    }
    initialise() {
        this.interaction = {
            args: this.arguments,
            thisArg: null,
            type: INTERACTION_CALLED,
            withNew: true
        };
    }
    render(code, options) {
        this.callee.render(code, options);
        renderCallArguments(code, options, this);
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        for (const argument of this.arguments) {
            // This will make sure all properties of parameters behave as "unknown"
            argument.deoptimizePath(UNKNOWN_PATH);
        }
        this.context.requestTreeshakingPass();
    }
}

class ObjectExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.objectEntity = null;
    }
    deoptimizeCache() {
        this.getObjectEntity().deoptimizeAllProperties();
    }
    deoptimizePath(path) {
        this.getObjectEntity().deoptimizePath(path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        this.getObjectEntity().deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.getObjectEntity().getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        return this.getObjectEntity().getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        return this.getObjectEntity().hasEffectsOnInteractionAtPath(path, interaction, context);
    }
    render(code, options, { renderedSurroundingElement } = BLANK) {
        super.render(code, options);
        if (renderedSurroundingElement === ExpressionStatement$1 ||
            renderedSurroundingElement === ArrowFunctionExpression$1) {
            code.appendRight(this.start, '(');
            code.prependLeft(this.end, ')');
        }
    }
    applyDeoptimizations() { }
    getObjectEntity() {
        if (this.objectEntity !== null) {
            return this.objectEntity;
        }
        let prototype = OBJECT_PROTOTYPE;
        const properties = [];
        for (const property of this.properties) {
            if (property instanceof SpreadElement) {
                properties.push({ key: UnknownKey, kind: 'init', property });
                continue;
            }
            let key;
            if (property.computed) {
                const keyValue = property.key.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this);
                if (typeof keyValue === 'symbol') {
                    properties.push({ key: UnknownKey, kind: property.kind, property });
                    continue;
                }
                else {
                    key = String(keyValue);
                }
            }
            else {
                key =
                    property.key instanceof Identifier
                        ? property.key.name
                        : String(property.key.value);
                if (key === '__proto__' && property.kind === 'init') {
                    prototype =
                        property.value instanceof Literal && property.value.value === null
                            ? null
                            : property.value;
                    continue;
                }
            }
            properties.push({ key, kind: property.kind, property });
        }
        return (this.objectEntity = new ObjectEntity(properties, prototype));
    }
}

class PrivateIdentifier extends NodeBase {
}

class Program extends NodeBase {
    constructor() {
        super(...arguments);
        this.hasCachedEffect = false;
    }
    hasEffects(context) {
        // We are caching here to later more efficiently identify side-effect-free modules
        if (this.hasCachedEffect)
            return true;
        for (const node of this.body) {
            if (node.hasEffects(context)) {
                return (this.hasCachedEffect = true);
            }
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        for (const node of this.body) {
            if (includeChildrenRecursively || node.shouldBeIncluded(context)) {
                node.include(context, includeChildrenRecursively);
            }
        }
    }
    render(code, options) {
        if (this.body.length) {
            renderStatementList(this.body, code, this.start, this.end, options);
        }
        else {
            super.render(code, options);
        }
    }
    applyDeoptimizations() { }
}

class Property extends MethodBase {
    constructor() {
        super(...arguments);
        this.declarationInit = null;
    }
    declare(kind, init) {
        this.declarationInit = init;
        return this.value.declare(kind, UNKNOWN_EXPRESSION);
    }
    hasEffects(context) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        const propertyReadSideEffects = this.context.options.treeshake
            .propertyReadSideEffects;
        return ((this.parent.type === 'ObjectPattern' && propertyReadSideEffects === 'always') ||
            this.key.hasEffects(context) ||
            this.value.hasEffects(context));
    }
    markDeclarationReached() {
        this.value.markDeclarationReached();
    }
    render(code, options) {
        if (!this.shorthand) {
            this.key.render(code, options);
        }
        this.value.render(code, options, { isShorthandProperty: this.shorthand });
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        if (this.declarationInit !== null) {
            this.declarationInit.deoptimizePath([UnknownKey, UnknownKey]);
            this.context.requestTreeshakingPass();
        }
    }
}

class PropertyDefinition extends NodeBase {
    deoptimizePath(path) {
        var _a;
        (_a = this.value) === null || _a === void 0 ? void 0 : _a.deoptimizePath(path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        var _a;
        (_a = this.value) === null || _a === void 0 ? void 0 : _a.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.value
            ? this.value.getLiteralValueAtPath(path, recursionTracker, origin)
            : UnknownValue;
    }
    getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin) {
        return this.value
            ? this.value.getReturnExpressionWhenCalledAtPath(path, interaction, recursionTracker, origin)
            : UNKNOWN_EXPRESSION;
    }
    hasEffects(context) {
        var _a;
        return this.key.hasEffects(context) || (this.static && !!((_a = this.value) === null || _a === void 0 ? void 0 : _a.hasEffects(context)));
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        return !this.value || this.value.hasEffectsOnInteractionAtPath(path, interaction, context);
    }
    applyDeoptimizations() { }
}

class ReturnStatement extends NodeBase {
    hasEffects(context) {
        var _a;
        if (!context.ignore.returnYield || ((_a = this.argument) === null || _a === void 0 ? void 0 : _a.hasEffects(context)))
            return true;
        context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
        return false;
    }
    include(context, includeChildrenRecursively) {
        var _a;
        this.included = true;
        (_a = this.argument) === null || _a === void 0 ? void 0 : _a.include(context, includeChildrenRecursively);
        context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
    }
    initialise() {
        this.scope.addReturnExpression(this.argument || UNKNOWN_EXPRESSION);
    }
    render(code, options) {
        if (this.argument) {
            this.argument.render(code, options, { preventASI: true });
            if (this.argument.start === this.start + 6 /* 'return'.length */) {
                code.prependLeft(this.start + 6, ' ');
            }
        }
    }
}

class SequenceExpression extends NodeBase {
    deoptimizePath(path) {
        this.expressions[this.expressions.length - 1].deoptimizePath(path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        this.expressions[this.expressions.length - 1].deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.expressions[this.expressions.length - 1].getLiteralValueAtPath(path, recursionTracker, origin);
    }
    hasEffects(context) {
        for (const expression of this.expressions) {
            if (expression.hasEffects(context))
                return true;
        }
        return false;
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        return this.expressions[this.expressions.length - 1].hasEffectsOnInteractionAtPath(path, interaction, context);
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        const lastExpression = this.expressions[this.expressions.length - 1];
        for (const expression of this.expressions) {
            if (includeChildrenRecursively ||
                (expression === lastExpression && !(this.parent instanceof ExpressionStatement)) ||
                expression.shouldBeIncluded(context))
                expression.include(context, includeChildrenRecursively);
        }
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent, preventASI } = BLANK) {
        let includedNodes = 0;
        let lastSeparatorPos = null;
        const lastNode = this.expressions[this.expressions.length - 1];
        for (const { node, separator, start, end } of getCommaSeparatedNodesWithBoundaries(this.expressions, code, this.start, this.end)) {
            if (!node.included) {
                treeshakeNode(node, code, start, end);
                continue;
            }
            includedNodes++;
            lastSeparatorPos = separator;
            if (includedNodes === 1 && preventASI) {
                removeLineBreaks(code, start, node.start);
            }
            if (includedNodes === 1) {
                const parentType = renderedParentType || this.parent.type;
                node.render(code, options, {
                    isCalleeOfRenderedParent: isCalleeOfRenderedParent && node === lastNode,
                    renderedParentType: parentType,
                    renderedSurroundingElement: parentType
                });
            }
            else {
                node.render(code, options);
            }
        }
        if (lastSeparatorPos) {
            code.remove(lastSeparatorPos, this.end);
        }
    }
}

class StaticBlock extends NodeBase {
    createScope(parentScope) {
        this.scope = new BlockScope(parentScope);
    }
    hasEffects(context) {
        for (const node of this.body) {
            if (node.hasEffects(context))
                return true;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        for (const node of this.body) {
            if (includeChildrenRecursively || node.shouldBeIncluded(context))
                node.include(context, includeChildrenRecursively);
        }
    }
    render(code, options) {
        if (this.body.length) {
            renderStatementList(this.body, code, this.start + 1, this.end - 1, options);
        }
        else {
            super.render(code, options);
        }
    }
}

class Super extends NodeBase {
    bind() {
        this.variable = this.scope.findVariable('this');
    }
    deoptimizePath(path) {
        this.variable.deoptimizePath(path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        this.variable.deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
    }
    include() {
        if (!this.included) {
            this.included = true;
            this.context.includeVariableInModule(this.variable);
        }
    }
}

class SwitchCase extends NodeBase {
    hasEffects(context) {
        var _a;
        if ((_a = this.test) === null || _a === void 0 ? void 0 : _a.hasEffects(context))
            return true;
        for (const node of this.consequent) {
            if (context.brokenFlow)
                break;
            if (node.hasEffects(context))
                return true;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        var _a;
        this.included = true;
        (_a = this.test) === null || _a === void 0 ? void 0 : _a.include(context, includeChildrenRecursively);
        for (const node of this.consequent) {
            if (includeChildrenRecursively || node.shouldBeIncluded(context))
                node.include(context, includeChildrenRecursively);
        }
    }
    render(code, options, nodeRenderOptions) {
        if (this.consequent.length) {
            this.test && this.test.render(code, options);
            const testEnd = this.test
                ? this.test.end
                : findFirstOccurrenceOutsideComment(code.original, 'default', this.start) + 7;
            const consequentStart = findFirstOccurrenceOutsideComment(code.original, ':', testEnd) + 1;
            renderStatementList(this.consequent, code, consequentStart, nodeRenderOptions.end, options);
        }
        else {
            super.render(code, options);
        }
    }
}
SwitchCase.prototype.needsBoundaries = true;

class SwitchStatement extends NodeBase {
    createScope(parentScope) {
        this.scope = new BlockScope(parentScope);
    }
    hasEffects(context) {
        if (this.discriminant.hasEffects(context))
            return true;
        const { brokenFlow, ignore: { breaks } } = context;
        let minBrokenFlow = Infinity;
        context.ignore.breaks = true;
        for (const switchCase of this.cases) {
            if (switchCase.hasEffects(context))
                return true;
            minBrokenFlow = context.brokenFlow < minBrokenFlow ? context.brokenFlow : minBrokenFlow;
            context.brokenFlow = brokenFlow;
        }
        if (this.defaultCase !== null && !(minBrokenFlow === BROKEN_FLOW_BREAK_CONTINUE)) {
            context.brokenFlow = minBrokenFlow;
        }
        context.ignore.breaks = breaks;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.discriminant.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        let minBrokenFlow = Infinity;
        let isCaseIncluded = includeChildrenRecursively ||
            (this.defaultCase !== null && this.defaultCase < this.cases.length - 1);
        for (let caseIndex = this.cases.length - 1; caseIndex >= 0; caseIndex--) {
            const switchCase = this.cases[caseIndex];
            if (switchCase.included) {
                isCaseIncluded = true;
            }
            if (!isCaseIncluded) {
                const hasEffectsContext = createHasEffectsContext();
                hasEffectsContext.ignore.breaks = true;
                isCaseIncluded = switchCase.hasEffects(hasEffectsContext);
            }
            if (isCaseIncluded) {
                switchCase.include(context, includeChildrenRecursively);
                minBrokenFlow = minBrokenFlow < context.brokenFlow ? minBrokenFlow : context.brokenFlow;
                context.brokenFlow = brokenFlow;
            }
            else {
                minBrokenFlow = brokenFlow;
            }
        }
        if (isCaseIncluded &&
            this.defaultCase !== null &&
            !(minBrokenFlow === BROKEN_FLOW_BREAK_CONTINUE)) {
            context.brokenFlow = minBrokenFlow;
        }
    }
    initialise() {
        for (let caseIndex = 0; caseIndex < this.cases.length; caseIndex++) {
            if (this.cases[caseIndex].test === null) {
                this.defaultCase = caseIndex;
                return;
            }
        }
        this.defaultCase = null;
    }
    render(code, options) {
        this.discriminant.render(code, options);
        if (this.cases.length > 0) {
            renderStatementList(this.cases, code, this.cases[0].start, this.end - 1, options);
        }
    }
}

class TaggedTemplateExpression extends CallExpressionBase {
    bind() {
        super.bind();
        if (this.tag.type === Identifier$1) {
            const name = this.tag.name;
            const variable = this.scope.findVariable(name);
            if (variable.isNamespace) {
                this.context.warn({
                    code: 'CANNOT_CALL_NAMESPACE',
                    message: `Cannot call a namespace ('${name}')`
                }, this.start);
            }
        }
    }
    hasEffects(context) {
        try {
            for (const argument of this.quasi.expressions) {
                if (argument.hasEffects(context))
                    return true;
            }
            return (this.tag.hasEffects(context) ||
                this.tag.hasEffectsOnInteractionAtPath(EMPTY_PATH, this.interaction, context));
        }
        finally {
            if (!this.deoptimized)
                this.applyDeoptimizations();
        }
    }
    include(context, includeChildrenRecursively) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        if (includeChildrenRecursively) {
            super.include(context, includeChildrenRecursively);
        }
        else {
            this.included = true;
            this.tag.include(context, includeChildrenRecursively);
            this.quasi.include(context, includeChildrenRecursively);
        }
        this.tag.includeCallArguments(context, this.interaction.args);
        const returnExpression = this.getReturnExpression();
        if (!returnExpression.included) {
            returnExpression.include(context, false);
        }
    }
    initialise() {
        this.interaction = {
            args: [UNKNOWN_EXPRESSION, ...this.quasi.expressions],
            thisArg: this.tag instanceof MemberExpression && !this.tag.variable ? this.tag.object : null,
            type: INTERACTION_CALLED,
            withNew: false
        };
    }
    render(code, options) {
        this.tag.render(code, options, { isCalleeOfRenderedParent: true });
        this.quasi.render(code, options);
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        if (this.interaction.thisArg) {
            this.tag.deoptimizeThisOnInteractionAtPath(this.interaction, EMPTY_PATH, SHARED_RECURSION_TRACKER);
        }
        for (const argument of this.quasi.expressions) {
            // This will make sure all properties of parameters behave as "unknown"
            argument.deoptimizePath(UNKNOWN_PATH);
        }
        this.context.requestTreeshakingPass();
    }
    getReturnExpression(recursionTracker = SHARED_RECURSION_TRACKER) {
        if (this.returnExpression === null) {
            this.returnExpression = UNKNOWN_EXPRESSION;
            return (this.returnExpression = this.tag.getReturnExpressionWhenCalledAtPath(EMPTY_PATH, this.interaction, recursionTracker, this));
        }
        return this.returnExpression;
    }
}

class TemplateElement extends NodeBase {
    // Do not try to bind value
    bind() { }
    hasEffects() {
        return false;
    }
    include() {
        this.included = true;
    }
    parseNode(esTreeNode) {
        this.value = esTreeNode.value;
        super.parseNode(esTreeNode);
    }
    render() { }
}

class TemplateLiteral extends NodeBase {
    deoptimizeThisOnInteractionAtPath() { }
    getLiteralValueAtPath(path) {
        if (path.length > 0 || this.quasis.length !== 1) {
            return UnknownValue;
        }
        return this.quasis[0].value.cooked;
    }
    getReturnExpressionWhenCalledAtPath(path) {
        if (path.length !== 1) {
            return UNKNOWN_EXPRESSION;
        }
        return getMemberReturnExpressionWhenCalled(literalStringMembers, path[0]);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (interaction.type === INTERACTION_ACCESSED) {
            return path.length > 1;
        }
        if (interaction.type === INTERACTION_CALLED && path.length === 1) {
            return hasMemberEffectWhenCalled(literalStringMembers, path[0], interaction, context);
        }
        return true;
    }
    render(code, options) {
        code.indentExclusionRanges.push([this.start, this.end]);
        super.render(code, options);
    }
}

class UndefinedVariable extends Variable {
    constructor() {
        super('undefined');
    }
    getLiteralValueAtPath() {
        return undefined;
    }
}

class ExportDefaultVariable extends LocalVariable {
    constructor(name, exportDefaultDeclaration, context) {
        super(name, exportDefaultDeclaration, exportDefaultDeclaration.declaration, context);
        this.hasId = false;
        this.originalId = null;
        this.originalVariable = null;
        const declaration = exportDefaultDeclaration.declaration;
        if ((declaration instanceof FunctionDeclaration || declaration instanceof ClassDeclaration) &&
            declaration.id) {
            this.hasId = true;
            this.originalId = declaration.id;
        }
        else if (declaration instanceof Identifier) {
            this.originalId = declaration;
        }
    }
    addReference(identifier) {
        if (!this.hasId) {
            this.name = identifier.name;
        }
    }
    getAssignedVariableName() {
        return (this.originalId && this.originalId.name) || null;
    }
    getBaseVariableName() {
        const original = this.getOriginalVariable();
        if (original === this) {
            return super.getBaseVariableName();
        }
        else {
            return original.getBaseVariableName();
        }
    }
    getDirectOriginalVariable() {
        return this.originalId &&
            (this.hasId ||
                !(this.originalId.isPossibleTDZ() ||
                    this.originalId.variable.isReassigned ||
                    this.originalId.variable instanceof UndefinedVariable ||
                    // this avoids a circular dependency
                    'syntheticNamespace' in this.originalId.variable))
            ? this.originalId.variable
            : null;
    }
    getName(getPropertyAccess) {
        const original = this.getOriginalVariable();
        if (original === this) {
            return super.getName(getPropertyAccess);
        }
        else {
            return original.getName(getPropertyAccess);
        }
    }
    getOriginalVariable() {
        if (this.originalVariable)
            return this.originalVariable;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let original = this;
        let currentVariable;
        const checkedVariables = new Set();
        do {
            checkedVariables.add(original);
            currentVariable = original;
            original = currentVariable.getDirectOriginalVariable();
        } while (original instanceof ExportDefaultVariable && !checkedVariables.has(original));
        return (this.originalVariable = original || currentVariable);
    }
}

class ModuleScope extends ChildScope {
    constructor(parent, context) {
        super(parent);
        this.context = context;
        this.variables.set('this', new LocalVariable('this', null, UNDEFINED_EXPRESSION, context));
    }
    addExportDefaultDeclaration(name, exportDefaultDeclaration, context) {
        const variable = new ExportDefaultVariable(name, exportDefaultDeclaration, context);
        this.variables.set('default', variable);
        return variable;
    }
    addNamespaceMemberAccess() { }
    deconflict(format, exportNamesByVariable, accessedGlobalsByScope) {
        // all module level variables are already deconflicted when deconflicting the chunk
        for (const scope of this.children)
            scope.deconflict(format, exportNamesByVariable, accessedGlobalsByScope);
    }
    findLexicalBoundary() {
        return this;
    }
    findVariable(name) {
        const knownVariable = this.variables.get(name) || this.accessedOutsideVariables.get(name);
        if (knownVariable) {
            return knownVariable;
        }
        const variable = this.context.traceVariable(name) || this.parent.findVariable(name);
        if (variable instanceof GlobalVariable) {
            this.accessedOutsideVariables.set(name, variable);
        }
        return variable;
    }
}

class ThisExpression extends NodeBase {
    bind() {
        this.variable = this.scope.findVariable('this');
    }
    deoptimizePath(path) {
        this.variable.deoptimizePath(path);
    }
    deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker) {
        // We rewrite the parameter so that a ThisVariable can detect self-mutations
        this.variable.deoptimizeThisOnInteractionAtPath(interaction.thisArg === this ? { ...interaction, thisArg: this.variable } : interaction, path, recursionTracker);
    }
    hasEffectsOnInteractionAtPath(path, interaction, context) {
        if (path.length === 0) {
            return interaction.type !== INTERACTION_ACCESSED;
        }
        return this.variable.hasEffectsOnInteractionAtPath(path, interaction, context);
    }
    include() {
        if (!this.included) {
            this.included = true;
            this.context.includeVariableInModule(this.variable);
        }
    }
    initialise() {
        this.alias =
            this.scope.findLexicalBoundary() instanceof ModuleScope ? this.context.moduleContext : null;
        if (this.alias === 'undefined') {
            this.context.warn({
                code: 'THIS_IS_UNDEFINED',
                message: `The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten`,
                url: `https://rollupjs.org/guide/en/#error-this-is-undefined`
            }, this.start);
        }
    }
    render(code) {
        if (this.alias !== null) {
            code.overwrite(this.start, this.end, this.alias, {
                contentOnly: false,
                storeName: true
            });
        }
    }
}

class ThrowStatement extends NodeBase {
    hasEffects() {
        return true;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.argument.include(context, includeChildrenRecursively);
        context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
    }
    render(code, options) {
        this.argument.render(code, options, { preventASI: true });
        if (this.argument.start === this.start + 5 /* 'throw'.length */) {
            code.prependLeft(this.start + 5, ' ');
        }
    }
}

class TryStatement extends NodeBase {
    constructor() {
        super(...arguments);
        this.directlyIncluded = false;
        this.includedLabelsAfterBlock = null;
    }
    hasEffects(context) {
        var _a;
        return ((this.context.options.treeshake.tryCatchDeoptimization
            ? this.block.body.length > 0
            : this.block.hasEffects(context)) || !!((_a = this.finalizer) === null || _a === void 0 ? void 0 : _a.hasEffects(context)));
    }
    include(context, includeChildrenRecursively) {
        var _a, _b;
        const tryCatchDeoptimization = (_a = this.context.options.treeshake) === null || _a === void 0 ? void 0 : _a.tryCatchDeoptimization;
        const { brokenFlow } = context;
        if (!this.directlyIncluded || !tryCatchDeoptimization) {
            this.included = true;
            this.directlyIncluded = true;
            this.block.include(context, tryCatchDeoptimization ? INCLUDE_PARAMETERS : includeChildrenRecursively);
            if (context.includedLabels.size > 0) {
                this.includedLabelsAfterBlock = [...context.includedLabels];
            }
            context.brokenFlow = brokenFlow;
        }
        else if (this.includedLabelsAfterBlock) {
            for (const label of this.includedLabelsAfterBlock) {
                context.includedLabels.add(label);
            }
        }
        if (this.handler !== null) {
            this.handler.include(context, includeChildrenRecursively);
            context.brokenFlow = brokenFlow;
        }
        (_b = this.finalizer) === null || _b === void 0 ? void 0 : _b.include(context, includeChildrenRecursively);
    }
}

const unaryOperators = {
    '!': value => !value,
    '+': value => +value,
    '-': value => -value,
    delete: () => UnknownValue,
    typeof: value => typeof value,
    void: () => undefined,
    '~': value => ~value
};
class UnaryExpression extends NodeBase {
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (path.length > 0)
            return UnknownValue;
        const argumentValue = this.argument.getLiteralValueAtPath(EMPTY_PATH, recursionTracker, origin);
        if (typeof argumentValue === 'symbol')
            return UnknownValue;
        return unaryOperators[this.operator](argumentValue);
    }
    hasEffects(context) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        if (this.operator === 'typeof' && this.argument instanceof Identifier)
            return false;
        return (this.argument.hasEffects(context) ||
            (this.operator === 'delete' &&
                this.argument.hasEffectsOnInteractionAtPath(EMPTY_PATH, NODE_INTERACTION_UNKNOWN_ASSIGNMENT, context)));
    }
    hasEffectsOnInteractionAtPath(path, { type }) {
        return type !== INTERACTION_ACCESSED || path.length > (this.operator === 'void' ? 0 : 1);
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        if (this.operator === 'delete') {
            this.argument.deoptimizePath(EMPTY_PATH);
            this.context.requestTreeshakingPass();
        }
    }
}

class UnknownNode extends NodeBase {
    hasEffects() {
        return true;
    }
    include(context) {
        super.include(context, true);
    }
}

class UpdateExpression extends NodeBase {
    hasEffects(context) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        return this.argument.hasEffectsAsAssignmentTarget(context, true);
    }
    hasEffectsOnInteractionAtPath(path, { type }) {
        return path.length > 1 || type !== INTERACTION_ACCESSED;
    }
    include(context, includeChildrenRecursively) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        this.included = true;
        this.argument.includeAsAssignmentTarget(context, includeChildrenRecursively, true);
    }
    initialise() {
        this.argument.setAssignedValue(UNKNOWN_EXPRESSION);
    }
    render(code, options) {
        const { exportNamesByVariable, format, snippets: { _ } } = options;
        this.argument.render(code, options);
        if (format === 'system') {
            const variable = this.argument.variable;
            const exportNames = exportNamesByVariable.get(variable);
            if (exportNames) {
                if (this.prefix) {
                    if (exportNames.length === 1) {
                        renderSystemExportExpression(variable, this.start, this.end, code, options);
                    }
                    else {
                        renderSystemExportSequenceAfterExpression(variable, this.start, this.end, this.parent.type !== ExpressionStatement$1, code, options);
                    }
                }
                else {
                    const operator = this.operator[0];
                    renderSystemExportSequenceBeforeExpression(variable, this.start, this.end, this.parent.type !== ExpressionStatement$1, code, options, `${_}${operator}${_}1`);
                }
            }
        }
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        this.argument.deoptimizePath(EMPTY_PATH);
        if (this.argument instanceof Identifier) {
            const variable = this.scope.findVariable(this.argument.name);
            variable.isReassigned = true;
        }
        this.context.requestTreeshakingPass();
    }
}

function isReassignedExportsMember(variable, exportNamesByVariable) {
    return (variable.renderBaseName !== null && exportNamesByVariable.has(variable) && variable.isReassigned);
}

function areAllDeclarationsIncludedAndNotExported(declarations, exportNamesByVariable) {
    for (const declarator of declarations) {
        if (!declarator.id.included)
            return false;
        if (declarator.id.type === Identifier$1) {
            if (exportNamesByVariable.has(declarator.id.variable))
                return false;
        }
        else {
            const exportedVariables = [];
            declarator.id.addExportedVariables(exportedVariables, exportNamesByVariable);
            if (exportedVariables.length > 0)
                return false;
        }
    }
    return true;
}
class VariableDeclaration extends NodeBase {
    deoptimizePath() {
        for (const declarator of this.declarations) {
            declarator.deoptimizePath(EMPTY_PATH);
        }
    }
    hasEffectsOnInteractionAtPath() {
        return false;
    }
    include(context, includeChildrenRecursively, { asSingleStatement } = BLANK) {
        this.included = true;
        for (const declarator of this.declarations) {
            if (includeChildrenRecursively || declarator.shouldBeIncluded(context))
                declarator.include(context, includeChildrenRecursively);
            if (asSingleStatement) {
                declarator.id.include(context, includeChildrenRecursively);
            }
        }
    }
    initialise() {
        for (const declarator of this.declarations) {
            declarator.declareDeclarator(this.kind);
        }
    }
    render(code, options, nodeRenderOptions = BLANK) {
        if (areAllDeclarationsIncludedAndNotExported(this.declarations, options.exportNamesByVariable)) {
            for (const declarator of this.declarations) {
                declarator.render(code, options);
            }
            if (!nodeRenderOptions.isNoStatement &&
                code.original.charCodeAt(this.end - 1) !== 59 /*";"*/) {
                code.appendLeft(this.end, ';');
            }
        }
        else {
            this.renderReplacedDeclarations(code, options);
        }
    }
    applyDeoptimizations() { }
    renderDeclarationEnd(code, separatorString, lastSeparatorPos, actualContentEnd, renderedContentEnd, systemPatternExports, options) {
        if (code.original.charCodeAt(this.end - 1) === 59 /*";"*/) {
            code.remove(this.end - 1, this.end);
        }
        separatorString += ';';
        if (lastSeparatorPos !== null) {
            if (code.original.charCodeAt(actualContentEnd - 1) === 10 /*"\n"*/ &&
                (code.original.charCodeAt(this.end) === 10 /*"\n"*/ ||
                    code.original.charCodeAt(this.end) === 13) /*"\r"*/) {
                actualContentEnd--;
                if (code.original.charCodeAt(actualContentEnd) === 13 /*"\r"*/) {
                    actualContentEnd--;
                }
            }
            if (actualContentEnd === lastSeparatorPos + 1) {
                code.overwrite(lastSeparatorPos, renderedContentEnd, separatorString);
            }
            else {
                code.overwrite(lastSeparatorPos, lastSeparatorPos + 1, separatorString);
                code.remove(actualContentEnd, renderedContentEnd);
            }
        }
        else {
            code.appendLeft(renderedContentEnd, separatorString);
        }
        if (systemPatternExports.length > 0) {
            code.appendLeft(renderedContentEnd, ` ${getSystemExportStatement(systemPatternExports, options)};`);
        }
    }
    renderReplacedDeclarations(code, options) {
        const separatedNodes = getCommaSeparatedNodesWithBoundaries(this.declarations, code, this.start + this.kind.length, this.end - (code.original.charCodeAt(this.end - 1) === 59 /*";"*/ ? 1 : 0));
        let actualContentEnd, renderedContentEnd;
        renderedContentEnd = findNonWhiteSpace(code.original, this.start + this.kind.length);
        let lastSeparatorPos = renderedContentEnd - 1;
        code.remove(this.start, lastSeparatorPos);
        let isInDeclaration = false;
        let hasRenderedContent = false;
        let separatorString = '', leadingString, nextSeparatorString;
        const aggregatedSystemExports = [];
        const singleSystemExport = gatherSystemExportsAndGetSingleExport(separatedNodes, options, aggregatedSystemExports);
        for (const { node, start, separator, contentEnd, end } of separatedNodes) {
            if (!node.included) {
                code.remove(start, end);
                continue;
            }
            node.render(code, options);
            leadingString = '';
            nextSeparatorString = '';
            if (!node.id.included ||
                (node.id instanceof Identifier &&
                    isReassignedExportsMember(node.id.variable, options.exportNamesByVariable))) {
                if (hasRenderedContent) {
                    separatorString += ';';
                }
                isInDeclaration = false;
            }
            else {
                if (singleSystemExport && singleSystemExport === node.id.variable) {
                    const operatorPos = findFirstOccurrenceOutsideComment(code.original, '=', node.id.end);
                    renderSystemExportExpression(singleSystemExport, findNonWhiteSpace(code.original, operatorPos + 1), separator === null ? contentEnd : separator, code, options);
                }
                if (isInDeclaration) {
                    separatorString += ',';
                }
                else {
                    if (hasRenderedContent) {
                        separatorString += ';';
                    }
                    leadingString += `${this.kind} `;
                    isInDeclaration = true;
                }
            }
            if (renderedContentEnd === lastSeparatorPos + 1) {
                code.overwrite(lastSeparatorPos, renderedContentEnd, separatorString + leadingString);
            }
            else {
                code.overwrite(lastSeparatorPos, lastSeparatorPos + 1, separatorString);
                code.appendLeft(renderedContentEnd, leadingString);
            }
            actualContentEnd = contentEnd;
            renderedContentEnd = end;
            hasRenderedContent = true;
            lastSeparatorPos = separator;
            separatorString = nextSeparatorString;
        }
        this.renderDeclarationEnd(code, separatorString, lastSeparatorPos, actualContentEnd, renderedContentEnd, aggregatedSystemExports, options);
    }
}
function gatherSystemExportsAndGetSingleExport(separatedNodes, options, aggregatedSystemExports) {
    var _a;
    let singleSystemExport = null;
    if (options.format === 'system') {
        for (const { node } of separatedNodes) {
            if (node.id instanceof Identifier &&
                node.init &&
                aggregatedSystemExports.length === 0 &&
                ((_a = options.exportNamesByVariable.get(node.id.variable)) === null || _a === void 0 ? void 0 : _a.length) === 1) {
                singleSystemExport = node.id.variable;
                aggregatedSystemExports.push(singleSystemExport);
            }
            else {
                node.id.addExportedVariables(aggregatedSystemExports, options.exportNamesByVariable);
            }
        }
        if (aggregatedSystemExports.length > 1) {
            singleSystemExport = null;
        }
        else if (singleSystemExport) {
            aggregatedSystemExports.length = 0;
        }
    }
    return singleSystemExport;
}

class VariableDeclarator extends NodeBase {
    declareDeclarator(kind) {
        this.id.declare(kind, this.init || UNDEFINED_EXPRESSION);
    }
    deoptimizePath(path) {
        this.id.deoptimizePath(path);
    }
    hasEffects(context) {
        var _a;
        const initEffect = (_a = this.init) === null || _a === void 0 ? void 0 : _a.hasEffects(context);
        this.id.markDeclarationReached();
        return initEffect || this.id.hasEffects(context);
    }
    include(context, includeChildrenRecursively) {
        var _a;
        this.included = true;
        (_a = this.init) === null || _a === void 0 ? void 0 : _a.include(context, includeChildrenRecursively);
        this.id.markDeclarationReached();
        if (includeChildrenRecursively || this.id.shouldBeIncluded(context)) {
            this.id.include(context, includeChildrenRecursively);
        }
    }
    render(code, options) {
        const { exportNamesByVariable, snippets: { _ } } = options;
        const renderId = this.id.included;
        if (renderId) {
            this.id.render(code, options);
        }
        else {
            const operatorPos = findFirstOccurrenceOutsideComment(code.original, '=', this.id.end);
            code.remove(this.start, findNonWhiteSpace(code.original, operatorPos + 1));
        }
        if (this.init) {
            this.init.render(code, options, renderId ? BLANK : { renderedSurroundingElement: ExpressionStatement$1 });
        }
        else if (this.id instanceof Identifier &&
            isReassignedExportsMember(this.id.variable, exportNamesByVariable)) {
            code.appendLeft(this.end, `${_}=${_}void 0`);
        }
    }
    applyDeoptimizations() { }
}

class WhileStatement extends NodeBase {
    hasEffects(context) {
        if (this.test.hasEffects(context))
            return true;
        const { brokenFlow, ignore: { breaks, continues } } = context;
        context.ignore.breaks = true;
        context.ignore.continues = true;
        if (this.body.hasEffects(context))
            return true;
        context.ignore.breaks = breaks;
        context.ignore.continues = continues;
        context.brokenFlow = brokenFlow;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.test.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        this.body.include(context, includeChildrenRecursively, { asSingleStatement: true });
        context.brokenFlow = brokenFlow;
    }
}

class YieldExpression extends NodeBase {
    hasEffects(context) {
        var _a;
        if (!this.deoptimized)
            this.applyDeoptimizations();
        return !(context.ignore.returnYield && !((_a = this.argument) === null || _a === void 0 ? void 0 : _a.hasEffects(context)));
    }
    render(code, options) {
        if (this.argument) {
            this.argument.render(code, options, { preventASI: true });
            if (this.argument.start === this.start + 5 /* 'yield'.length */) {
                code.prependLeft(this.start + 5, ' ');
            }
        }
    }
}

const nodeConstructors = {
    ArrayExpression,
    ArrayPattern,
    ArrowFunctionExpression,
    AssignmentExpression,
    AssignmentPattern,
    AwaitExpression,
    BinaryExpression,
    BlockStatement,
    BreakStatement,
    CallExpression,
    CatchClause,
    ChainExpression,
    ClassBody,
    ClassDeclaration,
    ClassExpression,
    ConditionalExpression,
    ContinueStatement,
    DoWhileStatement,
    EmptyStatement,
    ExportAllDeclaration,
    ExportDefaultDeclaration,
    ExportNamedDeclaration,
    ExportSpecifier,
    ExpressionStatement,
    ForInStatement,
    ForOfStatement,
    ForStatement,
    FunctionDeclaration,
    FunctionExpression,
    Identifier,
    IfStatement,
    ImportDeclaration,
    ImportDefaultSpecifier,
    ImportExpression,
    ImportNamespaceSpecifier,
    ImportSpecifier,
    LabeledStatement,
    Literal,
    LogicalExpression,
    MemberExpression,
    MetaProperty,
    MethodDefinition,
    NewExpression,
    ObjectExpression,
    ObjectPattern,
    PrivateIdentifier,
    Program,
    Property,
    PropertyDefinition,
    RestElement,
    ReturnStatement,
    SequenceExpression,
    SpreadElement,
    StaticBlock,
    Super,
    SwitchCase,
    SwitchStatement,
    TaggedTemplateExpression,
    TemplateElement,
    TemplateLiteral,
    ThisExpression,
    ThrowStatement,
    TryStatement,
    UnaryExpression,
    UnknownNode,
    UpdateExpression,
    VariableDeclaration,
    VariableDeclarator,
    WhileStatement,
    YieldExpression
};

const MISSING_EXPORT_SHIM_VARIABLE = '_missingExportShim';

class ExportShimVariable extends Variable {
    constructor(module) {
        super(MISSING_EXPORT_SHIM_VARIABLE);
        this.module = module;
    }
    include() {
        super.include();
        this.module.needsExportShim = true;
    }
}

class NamespaceVariable extends Variable {
    constructor(context) {
        super(context.getModuleName());
        this.memberVariables = null;
        this.mergedNamespaces = [];
        this.referencedEarly = false;
        this.references = [];
        this.context = context;
        this.module = context.module;
    }
    addReference(identifier) {
        this.references.push(identifier);
        this.name = identifier.name;
    }
    getMemberVariables() {
        if (this.memberVariables) {
            return this.memberVariables;
        }
        const memberVariables = Object.create(null);
        for (const name of this.context.getExports().concat(this.context.getReexports())) {
            if (name[0] !== '*' && name !== this.module.info.syntheticNamedExports) {
                const exportedVariable = this.context.traceExport(name);
                if (exportedVariable) {
                    memberVariables[name] = exportedVariable;
                }
            }
        }
        return (this.memberVariables = memberVariables);
    }
    include() {
        this.included = true;
        this.context.includeAllExports();
    }
    prepare(accessedGlobalsByScope) {
        if (this.mergedNamespaces.length > 0) {
            this.module.scope.addAccessedGlobals([MERGE_NAMESPACES_VARIABLE], accessedGlobalsByScope);
        }
    }
    renderBlock(options) {
        const { exportNamesByVariable, format, freeze, indent: t, namespaceToStringTag, snippets: { _, cnst, getObject, getPropertyAccess, n, s } } = options;
        const memberVariables = this.getMemberVariables();
        const members = Object.entries(memberVariables).map(([name, original]) => {
            if (this.referencedEarly || original.isReassigned) {
                return [
                    null,
                    `get ${name}${_}()${_}{${_}return ${original.getName(getPropertyAccess)}${s}${_}}`
                ];
            }
            return [name, original.getName(getPropertyAccess)];
        });
        members.unshift([null, `__proto__:${_}null`]);
        let output = getObject(members, { lineBreakIndent: { base: '', t } });
        if (this.mergedNamespaces.length > 0) {
            const assignmentArgs = this.mergedNamespaces.map(variable => variable.getName(getPropertyAccess));
            output = `/*#__PURE__*/${MERGE_NAMESPACES_VARIABLE}(${output},${_}[${assignmentArgs.join(`,${_}`)}])`;
        }
        else {
            // The helper to merge namespaces will also take care of freezing and toStringTag
            if (namespaceToStringTag) {
                output = `/*#__PURE__*/Object.defineProperty(${output},${_}Symbol.toStringTag,${_}${getToStringTagValue(getObject)})`;
            }
            if (freeze) {
                output = `/*#__PURE__*/Object.freeze(${output})`;
            }
        }
        const name = this.getName(getPropertyAccess);
        output = `${cnst} ${name}${_}=${_}${output};`;
        if (format === 'system' && exportNamesByVariable.has(this)) {
            output += `${n}${getSystemExportStatement([this], options)};`;
        }
        return output;
    }
    renderFirst() {
        return this.referencedEarly;
    }
    setMergedNamespaces(mergedNamespaces) {
        this.mergedNamespaces = mergedNamespaces;
        const moduleExecIndex = this.context.getModuleExecIndex();
        for (const identifier of this.references) {
            if (identifier.context.getModuleExecIndex() <= moduleExecIndex) {
                this.referencedEarly = true;
                break;
            }
        }
    }
}
NamespaceVariable.prototype.isNamespace = true;

class SyntheticNamedExportVariable extends Variable {
    constructor(context, name, syntheticNamespace) {
        super(name);
        this.baseVariable = null;
        this.context = context;
        this.module = context.module;
        this.syntheticNamespace = syntheticNamespace;
    }
    getBaseVariable() {
        if (this.baseVariable)
            return this.baseVariable;
        let baseVariable = this.syntheticNamespace;
        while (baseVariable instanceof ExportDefaultVariable ||
            baseVariable instanceof SyntheticNamedExportVariable) {
            if (baseVariable instanceof ExportDefaultVariable) {
                const original = baseVariable.getOriginalVariable();
                if (original === baseVariable)
                    break;
                baseVariable = original;
            }
            if (baseVariable instanceof SyntheticNamedExportVariable) {
                baseVariable = baseVariable.syntheticNamespace;
            }
        }
        return (this.baseVariable = baseVariable);
    }
    getBaseVariableName() {
        return this.syntheticNamespace.getBaseVariableName();
    }
    getName(getPropertyAccess) {
        return `${this.syntheticNamespace.getName(getPropertyAccess)}${getPropertyAccess(this.name)}`;
    }
    include() {
        this.included = true;
        this.context.includeVariableInModule(this.syntheticNamespace);
    }
    setRenderNames(baseName, name) {
        super.setRenderNames(baseName, name);
    }
}

var BuildPhase;
(function (BuildPhase) {
    BuildPhase[BuildPhase["LOAD_AND_PARSE"] = 0] = "LOAD_AND_PARSE";
    BuildPhase[BuildPhase["ANALYSE"] = 1] = "ANALYSE";
    BuildPhase[BuildPhase["GENERATE"] = 2] = "GENERATE";
})(BuildPhase || (BuildPhase = {}));

function getId(m) {
    return m.id;
}

function getOriginalLocation(sourcemapChain, location) {
    const filteredSourcemapChain = sourcemapChain.filter((sourcemap) => !!sourcemap.mappings);
    traceSourcemap: while (filteredSourcemapChain.length > 0) {
        const sourcemap = filteredSourcemapChain.pop();
        const line = sourcemap.mappings[location.line - 1];
        if (line) {
            const filteredLine = line.filter((segment) => segment.length > 1);
            const lastSegment = filteredLine[filteredLine.length - 1];
            for (const segment of filteredLine) {
                if (segment[0] >= location.column || segment === lastSegment) {
                    location = {
                        column: segment[3],
                        line: segment[2] + 1
                    };
                    continue traceSourcemap;
                }
            }
        }
        throw new Error("Can't resolve original location of error.");
    }
    return location;
}

const NOOP = () => { };
let timers = new Map();
function getPersistedLabel(label, level) {
    switch (level) {
        case 1:
            return `# ${label}`;
        case 2:
            return `## ${label}`;
        case 3:
            return label;
        default:
            return `${'  '.repeat(level - 4)}- ${label}`;
    }
}
function timeStartImpl(label, level = 3) {
    label = getPersistedLabel(label, level);
    const startMemory = process$1.memoryUsage().heapUsed;
    const startTime = performance.now();
    const timer = timers.get(label);
    if (timer === undefined) {
        timers.set(label, {
            memory: 0,
            startMemory,
            startTime,
            time: 0,
            totalMemory: 0
        });
    }
    else {
        timer.startMemory = startMemory;
        timer.startTime = startTime;
    }
}
function timeEndImpl(label, level = 3) {
    label = getPersistedLabel(label, level);
    const timer = timers.get(label);
    if (timer !== undefined) {
        const currentMemory = process$1.memoryUsage().heapUsed;
        timer.memory += currentMemory - timer.startMemory;
        timer.time += performance.now() - timer.startTime;
        timer.totalMemory = Math.max(timer.totalMemory, currentMemory);
    }
}
function getTimings() {
    const newTimings = {};
    for (const [label, { memory, time, totalMemory }] of timers) {
        newTimings[label] = [time, memory, totalMemory];
    }
    return newTimings;
}
let timeStart = NOOP;
let timeEnd = NOOP;
const TIMED_PLUGIN_HOOKS = ['load', 'resolveDynamicImport', 'resolveId', 'transform'];
function getPluginWithTimers(plugin, index) {
    for (const hook of TIMED_PLUGIN_HOOKS) {
        if (hook in plugin) {
            let timerLabel = `plugin ${index}`;
            if (plugin.name) {
                timerLabel += ` (${plugin.name})`;
            }
            timerLabel += ` - ${hook}`;
            const func = plugin[hook];
            plugin[hook] = function (...args) {
                timeStart(timerLabel, 4);
                const result = func.apply(this, args);
                timeEnd(timerLabel, 4);
                if (result && typeof result.then === 'function') {
                    timeStart(`${timerLabel} (async)`, 4);
                    return result.then((hookResult) => {
                        timeEnd(`${timerLabel} (async)`, 4);
                        return hookResult;
                    });
                }
                return result;
            };
        }
    }
    return plugin;
}
function initialiseTimers(inputOptions) {
    if (inputOptions.perf) {
        timers = new Map();
        timeStart = timeStartImpl;
        timeEnd = timeEndImpl;
        inputOptions.plugins = inputOptions.plugins.map(getPluginWithTimers);
    }
    else {
        timeStart = NOOP;
        timeEnd = NOOP;
    }
}

function markModuleAndImpureDependenciesAsExecuted(baseModule) {
    baseModule.isExecuted = true;
    const modules = [baseModule];
    const visitedModules = new Set();
    for (const module of modules) {
        for (const dependency of [...module.dependencies, ...module.implicitlyLoadedBefore]) {
            if (!(dependency instanceof ExternalModule) &&
                !dependency.isExecuted &&
                (dependency.info.moduleSideEffects || module.implicitlyLoadedBefore.has(dependency)) &&
                !visitedModules.has(dependency.id)) {
                dependency.isExecuted = true;
                visitedModules.add(dependency.id);
                modules.push(dependency);
            }
        }
    }
}

const MISSING_EXPORT_SHIM_DESCRIPTION = {
    identifier: null,
    localName: MISSING_EXPORT_SHIM_VARIABLE
};
function getVariableForExportNameRecursive(target, name, importerForSideEffects, isExportAllSearch, searchedNamesAndModules = new Map()) {
    const searchedModules = searchedNamesAndModules.get(name);
    if (searchedModules) {
        if (searchedModules.has(target)) {
            return isExportAllSearch ? [null] : error(errCircularReexport(name, target.id));
        }
        searchedModules.add(target);
    }
    else {
        searchedNamesAndModules.set(name, new Set([target]));
    }
    return target.getVariableForExportName(name, {
        importerForSideEffects,
        isExportAllSearch,
        searchedNamesAndModules
    });
}
function getAndExtendSideEffectModules(variable, module) {
    const sideEffectModules = getOrCreate(module.sideEffectDependenciesByVariable, variable, () => new Set());
    let currentVariable = variable;
    const referencedVariables = new Set([currentVariable]);
    while (true) {
        const importingModule = currentVariable.module;
        currentVariable =
            currentVariable instanceof ExportDefaultVariable
                ? currentVariable.getDirectOriginalVariable()
                : currentVariable instanceof SyntheticNamedExportVariable
                    ? currentVariable.syntheticNamespace
                    : null;
        if (!currentVariable || referencedVariables.has(currentVariable)) {
            break;
        }
        referencedVariables.add(currentVariable);
        sideEffectModules.add(importingModule);
        const originalSideEffects = importingModule.sideEffectDependenciesByVariable.get(currentVariable);
        if (originalSideEffects) {
            for (const module of originalSideEffects) {
                sideEffectModules.add(module);
            }
        }
    }
    return sideEffectModules;
}
class Module {
    constructor(graph, id, options, isEntry, moduleSideEffects, syntheticNamedExports, meta) {
        this.graph = graph;
        this.id = id;
        this.options = options;
        this.alternativeReexportModules = new Map();
        this.chunkFileNames = new Set();
        this.chunkNames = [];
        this.cycles = new Set();
        this.dependencies = new Set();
        this.dynamicDependencies = new Set();
        this.dynamicImporters = [];
        this.dynamicImports = [];
        this.execIndex = Infinity;
        this.implicitlyLoadedAfter = new Set();
        this.implicitlyLoadedBefore = new Set();
        this.importDescriptions = new Map();
        this.importMetas = [];
        this.importedFromNotTreeshaken = false;
        this.importers = [];
        this.includedDynamicImporters = [];
        this.includedImports = new Set();
        this.isExecuted = false;
        this.isUserDefinedEntryPoint = false;
        this.needsExportShim = false;
        this.sideEffectDependenciesByVariable = new Map();
        this.sources = new Set();
        this.usesTopLevelAwait = false;
        this.allExportNames = null;
        this.ast = null;
        this.exportAllModules = [];
        this.exportAllSources = new Set();
        this.exportNamesByVariable = null;
        this.exportShimVariable = new ExportShimVariable(this);
        this.exports = new Map();
        this.namespaceReexportsByName = new Map();
        this.reexportDescriptions = new Map();
        this.relevantDependencies = null;
        this.syntheticExports = new Map();
        this.syntheticNamespace = null;
        this.transformDependencies = [];
        this.transitiveReexports = null;
        this.excludeFromSourcemap = /\0/.test(id);
        this.context = options.moduleContext(id);
        this.preserveSignature = this.options.preserveEntrySignatures;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const module = this;
        const { dynamicImports, dynamicImporters, implicitlyLoadedAfter, implicitlyLoadedBefore, importers, reexportDescriptions, sources } = this;
        this.info = {
            ast: null,
            code: null,
            get dynamicallyImportedIdResolutions() {
                return dynamicImports
                    .map(({ argument }) => typeof argument === 'string' && module.resolvedIds[argument])
                    .filter(Boolean);
            },
            get dynamicallyImportedIds() {
                // We cannot use this.dynamicDependencies because this is needed before
                // dynamicDependencies are populated
                return dynamicImports.map(({ id }) => id).filter((id) => id != null);
            },
            get dynamicImporters() {
                return dynamicImporters.sort();
            },
            get hasDefaultExport() {
                // This information is only valid after parsing
                if (!module.ast) {
                    return null;
                }
                return module.exports.has('default') || reexportDescriptions.has('default');
            },
            get hasModuleSideEffects() {
                warnDeprecation('Accessing ModuleInfo.hasModuleSideEffects from plugins is deprecated. Please use ModuleInfo.moduleSideEffects instead.', false, options);
                return this.moduleSideEffects;
            },
            id,
            get implicitlyLoadedAfterOneOf() {
                return Array.from(implicitlyLoadedAfter, getId).sort();
            },
            get implicitlyLoadedBefore() {
                return Array.from(implicitlyLoadedBefore, getId).sort();
            },
            get importedIdResolutions() {
                return Array.from(sources, source => module.resolvedIds[source]).filter(Boolean);
            },
            get importedIds() {
                // We cannot use this.dependencies because this is needed before
                // dependencies are populated
                return Array.from(sources, source => { var _a; return (_a = module.resolvedIds[source]) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean);
            },
            get importers() {
                return importers.sort();
            },
            isEntry,
            isExternal: false,
            get isIncluded() {
                if (graph.phase !== BuildPhase.GENERATE) {
                    return null;
                }
                return module.isIncluded();
            },
            meta: { ...meta },
            moduleSideEffects,
            syntheticNamedExports
        };
        // Hide the deprecated key so that it only warns when accessed explicitly
        Object.defineProperty(this.info, 'hasModuleSideEffects', {
            enumerable: false
        });
    }
    basename() {
        const base = basename(this.id);
        const ext = extname(this.id);
        return makeLegal(ext ? base.slice(0, -ext.length) : base);
    }
    bindReferences() {
        this.ast.bind();
    }
    error(props, pos) {
        this.addLocationToLogProps(props, pos);
        return error(props);
    }
    getAllExportNames() {
        if (this.allExportNames) {
            return this.allExportNames;
        }
        this.allExportNames = new Set([...this.exports.keys(), ...this.reexportDescriptions.keys()]);
        for (const module of this.exportAllModules) {
            if (module instanceof ExternalModule) {
                this.allExportNames.add(`*${module.id}`);
                continue;
            }
            for (const name of module.getAllExportNames()) {
                if (name !== 'default')
                    this.allExportNames.add(name);
            }
        }
        // We do not count the synthetic namespace as a regular export to hide it
        // from entry signatures and namespace objects
        if (typeof this.info.syntheticNamedExports === 'string') {
            this.allExportNames.delete(this.info.syntheticNamedExports);
        }
        return this.allExportNames;
    }
    getDependenciesToBeIncluded() {
        if (this.relevantDependencies)
            return this.relevantDependencies;
        this.relevantDependencies = new Set();
        const necessaryDependencies = new Set();
        const alwaysCheckedDependencies = new Set();
        const dependencyVariables = new Set(this.includedImports);
        if (this.info.isEntry ||
            this.includedDynamicImporters.length > 0 ||
            this.namespace.included ||
            this.implicitlyLoadedAfter.size > 0) {
            for (const exportName of [...this.getReexports(), ...this.getExports()]) {
                const [exportedVariable] = this.getVariableForExportName(exportName);
                if (exportedVariable) {
                    dependencyVariables.add(exportedVariable);
                }
            }
        }
        for (let variable of dependencyVariables) {
            const sideEffectDependencies = this.sideEffectDependenciesByVariable.get(variable);
            if (sideEffectDependencies) {
                for (const module of sideEffectDependencies) {
                    alwaysCheckedDependencies.add(module);
                }
            }
            if (variable instanceof SyntheticNamedExportVariable) {
                variable = variable.getBaseVariable();
            }
            else if (variable instanceof ExportDefaultVariable) {
                variable = variable.getOriginalVariable();
            }
            necessaryDependencies.add(variable.module);
        }
        if (!this.options.treeshake || this.info.moduleSideEffects === 'no-treeshake') {
            for (const dependency of this.dependencies) {
                this.relevantDependencies.add(dependency);
            }
        }
        else {
            this.addRelevantSideEffectDependencies(this.relevantDependencies, necessaryDependencies, alwaysCheckedDependencies);
        }
        for (const dependency of necessaryDependencies) {
            this.relevantDependencies.add(dependency);
        }
        return this.relevantDependencies;
    }
    getExportNamesByVariable() {
        if (this.exportNamesByVariable) {
            return this.exportNamesByVariable;
        }
        const exportNamesByVariable = new Map();
        for (const exportName of this.getAllExportNames()) {
            let [tracedVariable] = this.getVariableForExportName(exportName);
            if (tracedVariable instanceof ExportDefaultVariable) {
                tracedVariable = tracedVariable.getOriginalVariable();
            }
            if (!tracedVariable ||
                !(tracedVariable.included || tracedVariable instanceof ExternalVariable)) {
                continue;
            }
            const existingExportNames = exportNamesByVariable.get(tracedVariable);
            if (existingExportNames) {
                existingExportNames.push(exportName);
            }
            else {
                exportNamesByVariable.set(tracedVariable, [exportName]);
            }
        }
        return (this.exportNamesByVariable = exportNamesByVariable);
    }
    getExports() {
        return Array.from(this.exports.keys());
    }
    getReexports() {
        if (this.transitiveReexports) {
            return this.transitiveReexports;
        }
        // to avoid infinite recursion when using circular `export * from X`
        this.transitiveReexports = [];
        const reexports = new Set(this.reexportDescriptions.keys());
        for (const module of this.exportAllModules) {
            if (module instanceof ExternalModule) {
                reexports.add(`*${module.id}`);
            }
            else {
                for (const name of [...module.getReexports(), ...module.getExports()]) {
                    if (name !== 'default')
                        reexports.add(name);
                }
            }
        }
        return (this.transitiveReexports = [...reexports]);
    }
    getRenderedExports() {
        // only direct exports are counted here, not reexports at all
        const renderedExports = [];
        const removedExports = [];
        for (const exportName of this.exports.keys()) {
            const [variable] = this.getVariableForExportName(exportName);
            (variable && variable.included ? renderedExports : removedExports).push(exportName);
        }
        return { removedExports, renderedExports };
    }
    getSyntheticNamespace() {
        if (this.syntheticNamespace === null) {
            this.syntheticNamespace = undefined;
            [this.syntheticNamespace] = this.getVariableForExportName(typeof this.info.syntheticNamedExports === 'string'
                ? this.info.syntheticNamedExports
                : 'default', { onlyExplicit: true });
        }
        if (!this.syntheticNamespace) {
            return error(errSyntheticNamedExportsNeedNamespaceExport(this.id, this.info.syntheticNamedExports));
        }
        return this.syntheticNamespace;
    }
    getVariableForExportName(name, { importerForSideEffects, isExportAllSearch, onlyExplicit, searchedNamesAndModules } = EMPTY_OBJECT) {
        var _a;
        if (name[0] === '*') {
            if (name.length === 1) {
                // export * from './other'
                return [this.namespace];
            }
            // export * from 'external'
            const module = this.graph.modulesById.get(name.slice(1));
            return module.getVariableForExportName('*');
        }
        // export { foo } from './other'
        const reexportDeclaration = this.reexportDescriptions.get(name);
        if (reexportDeclaration) {
            const [variable] = getVariableForExportNameRecursive(reexportDeclaration.module, reexportDeclaration.localName, importerForSideEffects, false, searchedNamesAndModules);
            if (!variable) {
                return this.error(errMissingExport(reexportDeclaration.localName, this.id, reexportDeclaration.module.id), reexportDeclaration.start);
            }
            if (importerForSideEffects) {
                setAlternativeExporterIfCyclic(variable, importerForSideEffects, this);
            }
            return [variable];
        }
        const exportDeclaration = this.exports.get(name);
        if (exportDeclaration) {
            if (exportDeclaration === MISSING_EXPORT_SHIM_DESCRIPTION) {
                return [this.exportShimVariable];
            }
            const name = exportDeclaration.localName;
            const variable = this.traceVariable(name, {
                importerForSideEffects,
                searchedNamesAndModules
            });
            if (importerForSideEffects) {
                getOrCreate(importerForSideEffects.sideEffectDependenciesByVariable, variable, () => new Set()).add(this);
                setAlternativeExporterIfCyclic(variable, importerForSideEffects, this);
            }
            return [variable];
        }
        if (onlyExplicit) {
            return [null];
        }
        if (name !== 'default') {
            const foundNamespaceReexport = (_a = this.namespaceReexportsByName.get(name)) !== null && _a !== void 0 ? _a : this.getVariableFromNamespaceReexports(name, importerForSideEffects, searchedNamesAndModules);
            this.namespaceReexportsByName.set(name, foundNamespaceReexport);
            if (foundNamespaceReexport[0]) {
                return foundNamespaceReexport;
            }
        }
        if (this.info.syntheticNamedExports) {
            return [
                getOrCreate(this.syntheticExports, name, () => new SyntheticNamedExportVariable(this.astContext, name, this.getSyntheticNamespace()))
            ];
        }
        // we don't want to create shims when we are just
        // probing export * modules for exports
        if (!isExportAllSearch) {
            if (this.options.shimMissingExports) {
                this.shimMissingExport(name);
                return [this.exportShimVariable];
            }
        }
        return [null];
    }
    hasEffects() {
        return (this.info.moduleSideEffects === 'no-treeshake' ||
            (this.ast.included && this.ast.hasEffects(createHasEffectsContext())));
    }
    include() {
        const context = createInclusionContext();
        if (this.ast.shouldBeIncluded(context))
            this.ast.include(context, false);
    }
    includeAllExports(includeNamespaceMembers) {
        if (!this.isExecuted) {
            markModuleAndImpureDependenciesAsExecuted(this);
            this.graph.needsTreeshakingPass = true;
        }
        for (const exportName of this.exports.keys()) {
            if (includeNamespaceMembers || exportName !== this.info.syntheticNamedExports) {
                const variable = this.getVariableForExportName(exportName)[0];
                variable.deoptimizePath(UNKNOWN_PATH);
                if (!variable.included) {
                    this.includeVariable(variable);
                }
            }
        }
        for (const name of this.getReexports()) {
            const [variable] = this.getVariableForExportName(name);
            if (variable) {
                variable.deoptimizePath(UNKNOWN_PATH);
                if (!variable.included) {
                    this.includeVariable(variable);
                }
                if (variable instanceof ExternalVariable) {
                    variable.module.reexported = true;
                }
            }
        }
        if (includeNamespaceMembers) {
            this.namespace.setMergedNamespaces(this.includeAndGetAdditionalMergedNamespaces());
        }
    }
    includeAllInBundle() {
        this.ast.include(createInclusionContext(), true);
        this.includeAllExports(false);
    }
    isIncluded() {
        return this.ast.included || this.namespace.included || this.importedFromNotTreeshaken;
    }
    linkImports() {
        this.addModulesToImportDescriptions(this.importDescriptions);
        this.addModulesToImportDescriptions(this.reexportDescriptions);
        const externalExportAllModules = [];
        for (const source of this.exportAllSources) {
            const module = this.graph.modulesById.get(this.resolvedIds[source].id);
            if (module instanceof ExternalModule) {
                externalExportAllModules.push(module);
                continue;
            }
            this.exportAllModules.push(module);
        }
        this.exportAllModules.push(...externalExportAllModules);
    }
    render(options) {
        const magicString = this.magicString.clone();
        this.ast.render(magicString, options);
        this.usesTopLevelAwait = this.astContext.usesTopLevelAwait;
        return magicString;
    }
    setSource({ ast, code, customTransformCache, originalCode, originalSourcemap, resolvedIds, sourcemapChain, transformDependencies, transformFiles, ...moduleOptions }) {
        this.info.code = code;
        this.originalCode = originalCode;
        this.originalSourcemap = originalSourcemap;
        this.sourcemapChain = sourcemapChain;
        if (transformFiles) {
            this.transformFiles = transformFiles;
        }
        this.transformDependencies = transformDependencies;
        this.customTransformCache = customTransformCache;
        this.updateOptions(moduleOptions);
        timeStart('generate ast', 3);
        if (!ast) {
            ast = this.tryParse();
        }
        timeEnd('generate ast', 3);
        this.resolvedIds = resolvedIds || Object.create(null);
        // By default, `id` is the file name. Custom resolvers and loaders
        // can change that, but it makes sense to use it for the source file name
        const fileName = this.id;
        this.magicString = new MagicString(code, {
            filename: (this.excludeFromSourcemap ? null : fileName),
            indentExclusionRanges: []
        });
        timeStart('analyse ast', 3);
        this.astContext = {
            addDynamicImport: this.addDynamicImport.bind(this),
            addExport: this.addExport.bind(this),
            addImport: this.addImport.bind(this),
            addImportMeta: this.addImportMeta.bind(this),
            code,
            deoptimizationTracker: this.graph.deoptimizationTracker,
            error: this.error.bind(this),
            fileName,
            getExports: this.getExports.bind(this),
            getModuleExecIndex: () => this.execIndex,
            getModuleName: this.basename.bind(this),
            getNodeConstructor: (name) => nodeConstructors[name] || nodeConstructors.UnknownNode,
            getReexports: this.getReexports.bind(this),
            importDescriptions: this.importDescriptions,
            includeAllExports: () => this.includeAllExports(true),
            includeDynamicImport: this.includeDynamicImport.bind(this),
            includeVariableInModule: this.includeVariableInModule.bind(this),
            magicString: this.magicString,
            module: this,
            moduleContext: this.context,
            options: this.options,
            requestTreeshakingPass: () => (this.graph.needsTreeshakingPass = true),
            traceExport: (name) => this.getVariableForExportName(name)[0],
            traceVariable: this.traceVariable.bind(this),
            usesTopLevelAwait: false,
            warn: this.warn.bind(this)
        };
        this.scope = new ModuleScope(this.graph.scope, this.astContext);
        this.namespace = new NamespaceVariable(this.astContext);
        this.ast = new Program(ast, { context: this.astContext, type: 'Module' }, this.scope);
        this.info.ast = ast;
        timeEnd('analyse ast', 3);
    }
    toJSON() {
        return {
            ast: this.ast.esTreeNode,
            code: this.info.code,
            customTransformCache: this.customTransformCache,
            dependencies: Array.from(this.dependencies, getId),
            id: this.id,
            meta: this.info.meta,
            moduleSideEffects: this.info.moduleSideEffects,
            originalCode: this.originalCode,
            originalSourcemap: this.originalSourcemap,
            resolvedIds: this.resolvedIds,
            sourcemapChain: this.sourcemapChain,
            syntheticNamedExports: this.info.syntheticNamedExports,
            transformDependencies: this.transformDependencies,
            transformFiles: this.transformFiles
        };
    }
    traceVariable(name, { importerForSideEffects, isExportAllSearch, searchedNamesAndModules } = EMPTY_OBJECT) {
        const localVariable = this.scope.variables.get(name);
        if (localVariable) {
            return localVariable;
        }
        const importDeclaration = this.importDescriptions.get(name);
        if (importDeclaration) {
            const otherModule = importDeclaration.module;
            if (otherModule instanceof Module && importDeclaration.name === '*') {
                return otherModule.namespace;
            }
            const [declaration] = getVariableForExportNameRecursive(otherModule, importDeclaration.name, importerForSideEffects || this, isExportAllSearch, searchedNamesAndModules);
            if (!declaration) {
                return this.error(errMissingExport(importDeclaration.name, this.id, otherModule.id), importDeclaration.start);
            }
            return declaration;
        }
        return null;
    }
    tryParse() {
        try {
            return this.graph.contextParse(this.info.code);
        }
        catch (err) {
            let message = err.message.replace(/ \(\d+:\d+\)$/, '');
            if (this.id.endsWith('.json')) {
                message += ' (Note that you need @rollup/plugin-json to import JSON files)';
            }
            else if (!this.id.endsWith('.js')) {
                message += ' (Note that you need plugins to import files that are not JavaScript)';
            }
            return this.error({
                code: 'PARSE_ERROR',
                message,
                parserError: err
            }, err.pos);
        }
    }
    updateOptions({ meta, moduleSideEffects, syntheticNamedExports }) {
        if (moduleSideEffects != null) {
            this.info.moduleSideEffects = moduleSideEffects;
        }
        if (syntheticNamedExports != null) {
            this.info.syntheticNamedExports = syntheticNamedExports;
        }
        if (meta != null) {
            Object.assign(this.info.meta, meta);
        }
    }
    warn(props, pos) {
        this.addLocationToLogProps(props, pos);
        this.options.onwarn(props);
    }
    addDynamicImport(node) {
        let argument = node.source;
        if (argument instanceof TemplateLiteral) {
            if (argument.quasis.length === 1 && argument.quasis[0].value.cooked) {
                argument = argument.quasis[0].value.cooked;
            }
        }
        else if (argument instanceof Literal && typeof argument.value === 'string') {
            argument = argument.value;
        }
        this.dynamicImports.push({ argument, id: null, node, resolution: null });
    }
    addExport(node) {
        if (node instanceof ExportDefaultDeclaration) {
            // export default foo;
            this.exports.set('default', {
                identifier: node.variable.getAssignedVariableName(),
                localName: 'default'
            });
        }
        else if (node instanceof ExportAllDeclaration) {
            const source = node.source.value;
            this.sources.add(source);
            if (node.exported) {
                // export * as name from './other'
                const name = node.exported.name;
                this.reexportDescriptions.set(name, {
                    localName: '*',
                    module: null,
                    source,
                    start: node.start
                });
            }
            else {
                // export * from './other'
                this.exportAllSources.add(source);
            }
        }
        else if (node.source instanceof Literal) {
            // export { name } from './other'
            const source = node.source.value;
            this.sources.add(source);
            for (const specifier of node.specifiers) {
                const name = specifier.exported.name;
                this.reexportDescriptions.set(name, {
                    localName: specifier.local.name,
                    module: null,
                    source,
                    start: specifier.start
                });
            }
        }
        else if (node.declaration) {
            const declaration = node.declaration;
            if (declaration instanceof VariableDeclaration) {
                // export var { foo, bar } = ...
                // export var foo = 1, bar = 2;
                for (const declarator of declaration.declarations) {
                    for (const localName of extractAssignedNames(declarator.id)) {
                        this.exports.set(localName, { identifier: null, localName });
                    }
                }
            }
            else {
                // export function foo () {}
                const localName = declaration.id.name;
                this.exports.set(localName, { identifier: null, localName });
            }
        }
        else {
            // export { foo, bar, baz }
            for (const specifier of node.specifiers) {
                const localName = specifier.local.name;
                const exportedName = specifier.exported.name;
                this.exports.set(exportedName, { identifier: null, localName });
            }
        }
    }
    addImport(node) {
        const source = node.source.value;
        this.sources.add(source);
        for (const specifier of node.specifiers) {
            const isDefault = specifier.type === ImportDefaultSpecifier$1;
            const isNamespace = specifier.type === ImportNamespaceSpecifier$1;
            const name = isDefault ? 'default' : isNamespace ? '*' : specifier.imported.name;
            this.importDescriptions.set(specifier.local.name, {
                module: null,
                name,
                source,
                start: specifier.start
            });
        }
    }
    addImportMeta(node) {
        this.importMetas.push(node);
    }
    addLocationToLogProps(props, pos) {
        props.id = this.id;
        props.pos = pos;
        let code = this.info.code;
        const location = locate(code, pos, { offsetLine: 1 });
        if (location) {
            let { column, line } = location;
            try {
                ({ column, line } = getOriginalLocation(this.sourcemapChain, { column, line }));
                code = this.originalCode;
            }
            catch (err) {
                this.options.onwarn({
                    code: 'SOURCEMAP_ERROR',
                    id: this.id,
                    loc: {
                        column,
                        file: this.id,
                        line
                    },
                    message: `Error when using sourcemap for reporting an error: ${err.message}`,
                    pos
                });
            }
            augmentCodeLocation(props, { column, line }, code, this.id);
        }
    }
    addModulesToImportDescriptions(importDescription) {
        for (const specifier of importDescription.values()) {
            const { id } = this.resolvedIds[specifier.source];
            specifier.module = this.graph.modulesById.get(id);
        }
    }
    addRelevantSideEffectDependencies(relevantDependencies, necessaryDependencies, alwaysCheckedDependencies) {
        const handledDependencies = new Set();
        const addSideEffectDependencies = (possibleDependencies) => {
            for (const dependency of possibleDependencies) {
                if (handledDependencies.has(dependency)) {
                    continue;
                }
                handledDependencies.add(dependency);
                if (necessaryDependencies.has(dependency)) {
                    relevantDependencies.add(dependency);
                    continue;
                }
                if (!(dependency.info.moduleSideEffects || alwaysCheckedDependencies.has(dependency))) {
                    continue;
                }
                if (dependency instanceof ExternalModule || dependency.hasEffects()) {
                    relevantDependencies.add(dependency);
                    continue;
                }
                addSideEffectDependencies(dependency.dependencies);
            }
        };
        addSideEffectDependencies(this.dependencies);
        addSideEffectDependencies(alwaysCheckedDependencies);
    }
    getVariableFromNamespaceReexports(name, importerForSideEffects, searchedNamesAndModules) {
        let foundSyntheticDeclaration = null;
        const foundInternalDeclarations = new Map();
        const foundExternalDeclarations = new Set();
        for (const module of this.exportAllModules) {
            // Synthetic namespaces should not hide "regular" exports of the same name
            if (module.info.syntheticNamedExports === name) {
                continue;
            }
            const [variable, indirectExternal] = getVariableForExportNameRecursive(module, name, importerForSideEffects, true, 
            // We are creating a copy to handle the case where the same binding is
            // imported through different namespace reexports gracefully
            copyNameToModulesMap(searchedNamesAndModules));
            if (module instanceof ExternalModule || indirectExternal) {
                foundExternalDeclarations.add(variable);
            }
            else if (variable instanceof SyntheticNamedExportVariable) {
                if (!foundSyntheticDeclaration) {
                    foundSyntheticDeclaration = variable;
                }
            }
            else if (variable) {
                foundInternalDeclarations.set(variable, module);
            }
        }
        if (foundInternalDeclarations.size > 0) {
            const foundDeclarationList = [...foundInternalDeclarations];
            const usedDeclaration = foundDeclarationList[0][0];
            if (foundDeclarationList.length === 1) {
                return [usedDeclaration];
            }
            this.options.onwarn(errNamespaceConflict(name, this.id, foundDeclarationList.map(([, module]) => module.id)));
            // TODO we are pretending it was not found while it should behave like "undefined"
            return [null];
        }
        if (foundExternalDeclarations.size > 0) {
            const foundDeclarationList = [...foundExternalDeclarations];
            const usedDeclaration = foundDeclarationList[0];
            if (foundDeclarationList.length > 1) {
                this.options.onwarn(errAmbiguousExternalNamespaces(name, this.id, usedDeclaration.module.id, foundDeclarationList.map(declaration => declaration.module.id)));
            }
            return [usedDeclaration, true];
        }
        if (foundSyntheticDeclaration) {
            return [foundSyntheticDeclaration];
        }
        return [null];
    }
    includeAndGetAdditionalMergedNamespaces() {
        const externalNamespaces = new Set();
        const syntheticNamespaces = new Set();
        for (const module of [this, ...this.exportAllModules]) {
            if (module instanceof ExternalModule) {
                const [externalVariable] = module.getVariableForExportName('*');
                externalVariable.include();
                this.includedImports.add(externalVariable);
                externalNamespaces.add(externalVariable);
            }
            else if (module.info.syntheticNamedExports) {
                const syntheticNamespace = module.getSyntheticNamespace();
                syntheticNamespace.include();
                this.includedImports.add(syntheticNamespace);
                syntheticNamespaces.add(syntheticNamespace);
            }
        }
        return [...syntheticNamespaces, ...externalNamespaces];
    }
    includeDynamicImport(node) {
        const resolution = this.dynamicImports.find(dynamicImport => dynamicImport.node === node).resolution;
        if (resolution instanceof Module) {
            resolution.includedDynamicImporters.push(this);
            resolution.includeAllExports(true);
        }
    }
    includeVariable(variable) {
        if (!variable.included) {
            variable.include();
            this.graph.needsTreeshakingPass = true;
            const variableModule = variable.module;
            if (variableModule instanceof Module) {
                if (!variableModule.isExecuted) {
                    markModuleAndImpureDependenciesAsExecuted(variableModule);
                }
                if (variableModule !== this) {
                    const sideEffectModules = getAndExtendSideEffectModules(variable, this);
                    for (const module of sideEffectModules) {
                        if (!module.isExecuted) {
                            markModuleAndImpureDependenciesAsExecuted(module);
                        }
                    }
                }
            }
        }
    }
    includeVariableInModule(variable) {
        this.includeVariable(variable);
        const variableModule = variable.module;
        if (variableModule && variableModule !== this) {
            this.includedImports.add(variable);
        }
    }
    shimMissingExport(name) {
        this.options.onwarn({
            code: 'SHIMMED_EXPORT',
            exporter: relativeId(this.id),
            exportName: name,
            message: `Missing export "${name}" has been shimmed in module ${relativeId(this.id)}.`
        });
        this.exports.set(name, MISSING_EXPORT_SHIM_DESCRIPTION);
    }
}
// if there is a cyclic import in the reexport chain, we should not
// import from the original module but from the cyclic module to not
// mess up execution order.
function setAlternativeExporterIfCyclic(variable, importer, reexporter) {
    if (variable.module instanceof Module && variable.module !== reexporter) {
        const exporterCycles = variable.module.cycles;
        if (exporterCycles.size > 0) {
            const importerCycles = reexporter.cycles;
            for (const cycleSymbol of importerCycles) {
                if (exporterCycles.has(cycleSymbol)) {
                    importer.alternativeReexportModules.set(variable, reexporter);
                    break;
                }
            }
        }
    }
}
const copyNameToModulesMap = (searchedNamesAndModules) => searchedNamesAndModules &&
    new Map(Array.from(searchedNamesAndModules, ([name, modules]) => [name, new Set(modules)]));

function removeJsExtension(name) {
    return name.endsWith('.js') ? name.slice(0, -3) : name;
}

function getCompleteAmdId(options, chunkId) {
    if (options.autoId) {
        return `${options.basePath ? options.basePath + '/' : ''}${removeJsExtension(chunkId)}`;
    }
    return options.id || '';
}

function getExportBlock$1(exports, dependencies, namedExportsMode, interop, snippets, t, externalLiveBindings, mechanism = 'return ') {
    const { _, cnst, getDirectReturnFunction, getFunctionIntro, getPropertyAccess, n, s } = snippets;
    if (!namedExportsMode) {
        return `${n}${n}${mechanism}${getSingleDefaultExport(exports, dependencies, interop, externalLiveBindings, getPropertyAccess)};`;
    }
    let exportBlock = '';
    for (const { defaultVariableName, id, isChunk, name, namedExportsMode: depNamedExportsMode, namespaceVariableName, reexports } of dependencies) {
        if (reexports && namedExportsMode) {
            for (const specifier of reexports) {
                if (specifier.reexported !== '*') {
                    const importName = getReexportedImportName(name, specifier.imported, depNamedExportsMode, isChunk, defaultVariableName, namespaceVariableName, interop, id, externalLiveBindings, getPropertyAccess);
                    if (exportBlock)
                        exportBlock += n;
                    if (specifier.imported !== '*' && specifier.needsLiveBinding) {
                        const [left, right] = getDirectReturnFunction([], {
                            functionReturn: true,
                            lineBreakIndent: null,
                            name: null
                        });
                        exportBlock +=
                            `Object.defineProperty(exports,${_}'${specifier.reexported}',${_}{${n}` +
                                `${t}enumerable:${_}true,${n}` +
                                `${t}get:${_}${left}${importName}${right}${n}});`;
                    }
                    else {
                        exportBlock += `exports${getPropertyAccess(specifier.reexported)}${_}=${_}${importName};`;
                    }
                }
            }
        }
    }
    for (const { exported, local } of exports) {
        const lhs = `exports${getPropertyAccess(exported)}`;
        const rhs = local;
        if (lhs !== rhs) {
            if (exportBlock)
                exportBlock += n;
            exportBlock += `${lhs}${_}=${_}${rhs};`;
        }
    }
    for (const { name, reexports } of dependencies) {
        if (reexports && namedExportsMode) {
            for (const specifier of reexports) {
                if (specifier.reexported === '*') {
                    if (exportBlock)
                        exportBlock += n;
                    const copyPropertyIfNecessary = `{${n}${t}if${_}(k${_}!==${_}'default'${_}&&${_}!exports.hasOwnProperty(k))${_}${getDefineProperty(name, specifier.needsLiveBinding, t, snippets)}${s}${n}}`;
                    exportBlock +=
                        cnst === 'var' && specifier.needsLiveBinding
                            ? `Object.keys(${name}).forEach(${getFunctionIntro(['k'], {
                                isAsync: false,
                                name: null
                            })}${copyPropertyIfNecessary});`
                            : `for${_}(${cnst} k in ${name})${_}${copyPropertyIfNecessary}`;
                }
            }
        }
    }
    if (exportBlock) {
        return `${n}${n}${exportBlock}`;
    }
    return '';
}
function getSingleDefaultExport(exports, dependencies, interop, externalLiveBindings, getPropertyAccess) {
    if (exports.length > 0) {
        return exports[0].local;
    }
    else {
        for (const { defaultVariableName, id, isChunk, name, namedExportsMode: depNamedExportsMode, namespaceVariableName, reexports } of dependencies) {
            if (reexports) {
                return getReexportedImportName(name, reexports[0].imported, depNamedExportsMode, isChunk, defaultVariableName, namespaceVariableName, interop, id, externalLiveBindings, getPropertyAccess);
            }
        }
    }
}
function getReexportedImportName(moduleVariableName, imported, depNamedExportsMode, isChunk, defaultVariableName, namespaceVariableName, interop, moduleId, externalLiveBindings, getPropertyAccess) {
    if (imported === 'default') {
        if (!isChunk) {
            const moduleInterop = String(interop(moduleId));
            const variableName = defaultInteropHelpersByInteropType[moduleInterop]
                ? defaultVariableName
                : moduleVariableName;
            return isDefaultAProperty(moduleInterop, externalLiveBindings)
                ? `${variableName}${getPropertyAccess('default')}`
                : variableName;
        }
        return depNamedExportsMode
            ? `${moduleVariableName}${getPropertyAccess('default')}`
            : moduleVariableName;
    }
    if (imported === '*') {
        return (isChunk
            ? !depNamedExportsMode
            : namespaceInteropHelpersByInteropType[String(interop(moduleId))])
            ? namespaceVariableName
            : moduleVariableName;
    }
    return `${moduleVariableName}${getPropertyAccess(imported)}`;
}
function getEsModuleValue(getObject) {
    return getObject([['value', 'true']], {
        lineBreakIndent: null
    });
}
function getNamespaceMarkers(hasNamedExports, addEsModule, addNamespaceToStringTag, { _, getObject }) {
    if (hasNamedExports) {
        if (addEsModule) {
            if (addNamespaceToStringTag) {
                return `Object.defineProperties(exports,${_}${getObject([
                    ['__esModule', getEsModuleValue(getObject)],
                    [null, `[Symbol.toStringTag]:${_}${getToStringTagValue(getObject)}`]
                ], {
                    lineBreakIndent: null
                })});`;
            }
            return `Object.defineProperty(exports,${_}'__esModule',${_}${getEsModuleValue(getObject)});`;
        }
        if (addNamespaceToStringTag) {
            return `Object.defineProperty(exports,${_}Symbol.toStringTag,${_}${getToStringTagValue(getObject)});`;
        }
    }
    return '';
}
const getDefineProperty = (name, needsLiveBinding, t, { _, getDirectReturnFunction, n }) => {
    if (needsLiveBinding) {
        const [left, right] = getDirectReturnFunction([], {
            functionReturn: true,
            lineBreakIndent: null,
            name: null
        });
        return (`Object.defineProperty(exports,${_}k,${_}{${n}` +
            `${t}${t}enumerable:${_}true,${n}` +
            `${t}${t}get:${_}${left}${name}[k]${right}${n}${t}})`);
    }
    return `exports[k]${_}=${_}${name}[k]`;
};

function getInteropBlock(dependencies, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, indent, snippets) {
    const { _, cnst, n } = snippets;
    const neededInteropHelpers = new Set();
    const interopStatements = [];
    const addInteropStatement = (helperVariableName, helper, dependencyVariableName) => {
        neededInteropHelpers.add(helper);
        interopStatements.push(`${cnst} ${helperVariableName}${_}=${_}/*#__PURE__*/${helper}(${dependencyVariableName});`);
    };
    for (const { defaultVariableName, imports, id, isChunk, name, namedExportsMode, namespaceVariableName, reexports } of dependencies) {
        if (isChunk) {
            for (const { imported, reexported } of [
                ...(imports || []),
                ...(reexports || [])
            ]) {
                if (imported === '*' && reexported !== '*') {
                    if (!namedExportsMode) {
                        addInteropStatement(namespaceVariableName, INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE, name);
                    }
                    break;
                }
            }
        }
        else {
            const moduleInterop = String(interop(id));
            let hasDefault = false;
            let hasNamespace = false;
            for (const { imported, reexported } of [
                ...(imports || []),
                ...(reexports || [])
            ]) {
                let helper;
                let variableName;
                if (imported === 'default') {
                    if (!hasDefault) {
                        hasDefault = true;
                        if (defaultVariableName !== namespaceVariableName) {
                            variableName = defaultVariableName;
                            helper = defaultInteropHelpersByInteropType[moduleInterop];
                        }
                    }
                }
                else if (imported === '*' && reexported !== '*') {
                    if (!hasNamespace) {
                        hasNamespace = true;
                        helper = namespaceInteropHelpersByInteropType[moduleInterop];
                        variableName = namespaceVariableName;
                    }
                }
                if (helper) {
                    addInteropStatement(variableName, helper, name);
                }
            }
        }
    }
    return `${getHelpersBlock(neededInteropHelpers, accessedGlobals, indent, snippets, externalLiveBindings, freeze, namespaceToStringTag)}${interopStatements.length > 0 ? `${interopStatements.join(n)}${n}${n}` : ''}`;
}

function addJsExtension(name) {
    return name.endsWith('.js') ? name : name + '.js';
}

// AMD resolution will only respect the AMD baseUrl if the .js extension is omitted.
// The assumption is that this makes sense for all relative ids:
// https://requirejs.org/docs/api.html#jsfiles
function updateExtensionForRelativeAmdId(id, forceJsExtensionForImports) {
    if (id[0] !== '.') {
        return id;
    }
    return forceJsExtensionForImports ? addJsExtension(id) : removeJsExtension(id);
}

const builtins = {
    assert: true,
    buffer: true,
    console: true,
    constants: true,
    domain: true,
    events: true,
    http: true,
    https: true,
    os: true,
    path: true,
    process: true,
    punycode: true,
    querystring: true,
    stream: true,
    string_decoder: true,
    timers: true,
    tty: true,
    url: true,
    util: true,
    vm: true,
    zlib: true
};
function warnOnBuiltins(warn, dependencies) {
    const externalBuiltins = dependencies.map(({ id }) => id).filter(id => id in builtins);
    if (!externalBuiltins.length)
        return;
    warn({
        code: 'MISSING_NODE_BUILTINS',
        message: `Creating a browser bundle that depends on Node.js built-in modules (${printQuotedStringList(externalBuiltins)}). You might need to include https://github.com/FredKSchott/rollup-plugin-polyfill-node`,
        modules: externalBuiltins
    });
}

function amd(magicString, { accessedGlobals, dependencies, exports, hasExports, id, indent: t, intro, isEntryFacade, isModuleFacade, namedExportsMode, outro, snippets, warn }, { amd, esModule, externalLiveBindings, freeze, interop, namespaceToStringTag, strict }) {
    warnOnBuiltins(warn, dependencies);
    const deps = dependencies.map(m => `'${updateExtensionForRelativeAmdId(m.id, amd.forceJsExtensionForImports)}'`);
    const args = dependencies.map(m => m.name);
    const { n, getNonArrowFunctionIntro, _ } = snippets;
    if (namedExportsMode && hasExports) {
        args.unshift(`exports`);
        deps.unshift(`'exports'`);
    }
    if (accessedGlobals.has('require')) {
        args.unshift('require');
        deps.unshift(`'require'`);
    }
    if (accessedGlobals.has('module')) {
        args.unshift('module');
        deps.unshift(`'module'`);
    }
    const completeAmdId = getCompleteAmdId(amd, id);
    const params = (completeAmdId ? `'${completeAmdId}',${_}` : ``) +
        (deps.length ? `[${deps.join(`,${_}`)}],${_}` : ``);
    const useStrict = strict ? `${_}'use strict';` : '';
    magicString.prepend(`${intro}${getInteropBlock(dependencies, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, t, snippets)}`);
    const exportBlock = getExportBlock$1(exports, dependencies, namedExportsMode, interop, snippets, t, externalLiveBindings);
    let namespaceMarkers = getNamespaceMarkers(namedExportsMode && hasExports, isEntryFacade && esModule, isModuleFacade && namespaceToStringTag, snippets);
    if (namespaceMarkers) {
        namespaceMarkers = n + n + namespaceMarkers;
    }
    magicString.append(`${exportBlock}${namespaceMarkers}${outro}`);
    return (magicString
        .indent(t)
        // factory function should be wrapped by parentheses to avoid lazy parsing,
        // cf. https://v8.dev/blog/preparser#pife
        .prepend(`${amd.define}(${params}(${getNonArrowFunctionIntro(args, {
        isAsync: false,
        name: null
    })}{${useStrict}${n}${n}`)
        .append(`${n}${n}}));`));
}

function cjs(magicString, { accessedGlobals, dependencies, exports, hasExports, indent: t, intro, isEntryFacade, isModuleFacade, namedExportsMode, outro, snippets }, { compact, esModule, externalLiveBindings, freeze, interop, namespaceToStringTag, strict }) {
    const { _, n } = snippets;
    const useStrict = strict ? `'use strict';${n}${n}` : '';
    let namespaceMarkers = getNamespaceMarkers(namedExportsMode && hasExports, isEntryFacade && esModule, isModuleFacade && namespaceToStringTag, snippets);
    if (namespaceMarkers) {
        namespaceMarkers += n + n;
    }
    const importBlock = getImportBlock$1(dependencies, snippets, compact);
    const interopBlock = getInteropBlock(dependencies, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, t, snippets);
    magicString.prepend(`${useStrict}${intro}${namespaceMarkers}${importBlock}${interopBlock}`);
    const exportBlock = getExportBlock$1(exports, dependencies, namedExportsMode, interop, snippets, t, externalLiveBindings, `module.exports${_}=${_}`);
    return magicString.append(`${exportBlock}${outro}`);
}
function getImportBlock$1(dependencies, { _, cnst, n }, compact) {
    let importBlock = '';
    let definingVariable = false;
    for (const { id, name, reexports, imports } of dependencies) {
        if (!reexports && !imports) {
            if (importBlock) {
                importBlock += compact && !definingVariable ? ',' : `;${n}`;
            }
            definingVariable = false;
            importBlock += `require('${id}')`;
        }
        else {
            importBlock += compact && definingVariable ? ',' : `${importBlock ? `;${n}` : ''}${cnst} `;
            definingVariable = true;
            importBlock += `${name}${_}=${_}require('${id}')`;
        }
    }
    if (importBlock) {
        return `${importBlock};${n}${n}`;
    }
    return '';
}

function es(magicString, { accessedGlobals, indent: t, intro, outro, dependencies, exports, snippets }, { externalLiveBindings, freeze, namespaceToStringTag }) {
    const { _, n } = snippets;
    const importBlock = getImportBlock(dependencies, _);
    if (importBlock.length > 0)
        intro += importBlock.join(n) + n + n;
    intro += getHelpersBlock(null, accessedGlobals, t, snippets, externalLiveBindings, freeze, namespaceToStringTag);
    if (intro)
        magicString.prepend(intro);
    const exportBlock = getExportBlock(exports, snippets);
    if (exportBlock.length)
        magicString.append(n + n + exportBlock.join(n).trim());
    if (outro)
        magicString.append(outro);
    return magicString.trim();
}
function getImportBlock(dependencies, _) {
    const importBlock = [];
    for (const { id, reexports, imports, name } of dependencies) {
        if (!reexports && !imports) {
            importBlock.push(`import${_}'${id}';`);
            continue;
        }
        if (imports) {
            let defaultImport = null;
            let starImport = null;
            const importedNames = [];
            for (const specifier of imports) {
                if (specifier.imported === 'default') {
                    defaultImport = specifier;
                }
                else if (specifier.imported === '*') {
                    starImport = specifier;
                }
                else {
                    importedNames.push(specifier);
                }
            }
            if (starImport) {
                importBlock.push(`import${_}*${_}as ${starImport.local} from${_}'${id}';`);
            }
            if (defaultImport && importedNames.length === 0) {
                importBlock.push(`import ${defaultImport.local} from${_}'${id}';`);
            }
            else if (importedNames.length > 0) {
                importBlock.push(`import ${defaultImport ? `${defaultImport.local},${_}` : ''}{${_}${importedNames
                    .map(specifier => {
                    if (specifier.imported === specifier.local) {
                        return specifier.imported;
                    }
                    else {
                        return `${specifier.imported} as ${specifier.local}`;
                    }
                })
                    .join(`,${_}`)}${_}}${_}from${_}'${id}';`);
            }
        }
        if (reexports) {
            let starExport = null;
            const namespaceReexports = [];
            const namedReexports = [];
            for (const specifier of reexports) {
                if (specifier.reexported === '*') {
                    starExport = specifier;
                }
                else if (specifier.imported === '*') {
                    namespaceReexports.push(specifier);
                }
                else {
                    namedReexports.push(specifier);
                }
            }
            if (starExport) {
                importBlock.push(`export${_}*${_}from${_}'${id}';`);
            }
            if (namespaceReexports.length > 0) {
                if (!imports ||
                    !imports.some(specifier => specifier.imported === '*' && specifier.local === name)) {
                    importBlock.push(`import${_}*${_}as ${name} from${_}'${id}';`);
                }
                for (const specifier of namespaceReexports) {
                    importBlock.push(`export${_}{${_}${name === specifier.reexported ? name : `${name} as ${specifier.reexported}`} };`);
                }
            }
            if (namedReexports.length > 0) {
                importBlock.push(`export${_}{${_}${namedReexports
                    .map(specifier => {
                    if (specifier.imported === specifier.reexported) {
                        return specifier.imported;
                    }
                    else {
                        return `${specifier.imported} as ${specifier.reexported}`;
                    }
                })
                    .join(`,${_}`)}${_}}${_}from${_}'${id}';`);
            }
        }
    }
    return importBlock;
}
function getExportBlock(exports, { _, cnst }) {
    const exportBlock = [];
    const exportDeclaration = [];
    for (const specifier of exports) {
        if (specifier.expression) {
            exportBlock.push(`${cnst} ${specifier.local}${_}=${_}${specifier.expression};`);
        }
        exportDeclaration.push(specifier.exported === specifier.local
            ? specifier.local
            : `${specifier.local} as ${specifier.exported}`);
    }
    if (exportDeclaration.length) {
        exportBlock.push(`export${_}{${_}${exportDeclaration.join(`,${_}`)}${_}};`);
    }
    return exportBlock;
}

const keypath = (keypath, getPropertyAccess) => keypath.split('.').map(getPropertyAccess).join('');

function setupNamespace(name, root, globals, { _, getPropertyAccess, s }, compact) {
    const parts = name.split('.');
    parts[0] = (typeof globals === 'function' ? globals(parts[0]) : globals[parts[0]]) || parts[0];
    parts.pop();
    let propertyPath = root;
    return (parts
        .map(part => {
        propertyPath += getPropertyAccess(part);
        return `${propertyPath}${_}=${_}${propertyPath}${_}||${_}{}${s}`;
    })
        .join(compact ? ',' : '\n') + (compact && parts.length ? ';' : '\n'));
}
function assignToDeepVariable(deepName, root, globals, assignment, { _, getPropertyAccess }) {
    const parts = deepName.split('.');
    parts[0] = (typeof globals === 'function' ? globals(parts[0]) : globals[parts[0]]) || parts[0];
    const last = parts.pop();
    let propertyPath = root;
    let deepAssignment = parts
        .map(part => {
        propertyPath += getPropertyAccess(part);
        return `${propertyPath}${_}=${_}${propertyPath}${_}||${_}{}`;
    })
        .concat(`${propertyPath}${getPropertyAccess(last)}`)
        .join(`,${_}`) + `${_}=${_}${assignment}`;
    if (parts.length > 0) {
        deepAssignment = `(${deepAssignment})`;
    }
    return deepAssignment;
}

function trimEmptyImports(dependencies) {
    let i = dependencies.length;
    while (i--) {
        const { imports, reexports } = dependencies[i];
        if (imports || reexports) {
            return dependencies.slice(0, i + 1);
        }
    }
    return [];
}

function iife(magicString, { accessedGlobals, dependencies, exports, hasExports, indent: t, intro, namedExportsMode, outro, snippets, warn }, { compact, esModule, extend, freeze, externalLiveBindings, globals, interop, name, namespaceToStringTag, strict }) {
    const { _, getNonArrowFunctionIntro, getPropertyAccess, n } = snippets;
    const isNamespaced = name && name.includes('.');
    const useVariableAssignment = !extend && !isNamespaced;
    if (name && useVariableAssignment && !isLegal(name)) {
        return error({
            code: 'ILLEGAL_IDENTIFIER_AS_NAME',
            message: `Given name "${name}" is not a legal JS identifier. If you need this, you can try "output.extend: true".`
        });
    }
    warnOnBuiltins(warn, dependencies);
    const external = trimEmptyImports(dependencies);
    const deps = external.map(dep => dep.globalName || 'null');
    const args = external.map(m => m.name);
    if (hasExports && !name) {
        warn({
            code: 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT',
            message: `If you do not supply "output.name", you may not be able to access the exports of an IIFE bundle.`
        });
    }
    if (namedExportsMode && hasExports) {
        if (extend) {
            deps.unshift(`this${keypath(name, getPropertyAccess)}${_}=${_}this${keypath(name, getPropertyAccess)}${_}||${_}{}`);
            args.unshift('exports');
        }
        else {
            deps.unshift('{}');
            args.unshift('exports');
        }
    }
    const useStrict = strict ? `${t}'use strict';${n}` : '';
    const interopBlock = getInteropBlock(dependencies, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, t, snippets);
    magicString.prepend(`${intro}${interopBlock}`);
    let wrapperIntro = `(${getNonArrowFunctionIntro(args, {
        isAsync: false,
        name: null
    })}{${n}${useStrict}${n}`;
    if (hasExports) {
        if (name && !(extend && namedExportsMode)) {
            wrapperIntro =
                (useVariableAssignment ? `var ${name}` : `this${keypath(name, getPropertyAccess)}`) +
                    `${_}=${_}${wrapperIntro}`;
        }
        if (isNamespaced) {
            wrapperIntro = setupNamespace(name, 'this', globals, snippets, compact) + wrapperIntro;
        }
    }
    let wrapperOutro = `${n}${n}})(${deps.join(`,${_}`)});`;
    if (hasExports && !extend && namedExportsMode) {
        wrapperOutro = `${n}${n}${t}return exports;${wrapperOutro}`;
    }
    const exportBlock = getExportBlock$1(exports, dependencies, namedExportsMode, interop, snippets, t, externalLiveBindings);
    let namespaceMarkers = getNamespaceMarkers(namedExportsMode && hasExports, esModule, namespaceToStringTag, snippets);
    if (namespaceMarkers) {
        namespaceMarkers = n + n + namespaceMarkers;
    }
    magicString.append(`${exportBlock}${namespaceMarkers}${outro}`);
    return magicString.indent(t).prepend(wrapperIntro).append(wrapperOutro);
}

function system(magicString, { accessedGlobals, dependencies, exports, hasExports, indent: t, intro, snippets, outro, usesTopLevelAwait }, { externalLiveBindings, freeze, name, namespaceToStringTag, strict, systemNullSetters }) {
    const { _, getFunctionIntro, getNonArrowFunctionIntro, n, s } = snippets;
    const { importBindings, setters, starExcludes } = analyzeDependencies(dependencies, exports, t, snippets);
    const registeredName = name ? `'${name}',${_}` : '';
    const wrapperParams = accessedGlobals.has('module')
        ? ['exports', 'module']
        : hasExports
            ? ['exports']
            : [];
    // factory function should be wrapped by parentheses to avoid lazy parsing,
    // cf. https://v8.dev/blog/preparser#pife
    let wrapperStart = `System.register(${registeredName}[` +
        dependencies.map(({ id }) => `'${id}'`).join(`,${_}`) +
        `],${_}(${getNonArrowFunctionIntro(wrapperParams, { isAsync: false, name: null })}{${n}${t}${strict ? "'use strict';" : ''}` +
        getStarExcludesBlock(starExcludes, t, snippets) +
        getImportBindingsBlock(importBindings, t, snippets) +
        `${n}${t}return${_}{${setters.length
            ? `${n}${t}${t}setters:${_}[${setters
                .map(setter => setter
                ? `${getFunctionIntro(['module'], {
                    isAsync: false,
                    name: null
                })}{${n}${t}${t}${t}${setter}${n}${t}${t}}`
                : systemNullSetters
                    ? `null`
                    : `${getFunctionIntro([], { isAsync: false, name: null })}{}`)
                .join(`,${_}`)}],`
            : ''}${n}`;
    wrapperStart += `${t}${t}execute:${_}(${getNonArrowFunctionIntro([], {
        isAsync: usesTopLevelAwait,
        name: null
    })}{${n}${n}`;
    const wrapperEnd = `${t}${t}})${n}${t}}${s}${n}}));`;
    magicString.prepend(intro +
        getHelpersBlock(null, accessedGlobals, t, snippets, externalLiveBindings, freeze, namespaceToStringTag) +
        getHoistedExportsBlock(exports, t, snippets));
    magicString.append(`${outro}${n}${n}` +
        getSyntheticExportsBlock(exports, t, snippets) +
        getMissingExportsBlock(exports, t, snippets));
    return magicString.indent(`${t}${t}${t}`).append(wrapperEnd).prepend(wrapperStart);
}
function analyzeDependencies(dependencies, exports, t, { _, cnst, getObject, getPropertyAccess, n }) {
    const importBindings = [];
    const setters = [];
    let starExcludes = null;
    for (const { imports, reexports } of dependencies) {
        const setter = [];
        if (imports) {
            for (const specifier of imports) {
                importBindings.push(specifier.local);
                if (specifier.imported === '*') {
                    setter.push(`${specifier.local}${_}=${_}module;`);
                }
                else {
                    setter.push(`${specifier.local}${_}=${_}module${getPropertyAccess(specifier.imported)};`);
                }
            }
        }
        if (reexports) {
            const reexportedNames = [];
            let hasStarReexport = false;
            for (const { imported, reexported } of reexports) {
                if (reexported === '*') {
                    hasStarReexport = true;
                }
                else {
                    reexportedNames.push([
                        reexported,
                        imported === '*' ? 'module' : `module${getPropertyAccess(imported)}`
                    ]);
                }
            }
            if (reexportedNames.length > 1 || hasStarReexport) {
                const exportMapping = getObject(reexportedNames, { lineBreakIndent: null });
                if (hasStarReexport) {
                    if (!starExcludes) {
                        starExcludes = getStarExcludes({ dependencies, exports });
                    }
                    setter.push(`${cnst} setter${_}=${_}${exportMapping};`, `for${_}(${cnst} name in module)${_}{`, `${t}if${_}(!_starExcludes[name])${_}setter[name]${_}=${_}module[name];`, '}', 'exports(setter);');
                }
                else {
                    setter.push(`exports(${exportMapping});`);
                }
            }
            else {
                const [key, value] = reexportedNames[0];
                setter.push(`exports('${key}',${_}${value});`);
            }
        }
        setters.push(setter.join(`${n}${t}${t}${t}`));
    }
    return { importBindings, setters, starExcludes };
}
const getStarExcludes = ({ dependencies, exports }) => {
    const starExcludes = new Set(exports.map(expt => expt.exported));
    starExcludes.add('default');
    for (const { reexports } of dependencies) {
        if (reexports) {
            for (const reexport of reexports) {
                if (reexport.reexported !== '*')
                    starExcludes.add(reexport.reexported);
            }
        }
    }
    return starExcludes;
};
const getStarExcludesBlock = (starExcludes, t, { _, cnst, getObject, n }) => starExcludes
    ? `${n}${t}${cnst} _starExcludes${_}=${_}${getObject([...starExcludes].map(prop => [prop, '1']), { lineBreakIndent: { base: t, t } })};`
    : '';
const getImportBindingsBlock = (importBindings, t, { _, n }) => (importBindings.length ? `${n}${t}var ${importBindings.join(`,${_}`)};` : '');
const getHoistedExportsBlock = (exports, t, snippets) => getExportsBlock(exports.filter(expt => expt.hoisted).map(expt => ({ name: expt.exported, value: expt.local })), t, snippets);
function getExportsBlock(exports, t, { _, n }) {
    if (exports.length === 0) {
        return '';
    }
    if (exports.length === 1) {
        return `exports('${exports[0].name}',${_}${exports[0].value});${n}${n}`;
    }
    return (`exports({${n}` +
        exports.map(({ name, value }) => `${t}${name}:${_}${value}`).join(`,${n}`) +
        `${n}});${n}${n}`);
}
const getSyntheticExportsBlock = (exports, t, snippets) => getExportsBlock(exports
    .filter(expt => expt.expression)
    .map(expt => ({ name: expt.exported, value: expt.local })), t, snippets);
const getMissingExportsBlock = (exports, t, snippets) => getExportsBlock(exports
    .filter(expt => expt.local === MISSING_EXPORT_SHIM_VARIABLE)
    .map(expt => ({ name: expt.exported, value: MISSING_EXPORT_SHIM_VARIABLE })), t, snippets);

function globalProp(name, globalVar, getPropertyAccess) {
    if (!name)
        return 'null';
    return `${globalVar}${keypath(name, getPropertyAccess)}`;
}
function safeAccess(name, globalVar, { _, getPropertyAccess }) {
    let propertyPath = globalVar;
    return name
        .split('.')
        .map(part => (propertyPath += getPropertyAccess(part)))
        .join(`${_}&&${_}`);
}
function umd(magicString, { accessedGlobals, dependencies, exports, hasExports, id, indent: t, intro, namedExportsMode, outro, snippets, warn }, { amd, compact, esModule, extend, externalLiveBindings, freeze, interop, name, namespaceToStringTag, globals, noConflict, strict }) {
    const { _, cnst, getFunctionIntro, getNonArrowFunctionIntro, getPropertyAccess, n, s } = snippets;
    const factoryVar = compact ? 'f' : 'factory';
    const globalVar = compact ? 'g' : 'global';
    if (hasExports && !name) {
        return error({
            code: 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT',
            message: 'You must supply "output.name" for UMD bundles that have exports so that the exports are accessible in environments without a module loader.'
        });
    }
    warnOnBuiltins(warn, dependencies);
    const amdDeps = dependencies.map(m => `'${updateExtensionForRelativeAmdId(m.id, amd.forceJsExtensionForImports)}'`);
    const cjsDeps = dependencies.map(m => `require('${m.id}')`);
    const trimmedImports = trimEmptyImports(dependencies);
    const globalDeps = trimmedImports.map(module => globalProp(module.globalName, globalVar, getPropertyAccess));
    const factoryParams = trimmedImports.map(m => m.name);
    if (namedExportsMode && (hasExports || noConflict)) {
        amdDeps.unshift(`'exports'`);
        cjsDeps.unshift(`exports`);
        globalDeps.unshift(assignToDeepVariable(name, globalVar, globals, `${extend ? `${globalProp(name, globalVar, getPropertyAccess)}${_}||${_}` : ''}{}`, snippets));
        factoryParams.unshift('exports');
    }
    const completeAmdId = getCompleteAmdId(amd, id);
    const amdParams = (completeAmdId ? `'${completeAmdId}',${_}` : ``) +
        (amdDeps.length ? `[${amdDeps.join(`,${_}`)}],${_}` : ``);
    const define = amd.define;
    const cjsExport = !namedExportsMode && hasExports ? `module.exports${_}=${_}` : ``;
    const useStrict = strict ? `${_}'use strict';${n}` : ``;
    let iifeExport;
    if (noConflict) {
        const noConflictExportsVar = compact ? 'e' : 'exports';
        let factory;
        if (!namedExportsMode && hasExports) {
            factory = `${cnst} ${noConflictExportsVar}${_}=${_}${assignToDeepVariable(name, globalVar, globals, `${factoryVar}(${globalDeps.join(`,${_}`)})`, snippets)};`;
        }
        else {
            const module = globalDeps.shift();
            factory =
                `${cnst} ${noConflictExportsVar}${_}=${_}${module};${n}` +
                    `${t}${t}${factoryVar}(${[noConflictExportsVar].concat(globalDeps).join(`,${_}`)});`;
        }
        iifeExport =
            `(${getFunctionIntro([], { isAsync: false, name: null })}{${n}` +
                `${t}${t}${cnst} current${_}=${_}${safeAccess(name, globalVar, snippets)};${n}` +
                `${t}${t}${factory}${n}` +
                `${t}${t}${noConflictExportsVar}.noConflict${_}=${_}${getFunctionIntro([], {
                    isAsync: false,
                    name: null
                })}{${_}` +
                `${globalProp(name, globalVar, getPropertyAccess)}${_}=${_}current;${_}return ${noConflictExportsVar}${s}${_}};${n}` +
                `${t}})()`;
    }
    else {
        iifeExport = `${factoryVar}(${globalDeps.join(`,${_}`)})`;
        if (!namedExportsMode && hasExports) {
            iifeExport = assignToDeepVariable(name, globalVar, globals, iifeExport, snippets);
        }
    }
    const iifeNeedsGlobal = hasExports || (noConflict && namedExportsMode) || globalDeps.length > 0;
    const wrapperParams = [factoryVar];
    if (iifeNeedsGlobal) {
        wrapperParams.unshift(globalVar);
    }
    const globalArg = iifeNeedsGlobal ? `this,${_}` : '';
    const iifeStart = iifeNeedsGlobal
        ? `(${globalVar}${_}=${_}typeof globalThis${_}!==${_}'undefined'${_}?${_}globalThis${_}:${_}${globalVar}${_}||${_}self,${_}`
        : '';
    const iifeEnd = iifeNeedsGlobal ? ')' : '';
    const cjsIntro = iifeNeedsGlobal
        ? `${t}typeof exports${_}===${_}'object'${_}&&${_}typeof module${_}!==${_}'undefined'${_}?` +
            `${_}${cjsExport}${factoryVar}(${cjsDeps.join(`,${_}`)})${_}:${n}`
        : '';
    const wrapperIntro = `(${getNonArrowFunctionIntro(wrapperParams, { isAsync: false, name: null })}{${n}` +
        cjsIntro +
        `${t}typeof ${define}${_}===${_}'function'${_}&&${_}${define}.amd${_}?${_}${define}(${amdParams}${factoryVar})${_}:${n}` +
        `${t}${iifeStart}${iifeExport}${iifeEnd};${n}` +
        // factory function should be wrapped by parentheses to avoid lazy parsing,
        // cf. https://v8.dev/blog/preparser#pife
        `})(${globalArg}(${getNonArrowFunctionIntro(factoryParams, {
            isAsync: false,
            name: null
        })}{${useStrict}${n}`;
    const wrapperOutro = n + n + '}));';
    magicString.prepend(`${intro}${getInteropBlock(dependencies, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, t, snippets)}`);
    const exportBlock = getExportBlock$1(exports, dependencies, namedExportsMode, interop, snippets, t, externalLiveBindings);
    let namespaceMarkers = getNamespaceMarkers(namedExportsMode && hasExports, esModule, namespaceToStringTag, snippets);
    if (namespaceMarkers) {
        namespaceMarkers = n + n + namespaceMarkers;
    }
    magicString.append(`${exportBlock}${namespaceMarkers}${outro}`);
    return magicString.trim().indent(t).append(wrapperOutro).prepend(wrapperIntro);
}

const finalisers = { amd, cjs, es, iife, system, umd };

class Source {
    constructor(filename, content) {
        this.isOriginal = true;
        this.filename = filename;
        this.content = content;
    }
    traceSegment(line, column, name) {
        return { column, line, name, source: this };
    }
}
class Link {
    constructor(map, sources) {
        this.sources = sources;
        this.names = map.names;
        this.mappings = map.mappings;
    }
    traceMappings() {
        const sources = [];
        const sourceIndexMap = new Map();
        const sourcesContent = [];
        const names = [];
        const nameIndexMap = new Map();
        const mappings = [];
        for (const line of this.mappings) {
            const tracedLine = [];
            for (const segment of line) {
                if (segment.length === 1)
                    continue;
                const source = this.sources[segment[1]];
                if (!source)
                    continue;
                const traced = source.traceSegment(segment[2], segment[3], segment.length === 5 ? this.names[segment[4]] : '');
                if (traced) {
                    const { column, line, name, source: { content, filename } } = traced;
                    let sourceIndex = sourceIndexMap.get(filename);
                    if (sourceIndex === undefined) {
                        sourceIndex = sources.length;
                        sources.push(filename);
                        sourceIndexMap.set(filename, sourceIndex);
                        sourcesContent[sourceIndex] = content;
                    }
                    else if (sourcesContent[sourceIndex] == null) {
                        sourcesContent[sourceIndex] = content;
                    }
                    else if (content != null && sourcesContent[sourceIndex] !== content) {
                        return error({
                            message: `Multiple conflicting contents for sourcemap source ${filename}`
                        });
                    }
                    const tracedSegment = [segment[0], sourceIndex, line, column];
                    if (name) {
                        let nameIndex = nameIndexMap.get(name);
                        if (nameIndex === undefined) {
                            nameIndex = names.length;
                            names.push(name);
                            nameIndexMap.set(name, nameIndex);
                        }
                        tracedSegment[4] = nameIndex;
                    }
                    tracedLine.push(tracedSegment);
                }
            }
            mappings.push(tracedLine);
        }
        return { mappings, names, sources, sourcesContent };
    }
    traceSegment(line, column, name) {
        const segments = this.mappings[line];
        if (!segments)
            return null;
        // binary search through segments for the given column
        let searchStart = 0;
        let searchEnd = segments.length - 1;
        while (searchStart <= searchEnd) {
            const m = (searchStart + searchEnd) >> 1;
            const segment = segments[m];
            // If a sourcemap does not have sufficient resolution to contain a
            // necessary mapping, e.g. because it only contains line information, we
            // use the best approximation we could find
            if (segment[0] === column || searchStart === searchEnd) {
                if (segment.length == 1)
                    return null;
                const source = this.sources[segment[1]];
                if (!source)
                    return null;
                return source.traceSegment(segment[2], segment[3], segment.length === 5 ? this.names[segment[4]] : name);
            }
            if (segment[0] > column) {
                searchEnd = m - 1;
            }
            else {
                searchStart = m + 1;
            }
        }
        return null;
    }
}
function getLinkMap(warn) {
    return function linkMap(source, map) {
        if (map.mappings) {
            return new Link(map, [source]);
        }
        warn({
            code: 'SOURCEMAP_BROKEN',
            message: `Sourcemap is likely to be incorrect: a plugin (${map.plugin}) was used to transform ` +
                "files, but didn't generate a sourcemap for the transformation. Consult the plugin " +
                'documentation for help',
            plugin: map.plugin,
            url: `https://rollupjs.org/guide/en/#warning-sourcemap-is-likely-to-be-incorrect`
        });
        return new Link({
            mappings: [],
            names: []
        }, [source]);
    };
}
function getCollapsedSourcemap(id, originalCode, originalSourcemap, sourcemapChain, linkMap) {
    let source;
    if (!originalSourcemap) {
        source = new Source(id, originalCode);
    }
    else {
        const sources = originalSourcemap.sources;
        const sourcesContent = originalSourcemap.sourcesContent || [];
        const directory = dirname(id) || '.';
        const sourceRoot = originalSourcemap.sourceRoot || '.';
        const baseSources = sources.map((source, i) => new Source(resolve(directory, sourceRoot, source), sourcesContent[i]));
        source = new Link(originalSourcemap, baseSources);
    }
    return sourcemapChain.reduce(linkMap, source);
}
function collapseSourcemaps(file, map, modules, bundleSourcemapChain, excludeContent, warn) {
    const linkMap = getLinkMap(warn);
    const moduleSources = modules
        .filter(module => !module.excludeFromSourcemap)
        .map(module => getCollapsedSourcemap(module.id, module.originalCode, module.originalSourcemap, module.sourcemapChain, linkMap));
    const link = new Link(map, moduleSources);
    const source = bundleSourcemapChain.reduce(linkMap, link);
    let { sources, sourcesContent, names, mappings } = source.traceMappings();
    if (file) {
        const directory = dirname(file);
        sources = sources.map((source) => relative$1(directory, source));
        file = basename(file);
    }
    sourcesContent = (excludeContent ? null : sourcesContent);
    return new SourceMap({ file, mappings, names, sources, sourcesContent });
}
function collapseSourcemap(id, originalCode, originalSourcemap, sourcemapChain, warn) {
    if (!sourcemapChain.length) {
        return originalSourcemap;
    }
    const source = getCollapsedSourcemap(id, originalCode, originalSourcemap, sourcemapChain, getLinkMap(warn));
    const map = source.traceMappings();
    return { version: 3, ...map };
}

const createHash = () => createHash$1('sha256');

const DECONFLICT_IMPORTED_VARIABLES_BY_FORMAT = {
    amd: deconflictImportsOther,
    cjs: deconflictImportsOther,
    es: deconflictImportsEsmOrSystem,
    iife: deconflictImportsOther,
    system: deconflictImportsEsmOrSystem,
    umd: deconflictImportsOther
};
function deconflictChunk(modules, dependenciesToBeDeconflicted, imports, usedNames, format, interop, preserveModules, externalLiveBindings, chunkByModule, syntheticExports, exportNamesByVariable, accessedGlobalsByScope, includedNamespaces) {
    const reversedModules = modules.slice().reverse();
    for (const module of reversedModules) {
        module.scope.addUsedOutsideNames(usedNames, format, exportNamesByVariable, accessedGlobalsByScope);
    }
    deconflictTopLevelVariables(usedNames, reversedModules, includedNamespaces);
    DECONFLICT_IMPORTED_VARIABLES_BY_FORMAT[format](usedNames, imports, dependenciesToBeDeconflicted, interop, preserveModules, externalLiveBindings, chunkByModule, syntheticExports);
    for (const module of reversedModules) {
        module.scope.deconflict(format, exportNamesByVariable, accessedGlobalsByScope);
    }
}
function deconflictImportsEsmOrSystem(usedNames, imports, dependenciesToBeDeconflicted, _interop, preserveModules, _externalLiveBindings, chunkByModule, syntheticExports) {
    // This is needed for namespace reexports
    for (const dependency of dependenciesToBeDeconflicted.dependencies) {
        if (preserveModules || dependency instanceof ExternalModule) {
            dependency.variableName = getSafeName(dependency.suggestedVariableName, usedNames);
        }
    }
    for (const variable of imports) {
        const module = variable.module;
        const name = variable.name;
        if (variable.isNamespace && (preserveModules || module instanceof ExternalModule)) {
            variable.setRenderNames(null, (module instanceof ExternalModule ? module : chunkByModule.get(module)).variableName);
        }
        else if (module instanceof ExternalModule && name === 'default') {
            variable.setRenderNames(null, getSafeName([...module.exportedVariables].some(([exportedVariable, exportedName]) => exportedName === '*' && exportedVariable.included)
                ? module.suggestedVariableName + '__default'
                : module.suggestedVariableName, usedNames));
        }
        else {
            variable.setRenderNames(null, getSafeName(name, usedNames));
        }
    }
    for (const variable of syntheticExports) {
        variable.setRenderNames(null, getSafeName(variable.name, usedNames));
    }
}
function deconflictImportsOther(usedNames, imports, { deconflictedDefault, deconflictedNamespace, dependencies }, interop, preserveModules, externalLiveBindings, chunkByModule) {
    for (const chunkOrExternalModule of dependencies) {
        chunkOrExternalModule.variableName = getSafeName(chunkOrExternalModule.suggestedVariableName, usedNames);
    }
    for (const externalModuleOrChunk of deconflictedNamespace) {
        externalModuleOrChunk.namespaceVariableName = getSafeName(`${externalModuleOrChunk.suggestedVariableName}__namespace`, usedNames);
    }
    for (const externalModule of deconflictedDefault) {
        if (deconflictedNamespace.has(externalModule) &&
            canDefaultBeTakenFromNamespace(String(interop(externalModule.id)), externalLiveBindings)) {
            externalModule.defaultVariableName = externalModule.namespaceVariableName;
        }
        else {
            externalModule.defaultVariableName = getSafeName(`${externalModule.suggestedVariableName}__default`, usedNames);
        }
    }
    for (const variable of imports) {
        const module = variable.module;
        if (module instanceof ExternalModule) {
            const name = variable.name;
            if (name === 'default') {
                const moduleInterop = String(interop(module.id));
                const variableName = defaultInteropHelpersByInteropType[moduleInterop]
                    ? module.defaultVariableName
                    : module.variableName;
                if (isDefaultAProperty(moduleInterop, externalLiveBindings)) {
                    variable.setRenderNames(variableName, 'default');
                }
                else {
                    variable.setRenderNames(null, variableName);
                }
            }
            else if (name === '*') {
                variable.setRenderNames(null, namespaceInteropHelpersByInteropType[String(interop(module.id))]
                    ? module.namespaceVariableName
                    : module.variableName);
            }
            else {
                // if the second parameter is `null`, it uses its "name" for the property name
                variable.setRenderNames(module.variableName, null);
            }
        }
        else {
            const chunk = chunkByModule.get(module);
            if (preserveModules && variable.isNamespace) {
                variable.setRenderNames(null, chunk.exportMode === 'default' ? chunk.namespaceVariableName : chunk.variableName);
            }
            else if (chunk.exportMode === 'default') {
                variable.setRenderNames(null, chunk.variableName);
            }
            else {
                variable.setRenderNames(chunk.variableName, chunk.getVariableExportName(variable));
            }
        }
    }
}
function deconflictTopLevelVariables(usedNames, modules, includedNamespaces) {
    for (const module of modules) {
        for (const variable of module.scope.variables.values()) {
            if (variable.included &&
                // this will only happen for exports in some formats
                !(variable.renderBaseName ||
                    (variable instanceof ExportDefaultVariable && variable.getOriginalVariable() !== variable))) {
                variable.setRenderNames(null, getSafeName(variable.name, usedNames));
            }
        }
        if (includedNamespaces.has(module)) {
            const namespace = module.namespace;
            namespace.setRenderNames(null, getSafeName(namespace.name, usedNames));
        }
    }
}

const needsEscapeRegEx = /[\\'\r\n\u2028\u2029]/;
const quoteNewlineRegEx = /(['\r\n\u2028\u2029])/g;
const backSlashRegEx = /\\/g;
function escapeId(id) {
    if (!id.match(needsEscapeRegEx))
        return id;
    return id.replace(backSlashRegEx, '\\\\').replace(quoteNewlineRegEx, '\\$1');
}

function assignExportsToMangledNames(exports, exportsByName, exportNamesByVariable) {
    let nameIndex = 0;
    for (const variable of exports) {
        let [exportName] = variable.name;
        if (exportsByName.has(exportName)) {
            do {
                exportName = toBase64(++nameIndex);
                // skip past leading number identifiers
                if (exportName.charCodeAt(0) === 49 /* '1' */) {
                    nameIndex += 9 * 64 ** (exportName.length - 1);
                    exportName = toBase64(nameIndex);
                }
            } while (RESERVED_NAMES$1.has(exportName) || exportsByName.has(exportName));
        }
        exportsByName.set(exportName, variable);
        exportNamesByVariable.set(variable, [exportName]);
    }
}
function assignExportsToNames(exports, exportsByName, exportNamesByVariable) {
    for (const variable of exports) {
        let nameIndex = 0;
        let exportName = variable.name;
        while (exportsByName.has(exportName)) {
            exportName = variable.name + '$' + ++nameIndex;
        }
        exportsByName.set(exportName, variable);
        exportNamesByVariable.set(variable, [exportName]);
    }
}

function getExportMode(chunk, { exports: exportMode, name, format }, unsetOptions, facadeModuleId, warn) {
    const exportKeys = chunk.getExportNames();
    if (exportMode === 'default') {
        if (exportKeys.length !== 1 || exportKeys[0] !== 'default') {
            return error(errIncompatibleExportOptionValue('default', exportKeys, facadeModuleId));
        }
    }
    else if (exportMode === 'none' && exportKeys.length) {
        return error(errIncompatibleExportOptionValue('none', exportKeys, facadeModuleId));
    }
    if (exportMode === 'auto') {
        if (exportKeys.length === 0) {
            exportMode = 'none';
        }
        else if (exportKeys.length === 1 && exportKeys[0] === 'default') {
            if (format === 'cjs' && unsetOptions.has('exports')) {
                warn(errPreferNamedExports(facadeModuleId));
            }
            exportMode = 'default';
        }
        else {
            if (format !== 'es' && format !== 'system' && exportKeys.includes('default')) {
                warn(errMixedExport(facadeModuleId, name));
            }
            exportMode = 'named';
        }
    }
    return exportMode;
}

function guessIndentString(code) {
    const lines = code.split('\n');
    const tabbed = lines.filter(line => /^\t+/.test(line));
    const spaced = lines.filter(line => /^ {2,}/.test(line));
    if (tabbed.length === 0 && spaced.length === 0) {
        return null;
    }
    // More lines tabbed than spaced? Assume tabs, and
    // default to tabs in the case of a tie (or nothing
    // to go on)
    if (tabbed.length >= spaced.length) {
        return '\t';
    }
    // Otherwise, we need to guess the multiple
    const min = spaced.reduce((previous, current) => {
        const numSpaces = /^ +/.exec(current)[0].length;
        return Math.min(numSpaces, previous);
    }, Infinity);
    return new Array(min + 1).join(' ');
}
function getIndentString(modules, options) {
    if (options.indent !== true)
        return options.indent;
    for (const module of modules) {
        const indent = guessIndentString(module.originalCode);
        if (indent !== null)
            return indent;
    }
    return '\t';
}

function getStaticDependencies(chunk, orderedModules, chunkByModule) {
    const staticDependencyBlocks = [];
    const handledDependencies = new Set();
    for (let modulePos = orderedModules.length - 1; modulePos >= 0; modulePos--) {
        const module = orderedModules[modulePos];
        if (!handledDependencies.has(module)) {
            const staticDependencies = [];
            addStaticDependencies(module, staticDependencies, handledDependencies, chunk, chunkByModule);
            staticDependencyBlocks.unshift(staticDependencies);
        }
    }
    const dependencies = new Set();
    for (const block of staticDependencyBlocks) {
        for (const dependency of block) {
            dependencies.add(dependency);
        }
    }
    return dependencies;
}
function addStaticDependencies(module, staticDependencies, handledModules, chunk, chunkByModule) {
    const dependencies = module.getDependenciesToBeIncluded();
    for (const dependency of dependencies) {
        if (dependency instanceof ExternalModule) {
            staticDependencies.push(dependency);
            continue;
        }
        const dependencyChunk = chunkByModule.get(dependency);
        if (dependencyChunk !== chunk) {
            staticDependencies.push(dependencyChunk);
            continue;
        }
        if (!handledModules.has(dependency)) {
            handledModules.add(dependency);
            addStaticDependencies(dependency, staticDependencies, handledModules, chunk, chunkByModule);
        }
    }
}

function decodedSourcemap(map) {
    if (!map)
        return null;
    if (typeof map === 'string') {
        map = JSON.parse(map);
    }
    if (map.mappings === '') {
        return {
            mappings: [],
            names: [],
            sources: [],
            version: 3
        };
    }
    const mappings = typeof map.mappings === 'string' ? decode(map.mappings) : map.mappings;
    return { ...map, mappings };
}

function renderChunk({ code, options, outputPluginDriver, renderChunk, sourcemapChain }) {
    const renderChunkReducer = (code, result, plugin) => {
        if (result == null)
            return code;
        if (typeof result === 'string')
            result = {
                code: result,
                map: undefined
            };
        // strict null check allows 'null' maps to not be pushed to the chain, while 'undefined' gets the missing map warning
        if (result.map !== null) {
            const map = decodedSourcemap(result.map);
            sourcemapChain.push(map || { missing: true, plugin: plugin.name });
        }
        return result.code;
    };
    return outputPluginDriver.hookReduceArg0('renderChunk', [code, renderChunk, options], renderChunkReducer);
}

const lowercaseBundleKeys = Symbol('bundleKeys');
const FILE_PLACEHOLDER = {
    type: 'placeholder'
};
const getOutputBundle = (outputBundleBase) => {
    const reservedLowercaseBundleKeys = new Set();
    return new Proxy(outputBundleBase, {
        deleteProperty(target, key) {
            if (typeof key === 'string') {
                reservedLowercaseBundleKeys.delete(key.toLowerCase());
            }
            return Reflect.deleteProperty(target, key);
        },
        get(target, key) {
            if (key === lowercaseBundleKeys) {
                return reservedLowercaseBundleKeys;
            }
            return Reflect.get(target, key);
        },
        set(target, key, value) {
            if (typeof key === 'string') {
                reservedLowercaseBundleKeys.add(key.toLowerCase());
            }
            return Reflect.set(target, key, value);
        }
    });
};

function renderNamePattern(pattern, patternName, replacements) {
    if (isPathFragment(pattern))
        return error(errFailedValidation(`Invalid pattern "${pattern}" for "${patternName}", patterns can be neither absolute nor relative paths. If you want your files to be stored in a subdirectory, write its name without a leading slash like this: subdirectory/pattern.`));
    return pattern.replace(/\[(\w+)\]/g, (_match, type) => {
        if (!replacements.hasOwnProperty(type)) {
            return error(errFailedValidation(`"[${type}]" is not a valid placeholder in "${patternName}" pattern.`));
        }
        const replacement = replacements[type]();
        if (isPathFragment(replacement))
            return error(errFailedValidation(`Invalid substitution "${replacement}" for placeholder "[${type}]" in "${patternName}" pattern, can be neither absolute nor relative path.`));
        return replacement;
    });
}
function makeUnique(name, { [lowercaseBundleKeys]: reservedLowercaseBundleKeys }) {
    if (!reservedLowercaseBundleKeys.has(name.toLowerCase()))
        return name;
    const ext = extname(name);
    name = name.substring(0, name.length - ext.length);
    let uniqueName, uniqueIndex = 1;
    while (reservedLowercaseBundleKeys.has((uniqueName = name + ++uniqueIndex + ext).toLowerCase()))
        ;
    return uniqueName;
}

const NON_ASSET_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
function getGlobalName(module, globals, hasExports, warn) {
    const globalName = typeof globals === 'function' ? globals(module.id) : globals[module.id];
    if (globalName) {
        return globalName;
    }
    if (hasExports) {
        warn({
            code: 'MISSING_GLOBAL_NAME',
            guess: module.variableName,
            message: `No name was provided for external module '${module.id}' in output.globals – guessing '${module.variableName}'`,
            source: module.id
        });
        return module.variableName;
    }
}
class Chunk {
    constructor(orderedModules, inputOptions, outputOptions, unsetOptions, pluginDriver, modulesById, chunkByModule, facadeChunkByModule, includedNamespaces, manualChunkAlias) {
        this.orderedModules = orderedModules;
        this.inputOptions = inputOptions;
        this.outputOptions = outputOptions;
        this.unsetOptions = unsetOptions;
        this.pluginDriver = pluginDriver;
        this.modulesById = modulesById;
        this.chunkByModule = chunkByModule;
        this.facadeChunkByModule = facadeChunkByModule;
        this.includedNamespaces = includedNamespaces;
        this.manualChunkAlias = manualChunkAlias;
        this.entryModules = [];
        this.exportMode = 'named';
        this.facadeModule = null;
        this.id = null;
        this.namespaceVariableName = '';
        this.needsExportsShim = false;
        this.variableName = '';
        this.accessedGlobalsByScope = new Map();
        this.dependencies = new Set();
        this.dynamicDependencies = new Set();
        this.dynamicEntryModules = [];
        this.dynamicName = null;
        this.exportNamesByVariable = new Map();
        this.exports = new Set();
        this.exportsByName = new Map();
        this.fileName = null;
        this.implicitEntryModules = [];
        this.implicitlyLoadedBefore = new Set();
        this.imports = new Set();
        this.includedReexportsByModule = new Map();
        this.indentString = undefined;
        // This may only be updated in the constructor
        this.isEmpty = true;
        this.name = null;
        this.renderedDependencies = null;
        this.renderedExports = null;
        this.renderedHash = undefined;
        this.renderedModuleSources = new Map();
        this.renderedModules = Object.create(null);
        this.renderedSource = null;
        this.sortedExportNames = null;
        this.strictFacade = false;
        this.usedModules = undefined;
        this.execIndex = orderedModules.length > 0 ? orderedModules[0].execIndex : Infinity;
        const chunkModules = new Set(orderedModules);
        for (const module of orderedModules) {
            if (module.namespace.included) {
                includedNamespaces.add(module);
            }
            if (this.isEmpty && module.isIncluded()) {
                this.isEmpty = false;
            }
            if (module.info.isEntry || outputOptions.preserveModules) {
                this.entryModules.push(module);
            }
            for (const importer of module.includedDynamicImporters) {
                if (!chunkModules.has(importer)) {
                    this.dynamicEntryModules.push(module);
                    // Modules with synthetic exports need an artificial namespace for dynamic imports
                    if (module.info.syntheticNamedExports && !outputOptions.preserveModules) {
                        includedNamespaces.add(module);
                        this.exports.add(module.namespace);
                    }
                }
            }
            if (module.implicitlyLoadedAfter.size > 0) {
                this.implicitEntryModules.push(module);
            }
        }
        this.suggestedVariableName = makeLegal(this.generateVariableName());
    }
    static generateFacade(inputOptions, outputOptions, unsetOptions, pluginDriver, modulesById, chunkByModule, facadeChunkByModule, includedNamespaces, facadedModule, facadeName) {
        const chunk = new Chunk([], inputOptions, outputOptions, unsetOptions, pluginDriver, modulesById, chunkByModule, facadeChunkByModule, includedNamespaces, null);
        chunk.assignFacadeName(facadeName, facadedModule);
        if (!facadeChunkByModule.has(facadedModule)) {
            facadeChunkByModule.set(facadedModule, chunk);
        }
        for (const dependency of facadedModule.getDependenciesToBeIncluded()) {
            chunk.dependencies.add(dependency instanceof Module ? chunkByModule.get(dependency) : dependency);
        }
        if (!chunk.dependencies.has(chunkByModule.get(facadedModule)) &&
            facadedModule.info.moduleSideEffects &&
            facadedModule.hasEffects()) {
            chunk.dependencies.add(chunkByModule.get(facadedModule));
        }
        chunk.ensureReexportsAreAvailableForModule(facadedModule);
        chunk.facadeModule = facadedModule;
        chunk.strictFacade = true;
        return chunk;
    }
    canModuleBeFacade(module, exposedVariables) {
        const moduleExportNamesByVariable = module.getExportNamesByVariable();
        for (const exposedVariable of this.exports) {
            if (!moduleExportNamesByVariable.has(exposedVariable)) {
                if (moduleExportNamesByVariable.size === 0 &&
                    module.isUserDefinedEntryPoint &&
                    module.preserveSignature === 'strict' &&
                    this.unsetOptions.has('preserveEntrySignatures')) {
                    this.inputOptions.onwarn({
                        code: 'EMPTY_FACADE',
                        id: module.id,
                        message: `To preserve the export signature of the entry module "${relativeId(module.id)}", an empty facade chunk was created. This often happens when creating a bundle for a web app where chunks are placed in script tags and exports are ignored. In this case it is recommended to set "preserveEntrySignatures: false" to avoid this and reduce the number of chunks. Otherwise if this is intentional, set "preserveEntrySignatures: 'strict'" explicitly to silence this warning.`,
                        url: 'https://rollupjs.org/guide/en/#preserveentrysignatures'
                    });
                }
                return false;
            }
        }
        for (const exposedVariable of exposedVariables) {
            if (!(moduleExportNamesByVariable.has(exposedVariable) || exposedVariable.module === module)) {
                return false;
            }
        }
        return true;
    }
    generateExports() {
        this.sortedExportNames = null;
        const remainingExports = new Set(this.exports);
        if (this.facadeModule !== null &&
            (this.facadeModule.preserveSignature !== false || this.strictFacade)) {
            const exportNamesByVariable = this.facadeModule.getExportNamesByVariable();
            for (const [variable, exportNames] of exportNamesByVariable) {
                this.exportNamesByVariable.set(variable, [...exportNames]);
                for (const exportName of exportNames) {
                    this.exportsByName.set(exportName, variable);
                }
                remainingExports.delete(variable);
            }
        }
        if (this.outputOptions.minifyInternalExports) {
            assignExportsToMangledNames(remainingExports, this.exportsByName, this.exportNamesByVariable);
        }
        else {
            assignExportsToNames(remainingExports, this.exportsByName, this.exportNamesByVariable);
        }
        if (this.outputOptions.preserveModules || (this.facadeModule && this.facadeModule.info.isEntry))
            this.exportMode = getExportMode(this, this.outputOptions, this.unsetOptions, this.facadeModule.id, this.inputOptions.onwarn);
    }
    generateFacades() {
        var _a;
        const facades = [];
        const entryModules = new Set([...this.entryModules, ...this.implicitEntryModules]);
        const exposedVariables = new Set(this.dynamicEntryModules.map(({ namespace }) => namespace));
        for (const module of entryModules) {
            if (module.preserveSignature) {
                for (const exportedVariable of module.getExportNamesByVariable().keys()) {
                    exposedVariables.add(exportedVariable);
                }
            }
        }
        for (const module of entryModules) {
            const requiredFacades = Array.from(new Set(module.chunkNames.filter(({ isUserDefined }) => isUserDefined).map(({ name }) => name)), 
            // mapping must run after Set 'name' dedupe
            name => ({
                name
            }));
            if (requiredFacades.length === 0 && module.isUserDefinedEntryPoint) {
                requiredFacades.push({});
            }
            requiredFacades.push(...Array.from(module.chunkFileNames, fileName => ({ fileName })));
            if (requiredFacades.length === 0) {
                requiredFacades.push({});
            }
            if (!this.facadeModule) {
                const needsStrictFacade = module.preserveSignature === 'strict' ||
                    (module.preserveSignature === 'exports-only' &&
                        module.getExportNamesByVariable().size !== 0);
                if (!needsStrictFacade ||
                    this.outputOptions.preserveModules ||
                    this.canModuleBeFacade(module, exposedVariables)) {
                    this.facadeModule = module;
                    this.facadeChunkByModule.set(module, this);
                    if (module.preserveSignature) {
                        this.strictFacade = needsStrictFacade;
                    }
                    this.assignFacadeName(requiredFacades.shift(), module);
                }
            }
            for (const facadeName of requiredFacades) {
                facades.push(Chunk.generateFacade(this.inputOptions, this.outputOptions, this.unsetOptions, this.pluginDriver, this.modulesById, this.chunkByModule, this.facadeChunkByModule, this.includedNamespaces, module, facadeName));
            }
        }
        for (const module of this.dynamicEntryModules) {
            if (module.info.syntheticNamedExports)
                continue;
            if (!this.facadeModule && this.canModuleBeFacade(module, exposedVariables)) {
                this.facadeModule = module;
                this.facadeChunkByModule.set(module, this);
                this.strictFacade = true;
                this.dynamicName = getChunkNameFromModule(module);
            }
            else if (this.facadeModule === module &&
                !this.strictFacade &&
                this.canModuleBeFacade(module, exposedVariables)) {
                this.strictFacade = true;
            }
            else if (!((_a = this.facadeChunkByModule.get(module)) === null || _a === void 0 ? void 0 : _a.strictFacade)) {
                this.includedNamespaces.add(module);
                this.exports.add(module.namespace);
            }
        }
        if (!this.outputOptions.preserveModules) {
            this.addNecessaryImportsForFacades();
        }
        return facades;
    }
    generateId(addons, options, bundle, includeHash) {
        if (this.fileName !== null) {
            return this.fileName;
        }
        const [pattern, patternName] = this.facadeModule && this.facadeModule.isUserDefinedEntryPoint
            ? [options.entryFileNames, 'output.entryFileNames']
            : [options.chunkFileNames, 'output.chunkFileNames'];
        return makeUnique(renderNamePattern(typeof pattern === 'function' ? pattern(this.getChunkInfo()) : pattern, patternName, {
            format: () => options.format,
            hash: () => includeHash
                ? this.computeContentHashWithDependencies(addons, options, bundle)
                : '[hash]',
            name: () => this.getChunkName()
        }), bundle);
    }
    generateIdPreserveModules(preserveModulesRelativeDir, options, bundle, unsetOptions) {
        const [{ id }] = this.orderedModules;
        const sanitizedId = this.outputOptions.sanitizeFileName(id.split(QUERY_HASH_REGEX, 1)[0]);
        let path;
        const patternOpt = unsetOptions.has('entryFileNames')
            ? '[name][assetExtname].js'
            : options.entryFileNames;
        const pattern = typeof patternOpt === 'function' ? patternOpt(this.getChunkInfo()) : patternOpt;
        if (isAbsolute(sanitizedId)) {
            const currentDir = dirname(sanitizedId);
            const extension = extname(sanitizedId);
            const fileName = renderNamePattern(pattern, 'output.entryFileNames', {
                assetExtname: () => (NON_ASSET_EXTENSIONS.includes(extension) ? '' : extension),
                ext: () => extension.substring(1),
                extname: () => extension,
                format: () => options.format,
                name: () => this.getChunkName()
            });
            const currentPath = `${currentDir}/${fileName}`;
            const { preserveModulesRoot } = options;
            if (preserveModulesRoot && resolve(currentPath).startsWith(preserveModulesRoot)) {
                path = currentPath.slice(preserveModulesRoot.length).replace(/^[\\/]/, '');
            }
            else {
                path = relative(preserveModulesRelativeDir, currentPath);
            }
        }
        else {
            const extension = extname(sanitizedId);
            const fileName = renderNamePattern(pattern, 'output.entryFileNames', {
                assetExtname: () => (NON_ASSET_EXTENSIONS.includes(extension) ? '' : extension),
                ext: () => extension.substring(1),
                extname: () => extension,
                format: () => options.format,
                name: () => getAliasName(sanitizedId)
            });
            path = `_virtual/${fileName}`;
        }
        return makeUnique(normalize(path), bundle);
    }
    getChunkInfo() {
        const facadeModule = this.facadeModule;
        const getChunkName = this.getChunkName.bind(this);
        return {
            exports: this.getExportNames(),
            facadeModuleId: facadeModule && facadeModule.id,
            isDynamicEntry: this.dynamicEntryModules.length > 0,
            isEntry: facadeModule !== null && facadeModule.info.isEntry,
            isImplicitEntry: this.implicitEntryModules.length > 0,
            modules: this.renderedModules,
            get name() {
                return getChunkName();
            },
            type: 'chunk'
        };
    }
    getChunkInfoWithFileNames() {
        return Object.assign(this.getChunkInfo(), {
            code: undefined,
            dynamicImports: Array.from(this.dynamicDependencies, getId),
            fileName: this.id,
            implicitlyLoadedBefore: Array.from(this.implicitlyLoadedBefore, getId),
            importedBindings: this.getImportedBindingsPerDependency(),
            imports: Array.from(this.dependencies, getId),
            map: undefined,
            referencedFiles: this.getReferencedFiles()
        });
    }
    getChunkName() {
        var _a;
        return ((_a = this.name) !== null && _a !== void 0 ? _a : (this.name = this.outputOptions.sanitizeFileName(this.getFallbackChunkName())));
    }
    getExportNames() {
        var _a;
        return ((_a = this.sortedExportNames) !== null && _a !== void 0 ? _a : (this.sortedExportNames = Array.from(this.exportsByName.keys()).sort()));
    }
    getRenderedHash() {
        if (this.renderedHash)
            return this.renderedHash;
        const hash = createHash();
        const hashAugmentation = this.pluginDriver.hookReduceValueSync('augmentChunkHash', '', [this.getChunkInfo()], (augmentation, pluginHash) => {
            if (pluginHash) {
                augmentation += pluginHash;
            }
            return augmentation;
        });
        hash.update(hashAugmentation);
        hash.update(this.renderedSource.toString());
        hash.update(this.getExportNames()
            .map(exportName => {
            const variable = this.exportsByName.get(exportName);
            return `${relativeId(variable.module.id).replace(/\\/g, '/')}:${variable.name}:${exportName}`;
        })
            .join(','));
        return (this.renderedHash = hash.digest('hex'));
    }
    getVariableExportName(variable) {
        if (this.outputOptions.preserveModules && variable instanceof NamespaceVariable) {
            return '*';
        }
        return this.exportNamesByVariable.get(variable)[0];
    }
    link() {
        this.dependencies = getStaticDependencies(this, this.orderedModules, this.chunkByModule);
        for (const module of this.orderedModules) {
            this.addDependenciesToChunk(module.dynamicDependencies, this.dynamicDependencies);
            this.addDependenciesToChunk(module.implicitlyLoadedBefore, this.implicitlyLoadedBefore);
            this.setUpChunkImportsAndExportsForModule(module);
        }
    }
    // prerender allows chunk hashes and names to be generated before finalizing
    preRender(options, inputBase, snippets) {
        const { _, getPropertyAccess, n } = snippets;
        const magicString = new Bundle$1({ separator: `${n}${n}` });
        this.usedModules = [];
        this.indentString = getIndentString(this.orderedModules, options);
        const renderOptions = {
            dynamicImportFunction: options.dynamicImportFunction,
            exportNamesByVariable: this.exportNamesByVariable,
            format: options.format,
            freeze: options.freeze,
            indent: this.indentString,
            namespaceToStringTag: options.namespaceToStringTag,
            outputPluginDriver: this.pluginDriver,
            snippets
        };
        // for static and dynamic entry points, inline the execution list to avoid loading latency
        if (options.hoistTransitiveImports &&
            !this.outputOptions.preserveModules &&
            this.facadeModule !== null) {
            for (const dep of this.dependencies) {
                if (dep instanceof Chunk)
                    this.inlineChunkDependencies(dep);
            }
        }
        this.prepareModulesForRendering(snippets);
        this.setIdentifierRenderResolutions(options);
        let hoistedSource = '';
        const renderedModules = this.renderedModules;
        for (const module of this.orderedModules) {
            let renderedLength = 0;
            if (module.isIncluded() || this.includedNamespaces.has(module)) {
                const source = module.render(renderOptions).trim();
                renderedLength = source.length();
                if (renderedLength) {
                    if (options.compact && source.lastLine().includes('//'))
                        source.append('\n');
                    this.renderedModuleSources.set(module, source);
                    magicString.addSource(source);
                    this.usedModules.push(module);
                }
                const namespace = module.namespace;
                if (this.includedNamespaces.has(module) && !this.outputOptions.preserveModules) {
                    const rendered = namespace.renderBlock(renderOptions);
                    if (namespace.renderFirst())
                        hoistedSource += n + rendered;
                    else
                        magicString.addSource(new MagicString(rendered));
                }
            }
            const { renderedExports, removedExports } = module.getRenderedExports();
            const { renderedModuleSources } = this;
            renderedModules[module.id] = {
                get code() {
                    var _a, _b;
                    return (_b = (_a = renderedModuleSources.get(module)) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : null;
                },
                originalLength: module.originalCode.length,
                removedExports,
                renderedExports,
                renderedLength
            };
        }
        if (hoistedSource)
            magicString.prepend(hoistedSource + n + n);
        if (this.needsExportsShim) {
            magicString.prepend(`${n}${snippets.cnst} ${MISSING_EXPORT_SHIM_VARIABLE}${_}=${_}void 0;${n}${n}`);
        }
        if (options.compact) {
            this.renderedSource = magicString;
        }
        else {
            this.renderedSource = magicString.trim();
        }
        this.renderedHash = undefined;
        if (this.isEmpty && this.getExportNames().length === 0 && this.dependencies.size === 0) {
            const chunkName = this.getChunkName();
            this.inputOptions.onwarn({
                chunkName,
                code: 'EMPTY_BUNDLE',
                message: `Generated an empty chunk: "${chunkName}"`
            });
        }
        this.setExternalRenderPaths(options, inputBase);
        this.renderedDependencies = this.getChunkDependencyDeclarations(options, getPropertyAccess);
        this.renderedExports =
            this.exportMode === 'none'
                ? []
                : this.getChunkExportDeclarations(options.format, getPropertyAccess);
    }
    async render(options, addons, outputChunk, snippets) {
        timeStart('render format', 2);
        const format = options.format;
        const finalise = finalisers[format];
        if (options.dynamicImportFunction && format !== 'es') {
            this.inputOptions.onwarn(errInvalidOption('output.dynamicImportFunction', 'outputdynamicImportFunction', 'this option is ignored for formats other than "es"'));
        }
        // populate ids in the rendered declarations only here
        // as chunk ids known only after prerender
        for (const dependency of this.dependencies) {
            const renderedDependency = this.renderedDependencies.get(dependency);
            if (dependency instanceof ExternalModule) {
                const originalId = dependency.renderPath;
                renderedDependency.id = escapeId(dependency.renormalizeRenderPath
                    ? getImportPath(this.id, originalId, false, false)
                    : originalId);
            }
            else {
                renderedDependency.namedExportsMode = dependency.exportMode !== 'default';
                renderedDependency.id = escapeId(getImportPath(this.id, dependency.id, false, true));
            }
        }
        this.finaliseDynamicImports(options, snippets);
        this.finaliseImportMetas(format, snippets);
        const hasExports = this.renderedExports.length !== 0 ||
            [...this.renderedDependencies.values()].some(dep => (dep.reexports && dep.reexports.length !== 0));
        let topLevelAwaitModule = null;
        const accessedGlobals = new Set();
        for (const module of this.orderedModules) {
            if (module.usesTopLevelAwait) {
                topLevelAwaitModule = module.id;
            }
            const accessedGlobalVariables = this.accessedGlobalsByScope.get(module.scope);
            if (accessedGlobalVariables) {
                for (const name of accessedGlobalVariables) {
                    accessedGlobals.add(name);
                }
            }
        }
        if (topLevelAwaitModule !== null && format !== 'es' && format !== 'system') {
            return error({
                code: 'INVALID_TLA_FORMAT',
                id: topLevelAwaitModule,
                message: `Module format ${format} does not support top-level await. Use the "es" or "system" output formats rather.`
            });
        }
        /* istanbul ignore next */
        if (!this.id) {
            throw new Error('Internal Error: expecting chunk id');
        }
        const magicString = finalise(this.renderedSource, {
            accessedGlobals,
            dependencies: [...this.renderedDependencies.values()],
            exports: this.renderedExports,
            hasExports,
            id: this.id,
            indent: this.indentString,
            intro: addons.intro,
            isEntryFacade: this.outputOptions.preserveModules ||
                (this.facadeModule !== null && this.facadeModule.info.isEntry),
            isModuleFacade: this.facadeModule !== null,
            namedExportsMode: this.exportMode !== 'default',
            outro: addons.outro,
            snippets,
            usesTopLevelAwait: topLevelAwaitModule !== null,
            warn: this.inputOptions.onwarn
        }, options);
        if (addons.banner)
            magicString.prepend(addons.banner);
        if (addons.footer)
            magicString.append(addons.footer);
        const prevCode = magicString.toString();
        timeEnd('render format', 2);
        let map = null;
        const chunkSourcemapChain = [];
        let code = await renderChunk({
            code: prevCode,
            options,
            outputPluginDriver: this.pluginDriver,
            renderChunk: outputChunk,
            sourcemapChain: chunkSourcemapChain
        });
        if (options.sourcemap) {
            timeStart('sourcemap', 2);
            let file;
            if (options.file)
                file = resolve(options.sourcemapFile || options.file);
            else if (options.dir)
                file = resolve(options.dir, this.id);
            else
                file = resolve(this.id);
            const decodedMap = magicString.generateDecodedMap({});
            map = collapseSourcemaps(file, decodedMap, this.usedModules, chunkSourcemapChain, options.sourcemapExcludeSources, this.inputOptions.onwarn);
            map.sources = map.sources
                .map(sourcePath => {
                const { sourcemapPathTransform } = options;
                if (sourcemapPathTransform) {
                    const newSourcePath = sourcemapPathTransform(sourcePath, `${file}.map`);
                    if (typeof newSourcePath !== 'string') {
                        error(errFailedValidation(`sourcemapPathTransform function must return a string.`));
                    }
                    return newSourcePath;
                }
                return sourcePath;
            })
                .map(normalize);
            timeEnd('sourcemap', 2);
        }
        if (!options.compact && code[code.length - 1] !== '\n')
            code += '\n';
        return { code, map };
    }
    addDependenciesToChunk(moduleDependencies, chunkDependencies) {
        for (const module of moduleDependencies) {
            if (module instanceof Module) {
                const chunk = this.chunkByModule.get(module);
                if (chunk && chunk !== this) {
                    chunkDependencies.add(chunk);
                }
            }
            else {
                chunkDependencies.add(module);
            }
        }
    }
    addNecessaryImportsForFacades() {
        for (const [module, variables] of this.includedReexportsByModule) {
            if (this.includedNamespaces.has(module)) {
                for (const variable of variables) {
                    this.imports.add(variable);
                }
            }
        }
    }
    assignFacadeName({ fileName, name }, facadedModule) {
        if (fileName) {
            this.fileName = fileName;
        }
        else {
            this.name = this.outputOptions.sanitizeFileName(name || getChunkNameFromModule(facadedModule));
        }
    }
    checkCircularDependencyImport(variable, importingModule) {
        const variableModule = variable.module;
        if (variableModule instanceof Module) {
            const exportChunk = this.chunkByModule.get(variableModule);
            let alternativeReexportModule;
            do {
                alternativeReexportModule = importingModule.alternativeReexportModules.get(variable);
                if (alternativeReexportModule) {
                    const exportingChunk = this.chunkByModule.get(alternativeReexportModule);
                    if (exportingChunk && exportingChunk !== exportChunk) {
                        this.inputOptions.onwarn(errCyclicCrossChunkReexport(variableModule.getExportNamesByVariable().get(variable)[0], variableModule.id, alternativeReexportModule.id, importingModule.id));
                    }
                    importingModule = alternativeReexportModule;
                }
            } while (alternativeReexportModule);
        }
    }
    computeContentHashWithDependencies(addons, options, bundle) {
        const hash = createHash();
        hash.update([addons.intro, addons.outro, addons.banner, addons.footer].join(':'));
        hash.update(options.format);
        const dependenciesForHashing = new Set([this]);
        for (const current of dependenciesForHashing) {
            if (current instanceof ExternalModule) {
                hash.update(`:${current.renderPath}`);
            }
            else {
                hash.update(current.getRenderedHash());
                hash.update(current.generateId(addons, options, bundle, false));
            }
            if (current instanceof ExternalModule)
                continue;
            for (const dependency of [...current.dependencies, ...current.dynamicDependencies]) {
                dependenciesForHashing.add(dependency);
            }
        }
        return hash.digest('hex').substr(0, 8);
    }
    ensureReexportsAreAvailableForModule(module) {
        const includedReexports = [];
        const map = module.getExportNamesByVariable();
        for (const exportedVariable of map.keys()) {
            const isSynthetic = exportedVariable instanceof SyntheticNamedExportVariable;
            const importedVariable = isSynthetic
                ? exportedVariable.getBaseVariable()
                : exportedVariable;
            if (!(importedVariable instanceof NamespaceVariable && this.outputOptions.preserveModules)) {
                this.checkCircularDependencyImport(importedVariable, module);
                const exportingModule = importedVariable.module;
                if (exportingModule instanceof Module) {
                    const chunk = this.chunkByModule.get(exportingModule);
                    if (chunk && chunk !== this) {
                        chunk.exports.add(importedVariable);
                        includedReexports.push(importedVariable);
                        if (isSynthetic) {
                            this.imports.add(importedVariable);
                        }
                    }
                }
            }
        }
        if (includedReexports.length) {
            this.includedReexportsByModule.set(module, includedReexports);
        }
    }
    finaliseDynamicImports(options, snippets) {
        const stripKnownJsExtensions = options.format === 'amd' && !options.amd.forceJsExtensionForImports;
        for (const [module, code] of this.renderedModuleSources) {
            for (const { node, resolution } of module.dynamicImports) {
                const chunk = this.chunkByModule.get(resolution);
                const facadeChunk = this.facadeChunkByModule.get(resolution);
                if (!resolution || !node.included || chunk === this) {
                    continue;
                }
                const renderedResolution = resolution instanceof Module
                    ? `'${escapeId(getImportPath(this.id, (facadeChunk || chunk).id, stripKnownJsExtensions, true))}'`
                    : resolution instanceof ExternalModule
                        ? `'${escapeId(resolution.renormalizeRenderPath
                            ? getImportPath(this.id, resolution.renderPath, stripKnownJsExtensions, false)
                            : resolution.renderPath)}'`
                        : resolution;
                node.renderFinalResolution(code, renderedResolution, resolution instanceof Module &&
                    !(facadeChunk === null || facadeChunk === void 0 ? void 0 : facadeChunk.strictFacade) &&
                    chunk.exportNamesByVariable.get(resolution.namespace)[0], snippets);
            }
        }
    }
    finaliseImportMetas(format, snippets) {
        for (const [module, code] of this.renderedModuleSources) {
            for (const importMeta of module.importMetas) {
                importMeta.renderFinalMechanism(code, this.id, format, snippets, this.pluginDriver);
            }
        }
    }
    generateVariableName() {
        if (this.manualChunkAlias) {
            return this.manualChunkAlias;
        }
        const moduleForNaming = this.entryModules[0] ||
            this.implicitEntryModules[0] ||
            this.dynamicEntryModules[0] ||
            this.orderedModules[this.orderedModules.length - 1];
        if (moduleForNaming) {
            return getChunkNameFromModule(moduleForNaming);
        }
        return 'chunk';
    }
    getChunkDependencyDeclarations(options, getPropertyAccess) {
        const importSpecifiers = this.getImportSpecifiers(getPropertyAccess);
        const reexportSpecifiers = this.getReexportSpecifiers();
        const dependencyDeclaration = new Map();
        for (const dep of this.dependencies) {
            const imports = importSpecifiers.get(dep) || null;
            const reexports = reexportSpecifiers.get(dep) || null;
            const namedExportsMode = dep instanceof ExternalModule || dep.exportMode !== 'default';
            dependencyDeclaration.set(dep, {
                defaultVariableName: dep.defaultVariableName,
                globalName: (dep instanceof ExternalModule &&
                    (options.format === 'umd' || options.format === 'iife') &&
                    getGlobalName(dep, options.globals, (imports || reexports) !== null, this.inputOptions.onwarn)),
                id: undefined,
                imports,
                isChunk: dep instanceof Chunk,
                name: dep.variableName,
                namedExportsMode,
                namespaceVariableName: dep.namespaceVariableName,
                reexports
            });
        }
        return dependencyDeclaration;
    }
    getChunkExportDeclarations(format, getPropertyAccess) {
        const exports = [];
        for (const exportName of this.getExportNames()) {
            if (exportName[0] === '*')
                continue;
            const variable = this.exportsByName.get(exportName);
            if (!(variable instanceof SyntheticNamedExportVariable)) {
                const module = variable.module;
                if (module && this.chunkByModule.get(module) !== this)
                    continue;
            }
            let expression = null;
            let hoisted = false;
            let local = variable.getName(getPropertyAccess);
            if (variable instanceof LocalVariable) {
                for (const declaration of variable.declarations) {
                    if (declaration.parent instanceof FunctionDeclaration ||
                        (declaration instanceof ExportDefaultDeclaration &&
                            declaration.declaration instanceof FunctionDeclaration)) {
                        hoisted = true;
                        break;
                    }
                }
            }
            else if (variable instanceof SyntheticNamedExportVariable) {
                expression = local;
                if (format === 'es') {
                    local = variable.renderName;
                }
            }
            exports.push({
                exported: exportName,
                expression,
                hoisted,
                local
            });
        }
        return exports;
    }
    getDependenciesToBeDeconflicted(addNonNamespacesAndInteropHelpers, addDependenciesWithoutBindings, interop) {
        const dependencies = new Set();
        const deconflictedDefault = new Set();
        const deconflictedNamespace = new Set();
        for (const variable of [...this.exportNamesByVariable.keys(), ...this.imports]) {
            if (addNonNamespacesAndInteropHelpers || variable.isNamespace) {
                const module = variable.module;
                if (module instanceof ExternalModule) {
                    dependencies.add(module);
                    if (addNonNamespacesAndInteropHelpers) {
                        if (variable.name === 'default') {
                            if (defaultInteropHelpersByInteropType[String(interop(module.id))]) {
                                deconflictedDefault.add(module);
                            }
                        }
                        else if (variable.name === '*') {
                            if (namespaceInteropHelpersByInteropType[String(interop(module.id))]) {
                                deconflictedNamespace.add(module);
                            }
                        }
                    }
                }
                else {
                    const chunk = this.chunkByModule.get(module);
                    if (chunk !== this) {
                        dependencies.add(chunk);
                        if (addNonNamespacesAndInteropHelpers &&
                            chunk.exportMode === 'default' &&
                            variable.isNamespace) {
                            deconflictedNamespace.add(chunk);
                        }
                    }
                }
            }
        }
        if (addDependenciesWithoutBindings) {
            for (const dependency of this.dependencies) {
                dependencies.add(dependency);
            }
        }
        return { deconflictedDefault, deconflictedNamespace, dependencies };
    }
    getFallbackChunkName() {
        if (this.manualChunkAlias) {
            return this.manualChunkAlias;
        }
        if (this.dynamicName) {
            return this.dynamicName;
        }
        if (this.fileName) {
            return getAliasName(this.fileName);
        }
        return getAliasName(this.orderedModules[this.orderedModules.length - 1].id);
    }
    getImportSpecifiers(getPropertyAccess) {
        const { interop } = this.outputOptions;
        const importsByDependency = new Map();
        for (const variable of this.imports) {
            const module = variable.module;
            let dependency;
            let imported;
            if (module instanceof ExternalModule) {
                dependency = module;
                imported = variable.name;
                if (imported !== 'default' && imported !== '*' && interop(module.id) === 'defaultOnly') {
                    return error(errUnexpectedNamedImport(module.id, imported, false));
                }
            }
            else {
                dependency = this.chunkByModule.get(module);
                imported = dependency.getVariableExportName(variable);
            }
            getOrCreate(importsByDependency, dependency, () => []).push({
                imported,
                local: variable.getName(getPropertyAccess)
            });
        }
        return importsByDependency;
    }
    getImportedBindingsPerDependency() {
        const importSpecifiers = {};
        for (const [dependency, declaration] of this.renderedDependencies) {
            const specifiers = new Set();
            if (declaration.imports) {
                for (const { imported } of declaration.imports) {
                    specifiers.add(imported);
                }
            }
            if (declaration.reexports) {
                for (const { imported } of declaration.reexports) {
                    specifiers.add(imported);
                }
            }
            importSpecifiers[dependency.id] = [...specifiers];
        }
        return importSpecifiers;
    }
    getReexportSpecifiers() {
        const { externalLiveBindings, interop } = this.outputOptions;
        const reexportSpecifiers = new Map();
        for (let exportName of this.getExportNames()) {
            let dependency;
            let imported;
            let needsLiveBinding = false;
            if (exportName[0] === '*') {
                const id = exportName.substring(1);
                if (interop(id) === 'defaultOnly') {
                    this.inputOptions.onwarn(errUnexpectedNamespaceReexport(id));
                }
                needsLiveBinding = externalLiveBindings;
                dependency = this.modulesById.get(id);
                imported = exportName = '*';
            }
            else {
                const variable = this.exportsByName.get(exportName);
                if (variable instanceof SyntheticNamedExportVariable)
                    continue;
                const module = variable.module;
                if (module instanceof Module) {
                    dependency = this.chunkByModule.get(module);
                    if (dependency === this)
                        continue;
                    imported = dependency.getVariableExportName(variable);
                    needsLiveBinding = variable.isReassigned;
                }
                else {
                    dependency = module;
                    imported = variable.name;
                    if (imported !== 'default' && imported !== '*' && interop(module.id) === 'defaultOnly') {
                        return error(errUnexpectedNamedImport(module.id, imported, true));
                    }
                    needsLiveBinding =
                        externalLiveBindings &&
                            (imported !== 'default' || isDefaultAProperty(String(interop(module.id)), true));
                }
            }
            getOrCreate(reexportSpecifiers, dependency, () => []).push({
                imported,
                needsLiveBinding,
                reexported: exportName
            });
        }
        return reexportSpecifiers;
    }
    getReferencedFiles() {
        const referencedFiles = [];
        for (const module of this.orderedModules) {
            for (const meta of module.importMetas) {
                const fileName = meta.getReferencedFileName(this.pluginDriver);
                if (fileName) {
                    referencedFiles.push(fileName);
                }
            }
        }
        return referencedFiles;
    }
    inlineChunkDependencies(chunk) {
        for (const dep of chunk.dependencies) {
            if (this.dependencies.has(dep))
                continue;
            this.dependencies.add(dep);
            if (dep instanceof Chunk) {
                this.inlineChunkDependencies(dep);
            }
        }
    }
    prepareModulesForRendering(snippets) {
        var _a;
        const accessedGlobalsByScope = this.accessedGlobalsByScope;
        for (const module of this.orderedModules) {
            for (const { node, resolution } of module.dynamicImports) {
                if (node.included) {
                    if (resolution instanceof Module) {
                        const chunk = this.chunkByModule.get(resolution);
                        if (chunk === this) {
                            node.setInternalResolution(resolution.namespace);
                        }
                        else {
                            node.setExternalResolution(((_a = this.facadeChunkByModule.get(resolution)) === null || _a === void 0 ? void 0 : _a.exportMode) || chunk.exportMode, resolution, this.outputOptions, snippets, this.pluginDriver, accessedGlobalsByScope);
                        }
                    }
                    else {
                        node.setExternalResolution('external', resolution, this.outputOptions, snippets, this.pluginDriver, accessedGlobalsByScope);
                    }
                }
            }
            for (const importMeta of module.importMetas) {
                importMeta.addAccessedGlobals(this.outputOptions.format, accessedGlobalsByScope);
            }
            if (this.includedNamespaces.has(module) && !this.outputOptions.preserveModules) {
                module.namespace.prepare(accessedGlobalsByScope);
            }
        }
    }
    setExternalRenderPaths(options, inputBase) {
        for (const dependency of [...this.dependencies, ...this.dynamicDependencies]) {
            if (dependency instanceof ExternalModule) {
                dependency.setRenderPath(options, inputBase);
            }
        }
    }
    setIdentifierRenderResolutions({ format, interop, namespaceToStringTag }) {
        const syntheticExports = new Set();
        for (const exportName of this.getExportNames()) {
            const exportVariable = this.exportsByName.get(exportName);
            if (format !== 'es' &&
                format !== 'system' &&
                exportVariable.isReassigned &&
                !exportVariable.isId) {
                exportVariable.setRenderNames('exports', exportName);
            }
            else if (exportVariable instanceof SyntheticNamedExportVariable) {
                syntheticExports.add(exportVariable);
            }
            else {
                exportVariable.setRenderNames(null, null);
            }
        }
        for (const module of this.orderedModules) {
            if (module.needsExportShim) {
                this.needsExportsShim = true;
                break;
            }
        }
        const usedNames = new Set(['Object', 'Promise']);
        if (this.needsExportsShim) {
            usedNames.add(MISSING_EXPORT_SHIM_VARIABLE);
        }
        if (namespaceToStringTag) {
            usedNames.add('Symbol');
        }
        switch (format) {
            case 'system':
                usedNames.add('module').add('exports');
                break;
            case 'es':
                break;
            case 'cjs':
                usedNames.add('module').add('require').add('__filename').add('__dirname');
            // fallthrough
            default:
                usedNames.add('exports');
                for (const helper of HELPER_NAMES) {
                    usedNames.add(helper);
                }
        }
        deconflictChunk(this.orderedModules, this.getDependenciesToBeDeconflicted(format !== 'es' && format !== 'system', format === 'amd' || format === 'umd' || format === 'iife', interop), this.imports, usedNames, format, interop, this.outputOptions.preserveModules, this.outputOptions.externalLiveBindings, this.chunkByModule, syntheticExports, this.exportNamesByVariable, this.accessedGlobalsByScope, this.includedNamespaces);
    }
    setUpChunkImportsAndExportsForModule(module) {
        const moduleImports = new Set(module.includedImports);
        // when we are not preserving modules, we need to make all namespace variables available for
        // rendering the namespace object
        if (!this.outputOptions.preserveModules) {
            if (this.includedNamespaces.has(module)) {
                const memberVariables = module.namespace.getMemberVariables();
                for (const variable of Object.values(memberVariables)) {
                    moduleImports.add(variable);
                }
            }
        }
        for (let variable of moduleImports) {
            if (variable instanceof ExportDefaultVariable) {
                variable = variable.getOriginalVariable();
            }
            if (variable instanceof SyntheticNamedExportVariable) {
                variable = variable.getBaseVariable();
            }
            const chunk = this.chunkByModule.get(variable.module);
            if (chunk !== this) {
                this.imports.add(variable);
                if (!(variable instanceof NamespaceVariable && this.outputOptions.preserveModules) &&
                    variable.module instanceof Module) {
                    chunk.exports.add(variable);
                    this.checkCircularDependencyImport(variable, module);
                }
            }
        }
        if (this.includedNamespaces.has(module) ||
            (module.info.isEntry && module.preserveSignature !== false) ||
            module.includedDynamicImporters.some(importer => this.chunkByModule.get(importer) !== this)) {
            this.ensureReexportsAreAvailableForModule(module);
        }
        for (const { node, resolution } of module.dynamicImports) {
            if (node.included &&
                resolution instanceof Module &&
                this.chunkByModule.get(resolution) === this &&
                !this.includedNamespaces.has(resolution)) {
                this.includedNamespaces.add(resolution);
                this.ensureReexportsAreAvailableForModule(resolution);
            }
        }
    }
}
function getChunkNameFromModule(module) {
    var _a, _b, _c, _d;
    return ((_d = (_b = (_a = module.chunkNames.find(({ isUserDefined }) => isUserDefined)) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : (_c = module.chunkNames[0]) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : getAliasName(module.id));
}
const QUERY_HASH_REGEX = /[?#]/;

const concatSep = (out, next) => (next ? `${out}\n${next}` : out);
const concatDblSep = (out, next) => (next ? `${out}\n\n${next}` : out);
async function createAddons(options, outputPluginDriver) {
    try {
        let [banner, footer, intro, outro] = await Promise.all([
            outputPluginDriver.hookReduceValue('banner', options.banner(), [], concatSep),
            outputPluginDriver.hookReduceValue('footer', options.footer(), [], concatSep),
            outputPluginDriver.hookReduceValue('intro', options.intro(), [], concatDblSep),
            outputPluginDriver.hookReduceValue('outro', options.outro(), [], concatDblSep)
        ]);
        if (intro)
            intro += '\n\n';
        if (outro)
            outro = `\n\n${outro}`;
        if (banner.length)
            banner += '\n';
        if (footer.length)
            footer = '\n' + footer;
        return { banner, footer, intro, outro };
    }
    catch (err) {
        return error({
            code: 'ADDON_ERROR',
            message: `Could not retrieve ${err.hook}. Check configuration of plugin ${err.plugin}.
\tError Message: ${err.message}`
        });
    }
}

function getChunkAssignments(entryModules, manualChunkAliasByEntry) {
    const chunkDefinitions = [];
    const modulesInManualChunks = new Set(manualChunkAliasByEntry.keys());
    const manualChunkModulesByAlias = Object.create(null);
    for (const [entry, alias] of manualChunkAliasByEntry) {
        const chunkModules = (manualChunkModulesByAlias[alias] =
            manualChunkModulesByAlias[alias] || []);
        addStaticDependenciesToManualChunk(entry, chunkModules, modulesInManualChunks);
    }
    for (const [alias, modules] of Object.entries(manualChunkModulesByAlias)) {
        chunkDefinitions.push({ alias, modules });
    }
    const assignedEntryPointsByModule = new Map();
    const { dependentEntryPointsByModule, dynamicEntryModules } = analyzeModuleGraph(entryModules);
    const dynamicallyDependentEntryPointsByDynamicEntry = getDynamicDependentEntryPoints(dependentEntryPointsByModule, dynamicEntryModules);
    const staticEntries = new Set(entryModules);
    function assignEntryToStaticDependencies(entry, dynamicDependentEntryPoints) {
        const modulesToHandle = new Set([entry]);
        for (const module of modulesToHandle) {
            const assignedEntryPoints = getOrCreate(assignedEntryPointsByModule, module, () => new Set());
            if (dynamicDependentEntryPoints &&
                areEntryPointsContainedOrDynamicallyDependent(dynamicDependentEntryPoints, dependentEntryPointsByModule.get(module))) {
                continue;
            }
            else {
                assignedEntryPoints.add(entry);
            }
            for (const dependency of module.getDependenciesToBeIncluded()) {
                if (!(dependency instanceof ExternalModule || modulesInManualChunks.has(dependency))) {
                    modulesToHandle.add(dependency);
                }
            }
        }
    }
    function areEntryPointsContainedOrDynamicallyDependent(entryPoints, containedIn) {
        const entriesToCheck = new Set(entryPoints);
        for (const entry of entriesToCheck) {
            if (!containedIn.has(entry)) {
                if (staticEntries.has(entry))
                    return false;
                const dynamicallyDependentEntryPoints = dynamicallyDependentEntryPointsByDynamicEntry.get(entry);
                for (const dependentEntry of dynamicallyDependentEntryPoints) {
                    entriesToCheck.add(dependentEntry);
                }
            }
        }
        return true;
    }
    for (const entry of entryModules) {
        if (!modulesInManualChunks.has(entry)) {
            assignEntryToStaticDependencies(entry, null);
        }
    }
    for (const entry of dynamicEntryModules) {
        if (!modulesInManualChunks.has(entry)) {
            assignEntryToStaticDependencies(entry, dynamicallyDependentEntryPointsByDynamicEntry.get(entry));
        }
    }
    chunkDefinitions.push(...createChunks([...entryModules, ...dynamicEntryModules], assignedEntryPointsByModule));
    return chunkDefinitions;
}
function addStaticDependenciesToManualChunk(entry, manualChunkModules, modulesInManualChunks) {
    const modulesToHandle = new Set([entry]);
    for (const module of modulesToHandle) {
        modulesInManualChunks.add(module);
        manualChunkModules.push(module);
        for (const dependency of module.dependencies) {
            if (!(dependency instanceof ExternalModule || modulesInManualChunks.has(dependency))) {
                modulesToHandle.add(dependency);
            }
        }
    }
}
function analyzeModuleGraph(entryModules) {
    const dynamicEntryModules = new Set();
    const dependentEntryPointsByModule = new Map();
    const entriesToHandle = new Set(entryModules);
    for (const currentEntry of entriesToHandle) {
        const modulesToHandle = new Set([currentEntry]);
        for (const module of modulesToHandle) {
            getOrCreate(dependentEntryPointsByModule, module, () => new Set()).add(currentEntry);
            for (const dependency of module.getDependenciesToBeIncluded()) {
                if (!(dependency instanceof ExternalModule)) {
                    modulesToHandle.add(dependency);
                }
            }
            for (const { resolution } of module.dynamicImports) {
                if (resolution instanceof Module && resolution.includedDynamicImporters.length > 0) {
                    dynamicEntryModules.add(resolution);
                    entriesToHandle.add(resolution);
                }
            }
            for (const dependency of module.implicitlyLoadedBefore) {
                dynamicEntryModules.add(dependency);
                entriesToHandle.add(dependency);
            }
        }
    }
    return { dependentEntryPointsByModule, dynamicEntryModules };
}
function getDynamicDependentEntryPoints(dependentEntryPointsByModule, dynamicEntryModules) {
    const dynamicallyDependentEntryPointsByDynamicEntry = new Map();
    for (const dynamicEntry of dynamicEntryModules) {
        const dynamicDependentEntryPoints = getOrCreate(dynamicallyDependentEntryPointsByDynamicEntry, dynamicEntry, () => new Set());
        for (const importer of [
            ...dynamicEntry.includedDynamicImporters,
            ...dynamicEntry.implicitlyLoadedAfter
        ]) {
            for (const entryPoint of dependentEntryPointsByModule.get(importer)) {
                dynamicDependentEntryPoints.add(entryPoint);
            }
        }
    }
    return dynamicallyDependentEntryPointsByDynamicEntry;
}
function createChunks(allEntryPoints, assignedEntryPointsByModule) {
    const chunkModules = Object.create(null);
    for (const [module, assignedEntryPoints] of assignedEntryPointsByModule) {
        let chunkSignature = '';
        for (const entry of allEntryPoints) {
            chunkSignature += assignedEntryPoints.has(entry) ? 'X' : '_';
        }
        const chunk = chunkModules[chunkSignature];
        if (chunk) {
            chunk.push(module);
        }
        else {
            chunkModules[chunkSignature] = [module];
        }
    }
    return Object.values(chunkModules).map(modules => ({
        alias: null,
        modules
    }));
}

// ported from https://github.com/substack/node-commondir
function commondir(files) {
    if (files.length === 0)
        return '/';
    if (files.length === 1)
        return dirname(files[0]);
    const commonSegments = files.slice(1).reduce((commonSegments, file) => {
        const pathSegements = file.split(/\/+|\\+/);
        let i;
        for (i = 0; commonSegments[i] === pathSegements[i] &&
            i < Math.min(commonSegments.length, pathSegements.length); i++)
            ;
        return commonSegments.slice(0, i);
    }, files[0].split(/\/+|\\+/));
    // Windows correctly handles paths with forward-slashes
    return commonSegments.length > 1 ? commonSegments.join('/') : '/';
}

const compareExecIndex = (unitA, unitB) => unitA.execIndex > unitB.execIndex ? 1 : -1;
function sortByExecutionOrder(units) {
    units.sort(compareExecIndex);
}
function analyseModuleExecution(entryModules) {
    let nextExecIndex = 0;
    const cyclePaths = [];
    const analysedModules = new Set();
    const dynamicImports = new Set();
    const parents = new Map();
    const orderedModules = [];
    const analyseModule = (module) => {
        if (module instanceof Module) {
            for (const dependency of module.dependencies) {
                if (parents.has(dependency)) {
                    if (!analysedModules.has(dependency)) {
                        cyclePaths.push(getCyclePath(dependency, module, parents));
                    }
                    continue;
                }
                parents.set(dependency, module);
                analyseModule(dependency);
            }
            for (const dependency of module.implicitlyLoadedBefore) {
                dynamicImports.add(dependency);
            }
            for (const { resolution } of module.dynamicImports) {
                if (resolution instanceof Module) {
                    dynamicImports.add(resolution);
                }
            }
            orderedModules.push(module);
        }
        module.execIndex = nextExecIndex++;
        analysedModules.add(module);
    };
    for (const curEntry of entryModules) {
        if (!parents.has(curEntry)) {
            parents.set(curEntry, null);
            analyseModule(curEntry);
        }
    }
    for (const curEntry of dynamicImports) {
        if (!parents.has(curEntry)) {
            parents.set(curEntry, null);
            analyseModule(curEntry);
        }
    }
    return { cyclePaths, orderedModules };
}
function getCyclePath(module, parent, parents) {
    const cycleSymbol = Symbol(module.id);
    const path = [relativeId(module.id)];
    let nextModule = parent;
    module.cycles.add(cycleSymbol);
    while (nextModule !== module) {
        nextModule.cycles.add(cycleSymbol);
        path.push(relativeId(nextModule.id));
        nextModule = parents.get(nextModule);
    }
    path.push(path[0]);
    path.reverse();
    return path;
}

function getGenerateCodeSnippets({ compact, generatedCode: { arrowFunctions, constBindings, objectShorthand, reservedNamesAsProps } }) {
    const { _, n, s } = compact ? { _: '', n: '', s: '' } : { _: ' ', n: '\n', s: ';' };
    const cnst = constBindings ? 'const' : 'var';
    const getNonArrowFunctionIntro = (params, { isAsync, name }) => `${isAsync ? `async ` : ''}function${name ? ` ${name}` : ''}${_}(${params.join(`,${_}`)})${_}`;
    const getFunctionIntro = arrowFunctions
        ? (params, { isAsync, name }) => {
            const singleParam = params.length === 1;
            const asyncString = isAsync ? `async${singleParam ? ' ' : _}` : '';
            return `${name ? `${cnst} ${name}${_}=${_}` : ''}${asyncString}${singleParam ? params[0] : `(${params.join(`,${_}`)})`}${_}=>${_}`;
        }
        : getNonArrowFunctionIntro;
    const getDirectReturnFunction = (params, { functionReturn, lineBreakIndent, name }) => [
        `${getFunctionIntro(params, {
            isAsync: false,
            name
        })}${arrowFunctions
            ? lineBreakIndent
                ? `${n}${lineBreakIndent.base}${lineBreakIndent.t}`
                : ''
            : `{${lineBreakIndent ? `${n}${lineBreakIndent.base}${lineBreakIndent.t}` : _}${functionReturn ? 'return ' : ''}`}`,
        arrowFunctions
            ? `${name ? ';' : ''}${lineBreakIndent ? `${n}${lineBreakIndent.base}` : ''}`
            : `${s}${lineBreakIndent ? `${n}${lineBreakIndent.base}` : _}}`
    ];
    const isValidPropName = reservedNamesAsProps
        ? (name) => validPropName.test(name)
        : (name) => !RESERVED_NAMES$1.has(name) && validPropName.test(name);
    return {
        _,
        cnst,
        getDirectReturnFunction,
        getDirectReturnIifeLeft: (params, returned, { needsArrowReturnParens, needsWrappedFunction }) => {
            const [left, right] = getDirectReturnFunction(params, {
                functionReturn: true,
                lineBreakIndent: null,
                name: null
            });
            return `${wrapIfNeeded(`${left}${wrapIfNeeded(returned, arrowFunctions && needsArrowReturnParens)}${right}`, arrowFunctions || needsWrappedFunction)}(`;
        },
        getFunctionIntro,
        getNonArrowFunctionIntro,
        getObject(fields, { lineBreakIndent }) {
            const prefix = lineBreakIndent ? `${n}${lineBreakIndent.base}${lineBreakIndent.t}` : _;
            return `{${fields
                .map(([key, value]) => {
                if (key === null)
                    return `${prefix}${value}`;
                const needsQuotes = !isValidPropName(key);
                return key === value && objectShorthand && !needsQuotes
                    ? prefix + key
                    : `${prefix}${needsQuotes ? `'${key}'` : key}:${_}${value}`;
            })
                .join(`,`)}${fields.length === 0 ? '' : lineBreakIndent ? `${n}${lineBreakIndent.base}` : _}}`;
        },
        getPropertyAccess: (name) => isValidPropName(name) ? `.${name}` : `[${JSON.stringify(name)}]`,
        n,
        s
    };
}
const wrapIfNeeded = (code, needsParens) => needsParens ? `(${code})` : code;
const validPropName = /^(?!\d)[\w$]+$/;

class Bundle {
    constructor(outputOptions, unsetOptions, inputOptions, pluginDriver, graph) {
        this.outputOptions = outputOptions;
        this.unsetOptions = unsetOptions;
        this.inputOptions = inputOptions;
        this.pluginDriver = pluginDriver;
        this.graph = graph;
        this.facadeChunkByModule = new Map();
        this.includedNamespaces = new Set();
    }
    async generate(isWrite) {
        timeStart('GENERATE', 1);
        const outputBundleBase = Object.create(null);
        const outputBundle = getOutputBundle(outputBundleBase);
        this.pluginDriver.setOutputBundle(outputBundle, this.outputOptions, this.facadeChunkByModule);
        try {
            await this.pluginDriver.hookParallel('renderStart', [this.outputOptions, this.inputOptions]);
            timeStart('generate chunks', 2);
            const chunks = await this.generateChunks();
            if (chunks.length > 1) {
                validateOptionsForMultiChunkOutput(this.outputOptions, this.inputOptions.onwarn);
            }
            const inputBase = commondir(getAbsoluteEntryModulePaths(chunks));
            timeEnd('generate chunks', 2);
            timeStart('render modules', 2);
            // We need to create addons before prerender because at the moment, there
            // can be no async code between prerender and render due to internal state
            const addons = await createAddons(this.outputOptions, this.pluginDriver);
            const snippets = getGenerateCodeSnippets(this.outputOptions);
            this.prerenderChunks(chunks, inputBase, snippets);
            timeEnd('render modules', 2);
            await this.addFinalizedChunksToBundle(chunks, inputBase, addons, outputBundle, snippets);
        }
        catch (err) {
            await this.pluginDriver.hookParallel('renderError', [err]);
            throw err;
        }
        await this.pluginDriver.hookSeq('generateBundle', [
            this.outputOptions,
            outputBundle,
            isWrite
        ]);
        this.finaliseAssets(outputBundle);
        timeEnd('GENERATE', 1);
        return outputBundleBase;
    }
    async addFinalizedChunksToBundle(chunks, inputBase, addons, bundle, snippets) {
        this.assignChunkIds(chunks, inputBase, addons, bundle);
        for (const chunk of chunks) {
            bundle[chunk.id] = chunk.getChunkInfoWithFileNames();
        }
        await Promise.all(chunks.map(async (chunk) => {
            const outputChunk = bundle[chunk.id];
            Object.assign(outputChunk, await chunk.render(this.outputOptions, addons, outputChunk, snippets));
        }));
    }
    async addManualChunks(manualChunks) {
        const manualChunkAliasByEntry = new Map();
        const chunkEntries = await Promise.all(Object.entries(manualChunks).map(async ([alias, files]) => ({
            alias,
            entries: await this.graph.moduleLoader.addAdditionalModules(files)
        })));
        for (const { alias, entries } of chunkEntries) {
            for (const entry of entries) {
                addModuleToManualChunk(alias, entry, manualChunkAliasByEntry);
            }
        }
        return manualChunkAliasByEntry;
    }
    assignChunkIds(chunks, inputBase, addons, bundle) {
        const entryChunks = [];
        const otherChunks = [];
        for (const chunk of chunks) {
            (chunk.facadeModule && chunk.facadeModule.isUserDefinedEntryPoint
                ? entryChunks
                : otherChunks).push(chunk);
        }
        // make sure entry chunk names take precedence with regard to deconflicting
        const chunksForNaming = entryChunks.concat(otherChunks);
        for (const chunk of chunksForNaming) {
            if (this.outputOptions.file) {
                chunk.id = basename(this.outputOptions.file);
            }
            else if (this.outputOptions.preserveModules) {
                chunk.id = chunk.generateIdPreserveModules(inputBase, this.outputOptions, bundle, this.unsetOptions);
            }
            else {
                chunk.id = chunk.generateId(addons, this.outputOptions, bundle, true);
            }
            bundle[chunk.id] = FILE_PLACEHOLDER;
        }
    }
    assignManualChunks(getManualChunk) {
        const manualChunkAliasesWithEntry = [];
        const manualChunksApi = {
            getModuleIds: () => this.graph.modulesById.keys(),
            getModuleInfo: this.graph.getModuleInfo
        };
        for (const module of this.graph.modulesById.values()) {
            if (module instanceof Module) {
                const manualChunkAlias = getManualChunk(module.id, manualChunksApi);
                if (typeof manualChunkAlias === 'string') {
                    manualChunkAliasesWithEntry.push([manualChunkAlias, module]);
                }
            }
        }
        manualChunkAliasesWithEntry.sort(([aliasA], [aliasB]) => aliasA > aliasB ? 1 : aliasA < aliasB ? -1 : 0);
        const manualChunkAliasByEntry = new Map();
        for (const [alias, module] of manualChunkAliasesWithEntry) {
            addModuleToManualChunk(alias, module, manualChunkAliasByEntry);
        }
        return manualChunkAliasByEntry;
    }
    finaliseAssets(outputBundle) {
        for (const file of Object.values(outputBundle)) {
            if (!file.type) {
                warnDeprecation('A plugin is directly adding properties to the bundle object in the "generateBundle" hook. This is deprecated and will be removed in a future Rollup version, please use "this.emitFile" instead.', true, this.inputOptions);
                file.type = 'asset';
            }
            if (this.outputOptions.validate && 'code' in file) {
                try {
                    this.graph.contextParse(file.code, {
                        allowHashBang: true,
                        ecmaVersion: 'latest'
                    });
                }
                catch (err) {
                    this.inputOptions.onwarn(errChunkInvalid(file, err));
                }
            }
        }
        this.pluginDriver.finaliseAssets();
    }
    async generateChunks() {
        const { manualChunks } = this.outputOptions;
        const manualChunkAliasByEntry = typeof manualChunks === 'object'
            ? await this.addManualChunks(manualChunks)
            : this.assignManualChunks(manualChunks);
        const chunks = [];
        const chunkByModule = new Map();
        for (const { alias, modules } of this.outputOptions.inlineDynamicImports
            ? [{ alias: null, modules: getIncludedModules(this.graph.modulesById) }]
            : this.outputOptions.preserveModules
                ? getIncludedModules(this.graph.modulesById).map(module => ({
                    alias: null,
                    modules: [module]
                }))
                : getChunkAssignments(this.graph.entryModules, manualChunkAliasByEntry)) {
            sortByExecutionOrder(modules);
            const chunk = new Chunk(modules, this.inputOptions, this.outputOptions, this.unsetOptions, this.pluginDriver, this.graph.modulesById, chunkByModule, this.facadeChunkByModule, this.includedNamespaces, alias);
            chunks.push(chunk);
            for (const module of modules) {
                chunkByModule.set(module, chunk);
            }
        }
        for (const chunk of chunks) {
            chunk.link();
        }
        const facades = [];
        for (const chunk of chunks) {
            facades.push(...chunk.generateFacades());
        }
        return [...chunks, ...facades];
    }
    prerenderChunks(chunks, inputBase, snippets) {
        for (const chunk of chunks) {
            chunk.generateExports();
        }
        for (const chunk of chunks) {
            chunk.preRender(this.outputOptions, inputBase, snippets);
        }
    }
}
function getAbsoluteEntryModulePaths(chunks) {
    const absoluteEntryModulePaths = [];
    for (const chunk of chunks) {
        for (const entryModule of chunk.entryModules) {
            if (isAbsolute(entryModule.id)) {
                absoluteEntryModulePaths.push(entryModule.id);
            }
        }
    }
    return absoluteEntryModulePaths;
}
function validateOptionsForMultiChunkOutput(outputOptions, onWarn) {
    if (outputOptions.format === 'umd' || outputOptions.format === 'iife')
        return error(errInvalidOption('output.format', 'outputformat', 'UMD and IIFE output formats are not supported for code-splitting builds', outputOptions.format));
    if (typeof outputOptions.file === 'string')
        return error(errInvalidOption('output.file', 'outputdir', 'when building multiple chunks, the "output.dir" option must be used, not "output.file". To inline dynamic imports, set the "inlineDynamicImports" option'));
    if (outputOptions.sourcemapFile)
        return error(errInvalidOption('output.sourcemapFile', 'outputsourcemapfile', '"output.sourcemapFile" is only supported for single-file builds'));
    if (!outputOptions.amd.autoId && outputOptions.amd.id)
        onWarn(errInvalidOption('output.amd.id', 'outputamd', 'this option is only properly supported for single-file builds. Use "output.amd.autoId" and "output.amd.basePath" instead'));
}
function getIncludedModules(modulesById) {
    return [...modulesById.values()].filter((module) => module instanceof Module &&
        (module.isIncluded() || module.info.isEntry || module.includedDynamicImporters.length > 0));
}
function addModuleToManualChunk(alias, module, manualChunkAliasByEntry) {
    const existingAlias = manualChunkAliasByEntry.get(module);
    if (typeof existingAlias === 'string' && existingAlias !== alias) {
        return error(errCannotAssignModuleToChunk(module.id, alias, existingAlias));
    }
    manualChunkAliasByEntry.set(module, alias);
}

// This file was generated. Do not modify manually!
var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 370, 1, 154, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 161, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 193, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 84, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 406, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 330, 3, 19306, 9, 87, 9, 39, 4, 60, 6, 26, 9, 1014, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4706, 45, 3, 22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 262, 6, 10, 9, 357, 0, 62, 13, 1495, 6, 110, 6, 6, 9, 4759, 9, 787719, 239];

// This file was generated. Do not modify manually!
var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10, 2, 14, 2, 6, 2, 1, 68, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 349, 41, 7, 1, 79, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 85, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 159, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 264, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 328, 18, 190, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1070, 4050, 582, 8634, 568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 689, 63, 129, 74, 6, 0, 67, 12, 65, 1, 2, 0, 29, 6135, 9, 1237, 43, 8, 8936, 3, 2, 6, 2, 1, 2, 290, 46, 2, 18, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 482, 44, 11, 6, 17, 0, 322, 29, 19, 43, 1269, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33, 4152, 8, 221, 3, 5761, 15, 7472, 3104, 541, 1507, 4938];

// This file was generated. Do not modify manually!
var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u0898-\u089f\u08ca-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b55-\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3c\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d81-\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1715\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u180f-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1abf-\u1ace\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf4\u1cf7-\u1cf9\u1dc0-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua82c\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";

// This file was generated. Do not modify manually!
var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u0870-\u0887\u0889-\u088e\u08a0-\u08c9\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c5d\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cdd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d04-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u1711\u171f-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4c\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31bf\u31f0-\u31ff\u3400-\u4dbf\u4e00-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ca\ua7d0\ua7d1\ua7d3\ua7d5-\ua7d9\ua7f2-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab69\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";

// These are a run-length and offset encoded representation of the

// Reserved word lists for various dialects of the language

var reservedWords = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};

// And the keywords

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var keywords$1 = {
  5: ecma5AndLessKeywords,
  "5module": ecma5AndLessKeywords + " export import",
  6: ecma5AndLessKeywords + " const class extends export import super"
};

var keywordRelationalOperator = /^in(stanceof)?$/;

// ## Character categories

var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

// This has a complexity linear to the value of the code. The
// assumption is that looking up astral identifier characters is
// rare.
function isInAstralSet(code, set) {
  var pos = 0x10000;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) { return false }
    pos += set[i + 1];
    if (pos >= code) { return true }
  }
}

// Test whether a given character code starts an identifier.

function isIdentifierStart(code, astral) {
  if (code < 65) { return code === 36 }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes)
}

// Test whether a given character is part of an identifier.

function isIdentifierChar(code, astral) {
  if (code < 48) { return code === 36 }
  if (code < 58) { return true }
  if (code < 65) { return false }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
}

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// The `startsExpr` property is used to check if the token ends a
// `yield` expression. It is set on all token types that either can
// directly start an expression (like a quotation mark) or can
// continue an expression (like the body of a string).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

var TokenType = function TokenType(label, conf) {
  if ( conf === void 0 ) conf = {};

  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};

function binop(name, prec) {
  return new TokenType(name, {beforeExpr: true, binop: prec})
}
var beforeExpr = {beforeExpr: true}, startsExpr = {startsExpr: true};

// Map keyword names to token types.

var keywords = {};

// Succinct definitions of keyword token types
function kw(name, options) {
  if ( options === void 0 ) options = {};

  options.keyword = name;
  return keywords[name] = new TokenType(name, options)
}

var types$1 = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  privateId: new TokenType("privateId", startsExpr),
  eof: new TokenType("eof"),

  // Punctuation token types.
  bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  questionDot: new TokenType("?."),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  invalidTemplate: new TokenType("invalidTemplate"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", {beforeExpr: true, startsExpr: true}),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
  assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
  incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
  prefix: new TokenType("!/~", {beforeExpr: true, prefix: true, startsExpr: true}),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=/===/!==", 6),
  relational: binop("</>/<=/>=", 7),
  bitShift: binop("<</>>/>>>", 8),
  plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  starstar: new TokenType("**", {beforeExpr: true}),
  coalesce: binop("??", 1),

  // Keyword token types.
  _break: kw("break"),
  _case: kw("case", beforeExpr),
  _catch: kw("catch"),
  _continue: kw("continue"),
  _debugger: kw("debugger"),
  _default: kw("default", beforeExpr),
  _do: kw("do", {isLoop: true, beforeExpr: true}),
  _else: kw("else", beforeExpr),
  _finally: kw("finally"),
  _for: kw("for", {isLoop: true}),
  _function: kw("function", startsExpr),
  _if: kw("if"),
  _return: kw("return", beforeExpr),
  _switch: kw("switch"),
  _throw: kw("throw", beforeExpr),
  _try: kw("try"),
  _var: kw("var"),
  _const: kw("const"),
  _while: kw("while", {isLoop: true}),
  _with: kw("with"),
  _new: kw("new", {beforeExpr: true, startsExpr: true}),
  _this: kw("this", startsExpr),
  _super: kw("super", startsExpr),
  _class: kw("class", startsExpr),
  _extends: kw("extends", beforeExpr),
  _export: kw("export"),
  _import: kw("import", startsExpr),
  _null: kw("null", startsExpr),
  _true: kw("true", startsExpr),
  _false: kw("false", startsExpr),
  _in: kw("in", {beforeExpr: true, binop: 7}),
  _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
  _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
  _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
  _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
};

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\r\n?|\n|\u2028|\u2029/;
var lineBreakG = new RegExp(lineBreak.source, "g");

function isNewLine(code) {
  return code === 10 || code === 13 || code === 0x2028 || code === 0x2029
}

function nextLineBreak(code, from, end) {
  if ( end === void 0 ) end = code.length;

  for (var i = from; i < end; i++) {
    var next = code.charCodeAt(i);
    if (isNewLine(next))
      { return i < end - 1 && next === 13 && code.charCodeAt(i + 1) === 10 ? i + 2 : i + 1 }
  }
  return -1
}

var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

var ref = Object.prototype;
var hasOwnProperty = ref.hasOwnProperty;
var toString = ref.toString;

var hasOwn = Object.hasOwn || (function (obj, propName) { return (
  hasOwnProperty.call(obj, propName)
); });

var isArray = Array.isArray || (function (obj) { return (
  toString.call(obj) === "[object Array]"
); });

function wordsRegexp(words) {
  return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$")
}

function codePointToString(code) {
  // UTF-16 Decoding
  if (code <= 0xFFFF) { return String.fromCharCode(code) }
  code -= 0x10000;
  return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
}

var loneSurrogate = /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/;

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.

var Position = function Position(line, col) {
  this.line = line;
  this.column = col;
};

Position.prototype.offset = function offset (n) {
  return new Position(this.line, this.column + n)
};

var SourceLocation = function SourceLocation(p, start, end) {
  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) { this.source = p.sourceFile; }
};

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

function getLineInfo(input, offset) {
  for (var line = 1, cur = 0;;) {
    var nextBreak = nextLineBreak(input, cur, offset);
    if (nextBreak < 0) { return new Position(line, offset - cur) }
    ++line;
    cur = nextBreak;
  }
}

// A second argument must be given to configure the parser process.
// These options are recognized (only `ecmaVersion` is required):

var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must be
  // either 3, 5, 6 (or 2015), 7 (2016), 8 (2017), 9 (2018), 10
  // (2019), 11 (2020), 12 (2021), 13 (2022), or `"latest"` (the
  // latest version the library supports). This influences support
  // for strict mode, the set of reserved words, and support for
  // new syntax features.
  ecmaVersion: null,
  // `sourceType` indicates the mode the code should be parsed in.
  // Can be either `"script"` or `"module"`. This influences global
  // strict mode and parsing of `import` and `export` declarations.
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called
  // when a semicolon is automatically inserted. It will be passed
  // the position of the comma as an offset, and if `locations` is
  // enabled, it is given the location as a `{line, column}` object
  // as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set `allowReserved` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program, and an import.meta expression
  // in a script isn't considered an error.
  allowImportExportEverywhere: false,
  // By default, await identifiers are allowed to appear at the top-level scope only if ecmaVersion >= 2022.
  // When enabled, await identifiers are allowed to appear at the top-level scope,
  // but they are still not allowed in non-async functions.
  allowAwaitOutsideFunction: null,
  // When enabled, super identifiers are not constrained to
  // appearing in methods and do not raise an error when they appear elsewhere.
  allowSuperOutsideMethod: null,
  // When enabled, hashbang directive in the beginning of file
  // is allowed and treated as a line comment.
  allowHashBang: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from `tokenizer().getToken()`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false
};

// Interpret and default an options object

var warnedAboutEcmaVersion = false;

function getOptions(opts) {
  var options = {};

  for (var opt in defaultOptions)
    { options[opt] = opts && hasOwn(opts, opt) ? opts[opt] : defaultOptions[opt]; }

  if (options.ecmaVersion === "latest") {
    options.ecmaVersion = 1e8;
  } else if (options.ecmaVersion == null) {
    if (!warnedAboutEcmaVersion && typeof console === "object" && console.warn) {
      warnedAboutEcmaVersion = true;
      console.warn("Since Acorn 8.0.0, options.ecmaVersion is required.\nDefaulting to 2020, but this will stop working in the future.");
    }
    options.ecmaVersion = 11;
  } else if (options.ecmaVersion >= 2015) {
    options.ecmaVersion -= 2009;
  }

  if (options.allowReserved == null)
    { options.allowReserved = options.ecmaVersion < 5; }

  if (isArray(options.onToken)) {
    var tokens = options.onToken;
    options.onToken = function (token) { return tokens.push(token); };
  }
  if (isArray(options.onComment))
    { options.onComment = pushComment(options, options.onComment); }

  return options
}

function pushComment(options, array) {
  return function(block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start: start,
      end: end
    };
    if (options.locations)
      { comment.loc = new SourceLocation(this, startLoc, endLoc); }
    if (options.ranges)
      { comment.range = [start, end]; }
    array.push(comment);
  }
}

// Each scope gets a bitset that may contain these flags
var
    SCOPE_TOP = 1,
    SCOPE_FUNCTION = 2,
    SCOPE_ASYNC = 4,
    SCOPE_GENERATOR = 8,
    SCOPE_ARROW = 16,
    SCOPE_SIMPLE_CATCH = 32,
    SCOPE_SUPER = 64,
    SCOPE_DIRECT_SUPER = 128,
    SCOPE_CLASS_STATIC_BLOCK = 256,
    SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK;

function functionFlags(async, generator) {
  return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0)
}

// Used in checkLVal* and declareName to determine the type of a binding
var
    BIND_NONE = 0, // Not a binding
    BIND_VAR = 1, // Var-style binding
    BIND_LEXICAL = 2, // Let- or const-style binding
    BIND_FUNCTION = 3, // Function declaration
    BIND_SIMPLE_CATCH = 4, // Simple (identifier pattern) catch binding
    BIND_OUTSIDE = 5; // Special case for function names as bound inside the function

var Parser = function Parser(options, input, startPos) {
  this.options = options = getOptions(options);
  this.sourceFile = options.sourceFile;
  this.keywords = wordsRegexp(keywords$1[options.ecmaVersion >= 6 ? 6 : options.sourceType === "module" ? "5module" : 5]);
  var reserved = "";
  if (options.allowReserved !== true) {
    reserved = reservedWords[options.ecmaVersion >= 6 ? 6 : options.ecmaVersion === 5 ? 5 : 3];
    if (options.sourceType === "module") { reserved += " await"; }
  }
  this.reservedWords = wordsRegexp(reserved);
  var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
  this.reservedWordsStrict = wordsRegexp(reservedStrict);
  this.reservedWordsStrictBind = wordsRegexp(reservedStrict + " " + reservedWords.strictBind);
  this.input = String(input);

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.
  this.containsEsc = false;

  // Set up token state

  // The current position of the tokenizer in the input.
  if (startPos) {
    this.pos = startPos;
    this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
    this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }

  // Properties of the current token:
  // Its type
  this.type = types$1.eof;
  // For tokens that include more information than their type, the value
  this.value = null;
  // Its start and end offset
  this.start = this.end = this.pos;
  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  this.startLoc = this.endLoc = this.curPosition();

  // Position information for the previous token
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;

  // The context stack is used to superficially track syntactic
  // context to predict whether a regular expression is allowed in a
  // given position.
  this.context = this.initialContext();
  this.exprAllowed = true;

  // Figure out if it's a module code.
  this.inModule = options.sourceType === "module";
  this.strict = this.inModule || this.strictDirective(this.pos);

  // Used to signify the start of a potential arrow function
  this.potentialArrowAt = -1;
  this.potentialArrowInForAwait = false;

  // Positions to delayed-check that yield/await does not exist in default parameters.
  this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
  // Labels in scope.
  this.labels = [];
  // Thus-far undefined exports.
  this.undefinedExports = Object.create(null);

  // If enabled, skip leading hashbang line.
  if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!")
    { this.skipLineComment(2); }

  // Scope tracking for duplicate variable names (see scope.js)
  this.scopeStack = [];
  this.enterScope(SCOPE_TOP);

  // For RegExp validation
  this.regexpState = null;

  // The stack of private names.
  // Each element has two properties: 'declared' and 'used'.
  // When it exited from the outermost class definition, all used private names must be declared.
  this.privateNameStack = [];
};

var prototypeAccessors = { inFunction: { configurable: true },inGenerator: { configurable: true },inAsync: { configurable: true },canAwait: { configurable: true },allowSuper: { configurable: true },allowDirectSuper: { configurable: true },treatFunctionsAsVar: { configurable: true },allowNewDotTarget: { configurable: true },inClassStaticBlock: { configurable: true } };

Parser.prototype.parse = function parse () {
  var node = this.options.program || this.startNode();
  this.nextToken();
  return this.parseTopLevel(node)
};

prototypeAccessors.inFunction.get = function () { return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0 };

prototypeAccessors.inGenerator.get = function () { return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0 && !this.currentVarScope().inClassFieldInit };

prototypeAccessors.inAsync.get = function () { return (this.currentVarScope().flags & SCOPE_ASYNC) > 0 && !this.currentVarScope().inClassFieldInit };

prototypeAccessors.canAwait.get = function () {
  for (var i = this.scopeStack.length - 1; i >= 0; i--) {
    var scope = this.scopeStack[i];
    if (scope.inClassFieldInit || scope.flags & SCOPE_CLASS_STATIC_BLOCK) { return false }
    if (scope.flags & SCOPE_FUNCTION) { return (scope.flags & SCOPE_ASYNC) > 0 }
  }
  return (this.inModule && this.options.ecmaVersion >= 13) || this.options.allowAwaitOutsideFunction
};

prototypeAccessors.allowSuper.get = function () {
  var ref = this.currentThisScope();
    var flags = ref.flags;
    var inClassFieldInit = ref.inClassFieldInit;
  return (flags & SCOPE_SUPER) > 0 || inClassFieldInit || this.options.allowSuperOutsideMethod
};

prototypeAccessors.allowDirectSuper.get = function () { return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0 };

prototypeAccessors.treatFunctionsAsVar.get = function () { return this.treatFunctionsAsVarInScope(this.currentScope()) };

prototypeAccessors.allowNewDotTarget.get = function () {
  var ref = this.currentThisScope();
    var flags = ref.flags;
    var inClassFieldInit = ref.inClassFieldInit;
  return (flags & (SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK)) > 0 || inClassFieldInit
};

prototypeAccessors.inClassStaticBlock.get = function () {
  return (this.currentVarScope().flags & SCOPE_CLASS_STATIC_BLOCK) > 0
};

Parser.extend = function extend () {
    var plugins = [], len = arguments.length;
    while ( len-- ) plugins[ len ] = arguments[ len ];

  var cls = this;
  for (var i = 0; i < plugins.length; i++) { cls = plugins[i](cls); }
  return cls
};

Parser.parse = function parse (input, options) {
  return new this(options, input).parse()
};

Parser.parseExpressionAt = function parseExpressionAt (input, pos, options) {
  var parser = new this(options, input, pos);
  parser.nextToken();
  return parser.parseExpression()
};

Parser.tokenizer = function tokenizer (input, options) {
  return new this(options, input)
};

Object.defineProperties( Parser.prototype, prototypeAccessors );

var pp$9 = Parser.prototype;

// ## Parser utilities

var literal = /^(?:'((?:\\.|[^'\\])*?)'|"((?:\\.|[^"\\])*?)")/;
pp$9.strictDirective = function(start) {
  if (this.options.ecmaVersion < 5) { return false }
  for (;;) {
    // Try to find string literal.
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    var match = literal.exec(this.input.slice(start));
    if (!match) { return false }
    if ((match[1] || match[2]) === "use strict") {
      skipWhiteSpace.lastIndex = start + match[0].length;
      var spaceAfter = skipWhiteSpace.exec(this.input), end = spaceAfter.index + spaceAfter[0].length;
      var next = this.input.charAt(end);
      return next === ";" || next === "}" ||
        (lineBreak.test(spaceAfter[0]) &&
         !(/[(`.[+\-/*%<>=,?^&]/.test(next) || next === "!" && this.input.charAt(end + 1) === "="))
    }
    start += match[0].length;

    // Skip semicolon, if any.
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    if (this.input[start] === ";")
      { start++; }
  }
};

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

pp$9.eat = function(type) {
  if (this.type === type) {
    this.next();
    return true
  } else {
    return false
  }
};

// Tests whether parsed token is a contextual keyword.

pp$9.isContextual = function(name) {
  return this.type === types$1.name && this.value === name && !this.containsEsc
};

// Consumes contextual keyword if possible.

pp$9.eatContextual = function(name) {
  if (!this.isContextual(name)) { return false }
  this.next();
  return true
};

// Asserts that following token is given contextual keyword.

pp$9.expectContextual = function(name) {
  if (!this.eatContextual(name)) { this.unexpected(); }
};

// Test whether a semicolon can be inserted at the current position.

pp$9.canInsertSemicolon = function() {
  return this.type === types$1.eof ||
    this.type === types$1.braceR ||
    lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

pp$9.insertSemicolon = function() {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon)
      { this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc); }
    return true
  }
};

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

pp$9.semicolon = function() {
  if (!this.eat(types$1.semi) && !this.insertSemicolon()) { this.unexpected(); }
};

pp$9.afterTrailingComma = function(tokType, notNext) {
  if (this.type === tokType) {
    if (this.options.onTrailingComma)
      { this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc); }
    if (!notNext)
      { this.next(); }
    return true
  }
};

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

pp$9.expect = function(type) {
  this.eat(type) || this.unexpected();
};

// Raise an unexpected token error.

pp$9.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};

var DestructuringErrors = function DestructuringErrors() {
  this.shorthandAssign =
  this.trailingComma =
  this.parenthesizedAssign =
  this.parenthesizedBind =
  this.doubleProto =
    -1;
};

pp$9.checkPatternErrors = function(refDestructuringErrors, isAssign) {
  if (!refDestructuringErrors) { return }
  if (refDestructuringErrors.trailingComma > -1)
    { this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element"); }
  var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
  if (parens > -1) { this.raiseRecoverable(parens, "Parenthesized pattern"); }
};

pp$9.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
  if (!refDestructuringErrors) { return false }
  var shorthandAssign = refDestructuringErrors.shorthandAssign;
  var doubleProto = refDestructuringErrors.doubleProto;
  if (!andThrow) { return shorthandAssign >= 0 || doubleProto >= 0 }
  if (shorthandAssign >= 0)
    { this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns"); }
  if (doubleProto >= 0)
    { this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property"); }
};

pp$9.checkYieldAwaitInDefaultParams = function() {
  if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
    { this.raise(this.yieldPos, "Yield expression cannot be a default value"); }
  if (this.awaitPos)
    { this.raise(this.awaitPos, "Await expression cannot be a default value"); }
};

pp$9.isSimpleAssignTarget = function(expr) {
  if (expr.type === "ParenthesizedExpression")
    { return this.isSimpleAssignTarget(expr.expression) }
  return expr.type === "Identifier" || expr.type === "MemberExpression"
};

var pp$8 = Parser.prototype;

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp$8.parseTopLevel = function(node) {
  var exports = Object.create(null);
  if (!node.body) { node.body = []; }
  while (this.type !== types$1.eof) {
    var stmt = this.parseStatement(null, true, exports);
    node.body.push(stmt);
  }
  if (this.inModule)
    { for (var i = 0, list = Object.keys(this.undefinedExports); i < list.length; i += 1)
      {
        var name = list[i];

        this.raiseRecoverable(this.undefinedExports[name].start, ("Export '" + name + "' is not defined"));
      } }
  this.adaptDirectivePrologue(node.body);
  this.next();
  node.sourceType = this.options.sourceType;
  return this.finishNode(node, "Program")
};

var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

pp$8.isLet = function(context) {
  if (this.options.ecmaVersion < 6 || !this.isContextual("let")) { return false }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
  // For ambiguous cases, determine if a LexicalDeclaration (or only a
  // Statement) is allowed here. If context is not empty then only a Statement
  // is allowed. However, `let [` is an explicit negative lookahead for
  // ExpressionStatement, so special-case it first.
  if (nextCh === 91 || nextCh === 92 || nextCh > 0xd7ff && nextCh < 0xdc00) { return true } // '[', '/', astral
  if (context) { return false }

  if (nextCh === 123) { return true } // '{'
  if (isIdentifierStart(nextCh, true)) {
    var pos = next + 1;
    while (isIdentifierChar(nextCh = this.input.charCodeAt(pos), true)) { ++pos; }
    if (nextCh === 92 || nextCh > 0xd7ff && nextCh < 0xdc00) { return true }
    var ident = this.input.slice(next, pos);
    if (!keywordRelationalOperator.test(ident)) { return true }
  }
  return false
};

// check 'async [no LineTerminator here] function'
// - 'async /*foo*/ function' is OK.
// - 'async /*\n*/ function' is invalid.
pp$8.isAsyncFunction = function() {
  if (this.options.ecmaVersion < 8 || !this.isContextual("async"))
    { return false }

  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, after;
  return !lineBreak.test(this.input.slice(this.pos, next)) &&
    this.input.slice(next, next + 8) === "function" &&
    (next + 8 === this.input.length ||
     !(isIdentifierChar(after = this.input.charCodeAt(next + 8)) || after > 0xd7ff && after < 0xdc00))
};

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.

pp$8.parseStatement = function(context, topLevel, exports) {
  var starttype = this.type, node = this.startNode(), kind;

  if (this.isLet(context)) {
    starttype = types$1._var;
    kind = "let";
  }

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
  case types$1._break: case types$1._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
  case types$1._debugger: return this.parseDebuggerStatement(node)
  case types$1._do: return this.parseDoStatement(node)
  case types$1._for: return this.parseForStatement(node)
  case types$1._function:
    // Function as sole body of either an if statement or a labeled statement
    // works, but not when it is part of a labeled statement that is the sole
    // body of an if statement.
    if ((context && (this.strict || context !== "if" && context !== "label")) && this.options.ecmaVersion >= 6) { this.unexpected(); }
    return this.parseFunctionStatement(node, false, !context)
  case types$1._class:
    if (context) { this.unexpected(); }
    return this.parseClass(node, true)
  case types$1._if: return this.parseIfStatement(node)
  case types$1._return: return this.parseReturnStatement(node)
  case types$1._switch: return this.parseSwitchStatement(node)
  case types$1._throw: return this.parseThrowStatement(node)
  case types$1._try: return this.parseTryStatement(node)
  case types$1._const: case types$1._var:
    kind = kind || this.value;
    if (context && kind !== "var") { this.unexpected(); }
    return this.parseVarStatement(node, kind)
  case types$1._while: return this.parseWhileStatement(node)
  case types$1._with: return this.parseWithStatement(node)
  case types$1.braceL: return this.parseBlock(true, node)
  case types$1.semi: return this.parseEmptyStatement(node)
  case types$1._export:
  case types$1._import:
    if (this.options.ecmaVersion > 10 && starttype === types$1._import) {
      skipWhiteSpace.lastIndex = this.pos;
      var skip = skipWhiteSpace.exec(this.input);
      var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
      if (nextCh === 40 || nextCh === 46) // '(' or '.'
        { return this.parseExpressionStatement(node, this.parseExpression()) }
    }

    if (!this.options.allowImportExportEverywhere) {
      if (!topLevel)
        { this.raise(this.start, "'import' and 'export' may only appear at the top level"); }
      if (!this.inModule)
        { this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'"); }
    }
    return starttype === types$1._import ? this.parseImport(node) : this.parseExport(node, exports)

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
  default:
    if (this.isAsyncFunction()) {
      if (context) { this.unexpected(); }
      this.next();
      return this.parseFunctionStatement(node, true, !context)
    }

    var maybeName = this.value, expr = this.parseExpression();
    if (starttype === types$1.name && expr.type === "Identifier" && this.eat(types$1.colon))
      { return this.parseLabeledStatement(node, maybeName, expr, context) }
    else { return this.parseExpressionStatement(node, expr) }
  }
};

pp$8.parseBreakContinueStatement = function(node, keyword) {
  var isBreak = keyword === "break";
  this.next();
  if (this.eat(types$1.semi) || this.insertSemicolon()) { node.label = null; }
  else if (this.type !== types$1.name) { this.unexpected(); }
  else {
    node.label = this.parseIdent();
    this.semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  var i = 0;
  for (; i < this.labels.length; ++i) {
    var lab = this.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) { break }
      if (node.label && isBreak) { break }
    }
  }
  if (i === this.labels.length) { this.raise(node.start, "Unsyntactic " + keyword); }
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
};

pp$8.parseDebuggerStatement = function(node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement")
};

pp$8.parseDoStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("do");
  this.labels.pop();
  this.expect(types$1._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6)
    { this.eat(types$1.semi); }
  else
    { this.semicolon(); }
  return this.finishNode(node, "DoWhileStatement")
};

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.

pp$8.parseForStatement = function(node) {
  this.next();
  var awaitAt = (this.options.ecmaVersion >= 9 && this.canAwait && this.eatContextual("await")) ? this.lastTokStart : -1;
  this.labels.push(loopLabel);
  this.enterScope(0);
  this.expect(types$1.parenL);
  if (this.type === types$1.semi) {
    if (awaitAt > -1) { this.unexpected(awaitAt); }
    return this.parseFor(node, null)
  }
  var isLet = this.isLet();
  if (this.type === types$1._var || this.type === types$1._const || isLet) {
    var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
    this.next();
    this.parseVar(init$1, true, kind);
    this.finishNode(init$1, "VariableDeclaration");
    if ((this.type === types$1._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1) {
      if (this.options.ecmaVersion >= 9) {
        if (this.type === types$1._in) {
          if (awaitAt > -1) { this.unexpected(awaitAt); }
        } else { node.await = awaitAt > -1; }
      }
      return this.parseForIn(node, init$1)
    }
    if (awaitAt > -1) { this.unexpected(awaitAt); }
    return this.parseFor(node, init$1)
  }
  var startsWithLet = this.isContextual("let"), isForOf = false;
  var refDestructuringErrors = new DestructuringErrors;
  var init = this.parseExpression(awaitAt > -1 ? "await" : true, refDestructuringErrors);
  if (this.type === types$1._in || (isForOf = this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
    if (this.options.ecmaVersion >= 9) {
      if (this.type === types$1._in) {
        if (awaitAt > -1) { this.unexpected(awaitAt); }
      } else { node.await = awaitAt > -1; }
    }
    if (startsWithLet && isForOf) { this.raise(init.start, "The left-hand side of a for-of loop may not start with 'let'."); }
    this.toAssignable(init, false, refDestructuringErrors);
    this.checkLValPattern(init);
    return this.parseForIn(node, init)
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  if (awaitAt > -1) { this.unexpected(awaitAt); }
  return this.parseFor(node, init)
};

pp$8.parseFunctionStatement = function(node, isAsync, declarationPosition) {
  this.next();
  return this.parseFunction(node, FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT), false, isAsync)
};

pp$8.parseIfStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  // allow function declarations in branches, but only in non-strict mode
  node.consequent = this.parseStatement("if");
  node.alternate = this.eat(types$1._else) ? this.parseStatement("if") : null;
  return this.finishNode(node, "IfStatement")
};

pp$8.parseReturnStatement = function(node) {
  if (!this.inFunction && !this.options.allowReturnOutsideFunction)
    { this.raise(this.start, "'return' outside of function"); }
  this.next();

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (this.eat(types$1.semi) || this.insertSemicolon()) { node.argument = null; }
  else { node.argument = this.parseExpression(); this.semicolon(); }
  return this.finishNode(node, "ReturnStatement")
};

pp$8.parseSwitchStatement = function(node) {
  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(types$1.braceL);
  this.labels.push(switchLabel);
  this.enterScope(0);

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  var cur;
  for (var sawDefault = false; this.type !== types$1.braceR;) {
    if (this.type === types$1._case || this.type === types$1._default) {
      var isCase = this.type === types$1._case;
      if (cur) { this.finishNode(cur, "SwitchCase"); }
      node.cases.push(cur = this.startNode());
      cur.consequent = [];
      this.next();
      if (isCase) {
        cur.test = this.parseExpression();
      } else {
        if (sawDefault) { this.raiseRecoverable(this.lastTokStart, "Multiple default clauses"); }
        sawDefault = true;
        cur.test = null;
      }
      this.expect(types$1.colon);
    } else {
      if (!cur) { this.unexpected(); }
      cur.consequent.push(this.parseStatement(null));
    }
  }
  this.exitScope();
  if (cur) { this.finishNode(cur, "SwitchCase"); }
  this.next(); // Closing brace
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement")
};

pp$8.parseThrowStatement = function(node) {
  this.next();
  if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
    { this.raise(this.lastTokEnd, "Illegal newline after throw"); }
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement")
};

// Reused empty array added for node fields that are always empty.

var empty$1 = [];

pp$8.parseTryStatement = function(node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === types$1._catch) {
    var clause = this.startNode();
    this.next();
    if (this.eat(types$1.parenL)) {
      clause.param = this.parseBindingAtom();
      var simple = clause.param.type === "Identifier";
      this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
      this.checkLValPattern(clause.param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
      this.expect(types$1.parenR);
    } else {
      if (this.options.ecmaVersion < 10) { this.unexpected(); }
      clause.param = null;
      this.enterScope(0);
    }
    clause.body = this.parseBlock(false);
    this.exitScope();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(types$1._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer)
    { this.raise(node.start, "Missing catch or finally clause"); }
  return this.finishNode(node, "TryStatement")
};

pp$8.parseVarStatement = function(node, kind) {
  this.next();
  this.parseVar(node, false, kind);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration")
};

pp$8.parseWhileStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("while");
  this.labels.pop();
  return this.finishNode(node, "WhileStatement")
};

pp$8.parseWithStatement = function(node) {
  if (this.strict) { this.raise(this.start, "'with' in strict mode"); }
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement("with");
  return this.finishNode(node, "WithStatement")
};

pp$8.parseEmptyStatement = function(node) {
  this.next();
  return this.finishNode(node, "EmptyStatement")
};

pp$8.parseLabeledStatement = function(node, maybeName, expr, context) {
  for (var i$1 = 0, list = this.labels; i$1 < list.length; i$1 += 1)
    {
    var label = list[i$1];

    if (label.name === maybeName)
      { this.raise(expr.start, "Label '" + maybeName + "' is already declared");
  } }
  var kind = this.type.isLoop ? "loop" : this.type === types$1._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label$1 = this.labels[i];
    if (label$1.statementStart === node.start) {
      // Update information about previous labels on this node
      label$1.statementStart = this.start;
      label$1.kind = kind;
    } else { break }
  }
  this.labels.push({name: maybeName, kind: kind, statementStart: this.start});
  node.body = this.parseStatement(context ? context.indexOf("label") === -1 ? context + "label" : context : "label");
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement")
};

pp$8.parseExpressionStatement = function(node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement")
};

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).

pp$8.parseBlock = function(createNewLexicalScope, node, exitStrict) {
  if ( createNewLexicalScope === void 0 ) createNewLexicalScope = true;
  if ( node === void 0 ) node = this.startNode();

  node.body = [];
  this.expect(types$1.braceL);
  if (createNewLexicalScope) { this.enterScope(0); }
  while (this.type !== types$1.braceR) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  if (exitStrict) { this.strict = false; }
  this.next();
  if (createNewLexicalScope) { this.exitScope(); }
  return this.finishNode(node, "BlockStatement")
};

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

pp$8.parseFor = function(node, init) {
  node.init = init;
  this.expect(types$1.semi);
  node.test = this.type === types$1.semi ? null : this.parseExpression();
  this.expect(types$1.semi);
  node.update = this.type === types$1.parenR ? null : this.parseExpression();
  this.expect(types$1.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, "ForStatement")
};

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

pp$8.parseForIn = function(node, init) {
  var isForIn = this.type === types$1._in;
  this.next();

  if (
    init.type === "VariableDeclaration" &&
    init.declarations[0].init != null &&
    (
      !isForIn ||
      this.options.ecmaVersion < 8 ||
      this.strict ||
      init.kind !== "var" ||
      init.declarations[0].id.type !== "Identifier"
    )
  ) {
    this.raise(
      init.start,
      ((isForIn ? "for-in" : "for-of") + " loop variable declaration may not have an initializer")
    );
  }
  node.left = init;
  node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
  this.expect(types$1.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement")
};

// Parse a list of variable declarations.

pp$8.parseVar = function(node, isFor, kind) {
  node.declarations = [];
  node.kind = kind;
  for (;;) {
    var decl = this.startNode();
    this.parseVarId(decl, kind);
    if (this.eat(types$1.eq)) {
      decl.init = this.parseMaybeAssign(isFor);
    } else if (kind === "const" && !(this.type === types$1._in || (this.options.ecmaVersion >= 6 && this.isContextual("of")))) {
      this.unexpected();
    } else if (decl.id.type !== "Identifier" && !(isFor && (this.type === types$1._in || this.isContextual("of")))) {
      this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
    if (!this.eat(types$1.comma)) { break }
  }
  return node
};

pp$8.parseVarId = function(decl, kind) {
  decl.id = this.parseBindingAtom();
  this.checkLValPattern(decl.id, kind === "var" ? BIND_VAR : BIND_LEXICAL, false);
};

var FUNC_STATEMENT = 1, FUNC_HANGING_STATEMENT = 2, FUNC_NULLABLE_ID = 4;

// Parse a function declaration or literal (depending on the
// `statement & FUNC_STATEMENT`).

// Remove `allowExpressionBody` for 7.0.0, as it is only called with false
pp$8.parseFunction = function(node, statement, allowExpressionBody, isAsync, forInit) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync) {
    if (this.type === types$1.star && (statement & FUNC_HANGING_STATEMENT))
      { this.unexpected(); }
    node.generator = this.eat(types$1.star);
  }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  if (statement & FUNC_STATEMENT) {
    node.id = (statement & FUNC_NULLABLE_ID) && this.type !== types$1.name ? null : this.parseIdent();
    if (node.id && !(statement & FUNC_HANGING_STATEMENT))
      // If it is a regular function declaration in sloppy mode, then it is
      // subject to Annex B semantics (BIND_FUNCTION). Otherwise, the binding
      // mode depends on properties of the current scope (see
      // treatFunctionsAsVar).
      { this.checkLValSimple(node.id, (this.strict || node.generator || node.async) ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION); }
  }

  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(node.async, node.generator));

  if (!(statement & FUNC_STATEMENT))
    { node.id = this.type === types$1.name ? this.parseIdent() : null; }

  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody, false, forInit);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, (statement & FUNC_STATEMENT) ? "FunctionDeclaration" : "FunctionExpression")
};

pp$8.parseFunctionParams = function(node) {
  this.expect(types$1.parenL);
  node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
};

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

pp$8.parseClass = function(node, isStatement) {
  this.next();

  // ecma-262 14.6 Class Definitions
  // A class definition is always strict mode code.
  var oldStrict = this.strict;
  this.strict = true;

  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var privateNameMap = this.enterClassBody();
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(types$1.braceL);
  while (this.type !== types$1.braceR) {
    var element = this.parseClassElement(node.superClass !== null);
    if (element) {
      classBody.body.push(element);
      if (element.type === "MethodDefinition" && element.kind === "constructor") {
        if (hadConstructor) { this.raise(element.start, "Duplicate constructor in the same class"); }
        hadConstructor = true;
      } else if (element.key && element.key.type === "PrivateIdentifier" && isPrivateNameConflicted(privateNameMap, element)) {
        this.raiseRecoverable(element.key.start, ("Identifier '#" + (element.key.name) + "' has already been declared"));
      }
    }
  }
  this.strict = oldStrict;
  this.next();
  node.body = this.finishNode(classBody, "ClassBody");
  this.exitClassBody();
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
};

pp$8.parseClassElement = function(constructorAllowsSuper) {
  if (this.eat(types$1.semi)) { return null }

  var ecmaVersion = this.options.ecmaVersion;
  var node = this.startNode();
  var keyName = "";
  var isGenerator = false;
  var isAsync = false;
  var kind = "method";
  var isStatic = false;

  if (this.eatContextual("static")) {
    // Parse static init block
    if (ecmaVersion >= 13 && this.eat(types$1.braceL)) {
      this.parseClassStaticBlock(node);
      return node
    }
    if (this.isClassElementNameStart() || this.type === types$1.star) {
      isStatic = true;
    } else {
      keyName = "static";
    }
  }
  node.static = isStatic;
  if (!keyName && ecmaVersion >= 8 && this.eatContextual("async")) {
    if ((this.isClassElementNameStart() || this.type === types$1.star) && !this.canInsertSemicolon()) {
      isAsync = true;
    } else {
      keyName = "async";
    }
  }
  if (!keyName && (ecmaVersion >= 9 || !isAsync) && this.eat(types$1.star)) {
    isGenerator = true;
  }
  if (!keyName && !isAsync && !isGenerator) {
    var lastValue = this.value;
    if (this.eatContextual("get") || this.eatContextual("set")) {
      if (this.isClassElementNameStart()) {
        kind = lastValue;
      } else {
        keyName = lastValue;
      }
    }
  }

  // Parse element name
  if (keyName) {
    // 'async', 'get', 'set', or 'static' were not a keyword contextually.
    // The last token is any of those. Make it the element name.
    node.computed = false;
    node.key = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
    node.key.name = keyName;
    this.finishNode(node.key, "Identifier");
  } else {
    this.parseClassElementName(node);
  }

  // Parse element value
  if (ecmaVersion < 13 || this.type === types$1.parenL || kind !== "method" || isGenerator || isAsync) {
    var isConstructor = !node.static && checkKeyName(node, "constructor");
    var allowsDirectSuper = isConstructor && constructorAllowsSuper;
    // Couldn't move this check into the 'parseClassMethod' method for backward compatibility.
    if (isConstructor && kind !== "method") { this.raise(node.key.start, "Constructor can't have get/set modifier"); }
    node.kind = isConstructor ? "constructor" : kind;
    this.parseClassMethod(node, isGenerator, isAsync, allowsDirectSuper);
  } else {
    this.parseClassField(node);
  }

  return node
};

pp$8.isClassElementNameStart = function() {
  return (
    this.type === types$1.name ||
    this.type === types$1.privateId ||
    this.type === types$1.num ||
    this.type === types$1.string ||
    this.type === types$1.bracketL ||
    this.type.keyword
  )
};

pp$8.parseClassElementName = function(element) {
  if (this.type === types$1.privateId) {
    if (this.value === "constructor") {
      this.raise(this.start, "Classes can't have an element named '#constructor'");
    }
    element.computed = false;
    element.key = this.parsePrivateIdent();
  } else {
    this.parsePropertyName(element);
  }
};

pp$8.parseClassMethod = function(method, isGenerator, isAsync, allowsDirectSuper) {
  // Check key and flags
  var key = method.key;
  if (method.kind === "constructor") {
    if (isGenerator) { this.raise(key.start, "Constructor can't be a generator"); }
    if (isAsync) { this.raise(key.start, "Constructor can't be an async method"); }
  } else if (method.static && checkKeyName(method, "prototype")) {
    this.raise(key.start, "Classes may not have a static property named prototype");
  }

  // Parse value
  var value = method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);

  // Check value
  if (method.kind === "get" && value.params.length !== 0)
    { this.raiseRecoverable(value.start, "getter should have no params"); }
  if (method.kind === "set" && value.params.length !== 1)
    { this.raiseRecoverable(value.start, "setter should have exactly one param"); }
  if (method.kind === "set" && value.params[0].type === "RestElement")
    { this.raiseRecoverable(value.params[0].start, "Setter cannot use rest params"); }

  return this.finishNode(method, "MethodDefinition")
};

pp$8.parseClassField = function(field) {
  if (checkKeyName(field, "constructor")) {
    this.raise(field.key.start, "Classes can't have a field named 'constructor'");
  } else if (field.static && checkKeyName(field, "prototype")) {
    this.raise(field.key.start, "Classes can't have a static field named 'prototype'");
  }

  if (this.eat(types$1.eq)) {
    // To raise SyntaxError if 'arguments' exists in the initializer.
    var scope = this.currentThisScope();
    var inClassFieldInit = scope.inClassFieldInit;
    scope.inClassFieldInit = true;
    field.value = this.parseMaybeAssign();
    scope.inClassFieldInit = inClassFieldInit;
  } else {
    field.value = null;
  }
  this.semicolon();

  return this.finishNode(field, "PropertyDefinition")
};

pp$8.parseClassStaticBlock = function(node) {
  node.body = [];

  var oldLabels = this.labels;
  this.labels = [];
  this.enterScope(SCOPE_CLASS_STATIC_BLOCK | SCOPE_SUPER);
  while (this.type !== types$1.braceR) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  this.next();
  this.exitScope();
  this.labels = oldLabels;

  return this.finishNode(node, "StaticBlock")
};

pp$8.parseClassId = function(node, isStatement) {
  if (this.type === types$1.name) {
    node.id = this.parseIdent();
    if (isStatement)
      { this.checkLValSimple(node.id, BIND_LEXICAL, false); }
  } else {
    if (isStatement === true)
      { this.unexpected(); }
    node.id = null;
  }
};

pp$8.parseClassSuper = function(node) {
  node.superClass = this.eat(types$1._extends) ? this.parseExprSubscripts(false) : null;
};

pp$8.enterClassBody = function() {
  var element = {declared: Object.create(null), used: []};
  this.privateNameStack.push(element);
  return element.declared
};

pp$8.exitClassBody = function() {
  var ref = this.privateNameStack.pop();
  var declared = ref.declared;
  var used = ref.used;
  var len = this.privateNameStack.length;
  var parent = len === 0 ? null : this.privateNameStack[len - 1];
  for (var i = 0; i < used.length; ++i) {
    var id = used[i];
    if (!hasOwn(declared, id.name)) {
      if (parent) {
        parent.used.push(id);
      } else {
        this.raiseRecoverable(id.start, ("Private field '#" + (id.name) + "' must be declared in an enclosing class"));
      }
    }
  }
};

function isPrivateNameConflicted(privateNameMap, element) {
  var name = element.key.name;
  var curr = privateNameMap[name];

  var next = "true";
  if (element.type === "MethodDefinition" && (element.kind === "get" || element.kind === "set")) {
    next = (element.static ? "s" : "i") + element.kind;
  }

  // `class { get #a(){}; static set #a(_){} }` is also conflict.
  if (
    curr === "iget" && next === "iset" ||
    curr === "iset" && next === "iget" ||
    curr === "sget" && next === "sset" ||
    curr === "sset" && next === "sget"
  ) {
    privateNameMap[name] = "true";
    return false
  } else if (!curr) {
    privateNameMap[name] = next;
    return false
  } else {
    return true
  }
}

function checkKeyName(node, name) {
  var computed = node.computed;
  var key = node.key;
  return !computed && (
    key.type === "Identifier" && key.name === name ||
    key.type === "Literal" && key.value === name
  )
}

// Parses module export declaration.

pp$8.parseExport = function(node, exports) {
  this.next();
  // export * from '...'
  if (this.eat(types$1.star)) {
    if (this.options.ecmaVersion >= 11) {
      if (this.eatContextual("as")) {
        node.exported = this.parseModuleExportName();
        this.checkExport(exports, node.exported, this.lastTokStart);
      } else {
        node.exported = null;
      }
    }
    this.expectContextual("from");
    if (this.type !== types$1.string) { this.unexpected(); }
    node.source = this.parseExprAtom();
    this.semicolon();
    return this.finishNode(node, "ExportAllDeclaration")
  }
  if (this.eat(types$1._default)) { // export default ...
    this.checkExport(exports, "default", this.lastTokStart);
    var isAsync;
    if (this.type === types$1._function || (isAsync = this.isAsyncFunction())) {
      var fNode = this.startNode();
      this.next();
      if (isAsync) { this.next(); }
      node.declaration = this.parseFunction(fNode, FUNC_STATEMENT | FUNC_NULLABLE_ID, false, isAsync);
    } else if (this.type === types$1._class) {
      var cNode = this.startNode();
      node.declaration = this.parseClass(cNode, "nullableID");
    } else {
      node.declaration = this.parseMaybeAssign();
      this.semicolon();
    }
    return this.finishNode(node, "ExportDefaultDeclaration")
  }
  // export var|const|let|function|class ...
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseStatement(null);
    if (node.declaration.type === "VariableDeclaration")
      { this.checkVariableExport(exports, node.declaration.declarations); }
    else
      { this.checkExport(exports, node.declaration.id, node.declaration.id.start); }
    node.specifiers = [];
    node.source = null;
  } else { // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports);
    if (this.eatContextual("from")) {
      if (this.type !== types$1.string) { this.unexpected(); }
      node.source = this.parseExprAtom();
    } else {
      for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
        // check for keywords used as local names
        var spec = list[i];

        this.checkUnreserved(spec.local);
        // check if export is defined
        this.checkLocalExport(spec.local);

        if (spec.local.type === "Literal") {
          this.raise(spec.local.start, "A string literal cannot be used as an exported binding without `from`.");
        }
      }

      node.source = null;
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration")
};

pp$8.checkExport = function(exports, name, pos) {
  if (!exports) { return }
  if (typeof name !== "string")
    { name = name.type === "Identifier" ? name.name : name.value; }
  if (hasOwn(exports, name))
    { this.raiseRecoverable(pos, "Duplicate export '" + name + "'"); }
  exports[name] = true;
};

pp$8.checkPatternExport = function(exports, pat) {
  var type = pat.type;
  if (type === "Identifier")
    { this.checkExport(exports, pat, pat.start); }
  else if (type === "ObjectPattern")
    { for (var i = 0, list = pat.properties; i < list.length; i += 1)
      {
        var prop = list[i];

        this.checkPatternExport(exports, prop);
      } }
  else if (type === "ArrayPattern")
    { for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
      var elt = list$1[i$1];

        if (elt) { this.checkPatternExport(exports, elt); }
    } }
  else if (type === "Property")
    { this.checkPatternExport(exports, pat.value); }
  else if (type === "AssignmentPattern")
    { this.checkPatternExport(exports, pat.left); }
  else if (type === "RestElement")
    { this.checkPatternExport(exports, pat.argument); }
  else if (type === "ParenthesizedExpression")
    { this.checkPatternExport(exports, pat.expression); }
};

pp$8.checkVariableExport = function(exports, decls) {
  if (!exports) { return }
  for (var i = 0, list = decls; i < list.length; i += 1)
    {
    var decl = list[i];

    this.checkPatternExport(exports, decl.id);
  }
};

pp$8.shouldParseExportStatement = function() {
  return this.type.keyword === "var" ||
    this.type.keyword === "const" ||
    this.type.keyword === "class" ||
    this.type.keyword === "function" ||
    this.isLet() ||
    this.isAsyncFunction()
};

// Parses a comma-separated list of module exports.

pp$8.parseExportSpecifiers = function(exports) {
  var nodes = [], first = true;
  // export { x, y as z } [from '...']
  this.expect(types$1.braceL);
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) { break }
    } else { first = false; }

    var node = this.startNode();
    node.local = this.parseModuleExportName();
    node.exported = this.eatContextual("as") ? this.parseModuleExportName() : node.local;
    this.checkExport(
      exports,
      node.exported,
      node.exported.start
    );
    nodes.push(this.finishNode(node, "ExportSpecifier"));
  }
  return nodes
};

// Parses import declaration.

pp$8.parseImport = function(node) {
  this.next();
  // import '...'
  if (this.type === types$1.string) {
    node.specifiers = empty$1;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === types$1.string ? this.parseExprAtom() : this.unexpected();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration")
};

// Parses a comma-separated list of module imports.

pp$8.parseImportSpecifiers = function() {
  var nodes = [], first = true;
  if (this.type === types$1.name) {
    // import defaultObj, { x, y as z } from '...'
    var node = this.startNode();
    node.local = this.parseIdent();
    this.checkLValSimple(node.local, BIND_LEXICAL);
    nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
    if (!this.eat(types$1.comma)) { return nodes }
  }
  if (this.type === types$1.star) {
    var node$1 = this.startNode();
    this.next();
    this.expectContextual("as");
    node$1.local = this.parseIdent();
    this.checkLValSimple(node$1.local, BIND_LEXICAL);
    nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
    return nodes
  }
  this.expect(types$1.braceL);
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) { break }
    } else { first = false; }

    var node$2 = this.startNode();
    node$2.imported = this.parseModuleExportName();
    if (this.eatContextual("as")) {
      node$2.local = this.parseIdent();
    } else {
      this.checkUnreserved(node$2.imported);
      node$2.local = node$2.imported;
    }
    this.checkLValSimple(node$2.local, BIND_LEXICAL);
    nodes.push(this.finishNode(node$2, "ImportSpecifier"));
  }
  return nodes
};

pp$8.parseModuleExportName = function() {
  if (this.options.ecmaVersion >= 13 && this.type === types$1.string) {
    var stringLiteral = this.parseLiteral(this.value);
    if (loneSurrogate.test(stringLiteral.value)) {
      this.raise(stringLiteral.start, "An export name cannot include a lone surrogate.");
    }
    return stringLiteral
  }
  return this.parseIdent(true)
};

// Set `ExpressionStatement#directive` property for directive prologues.
pp$8.adaptDirectivePrologue = function(statements) {
  for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
    statements[i].directive = statements[i].expression.raw.slice(1, -1);
  }
};
pp$8.isDirectiveCandidate = function(statement) {
  return (
    statement.type === "ExpressionStatement" &&
    statement.expression.type === "Literal" &&
    typeof statement.expression.value === "string" &&
    // Reject parenthesized strings.
    (this.input[statement.start] === "\"" || this.input[statement.start] === "'")
  )
};

var pp$7 = Parser.prototype;

// Convert existing expression atom to assignable pattern
// if possible.

pp$7.toAssignable = function(node, isBinding, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
    case "Identifier":
      if (this.inAsync && node.name === "await")
        { this.raise(node.start, "Cannot use 'await' as identifier inside an async function"); }
      break

    case "ObjectPattern":
    case "ArrayPattern":
    case "AssignmentPattern":
    case "RestElement":
      break

    case "ObjectExpression":
      node.type = "ObjectPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      for (var i = 0, list = node.properties; i < list.length; i += 1) {
        var prop = list[i];

      this.toAssignable(prop, isBinding);
        // Early error:
        //   AssignmentRestProperty[Yield, Await] :
        //     `...` DestructuringAssignmentTarget[Yield, Await]
        //
        //   It is a Syntax Error if |DestructuringAssignmentTarget| is an |ArrayLiteral| or an |ObjectLiteral|.
        if (
          prop.type === "RestElement" &&
          (prop.argument.type === "ArrayPattern" || prop.argument.type === "ObjectPattern")
        ) {
          this.raise(prop.argument.start, "Unexpected token");
        }
      }
      break

    case "Property":
      // AssignmentProperty has type === "Property"
      if (node.kind !== "init") { this.raise(node.key.start, "Object pattern can't contain getter or setter"); }
      this.toAssignable(node.value, isBinding);
      break

    case "ArrayExpression":
      node.type = "ArrayPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      this.toAssignableList(node.elements, isBinding);
      break

    case "SpreadElement":
      node.type = "RestElement";
      this.toAssignable(node.argument, isBinding);
      if (node.argument.type === "AssignmentPattern")
        { this.raise(node.argument.start, "Rest elements cannot have a default value"); }
      break

    case "AssignmentExpression":
      if (node.operator !== "=") { this.raise(node.left.end, "Only '=' operator can be used for specifying default value."); }
      node.type = "AssignmentPattern";
      delete node.operator;
      this.toAssignable(node.left, isBinding);
      break

    case "ParenthesizedExpression":
      this.toAssignable(node.expression, isBinding, refDestructuringErrors);
      break

    case "ChainExpression":
      this.raiseRecoverable(node.start, "Optional chaining cannot appear in left-hand side");
      break

    case "MemberExpression":
      if (!isBinding) { break }

    default:
      this.raise(node.start, "Assigning to rvalue");
    }
  } else if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
  return node
};

// Convert list of expression atoms to binding list.

pp$7.toAssignableList = function(exprList, isBinding) {
  var end = exprList.length;
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) { this.toAssignable(elt, isBinding); }
  }
  if (end) {
    var last = exprList[end - 1];
    if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
      { this.unexpected(last.argument.start); }
  }
  return exprList
};

// Parses spread element.

pp$7.parseSpread = function(refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
  return this.finishNode(node, "SpreadElement")
};

pp$7.parseRestBinding = function() {
  var node = this.startNode();
  this.next();

  // RestElement inside of a function parameter must be an identifier
  if (this.options.ecmaVersion === 6 && this.type !== types$1.name)
    { this.unexpected(); }

  node.argument = this.parseBindingAtom();

  return this.finishNode(node, "RestElement")
};

// Parses lvalue (assignable) atom.

pp$7.parseBindingAtom = function() {
  if (this.options.ecmaVersion >= 6) {
    switch (this.type) {
    case types$1.bracketL:
      var node = this.startNode();
      this.next();
      node.elements = this.parseBindingList(types$1.bracketR, true, true);
      return this.finishNode(node, "ArrayPattern")

    case types$1.braceL:
      return this.parseObj(true)
    }
  }
  return this.parseIdent()
};

pp$7.parseBindingList = function(close, allowEmpty, allowTrailingComma) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (first) { first = false; }
    else { this.expect(types$1.comma); }
    if (allowEmpty && this.type === types$1.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this.afterTrailingComma(close)) {
      break
    } else if (this.type === types$1.ellipsis) {
      var rest = this.parseRestBinding();
      this.parseBindingListItem(rest);
      elts.push(rest);
      if (this.type === types$1.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
      this.expect(close);
      break
    } else {
      var elem = this.parseMaybeDefault(this.start, this.startLoc);
      this.parseBindingListItem(elem);
      elts.push(elem);
    }
  }
  return elts
};

pp$7.parseBindingListItem = function(param) {
  return param
};

// Parses assignment pattern around given atom if possible.

pp$7.parseMaybeDefault = function(startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(types$1.eq)) { return left }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern")
};

// The following three functions all verify that a node is an lvalue —
// something that can be bound, or assigned to. In order to do so, they perform
// a variety of checks:
//
// - Check that none of the bound/assigned-to identifiers are reserved words.
// - Record name declarations for bindings in the appropriate scope.
// - Check duplicate argument names, if checkClashes is set.
//
// If a complex binding pattern is encountered (e.g., object and array
// destructuring), the entire pattern is recursively checked.
//
// There are three versions of checkLVal*() appropriate for different
// circumstances:
//
// - checkLValSimple() shall be used if the syntactic construct supports
//   nothing other than identifiers and member expressions. Parenthesized
//   expressions are also correctly handled. This is generally appropriate for
//   constructs for which the spec says
//
//   > It is a Syntax Error if AssignmentTargetType of [the production] is not
//   > simple.
//
//   It is also appropriate for checking if an identifier is valid and not
//   defined elsewhere, like import declarations or function/class identifiers.
//
//   Examples where this is used include:
//     a += …;
//     import a from '…';
//   where a is the node to be checked.
//
// - checkLValPattern() shall be used if the syntactic construct supports
//   anything checkLValSimple() supports, as well as object and array
//   destructuring patterns. This is generally appropriate for constructs for
//   which the spec says
//
//   > It is a Syntax Error if [the production] is neither an ObjectLiteral nor
//   > an ArrayLiteral and AssignmentTargetType of [the production] is not
//   > simple.
//
//   Examples where this is used include:
//     (a = …);
//     const a = …;
//     try { … } catch (a) { … }
//   where a is the node to be checked.
//
// - checkLValInnerPattern() shall be used if the syntactic construct supports
//   anything checkLValPattern() supports, as well as default assignment
//   patterns, rest elements, and other constructs that may appear within an
//   object or array destructuring pattern.
//
//   As a special case, function parameters also use checkLValInnerPattern(),
//   as they also support defaults and rest constructs.
//
// These functions deliberately support both assignment and binding constructs,
// as the logic for both is exceedingly similar. If the node is the target of
// an assignment, then bindingType should be set to BIND_NONE. Otherwise, it
// should be set to the appropriate BIND_* constant, like BIND_VAR or
// BIND_LEXICAL.
//
// If the function is called with a non-BIND_NONE bindingType, then
// additionally a checkClashes object may be specified to allow checking for
// duplicate argument names. checkClashes is ignored if the provided construct
// is an assignment (i.e., bindingType is BIND_NONE).

pp$7.checkLValSimple = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  var isBind = bindingType !== BIND_NONE;

  switch (expr.type) {
  case "Identifier":
    if (this.strict && this.reservedWordsStrictBind.test(expr.name))
      { this.raiseRecoverable(expr.start, (isBind ? "Binding " : "Assigning to ") + expr.name + " in strict mode"); }
    if (isBind) {
      if (bindingType === BIND_LEXICAL && expr.name === "let")
        { this.raiseRecoverable(expr.start, "let is disallowed as a lexically bound name"); }
      if (checkClashes) {
        if (hasOwn(checkClashes, expr.name))
          { this.raiseRecoverable(expr.start, "Argument name clash"); }
        checkClashes[expr.name] = true;
      }
      if (bindingType !== BIND_OUTSIDE) { this.declareName(expr.name, bindingType, expr.start); }
    }
    break

  case "ChainExpression":
    this.raiseRecoverable(expr.start, "Optional chaining cannot appear in left-hand side");
    break

  case "MemberExpression":
    if (isBind) { this.raiseRecoverable(expr.start, "Binding member expression"); }
    break

  case "ParenthesizedExpression":
    if (isBind) { this.raiseRecoverable(expr.start, "Binding parenthesized expression"); }
    return this.checkLValSimple(expr.expression, bindingType, checkClashes)

  default:
    this.raise(expr.start, (isBind ? "Binding" : "Assigning to") + " rvalue");
  }
};

pp$7.checkLValPattern = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  switch (expr.type) {
  case "ObjectPattern":
    for (var i = 0, list = expr.properties; i < list.length; i += 1) {
      var prop = list[i];

    this.checkLValInnerPattern(prop, bindingType, checkClashes);
    }
    break

  case "ArrayPattern":
    for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
      var elem = list$1[i$1];

    if (elem) { this.checkLValInnerPattern(elem, bindingType, checkClashes); }
    }
    break

  default:
    this.checkLValSimple(expr, bindingType, checkClashes);
  }
};

pp$7.checkLValInnerPattern = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  switch (expr.type) {
  case "Property":
    // AssignmentProperty has type === "Property"
    this.checkLValInnerPattern(expr.value, bindingType, checkClashes);
    break

  case "AssignmentPattern":
    this.checkLValPattern(expr.left, bindingType, checkClashes);
    break

  case "RestElement":
    this.checkLValPattern(expr.argument, bindingType, checkClashes);
    break

  default:
    this.checkLValPattern(expr, bindingType, checkClashes);
  }
};

// The algorithm used to determine whether a regexp can appear at a

var TokContext = function TokContext(token, isExpr, preserveSpace, override, generator) {
  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
  this.generator = !!generator;
};

var types = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", false),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function (p) { return p.tryReadTemplateToken(); }),
  f_stat: new TokContext("function", false),
  f_expr: new TokContext("function", true),
  f_expr_gen: new TokContext("function", true, false, null, true),
  f_gen: new TokContext("function", false, false, null, true)
};

var pp$6 = Parser.prototype;

pp$6.initialContext = function() {
  return [types.b_stat]
};

pp$6.curContext = function() {
  return this.context[this.context.length - 1]
};

pp$6.braceIsBlock = function(prevType) {
  var parent = this.curContext();
  if (parent === types.f_expr || parent === types.f_stat)
    { return true }
  if (prevType === types$1.colon && (parent === types.b_stat || parent === types.b_expr))
    { return !parent.isExpr }

  // The check for `tt.name && exprAllowed` detects whether we are
  // after a `yield` or `of` construct. See the `updateContext` for
  // `tt.name`.
  if (prevType === types$1._return || prevType === types$1.name && this.exprAllowed)
    { return lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) }
  if (prevType === types$1._else || prevType === types$1.semi || prevType === types$1.eof || prevType === types$1.parenR || prevType === types$1.arrow)
    { return true }
  if (prevType === types$1.braceL)
    { return parent === types.b_stat }
  if (prevType === types$1._var || prevType === types$1._const || prevType === types$1.name)
    { return false }
  return !this.exprAllowed
};

pp$6.inGeneratorContext = function() {
  for (var i = this.context.length - 1; i >= 1; i--) {
    var context = this.context[i];
    if (context.token === "function")
      { return context.generator }
  }
  return false
};

pp$6.updateContext = function(prevType) {
  var update, type = this.type;
  if (type.keyword && prevType === types$1.dot)
    { this.exprAllowed = false; }
  else if (update = type.updateContext)
    { update.call(this, prevType); }
  else
    { this.exprAllowed = type.beforeExpr; }
};

// Used to handle egde case when token context could not be inferred correctly in tokenize phase
pp$6.overrideContext = function(tokenCtx) {
  if (this.curContext() !== tokenCtx) {
    this.context[this.context.length - 1] = tokenCtx;
  }
};

// Token-specific context update code

types$1.parenR.updateContext = types$1.braceR.updateContext = function() {
  if (this.context.length === 1) {
    this.exprAllowed = true;
    return
  }
  var out = this.context.pop();
  if (out === types.b_stat && this.curContext().token === "function") {
    out = this.context.pop();
  }
  this.exprAllowed = !out.isExpr;
};

types$1.braceL.updateContext = function(prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr);
  this.exprAllowed = true;
};

types$1.dollarBraceL.updateContext = function() {
  this.context.push(types.b_tmpl);
  this.exprAllowed = true;
};

types$1.parenL.updateContext = function(prevType) {
  var statementParens = prevType === types$1._if || prevType === types$1._for || prevType === types$1._with || prevType === types$1._while;
  this.context.push(statementParens ? types.p_stat : types.p_expr);
  this.exprAllowed = true;
};

types$1.incDec.updateContext = function() {
  // tokExprAllowed stays unchanged
};

types$1._function.updateContext = types$1._class.updateContext = function(prevType) {
  if (prevType.beforeExpr && prevType !== types$1._else &&
      !(prevType === types$1.semi && this.curContext() !== types.p_stat) &&
      !(prevType === types$1._return && lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) &&
      !((prevType === types$1.colon || prevType === types$1.braceL) && this.curContext() === types.b_stat))
    { this.context.push(types.f_expr); }
  else
    { this.context.push(types.f_stat); }
  this.exprAllowed = false;
};

types$1.backQuote.updateContext = function() {
  if (this.curContext() === types.q_tmpl)
    { this.context.pop(); }
  else
    { this.context.push(types.q_tmpl); }
  this.exprAllowed = false;
};

types$1.star.updateContext = function(prevType) {
  if (prevType === types$1._function) {
    var index = this.context.length - 1;
    if (this.context[index] === types.f_expr)
      { this.context[index] = types.f_expr_gen; }
    else
      { this.context[index] = types.f_gen; }
  }
  this.exprAllowed = true;
};

types$1.name.updateContext = function(prevType) {
  var allowed = false;
  if (this.options.ecmaVersion >= 6 && prevType !== types$1.dot) {
    if (this.value === "of" && !this.exprAllowed ||
        this.value === "yield" && this.inGeneratorContext())
      { allowed = true; }
  }
  this.exprAllowed = allowed;
};

// A recursive descent parser operates by defining functions for all

var pp$5 = Parser.prototype;

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

pp$5.checkPropClash = function(prop, propHash, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement")
    { return }
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
    { return }
  var key = prop.key;
  var name;
  switch (key.type) {
  case "Identifier": name = key.name; break
  case "Literal": name = String(key.value); break
  default: return
  }
  var kind = prop.kind;
  if (this.options.ecmaVersion >= 6) {
    if (name === "__proto__" && kind === "init") {
      if (propHash.proto) {
        if (refDestructuringErrors) {
          if (refDestructuringErrors.doubleProto < 0) {
            refDestructuringErrors.doubleProto = key.start;
          }
        } else {
          this.raiseRecoverable(key.start, "Redefinition of __proto__ property");
        }
      }
      propHash.proto = true;
    }
    return
  }
  name = "$" + name;
  var other = propHash[name];
  if (other) {
    var redefinition;
    if (kind === "init") {
      redefinition = this.strict && other.init || other.get || other.set;
    } else {
      redefinition = other.init || other[kind];
    }
    if (redefinition)
      { this.raiseRecoverable(key.start, "Redefinition of property"); }
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.

// Parse a full expression. The optional arguments are used to
// forbid the `in` operator (in for loops initalization expressions)
// and provide reference for storing '=' operator inside shorthand
// property assignment in contexts where both object expression
// and object pattern might appear (so it's possible to raise
// delayed syntax error at correct position).

pp$5.parseExpression = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeAssign(forInit, refDestructuringErrors);
  if (this.type === types$1.comma) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(types$1.comma)) { node.expressions.push(this.parseMaybeAssign(forInit, refDestructuringErrors)); }
    return this.finishNode(node, "SequenceExpression")
  }
  return expr
};

// Parse an assignment expression. This includes applications of
// operators like `+=`.

pp$5.parseMaybeAssign = function(forInit, refDestructuringErrors, afterLeftParse) {
  if (this.isContextual("yield")) {
    if (this.inGenerator) { return this.parseYield(forInit) }
    // The tokenizer will assume an expression is allowed after
    // `yield`, but this isn't that kind of yield
    else { this.exprAllowed = false; }
  }

  var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1, oldDoubleProto = -1;
  if (refDestructuringErrors) {
    oldParenAssign = refDestructuringErrors.parenthesizedAssign;
    oldTrailingComma = refDestructuringErrors.trailingComma;
    oldDoubleProto = refDestructuringErrors.doubleProto;
    refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
  } else {
    refDestructuringErrors = new DestructuringErrors;
    ownDestructuringErrors = true;
  }

  var startPos = this.start, startLoc = this.startLoc;
  if (this.type === types$1.parenL || this.type === types$1.name) {
    this.potentialArrowAt = this.start;
    this.potentialArrowInForAwait = forInit === "await";
  }
  var left = this.parseMaybeConditional(forInit, refDestructuringErrors);
  if (afterLeftParse) { left = afterLeftParse.call(this, left, startPos, startLoc); }
  if (this.type.isAssign) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    if (this.type === types$1.eq)
      { left = this.toAssignable(left, false, refDestructuringErrors); }
    if (!ownDestructuringErrors) {
      refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.doubleProto = -1;
    }
    if (refDestructuringErrors.shorthandAssign >= left.start)
      { refDestructuringErrors.shorthandAssign = -1; } // reset because shorthand default was used correctly
    if (this.type === types$1.eq)
      { this.checkLValPattern(left); }
    else
      { this.checkLValSimple(left); }
    node.left = left;
    this.next();
    node.right = this.parseMaybeAssign(forInit);
    if (oldDoubleProto > -1) { refDestructuringErrors.doubleProto = oldDoubleProto; }
    return this.finishNode(node, "AssignmentExpression")
  } else {
    if (ownDestructuringErrors) { this.checkExpressionErrors(refDestructuringErrors, true); }
  }
  if (oldParenAssign > -1) { refDestructuringErrors.parenthesizedAssign = oldParenAssign; }
  if (oldTrailingComma > -1) { refDestructuringErrors.trailingComma = oldTrailingComma; }
  return left
};

// Parse a ternary conditional (`?:`) operator.

pp$5.parseMaybeConditional = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprOps(forInit, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  if (this.eat(types$1.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(types$1.colon);
    node.alternate = this.parseMaybeAssign(forInit);
    return this.finishNode(node, "ConditionalExpression")
  }
  return expr
};

// Start the precedence parser.

pp$5.parseExprOps = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors, false, false, forInit);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  return expr.start === startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, forInit)
};

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

pp$5.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, forInit) {
  var prec = this.type.binop;
  if (prec != null && (!forInit || this.type !== types$1._in)) {
    if (prec > minPrec) {
      var logical = this.type === types$1.logicalOR || this.type === types$1.logicalAND;
      var coalesce = this.type === types$1.coalesce;
      if (coalesce) {
        // Handle the precedence of `tt.coalesce` as equal to the range of logical expressions.
        // In other words, `node.right` shouldn't contain logical expressions in order to check the mixed error.
        prec = types$1.logicalAND.binop;
      }
      var op = this.value;
      this.next();
      var startPos = this.start, startLoc = this.startLoc;
      var right = this.parseExprOp(this.parseMaybeUnary(null, false, false, forInit), startPos, startLoc, prec, forInit);
      var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical || coalesce);
      if ((logical && this.type === types$1.coalesce) || (coalesce && (this.type === types$1.logicalOR || this.type === types$1.logicalAND))) {
        this.raiseRecoverable(this.start, "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses");
      }
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, forInit)
    }
  }
  return left
};

pp$5.buildBinary = function(startPos, startLoc, left, right, op, logical) {
  if (right.type === "PrivateIdentifier") { this.raise(right.start, "Private identifier can only be left side of binary expression"); }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.operator = op;
  node.right = right;
  return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
};

// Parse unary operators, both prefix and postfix.

pp$5.parseMaybeUnary = function(refDestructuringErrors, sawUnary, incDec, forInit) {
  var startPos = this.start, startLoc = this.startLoc, expr;
  if (this.isContextual("await") && this.canAwait) {
    expr = this.parseAwait(forInit);
    sawUnary = true;
  } else if (this.type.prefix) {
    var node = this.startNode(), update = this.type === types$1.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(null, true, update, forInit);
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update) { this.checkLValSimple(node.argument); }
    else if (this.strict && node.operator === "delete" &&
             node.argument.type === "Identifier")
      { this.raiseRecoverable(node.start, "Deleting local variable in strict mode"); }
    else if (node.operator === "delete" && isPrivateFieldAccess(node.argument))
      { this.raiseRecoverable(node.start, "Private fields can not be deleted"); }
    else { sawUnary = true; }
    expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else if (!sawUnary && this.type === types$1.privateId) {
    if (forInit || this.privateNameStack.length === 0) { this.unexpected(); }
    expr = this.parsePrivateIdent();
    // only could be private fields in 'in', such as #x in obj
    if (this.type !== types$1._in) { this.unexpected(); }
  } else {
    expr = this.parseExprSubscripts(refDestructuringErrors, forInit);
    if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
    while (this.type.postfix && !this.canInsertSemicolon()) {
      var node$1 = this.startNodeAt(startPos, startLoc);
      node$1.operator = this.value;
      node$1.prefix = false;
      node$1.argument = expr;
      this.checkLValSimple(expr);
      this.next();
      expr = this.finishNode(node$1, "UpdateExpression");
    }
  }

  if (!incDec && this.eat(types$1.starstar)) {
    if (sawUnary)
      { this.unexpected(this.lastTokStart); }
    else
      { return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false, false, forInit), "**", false) }
  } else {
    return expr
  }
};

function isPrivateFieldAccess(node) {
  return (
    node.type === "MemberExpression" && node.property.type === "PrivateIdentifier" ||
    node.type === "ChainExpression" && isPrivateFieldAccess(node.expression)
  )
}

// Parse call, dot, and `[]`-subscript expressions.

pp$5.parseExprSubscripts = function(refDestructuringErrors, forInit) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors, forInit);
  if (expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")")
    { return expr }
  var result = this.parseSubscripts(expr, startPos, startLoc, false, forInit);
  if (refDestructuringErrors && result.type === "MemberExpression") {
    if (refDestructuringErrors.parenthesizedAssign >= result.start) { refDestructuringErrors.parenthesizedAssign = -1; }
    if (refDestructuringErrors.parenthesizedBind >= result.start) { refDestructuringErrors.parenthesizedBind = -1; }
    if (refDestructuringErrors.trailingComma >= result.start) { refDestructuringErrors.trailingComma = -1; }
  }
  return result
};

pp$5.parseSubscripts = function(base, startPos, startLoc, noCalls, forInit) {
  var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" &&
      this.lastTokEnd === base.end && !this.canInsertSemicolon() && base.end - base.start === 5 &&
      this.potentialArrowAt === base.start;
  var optionalChained = false;

  while (true) {
    var element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit);

    if (element.optional) { optionalChained = true; }
    if (element === base || element.type === "ArrowFunctionExpression") {
      if (optionalChained) {
        var chainNode = this.startNodeAt(startPos, startLoc);
        chainNode.expression = element;
        element = this.finishNode(chainNode, "ChainExpression");
      }
      return element
    }

    base = element;
  }
};

pp$5.parseSubscript = function(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit) {
  var optionalSupported = this.options.ecmaVersion >= 11;
  var optional = optionalSupported && this.eat(types$1.questionDot);
  if (noCalls && optional) { this.raise(this.lastTokStart, "Optional chaining cannot appear in the callee of new expressions"); }

  var computed = this.eat(types$1.bracketL);
  if (computed || (optional && this.type !== types$1.parenL && this.type !== types$1.backQuote) || this.eat(types$1.dot)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.object = base;
    if (computed) {
      node.property = this.parseExpression();
      this.expect(types$1.bracketR);
    } else if (this.type === types$1.privateId && base.type !== "Super") {
      node.property = this.parsePrivateIdent();
    } else {
      node.property = this.parseIdent(this.options.allowReserved !== "never");
    }
    node.computed = !!computed;
    if (optionalSupported) {
      node.optional = optional;
    }
    base = this.finishNode(node, "MemberExpression");
  } else if (!noCalls && this.eat(types$1.parenL)) {
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    var exprList = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false, refDestructuringErrors);
    if (maybeAsyncArrow && !optional && !this.canInsertSemicolon() && this.eat(types$1.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      if (this.awaitIdentPos > 0)
        { this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function"); }
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      this.awaitIdentPos = oldAwaitIdentPos;
      return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, true, forInit)
    }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;
    this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
    var node$1 = this.startNodeAt(startPos, startLoc);
    node$1.callee = base;
    node$1.arguments = exprList;
    if (optionalSupported) {
      node$1.optional = optional;
    }
    base = this.finishNode(node$1, "CallExpression");
  } else if (this.type === types$1.backQuote) {
    if (optional || optionalChained) {
      this.raise(this.start, "Optional chaining cannot appear in the tag of tagged template expressions");
    }
    var node$2 = this.startNodeAt(startPos, startLoc);
    node$2.tag = base;
    node$2.quasi = this.parseTemplate({isTagged: true});
    base = this.finishNode(node$2, "TaggedTemplateExpression");
  }
  return base
};

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

pp$5.parseExprAtom = function(refDestructuringErrors, forInit) {
  // If a division operator appears in an expression position, the
  // tokenizer got confused, and we force it to read a regexp instead.
  if (this.type === types$1.slash) { this.readRegexp(); }

  var node, canBeArrow = this.potentialArrowAt === this.start;
  switch (this.type) {
  case types$1._super:
    if (!this.allowSuper)
      { this.raise(this.start, "'super' keyword outside a method"); }
    node = this.startNode();
    this.next();
    if (this.type === types$1.parenL && !this.allowDirectSuper)
      { this.raise(node.start, "super() call outside constructor of a subclass"); }
    // The `super` keyword can appear at below:
    // SuperProperty:
    //     super [ Expression ]
    //     super . IdentifierName
    // SuperCall:
    //     super ( Arguments )
    if (this.type !== types$1.dot && this.type !== types$1.bracketL && this.type !== types$1.parenL)
      { this.unexpected(); }
    return this.finishNode(node, "Super")

  case types$1._this:
    node = this.startNode();
    this.next();
    return this.finishNode(node, "ThisExpression")

  case types$1.name:
    var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
    var id = this.parseIdent(false);
    if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types$1._function)) {
      this.overrideContext(types.f_expr);
      return this.parseFunction(this.startNodeAt(startPos, startLoc), 0, false, true, forInit)
    }
    if (canBeArrow && !this.canInsertSemicolon()) {
      if (this.eat(types$1.arrow))
        { return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false, forInit) }
      if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types$1.name && !containsEsc &&
          (!this.potentialArrowInForAwait || this.value !== "of" || this.containsEsc)) {
        id = this.parseIdent(false);
        if (this.canInsertSemicolon() || !this.eat(types$1.arrow))
          { this.unexpected(); }
        return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true, forInit)
      }
    }
    return id

  case types$1.regexp:
    var value = this.value;
    node = this.parseLiteral(value.value);
    node.regex = {pattern: value.pattern, flags: value.flags};
    return node

  case types$1.num: case types$1.string:
    return this.parseLiteral(this.value)

  case types$1._null: case types$1._true: case types$1._false:
    node = this.startNode();
    node.value = this.type === types$1._null ? null : this.type === types$1._true;
    node.raw = this.type.keyword;
    this.next();
    return this.finishNode(node, "Literal")

  case types$1.parenL:
    var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow, forInit);
    if (refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr))
        { refDestructuringErrors.parenthesizedAssign = start; }
      if (refDestructuringErrors.parenthesizedBind < 0)
        { refDestructuringErrors.parenthesizedBind = start; }
    }
    return expr

  case types$1.bracketL:
    node = this.startNode();
    this.next();
    node.elements = this.parseExprList(types$1.bracketR, true, true, refDestructuringErrors);
    return this.finishNode(node, "ArrayExpression")

  case types$1.braceL:
    this.overrideContext(types.b_expr);
    return this.parseObj(false, refDestructuringErrors)

  case types$1._function:
    node = this.startNode();
    this.next();
    return this.parseFunction(node, 0)

  case types$1._class:
    return this.parseClass(this.startNode(), false)

  case types$1._new:
    return this.parseNew()

  case types$1.backQuote:
    return this.parseTemplate()

  case types$1._import:
    if (this.options.ecmaVersion >= 11) {
      return this.parseExprImport()
    } else {
      return this.unexpected()
    }

  default:
    this.unexpected();
  }
};

pp$5.parseExprImport = function() {
  var node = this.startNode();

  // Consume `import` as an identifier for `import.meta`.
  // Because `this.parseIdent(true)` doesn't check escape sequences, it needs the check of `this.containsEsc`.
  if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword import"); }
  var meta = this.parseIdent(true);

  switch (this.type) {
  case types$1.parenL:
    return this.parseDynamicImport(node)
  case types$1.dot:
    node.meta = meta;
    return this.parseImportMeta(node)
  default:
    this.unexpected();
  }
};

pp$5.parseDynamicImport = function(node) {
  this.next(); // skip `(`

  // Parse node.source.
  node.source = this.parseMaybeAssign();

  // Verify ending.
  if (!this.eat(types$1.parenR)) {
    var errorPos = this.start;
    if (this.eat(types$1.comma) && this.eat(types$1.parenR)) {
      this.raiseRecoverable(errorPos, "Trailing comma is not allowed in import()");
    } else {
      this.unexpected(errorPos);
    }
  }

  return this.finishNode(node, "ImportExpression")
};

pp$5.parseImportMeta = function(node) {
  this.next(); // skip `.`

  var containsEsc = this.containsEsc;
  node.property = this.parseIdent(true);

  if (node.property.name !== "meta")
    { this.raiseRecoverable(node.property.start, "The only valid meta property for import is 'import.meta'"); }
  if (containsEsc)
    { this.raiseRecoverable(node.start, "'import.meta' must not contain escaped characters"); }
  if (this.options.sourceType !== "module" && !this.options.allowImportExportEverywhere)
    { this.raiseRecoverable(node.start, "Cannot use 'import.meta' outside a module"); }

  return this.finishNode(node, "MetaProperty")
};

pp$5.parseLiteral = function(value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  if (node.raw.charCodeAt(node.raw.length - 1) === 110) { node.bigint = node.raw.slice(0, -1).replace(/_/g, ""); }
  this.next();
  return this.finishNode(node, "Literal")
};

pp$5.parseParenExpression = function() {
  this.expect(types$1.parenL);
  var val = this.parseExpression();
  this.expect(types$1.parenR);
  return val
};

pp$5.parseParenAndDistinguishExpression = function(canBeArrow, forInit) {
  var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
  if (this.options.ecmaVersion >= 6) {
    this.next();

    var innerStartPos = this.start, innerStartLoc = this.startLoc;
    var exprList = [], first = true, lastIsComma = false;
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
    this.yieldPos = 0;
    this.awaitPos = 0;
    // Do not save awaitIdentPos to allow checking awaits nested in parameters
    while (this.type !== types$1.parenR) {
      first ? first = false : this.expect(types$1.comma);
      if (allowTrailingComma && this.afterTrailingComma(types$1.parenR, true)) {
        lastIsComma = true;
        break
      } else if (this.type === types$1.ellipsis) {
        spreadStart = this.start;
        exprList.push(this.parseParenItem(this.parseRestBinding()));
        if (this.type === types$1.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
        break
      } else {
        exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
      }
    }
    var innerEndPos = this.lastTokEnd, innerEndLoc = this.lastTokEndLoc;
    this.expect(types$1.parenR);

    if (canBeArrow && !this.canInsertSemicolon() && this.eat(types$1.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      return this.parseParenArrowList(startPos, startLoc, exprList, forInit)
    }

    if (!exprList.length || lastIsComma) { this.unexpected(this.lastTokStart); }
    if (spreadStart) { this.unexpected(spreadStart); }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;

    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }

  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression")
  } else {
    return val
  }
};

pp$5.parseParenItem = function(item) {
  return item
};

pp$5.parseParenArrowList = function(startPos, startLoc, exprList, forInit) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, false, forInit)
};

// New's precedence is slightly tricky. It must allow its argument to
// be a `[]` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.

var empty = [];

pp$5.parseNew = function() {
  if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword new"); }
  var node = this.startNode();
  var meta = this.parseIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(types$1.dot)) {
    node.meta = meta;
    var containsEsc = this.containsEsc;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target")
      { this.raiseRecoverable(node.property.start, "The only valid meta property for new is 'new.target'"); }
    if (containsEsc)
      { this.raiseRecoverable(node.start, "'new.target' must not contain escaped characters"); }
    if (!this.allowNewDotTarget)
      { this.raiseRecoverable(node.start, "'new.target' can only be used in functions and class static block"); }
    return this.finishNode(node, "MetaProperty")
  }
  var startPos = this.start, startLoc = this.startLoc, isImport = this.type === types$1._import;
  node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true, false);
  if (isImport && node.callee.type === "ImportExpression") {
    this.raise(startPos, "Cannot use new with import()");
  }
  if (this.eat(types$1.parenL)) { node.arguments = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false); }
  else { node.arguments = empty; }
  return this.finishNode(node, "NewExpression")
};

// Parse template expression.

pp$5.parseTemplateElement = function(ref) {
  var isTagged = ref.isTagged;

  var elem = this.startNode();
  if (this.type === types$1.invalidTemplate) {
    if (!isTagged) {
      this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
    }
    elem.value = {
      raw: this.value,
      cooked: null
    };
  } else {
    elem.value = {
      raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
      cooked: this.value
    };
  }
  this.next();
  elem.tail = this.type === types$1.backQuote;
  return this.finishNode(elem, "TemplateElement")
};

pp$5.parseTemplate = function(ref) {
  if ( ref === void 0 ) ref = {};
  var isTagged = ref.isTagged; if ( isTagged === void 0 ) isTagged = false;

  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement({isTagged: isTagged});
  node.quasis = [curElt];
  while (!curElt.tail) {
    if (this.type === types$1.eof) { this.raise(this.pos, "Unterminated template literal"); }
    this.expect(types$1.dollarBraceL);
    node.expressions.push(this.parseExpression());
    this.expect(types$1.braceR);
    node.quasis.push(curElt = this.parseTemplateElement({isTagged: isTagged}));
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral")
};

pp$5.isAsyncProp = function(prop) {
  return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" &&
    (this.type === types$1.name || this.type === types$1.num || this.type === types$1.string || this.type === types$1.bracketL || this.type.keyword || (this.options.ecmaVersion >= 9 && this.type === types$1.star)) &&
    !lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

// Parse an object literal or binding pattern.

pp$5.parseObj = function(isPattern, refDestructuringErrors) {
  var node = this.startNode(), first = true, propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.options.ecmaVersion >= 5 && this.afterTrailingComma(types$1.braceR)) { break }
    } else { first = false; }

    var prop = this.parseProperty(isPattern, refDestructuringErrors);
    if (!isPattern) { this.checkPropClash(prop, propHash, refDestructuringErrors); }
    node.properties.push(prop);
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
};

pp$5.parseProperty = function(isPattern, refDestructuringErrors) {
  var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
  if (this.options.ecmaVersion >= 9 && this.eat(types$1.ellipsis)) {
    if (isPattern) {
      prop.argument = this.parseIdent(false);
      if (this.type === types$1.comma) {
        this.raise(this.start, "Comma is not permitted after the rest element");
      }
      return this.finishNode(prop, "RestElement")
    }
    // To disallow parenthesized identifier via `this.toAssignable()`.
    if (this.type === types$1.parenL && refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0) {
        refDestructuringErrors.parenthesizedAssign = this.start;
      }
      if (refDestructuringErrors.parenthesizedBind < 0) {
        refDestructuringErrors.parenthesizedBind = this.start;
      }
    }
    // Parse argument.
    prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
    // To disallow trailing comma via `this.toAssignable()`.
    if (this.type === types$1.comma && refDestructuringErrors && refDestructuringErrors.trailingComma < 0) {
      refDestructuringErrors.trailingComma = this.start;
    }
    // Finish
    return this.finishNode(prop, "SpreadElement")
  }
  if (this.options.ecmaVersion >= 6) {
    prop.method = false;
    prop.shorthand = false;
    if (isPattern || refDestructuringErrors) {
      startPos = this.start;
      startLoc = this.startLoc;
    }
    if (!isPattern)
      { isGenerator = this.eat(types$1.star); }
  }
  var containsEsc = this.containsEsc;
  this.parsePropertyName(prop);
  if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
    isAsync = true;
    isGenerator = this.options.ecmaVersion >= 9 && this.eat(types$1.star);
    this.parsePropertyName(prop, refDestructuringErrors);
  } else {
    isAsync = false;
  }
  this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
  return this.finishNode(prop, "Property")
};

pp$5.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
  if ((isGenerator || isAsync) && this.type === types$1.colon)
    { this.unexpected(); }

  if (this.eat(types$1.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === types$1.parenL) {
    if (isPattern) { this.unexpected(); }
    prop.kind = "init";
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
  } else if (!isPattern && !containsEsc &&
             this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
             (prop.key.name === "get" || prop.key.name === "set") &&
             (this.type !== types$1.comma && this.type !== types$1.braceR && this.type !== types$1.eq)) {
    if (isGenerator || isAsync) { this.unexpected(); }
    prop.kind = prop.key.name;
    this.parsePropertyName(prop);
    prop.value = this.parseMethod(false);
    var paramCount = prop.kind === "get" ? 0 : 1;
    if (prop.value.params.length !== paramCount) {
      var start = prop.value.start;
      if (prop.kind === "get")
        { this.raiseRecoverable(start, "getter should have no params"); }
      else
        { this.raiseRecoverable(start, "setter should have exactly one param"); }
    } else {
      if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
        { this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params"); }
    }
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    if (isGenerator || isAsync) { this.unexpected(); }
    this.checkUnreserved(prop.key);
    if (prop.key.name === "await" && !this.awaitIdentPos)
      { this.awaitIdentPos = startPos; }
    prop.kind = "init";
    if (isPattern) {
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else if (this.type === types$1.eq && refDestructuringErrors) {
      if (refDestructuringErrors.shorthandAssign < 0)
        { refDestructuringErrors.shorthandAssign = this.start; }
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else {
      prop.value = this.copyNode(prop.key);
    }
    prop.shorthand = true;
  } else { this.unexpected(); }
};

pp$5.parsePropertyName = function(prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(types$1.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(types$1.bracketR);
      return prop.key
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === types$1.num || this.type === types$1.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never")
};

// Initialize empty function node.

pp$5.initFunction = function(node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) { node.generator = node.expression = false; }
  if (this.options.ecmaVersion >= 8) { node.async = false; }
};

// Parse object or class method.

pp$5.parseMethod = function(isGenerator, isAsync, allowDirectSuper) {
  var node = this.startNode(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

  this.initFunction(node);
  if (this.options.ecmaVersion >= 6)
    { node.generator = isGenerator; }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(isAsync, node.generator) | SCOPE_SUPER | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));

  this.expect(types$1.parenL);
  node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
  this.parseFunctionBody(node, false, true, false);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "FunctionExpression")
};

// Parse arrow function expression with given parameters.

pp$5.parseArrowExpression = function(node, params, isAsync, forInit) {
  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

  this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
  this.initFunction(node);
  if (this.options.ecmaVersion >= 8) { node.async = !!isAsync; }

  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;

  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true, false, forInit);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "ArrowFunctionExpression")
};

// Parse function body and check parameters.

pp$5.parseFunctionBody = function(node, isArrowFunction, isMethod, forInit) {
  var isExpression = isArrowFunction && this.type !== types$1.braceL;
  var oldStrict = this.strict, useStrict = false;

  if (isExpression) {
    node.body = this.parseMaybeAssign(forInit);
    node.expression = true;
    this.checkParams(node, false);
  } else {
    var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
    if (!oldStrict || nonSimple) {
      useStrict = this.strictDirective(this.end);
      // If this is a strict mode function, verify that argument names
      // are not repeated, and it does not try to bind the words `eval`
      // or `arguments`.
      if (useStrict && nonSimple)
        { this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list"); }
    }
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldLabels = this.labels;
    this.labels = [];
    if (useStrict) { this.strict = true; }

    // Add the params to varDeclaredNames to ensure that an error is thrown
    // if a let/const declaration in the function clashes with one of the params.
    this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && !isMethod && this.isSimpleParamList(node.params));
    // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
    if (this.strict && node.id) { this.checkLValSimple(node.id, BIND_OUTSIDE); }
    node.body = this.parseBlock(false, undefined, useStrict && !oldStrict);
    node.expression = false;
    this.adaptDirectivePrologue(node.body.body);
    this.labels = oldLabels;
  }
  this.exitScope();
};

pp$5.isSimpleParamList = function(params) {
  for (var i = 0, list = params; i < list.length; i += 1)
    {
    var param = list[i];

    if (param.type !== "Identifier") { return false
  } }
  return true
};

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

pp$5.checkParams = function(node, allowDuplicates) {
  var nameHash = Object.create(null);
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    this.checkLValInnerPattern(param, BIND_VAR, allowDuplicates ? null : nameHash);
  }
};

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

pp$5.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (!first) {
      this.expect(types$1.comma);
      if (allowTrailingComma && this.afterTrailingComma(close)) { break }
    } else { first = false; }

    var elt = (void 0);
    if (allowEmpty && this.type === types$1.comma)
      { elt = null; }
    else if (this.type === types$1.ellipsis) {
      elt = this.parseSpread(refDestructuringErrors);
      if (refDestructuringErrors && this.type === types$1.comma && refDestructuringErrors.trailingComma < 0)
        { refDestructuringErrors.trailingComma = this.start; }
    } else {
      elt = this.parseMaybeAssign(false, refDestructuringErrors);
    }
    elts.push(elt);
  }
  return elts
};

pp$5.checkUnreserved = function(ref) {
  var start = ref.start;
  var end = ref.end;
  var name = ref.name;

  if (this.inGenerator && name === "yield")
    { this.raiseRecoverable(start, "Cannot use 'yield' as identifier inside a generator"); }
  if (this.inAsync && name === "await")
    { this.raiseRecoverable(start, "Cannot use 'await' as identifier inside an async function"); }
  if (this.currentThisScope().inClassFieldInit && name === "arguments")
    { this.raiseRecoverable(start, "Cannot use 'arguments' in class field initializer"); }
  if (this.inClassStaticBlock && (name === "arguments" || name === "await"))
    { this.raise(start, ("Cannot use " + name + " in class static initialization block")); }
  if (this.keywords.test(name))
    { this.raise(start, ("Unexpected keyword '" + name + "'")); }
  if (this.options.ecmaVersion < 6 &&
    this.input.slice(start, end).indexOf("\\") !== -1) { return }
  var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re.test(name)) {
    if (!this.inAsync && name === "await")
      { this.raiseRecoverable(start, "Cannot use keyword 'await' outside an async function"); }
    this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved"));
  }
};

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

pp$5.parseIdent = function(liberal, isBinding) {
  var node = this.startNode();
  if (this.type === types$1.name) {
    node.name = this.value;
  } else if (this.type.keyword) {
    node.name = this.type.keyword;

    // To fix https://github.com/acornjs/acorn/issues/575
    // `class` and `function` keywords push new context into this.context.
    // But there is no chance to pop the context if the keyword is consumed as an identifier such as a property name.
    // If the previous token is a dot, this does not apply because the context-managing code already ignored the keyword
    if ((node.name === "class" || node.name === "function") &&
        (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
      this.context.pop();
    }
  } else {
    this.unexpected();
  }
  this.next(!!liberal);
  this.finishNode(node, "Identifier");
  if (!liberal) {
    this.checkUnreserved(node);
    if (node.name === "await" && !this.awaitIdentPos)
      { this.awaitIdentPos = node.start; }
  }
  return node
};

pp$5.parsePrivateIdent = function() {
  var node = this.startNode();
  if (this.type === types$1.privateId) {
    node.name = this.value;
  } else {
    this.unexpected();
  }
  this.next();
  this.finishNode(node, "PrivateIdentifier");

  // For validating existence
  if (this.privateNameStack.length === 0) {
    this.raise(node.start, ("Private field '#" + (node.name) + "' must be declared in an enclosing class"));
  } else {
    this.privateNameStack[this.privateNameStack.length - 1].used.push(node);
  }

  return node
};

// Parses yield expression inside generator.

pp$5.parseYield = function(forInit) {
  if (!this.yieldPos) { this.yieldPos = this.start; }

  var node = this.startNode();
  this.next();
  if (this.type === types$1.semi || this.canInsertSemicolon() || (this.type !== types$1.star && !this.type.startsExpr)) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(types$1.star);
    node.argument = this.parseMaybeAssign(forInit);
  }
  return this.finishNode(node, "YieldExpression")
};

pp$5.parseAwait = function(forInit) {
  if (!this.awaitPos) { this.awaitPos = this.start; }

  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeUnary(null, true, false, forInit);
  return this.finishNode(node, "AwaitExpression")
};

var pp$4 = Parser.prototype;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

pp$4.raise = function(pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  err.pos = pos; err.loc = loc; err.raisedAt = this.pos;
  throw err
};

pp$4.raiseRecoverable = pp$4.raise;

pp$4.curPosition = function() {
  if (this.options.locations) {
    return new Position(this.curLine, this.pos - this.lineStart)
  }
};

var pp$3 = Parser.prototype;

var Scope = function Scope(flags) {
  this.flags = flags;
  // A list of var-declared names in the current lexical scope
  this.var = [];
  // A list of lexically-declared names in the current lexical scope
  this.lexical = [];
  // A list of lexically-declared FunctionDeclaration names in the current lexical scope
  this.functions = [];
  // A switch to disallow the identifier reference 'arguments'
  this.inClassFieldInit = false;
};

// The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

pp$3.enterScope = function(flags) {
  this.scopeStack.push(new Scope(flags));
};

pp$3.exitScope = function() {
  this.scopeStack.pop();
};

// The spec says:
// > At the top level of a function, or script, function declarations are
// > treated like var declarations rather than like lexical declarations.
pp$3.treatFunctionsAsVarInScope = function(scope) {
  return (scope.flags & SCOPE_FUNCTION) || !this.inModule && (scope.flags & SCOPE_TOP)
};

pp$3.declareName = function(name, bindingType, pos) {
  var redeclared = false;
  if (bindingType === BIND_LEXICAL) {
    var scope = this.currentScope();
    redeclared = scope.lexical.indexOf(name) > -1 || scope.functions.indexOf(name) > -1 || scope.var.indexOf(name) > -1;
    scope.lexical.push(name);
    if (this.inModule && (scope.flags & SCOPE_TOP))
      { delete this.undefinedExports[name]; }
  } else if (bindingType === BIND_SIMPLE_CATCH) {
    var scope$1 = this.currentScope();
    scope$1.lexical.push(name);
  } else if (bindingType === BIND_FUNCTION) {
    var scope$2 = this.currentScope();
    if (this.treatFunctionsAsVar)
      { redeclared = scope$2.lexical.indexOf(name) > -1; }
    else
      { redeclared = scope$2.lexical.indexOf(name) > -1 || scope$2.var.indexOf(name) > -1; }
    scope$2.functions.push(name);
  } else {
    for (var i = this.scopeStack.length - 1; i >= 0; --i) {
      var scope$3 = this.scopeStack[i];
      if (scope$3.lexical.indexOf(name) > -1 && !((scope$3.flags & SCOPE_SIMPLE_CATCH) && scope$3.lexical[0] === name) ||
          !this.treatFunctionsAsVarInScope(scope$3) && scope$3.functions.indexOf(name) > -1) {
        redeclared = true;
        break
      }
      scope$3.var.push(name);
      if (this.inModule && (scope$3.flags & SCOPE_TOP))
        { delete this.undefinedExports[name]; }
      if (scope$3.flags & SCOPE_VAR) { break }
    }
  }
  if (redeclared) { this.raiseRecoverable(pos, ("Identifier '" + name + "' has already been declared")); }
};

pp$3.checkLocalExport = function(id) {
  // scope.functions must be empty as Module code is always strict.
  if (this.scopeStack[0].lexical.indexOf(id.name) === -1 &&
      this.scopeStack[0].var.indexOf(id.name) === -1) {
    this.undefinedExports[id.name] = id;
  }
};

pp$3.currentScope = function() {
  return this.scopeStack[this.scopeStack.length - 1]
};

pp$3.currentVarScope = function() {
  for (var i = this.scopeStack.length - 1;; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & SCOPE_VAR) { return scope }
  }
};

// Could be useful for `this`, `new.target`, `super()`, `super.property`, and `super[property]`.
pp$3.currentThisScope = function() {
  for (var i = this.scopeStack.length - 1;; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & SCOPE_VAR && !(scope.flags & SCOPE_ARROW)) { return scope }
  }
};

var Node = function Node(parser, pos, loc) {
  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations)
    { this.loc = new SourceLocation(parser, loc); }
  if (parser.options.directSourceFile)
    { this.sourceFile = parser.options.directSourceFile; }
  if (parser.options.ranges)
    { this.range = [pos, 0]; }
};

// Start an AST node, attaching a start offset.

var pp$2 = Parser.prototype;

pp$2.startNode = function() {
  return new Node(this, this.start, this.startLoc)
};

pp$2.startNodeAt = function(pos, loc) {
  return new Node(this, pos, loc)
};

// Finish an AST node, adding `type` and `end` properties.

function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations)
    { node.loc.end = loc; }
  if (this.options.ranges)
    { node.range[1] = pos; }
  return node
}

pp$2.finishNode = function(node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
};

// Finish node at given position

pp$2.finishNodeAt = function(node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc)
};

pp$2.copyNode = function(node) {
  var newNode = new Node(this, node.start, this.startLoc);
  for (var prop in node) { newNode[prop] = node[prop]; }
  return newNode
};

// This file contains Unicode properties extracted from the ECMAScript
// specification. The lists are extracted like so:
// $$('#table-binary-unicode-properties > figure > table > tbody > tr > td:nth-child(1) code').map(el => el.innerText)

// #table-binary-unicode-properties
var ecma9BinaryProperties = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
var ecma11BinaryProperties = ecma10BinaryProperties;
var ecma12BinaryProperties = ecma11BinaryProperties + " EBase EComp EMod EPres ExtPict";
var ecma13BinaryProperties = ecma12BinaryProperties;
var unicodeBinaryProperties = {
  9: ecma9BinaryProperties,
  10: ecma10BinaryProperties,
  11: ecma11BinaryProperties,
  12: ecma12BinaryProperties,
  13: ecma13BinaryProperties
};

// #table-unicode-general-category-values
var unicodeGeneralCategoryValues = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";

// #table-unicode-script-values
var ecma9ScriptValues = "Adlam Adlm Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
var ecma10ScriptValues = ecma9ScriptValues + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
var ecma11ScriptValues = ecma10ScriptValues + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
var ecma12ScriptValues = ecma11ScriptValues + " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi";
var ecma13ScriptValues = ecma12ScriptValues + " Cypro_Minoan Cpmn Old_Uyghur Ougr Tangsa Tnsa Toto Vithkuqi Vith";
var unicodeScriptValues = {
  9: ecma9ScriptValues,
  10: ecma10ScriptValues,
  11: ecma11ScriptValues,
  12: ecma12ScriptValues,
  13: ecma13ScriptValues
};

var data = {};
function buildUnicodeData(ecmaVersion) {
  var d = data[ecmaVersion] = {
    binary: wordsRegexp(unicodeBinaryProperties[ecmaVersion] + " " + unicodeGeneralCategoryValues),
    nonBinary: {
      General_Category: wordsRegexp(unicodeGeneralCategoryValues),
      Script: wordsRegexp(unicodeScriptValues[ecmaVersion])
    }
  };
  d.nonBinary.Script_Extensions = d.nonBinary.Script;

  d.nonBinary.gc = d.nonBinary.General_Category;
  d.nonBinary.sc = d.nonBinary.Script;
  d.nonBinary.scx = d.nonBinary.Script_Extensions;
}

for (var i = 0, list = [9, 10, 11, 12, 13]; i < list.length; i += 1) {
  var ecmaVersion = list[i];

  buildUnicodeData(ecmaVersion);
}

var pp$1 = Parser.prototype;

var RegExpValidationState = function RegExpValidationState(parser) {
  this.parser = parser;
  this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") + (parser.options.ecmaVersion >= 9 ? "s" : "") + (parser.options.ecmaVersion >= 13 ? "d" : "");
  this.unicodeProperties = data[parser.options.ecmaVersion >= 13 ? 13 : parser.options.ecmaVersion];
  this.source = "";
  this.flags = "";
  this.start = 0;
  this.switchU = false;
  this.switchN = false;
  this.pos = 0;
  this.lastIntValue = 0;
  this.lastStringValue = "";
  this.lastAssertionIsQuantifiable = false;
  this.numCapturingParens = 0;
  this.maxBackReference = 0;
  this.groupNames = [];
  this.backReferenceNames = [];
};

RegExpValidationState.prototype.reset = function reset (start, pattern, flags) {
  var unicode = flags.indexOf("u") !== -1;
  this.start = start | 0;
  this.source = pattern + "";
  this.flags = flags;
  this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
  this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
};

RegExpValidationState.prototype.raise = function raise (message) {
  this.parser.raiseRecoverable(this.start, ("Invalid regular expression: /" + (this.source) + "/: " + message));
};

// If u flag is given, this returns the code point at the index (it combines a surrogate pair).
// Otherwise, this returns the code unit of the index (can be a part of a surrogate pair).
RegExpValidationState.prototype.at = function at (i, forceU) {
    if ( forceU === void 0 ) forceU = false;

  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return -1
  }
  var c = s.charCodeAt(i);
  if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l) {
    return c
  }
  var next = s.charCodeAt(i + 1);
  return next >= 0xDC00 && next <= 0xDFFF ? (c << 10) + next - 0x35FDC00 : c
};

RegExpValidationState.prototype.nextIndex = function nextIndex (i, forceU) {
    if ( forceU === void 0 ) forceU = false;

  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return l
  }
  var c = s.charCodeAt(i), next;
  if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l ||
      (next = s.charCodeAt(i + 1)) < 0xDC00 || next > 0xDFFF) {
    return i + 1
  }
  return i + 2
};

RegExpValidationState.prototype.current = function current (forceU) {
    if ( forceU === void 0 ) forceU = false;

  return this.at(this.pos, forceU)
};

RegExpValidationState.prototype.lookahead = function lookahead (forceU) {
    if ( forceU === void 0 ) forceU = false;

  return this.at(this.nextIndex(this.pos, forceU), forceU)
};

RegExpValidationState.prototype.advance = function advance (forceU) {
    if ( forceU === void 0 ) forceU = false;

  this.pos = this.nextIndex(this.pos, forceU);
};

RegExpValidationState.prototype.eat = function eat (ch, forceU) {
    if ( forceU === void 0 ) forceU = false;

  if (this.current(forceU) === ch) {
    this.advance(forceU);
    return true
  }
  return false
};

/**
 * Validate the flags part of a given RegExpLiteral.
 *
 * @param {RegExpValidationState} state The state to validate RegExp.
 * @returns {void}
 */
pp$1.validateRegExpFlags = function(state) {
  var validFlags = state.validFlags;
  var flags = state.flags;

  for (var i = 0; i < flags.length; i++) {
    var flag = flags.charAt(i);
    if (validFlags.indexOf(flag) === -1) {
      this.raise(state.start, "Invalid regular expression flag");
    }
    if (flags.indexOf(flag, i + 1) > -1) {
      this.raise(state.start, "Duplicate regular expression flag");
    }
  }
};

/**
 * Validate the pattern part of a given RegExpLiteral.
 *
 * @param {RegExpValidationState} state The state to validate RegExp.
 * @returns {void}
 */
pp$1.validateRegExpPattern = function(state) {
  this.regexp_pattern(state);

  // The goal symbol for the parse is |Pattern[~U, ~N]|. If the result of
  // parsing contains a |GroupName|, reparse with the goal symbol
  // |Pattern[~U, +N]| and use this result instead. Throw a *SyntaxError*
  // exception if _P_ did not conform to the grammar, if any elements of _P_
  // were not matched by the parse, or if any Early Error conditions exist.
  if (!state.switchN && this.options.ecmaVersion >= 9 && state.groupNames.length > 0) {
    state.switchN = true;
    this.regexp_pattern(state);
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Pattern
pp$1.regexp_pattern = function(state) {
  state.pos = 0;
  state.lastIntValue = 0;
  state.lastStringValue = "";
  state.lastAssertionIsQuantifiable = false;
  state.numCapturingParens = 0;
  state.maxBackReference = 0;
  state.groupNames.length = 0;
  state.backReferenceNames.length = 0;

  this.regexp_disjunction(state);

  if (state.pos !== state.source.length) {
    // Make the same messages as V8.
    if (state.eat(0x29 /* ) */)) {
      state.raise("Unmatched ')'");
    }
    if (state.eat(0x5D /* ] */) || state.eat(0x7D /* } */)) {
      state.raise("Lone quantifier brackets");
    }
  }
  if (state.maxBackReference > state.numCapturingParens) {
    state.raise("Invalid escape");
  }
  for (var i = 0, list = state.backReferenceNames; i < list.length; i += 1) {
    var name = list[i];

    if (state.groupNames.indexOf(name) === -1) {
      state.raise("Invalid named capture referenced");
    }
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Disjunction
pp$1.regexp_disjunction = function(state) {
  this.regexp_alternative(state);
  while (state.eat(0x7C /* | */)) {
    this.regexp_alternative(state);
  }

  // Make the same message as V8.
  if (this.regexp_eatQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  if (state.eat(0x7B /* { */)) {
    state.raise("Lone quantifier brackets");
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Alternative
pp$1.regexp_alternative = function(state) {
  while (state.pos < state.source.length && this.regexp_eatTerm(state))
    { }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Term
pp$1.regexp_eatTerm = function(state) {
  if (this.regexp_eatAssertion(state)) {
    // Handle `QuantifiableAssertion Quantifier` alternative.
    // `state.lastAssertionIsQuantifiable` is true if the last eaten Assertion
    // is a QuantifiableAssertion.
    if (state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)) {
      // Make the same message as V8.
      if (state.switchU) {
        state.raise("Invalid quantifier");
      }
    }
    return true
  }

  if (state.switchU ? this.regexp_eatAtom(state) : this.regexp_eatExtendedAtom(state)) {
    this.regexp_eatQuantifier(state);
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Assertion
pp$1.regexp_eatAssertion = function(state) {
  var start = state.pos;
  state.lastAssertionIsQuantifiable = false;

  // ^, $
  if (state.eat(0x5E /* ^ */) || state.eat(0x24 /* $ */)) {
    return true
  }

  // \b \B
  if (state.eat(0x5C /* \ */)) {
    if (state.eat(0x42 /* B */) || state.eat(0x62 /* b */)) {
      return true
    }
    state.pos = start;
  }

  // Lookahead / Lookbehind
  if (state.eat(0x28 /* ( */) && state.eat(0x3F /* ? */)) {
    var lookbehind = false;
    if (this.options.ecmaVersion >= 9) {
      lookbehind = state.eat(0x3C /* < */);
    }
    if (state.eat(0x3D /* = */) || state.eat(0x21 /* ! */)) {
      this.regexp_disjunction(state);
      if (!state.eat(0x29 /* ) */)) {
        state.raise("Unterminated group");
      }
      state.lastAssertionIsQuantifiable = !lookbehind;
      return true
    }
  }

  state.pos = start;
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Quantifier
pp$1.regexp_eatQuantifier = function(state, noError) {
  if ( noError === void 0 ) noError = false;

  if (this.regexp_eatQuantifierPrefix(state, noError)) {
    state.eat(0x3F /* ? */);
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-QuantifierPrefix
pp$1.regexp_eatQuantifierPrefix = function(state, noError) {
  return (
    state.eat(0x2A /* * */) ||
    state.eat(0x2B /* + */) ||
    state.eat(0x3F /* ? */) ||
    this.regexp_eatBracedQuantifier(state, noError)
  )
};
pp$1.regexp_eatBracedQuantifier = function(state, noError) {
  var start = state.pos;
  if (state.eat(0x7B /* { */)) {
    var min = 0, max = -1;
    if (this.regexp_eatDecimalDigits(state)) {
      min = state.lastIntValue;
      if (state.eat(0x2C /* , */) && this.regexp_eatDecimalDigits(state)) {
        max = state.lastIntValue;
      }
      if (state.eat(0x7D /* } */)) {
        // SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-term
        if (max !== -1 && max < min && !noError) {
          state.raise("numbers out of order in {} quantifier");
        }
        return true
      }
    }
    if (state.switchU && !noError) {
      state.raise("Incomplete quantifier");
    }
    state.pos = start;
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Atom
pp$1.regexp_eatAtom = function(state) {
  return (
    this.regexp_eatPatternCharacters(state) ||
    state.eat(0x2E /* . */) ||
    this.regexp_eatReverseSolidusAtomEscape(state) ||
    this.regexp_eatCharacterClass(state) ||
    this.regexp_eatUncapturingGroup(state) ||
    this.regexp_eatCapturingGroup(state)
  )
};
pp$1.regexp_eatReverseSolidusAtomEscape = function(state) {
  var start = state.pos;
  if (state.eat(0x5C /* \ */)) {
    if (this.regexp_eatAtomEscape(state)) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$1.regexp_eatUncapturingGroup = function(state) {
  var start = state.pos;
  if (state.eat(0x28 /* ( */)) {
    if (state.eat(0x3F /* ? */) && state.eat(0x3A /* : */)) {
      this.regexp_disjunction(state);
      if (state.eat(0x29 /* ) */)) {
        return true
      }
      state.raise("Unterminated group");
    }
    state.pos = start;
  }
  return false
};
pp$1.regexp_eatCapturingGroup = function(state) {
  if (state.eat(0x28 /* ( */)) {
    if (this.options.ecmaVersion >= 9) {
      this.regexp_groupSpecifier(state);
    } else if (state.current() === 0x3F /* ? */) {
      state.raise("Invalid group");
    }
    this.regexp_disjunction(state);
    if (state.eat(0x29 /* ) */)) {
      state.numCapturingParens += 1;
      return true
    }
    state.raise("Unterminated group");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedAtom
pp$1.regexp_eatExtendedAtom = function(state) {
  return (
    state.eat(0x2E /* . */) ||
    this.regexp_eatReverseSolidusAtomEscape(state) ||
    this.regexp_eatCharacterClass(state) ||
    this.regexp_eatUncapturingGroup(state) ||
    this.regexp_eatCapturingGroup(state) ||
    this.regexp_eatInvalidBracedQuantifier(state) ||
    this.regexp_eatExtendedPatternCharacter(state)
  )
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-InvalidBracedQuantifier
pp$1.regexp_eatInvalidBracedQuantifier = function(state) {
  if (this.regexp_eatBracedQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-SyntaxCharacter
pp$1.regexp_eatSyntaxCharacter = function(state) {
  var ch = state.current();
  if (isSyntaxCharacter(ch)) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }
  return false
};
function isSyntaxCharacter(ch) {
  return (
    ch === 0x24 /* $ */ ||
    ch >= 0x28 /* ( */ && ch <= 0x2B /* + */ ||
    ch === 0x2E /* . */ ||
    ch === 0x3F /* ? */ ||
    ch >= 0x5B /* [ */ && ch <= 0x5E /* ^ */ ||
    ch >= 0x7B /* { */ && ch <= 0x7D /* } */
  )
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-PatternCharacter
// But eat eager.
pp$1.regexp_eatPatternCharacters = function(state) {
  var start = state.pos;
  var ch = 0;
  while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
    state.advance();
  }
  return state.pos !== start
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedPatternCharacter
pp$1.regexp_eatExtendedPatternCharacter = function(state) {
  var ch = state.current();
  if (
    ch !== -1 &&
    ch !== 0x24 /* $ */ &&
    !(ch >= 0x28 /* ( */ && ch <= 0x2B /* + */) &&
    ch !== 0x2E /* . */ &&
    ch !== 0x3F /* ? */ &&
    ch !== 0x5B /* [ */ &&
    ch !== 0x5E /* ^ */ &&
    ch !== 0x7C /* | */
  ) {
    state.advance();
    return true
  }
  return false
};

// GroupSpecifier ::
//   [empty]
//   `?` GroupName
pp$1.regexp_groupSpecifier = function(state) {
  if (state.eat(0x3F /* ? */)) {
    if (this.regexp_eatGroupName(state)) {
      if (state.groupNames.indexOf(state.lastStringValue) !== -1) {
        state.raise("Duplicate capture group name");
      }
      state.groupNames.push(state.lastStringValue);
      return
    }
    state.raise("Invalid group");
  }
};

// GroupName ::
//   `<` RegExpIdentifierName `>`
// Note: this updates `state.lastStringValue` property with the eaten name.
pp$1.regexp_eatGroupName = function(state) {
  state.lastStringValue = "";
  if (state.eat(0x3C /* < */)) {
    if (this.regexp_eatRegExpIdentifierName(state) && state.eat(0x3E /* > */)) {
      return true
    }
    state.raise("Invalid capture group name");
  }
  return false
};

// RegExpIdentifierName ::
//   RegExpIdentifierStart
//   RegExpIdentifierName RegExpIdentifierPart
// Note: this updates `state.lastStringValue` property with the eaten name.
pp$1.regexp_eatRegExpIdentifierName = function(state) {
  state.lastStringValue = "";
  if (this.regexp_eatRegExpIdentifierStart(state)) {
    state.lastStringValue += codePointToString(state.lastIntValue);
    while (this.regexp_eatRegExpIdentifierPart(state)) {
      state.lastStringValue += codePointToString(state.lastIntValue);
    }
    return true
  }
  return false
};

// RegExpIdentifierStart ::
//   UnicodeIDStart
//   `$`
//   `_`
//   `\` RegExpUnicodeEscapeSequence[+U]
pp$1.regexp_eatRegExpIdentifierStart = function(state) {
  var start = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);

  if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierStart(ch)) {
    state.lastIntValue = ch;
    return true
  }

  state.pos = start;
  return false
};
function isRegExpIdentifierStart(ch) {
  return isIdentifierStart(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */
}

// RegExpIdentifierPart ::
//   UnicodeIDContinue
//   `$`
//   `_`
//   `\` RegExpUnicodeEscapeSequence[+U]
//   <ZWNJ>
//   <ZWJ>
pp$1.regexp_eatRegExpIdentifierPart = function(state) {
  var start = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);

  if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierPart(ch)) {
    state.lastIntValue = ch;
    return true
  }

  state.pos = start;
  return false
};
function isRegExpIdentifierPart(ch) {
  return isIdentifierChar(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */ || ch === 0x200C /* <ZWNJ> */ || ch === 0x200D /* <ZWJ> */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-AtomEscape
pp$1.regexp_eatAtomEscape = function(state) {
  if (
    this.regexp_eatBackReference(state) ||
    this.regexp_eatCharacterClassEscape(state) ||
    this.regexp_eatCharacterEscape(state) ||
    (state.switchN && this.regexp_eatKGroupName(state))
  ) {
    return true
  }
  if (state.switchU) {
    // Make the same message as V8.
    if (state.current() === 0x63 /* c */) {
      state.raise("Invalid unicode escape");
    }
    state.raise("Invalid escape");
  }
  return false
};
pp$1.regexp_eatBackReference = function(state) {
  var start = state.pos;
  if (this.regexp_eatDecimalEscape(state)) {
    var n = state.lastIntValue;
    if (state.switchU) {
      // For SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-atomescape
      if (n > state.maxBackReference) {
        state.maxBackReference = n;
      }
      return true
    }
    if (n <= state.numCapturingParens) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$1.regexp_eatKGroupName = function(state) {
  if (state.eat(0x6B /* k */)) {
    if (this.regexp_eatGroupName(state)) {
      state.backReferenceNames.push(state.lastStringValue);
      return true
    }
    state.raise("Invalid named reference");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-CharacterEscape
pp$1.regexp_eatCharacterEscape = function(state) {
  return (
    this.regexp_eatControlEscape(state) ||
    this.regexp_eatCControlLetter(state) ||
    this.regexp_eatZero(state) ||
    this.regexp_eatHexEscapeSequence(state) ||
    this.regexp_eatRegExpUnicodeEscapeSequence(state, false) ||
    (!state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state)) ||
    this.regexp_eatIdentityEscape(state)
  )
};
pp$1.regexp_eatCControlLetter = function(state) {
  var start = state.pos;
  if (state.eat(0x63 /* c */)) {
    if (this.regexp_eatControlLetter(state)) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$1.regexp_eatZero = function(state) {
  if (state.current() === 0x30 /* 0 */ && !isDecimalDigit(state.lookahead())) {
    state.lastIntValue = 0;
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ControlEscape
pp$1.regexp_eatControlEscape = function(state) {
  var ch = state.current();
  if (ch === 0x74 /* t */) {
    state.lastIntValue = 0x09; /* \t */
    state.advance();
    return true
  }
  if (ch === 0x6E /* n */) {
    state.lastIntValue = 0x0A; /* \n */
    state.advance();
    return true
  }
  if (ch === 0x76 /* v */) {
    state.lastIntValue = 0x0B; /* \v */
    state.advance();
    return true
  }
  if (ch === 0x66 /* f */) {
    state.lastIntValue = 0x0C; /* \f */
    state.advance();
    return true
  }
  if (ch === 0x72 /* r */) {
    state.lastIntValue = 0x0D; /* \r */
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ControlLetter
pp$1.regexp_eatControlLetter = function(state) {
  var ch = state.current();
  if (isControlLetter(ch)) {
    state.lastIntValue = ch % 0x20;
    state.advance();
    return true
  }
  return false
};
function isControlLetter(ch) {
  return (
    (ch >= 0x41 /* A */ && ch <= 0x5A /* Z */) ||
    (ch >= 0x61 /* a */ && ch <= 0x7A /* z */)
  )
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-RegExpUnicodeEscapeSequence
pp$1.regexp_eatRegExpUnicodeEscapeSequence = function(state, forceU) {
  if ( forceU === void 0 ) forceU = false;

  var start = state.pos;
  var switchU = forceU || state.switchU;

  if (state.eat(0x75 /* u */)) {
    if (this.regexp_eatFixedHexDigits(state, 4)) {
      var lead = state.lastIntValue;
      if (switchU && lead >= 0xD800 && lead <= 0xDBFF) {
        var leadSurrogateEnd = state.pos;
        if (state.eat(0x5C /* \ */) && state.eat(0x75 /* u */) && this.regexp_eatFixedHexDigits(state, 4)) {
          var trail = state.lastIntValue;
          if (trail >= 0xDC00 && trail <= 0xDFFF) {
            state.lastIntValue = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
            return true
          }
        }
        state.pos = leadSurrogateEnd;
        state.lastIntValue = lead;
      }
      return true
    }
    if (
      switchU &&
      state.eat(0x7B /* { */) &&
      this.regexp_eatHexDigits(state) &&
      state.eat(0x7D /* } */) &&
      isValidUnicode(state.lastIntValue)
    ) {
      return true
    }
    if (switchU) {
      state.raise("Invalid unicode escape");
    }
    state.pos = start;
  }

  return false
};
function isValidUnicode(ch) {
  return ch >= 0 && ch <= 0x10FFFF
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-IdentityEscape
pp$1.regexp_eatIdentityEscape = function(state) {
  if (state.switchU) {
    if (this.regexp_eatSyntaxCharacter(state)) {
      return true
    }
    if (state.eat(0x2F /* / */)) {
      state.lastIntValue = 0x2F; /* / */
      return true
    }
    return false
  }

  var ch = state.current();
  if (ch !== 0x63 /* c */ && (!state.switchN || ch !== 0x6B /* k */)) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalEscape
pp$1.regexp_eatDecimalEscape = function(state) {
  state.lastIntValue = 0;
  var ch = state.current();
  if (ch >= 0x31 /* 1 */ && ch <= 0x39 /* 9 */) {
    do {
      state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
      state.advance();
    } while ((ch = state.current()) >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */)
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClassEscape
pp$1.regexp_eatCharacterClassEscape = function(state) {
  var ch = state.current();

  if (isCharacterClassEscape(ch)) {
    state.lastIntValue = -1;
    state.advance();
    return true
  }

  if (
    state.switchU &&
    this.options.ecmaVersion >= 9 &&
    (ch === 0x50 /* P */ || ch === 0x70 /* p */)
  ) {
    state.lastIntValue = -1;
    state.advance();
    if (
      state.eat(0x7B /* { */) &&
      this.regexp_eatUnicodePropertyValueExpression(state) &&
      state.eat(0x7D /* } */)
    ) {
      return true
    }
    state.raise("Invalid property name");
  }

  return false
};
function isCharacterClassEscape(ch) {
  return (
    ch === 0x64 /* d */ ||
    ch === 0x44 /* D */ ||
    ch === 0x73 /* s */ ||
    ch === 0x53 /* S */ ||
    ch === 0x77 /* w */ ||
    ch === 0x57 /* W */
  )
}

// UnicodePropertyValueExpression ::
//   UnicodePropertyName `=` UnicodePropertyValue
//   LoneUnicodePropertyNameOrValue
pp$1.regexp_eatUnicodePropertyValueExpression = function(state) {
  var start = state.pos;

  // UnicodePropertyName `=` UnicodePropertyValue
  if (this.regexp_eatUnicodePropertyName(state) && state.eat(0x3D /* = */)) {
    var name = state.lastStringValue;
    if (this.regexp_eatUnicodePropertyValue(state)) {
      var value = state.lastStringValue;
      this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
      return true
    }
  }
  state.pos = start;

  // LoneUnicodePropertyNameOrValue
  if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
    var nameOrValue = state.lastStringValue;
    this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
    return true
  }
  return false
};
pp$1.regexp_validateUnicodePropertyNameAndValue = function(state, name, value) {
  if (!hasOwn(state.unicodeProperties.nonBinary, name))
    { state.raise("Invalid property name"); }
  if (!state.unicodeProperties.nonBinary[name].test(value))
    { state.raise("Invalid property value"); }
};
pp$1.regexp_validateUnicodePropertyNameOrValue = function(state, nameOrValue) {
  if (!state.unicodeProperties.binary.test(nameOrValue))
    { state.raise("Invalid property name"); }
};

// UnicodePropertyName ::
//   UnicodePropertyNameCharacters
pp$1.regexp_eatUnicodePropertyName = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyNameCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== ""
};
function isUnicodePropertyNameCharacter(ch) {
  return isControlLetter(ch) || ch === 0x5F /* _ */
}

// UnicodePropertyValue ::
//   UnicodePropertyValueCharacters
pp$1.regexp_eatUnicodePropertyValue = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyValueCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== ""
};
function isUnicodePropertyValueCharacter(ch) {
  return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch)
}

// LoneUnicodePropertyNameOrValue ::
//   UnicodePropertyValueCharacters
pp$1.regexp_eatLoneUnicodePropertyNameOrValue = function(state) {
  return this.regexp_eatUnicodePropertyValue(state)
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClass
pp$1.regexp_eatCharacterClass = function(state) {
  if (state.eat(0x5B /* [ */)) {
    state.eat(0x5E /* ^ */);
    this.regexp_classRanges(state);
    if (state.eat(0x5D /* ] */)) {
      return true
    }
    // Unreachable since it threw "unterminated regular expression" error before.
    state.raise("Unterminated character class");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassRanges
// https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRanges
// https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRangesNoDash
pp$1.regexp_classRanges = function(state) {
  while (this.regexp_eatClassAtom(state)) {
    var left = state.lastIntValue;
    if (state.eat(0x2D /* - */) && this.regexp_eatClassAtom(state)) {
      var right = state.lastIntValue;
      if (state.switchU && (left === -1 || right === -1)) {
        state.raise("Invalid character class");
      }
      if (left !== -1 && right !== -1 && left > right) {
        state.raise("Range out of order in character class");
      }
    }
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtom
// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtomNoDash
pp$1.regexp_eatClassAtom = function(state) {
  var start = state.pos;

  if (state.eat(0x5C /* \ */)) {
    if (this.regexp_eatClassEscape(state)) {
      return true
    }
    if (state.switchU) {
      // Make the same message as V8.
      var ch$1 = state.current();
      if (ch$1 === 0x63 /* c */ || isOctalDigit(ch$1)) {
        state.raise("Invalid class escape");
      }
      state.raise("Invalid escape");
    }
    state.pos = start;
  }

  var ch = state.current();
  if (ch !== 0x5D /* ] */) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassEscape
pp$1.regexp_eatClassEscape = function(state) {
  var start = state.pos;

  if (state.eat(0x62 /* b */)) {
    state.lastIntValue = 0x08; /* <BS> */
    return true
  }

  if (state.switchU && state.eat(0x2D /* - */)) {
    state.lastIntValue = 0x2D; /* - */
    return true
  }

  if (!state.switchU && state.eat(0x63 /* c */)) {
    if (this.regexp_eatClassControlLetter(state)) {
      return true
    }
    state.pos = start;
  }

  return (
    this.regexp_eatCharacterClassEscape(state) ||
    this.regexp_eatCharacterEscape(state)
  )
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassControlLetter
pp$1.regexp_eatClassControlLetter = function(state) {
  var ch = state.current();
  if (isDecimalDigit(ch) || ch === 0x5F /* _ */) {
    state.lastIntValue = ch % 0x20;
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
pp$1.regexp_eatHexEscapeSequence = function(state) {
  var start = state.pos;
  if (state.eat(0x78 /* x */)) {
    if (this.regexp_eatFixedHexDigits(state, 2)) {
      return true
    }
    if (state.switchU) {
      state.raise("Invalid escape");
    }
    state.pos = start;
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalDigits
pp$1.regexp_eatDecimalDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isDecimalDigit(ch = state.current())) {
    state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
    state.advance();
  }
  return state.pos !== start
};
function isDecimalDigit(ch) {
  return ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigits
pp$1.regexp_eatHexDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isHexDigit(ch = state.current())) {
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return state.pos !== start
};
function isHexDigit(ch) {
  return (
    (ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) ||
    (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) ||
    (ch >= 0x61 /* a */ && ch <= 0x66 /* f */)
  )
}
function hexToInt(ch) {
  if (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) {
    return 10 + (ch - 0x41 /* A */)
  }
  if (ch >= 0x61 /* a */ && ch <= 0x66 /* f */) {
    return 10 + (ch - 0x61 /* a */)
  }
  return ch - 0x30 /* 0 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-LegacyOctalEscapeSequence
// Allows only 0-377(octal) i.e. 0-255(decimal).
pp$1.regexp_eatLegacyOctalEscapeSequence = function(state) {
  if (this.regexp_eatOctalDigit(state)) {
    var n1 = state.lastIntValue;
    if (this.regexp_eatOctalDigit(state)) {
      var n2 = state.lastIntValue;
      if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
        state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
      } else {
        state.lastIntValue = n1 * 8 + n2;
      }
    } else {
      state.lastIntValue = n1;
    }
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-OctalDigit
pp$1.regexp_eatOctalDigit = function(state) {
  var ch = state.current();
  if (isOctalDigit(ch)) {
    state.lastIntValue = ch - 0x30; /* 0 */
    state.advance();
    return true
  }
  state.lastIntValue = 0;
  return false
};
function isOctalDigit(ch) {
  return ch >= 0x30 /* 0 */ && ch <= 0x37 /* 7 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-Hex4Digits
// https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigit
// And HexDigit HexDigit in https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
pp$1.regexp_eatFixedHexDigits = function(state, length) {
  var start = state.pos;
  state.lastIntValue = 0;
  for (var i = 0; i < length; ++i) {
    var ch = state.current();
    if (!isHexDigit(ch)) {
      state.pos = start;
      return false
    }
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return true
};

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.

var Token = function Token(p) {
  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations)
    { this.loc = new SourceLocation(p, p.startLoc, p.endLoc); }
  if (p.options.ranges)
    { this.range = [p.start, p.end]; }
};

// ## Tokenizer

var pp = Parser.prototype;

// Move to the next token

pp.next = function(ignoreEscapeSequenceInKeyword) {
  if (!ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc)
    { this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword); }
  if (this.options.onToken)
    { this.options.onToken(new Token(this)); }

  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};

pp.getToken = function() {
  this.next();
  return new Token(this)
};

// If we're in an ES6 environment, make parsers iterable
if (typeof Symbol !== "undefined")
  { pp[Symbol.iterator] = function() {
    var this$1$1 = this;

    return {
      next: function () {
        var token = this$1$1.getToken();
        return {
          done: token.type === types$1.eof,
          value: token
        }
      }
    }
  }; }

// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (`"use strict"; 010;` should fail).

// Read a single token, updating the parser object's token-related
// properties.

pp.nextToken = function() {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) { this.skipSpace(); }

  this.start = this.pos;
  if (this.options.locations) { this.startLoc = this.curPosition(); }
  if (this.pos >= this.input.length) { return this.finishToken(types$1.eof) }

  if (curContext.override) { return curContext.override(this) }
  else { this.readToken(this.fullCharCodeAtPos()); }
};

pp.readToken = function(code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */)
    { return this.readWord() }

  return this.getTokenFromCode(code)
};

pp.fullCharCodeAtPos = function() {
  var code = this.input.charCodeAt(this.pos);
  if (code <= 0xd7ff || code >= 0xdc00) { return code }
  var next = this.input.charCodeAt(this.pos + 1);
  return next <= 0xdbff || next >= 0xe000 ? code : (code << 10) + next - 0x35fdc00
};

pp.skipBlockComment = function() {
  var startLoc = this.options.onComment && this.curPosition();
  var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) { this.raise(this.pos - 2, "Unterminated comment"); }
  this.pos = end + 2;
  if (this.options.locations) {
    for (var nextBreak = (void 0), pos = start; (nextBreak = nextLineBreak(this.input, pos, this.pos)) > -1;) {
      ++this.curLine;
      pos = this.lineStart = nextBreak;
    }
  }
  if (this.options.onComment)
    { this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
                           startLoc, this.curPosition()); }
};

pp.skipLineComment = function(startSkip) {
  var start = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && !isNewLine(ch)) {
    ch = this.input.charCodeAt(++this.pos);
  }
  if (this.options.onComment)
    { this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
                           startLoc, this.curPosition()); }
};

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

pp.skipSpace = function() {
  loop: while (this.pos < this.input.length) {
    var ch = this.input.charCodeAt(this.pos);
    switch (ch) {
    case 32: case 160: // ' '
      ++this.pos;
      break
    case 13:
      if (this.input.charCodeAt(this.pos + 1) === 10) {
        ++this.pos;
      }
    case 10: case 8232: case 8233:
      ++this.pos;
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      break
    case 47: // '/'
      switch (this.input.charCodeAt(this.pos + 1)) {
      case 42: // '*'
        this.skipBlockComment();
        break
      case 47:
        this.skipLineComment(2);
        break
      default:
        break loop
      }
      break
    default:
      if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++this.pos;
      } else {
        break loop
      }
    }
  }
};

// Called at the end of every token. Sets `end`, `val`, and
// maintains `context` and `exprAllowed`, and skips the space after
// the token, so that the next one's `start` will point at the
// right position.

pp.finishToken = function(type, val) {
  this.end = this.pos;
  if (this.options.locations) { this.endLoc = this.curPosition(); }
  var prevType = this.type;
  this.type = type;
  this.value = val;

  this.updateContext(prevType);
};

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
pp.readToken_dot = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) { return this.readNumber(true) }
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
    this.pos += 3;
    return this.finishToken(types$1.ellipsis)
  } else {
    ++this.pos;
    return this.finishToken(types$1.dot)
  }
};

pp.readToken_slash = function() { // '/'
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) { ++this.pos; return this.readRegexp() }
  if (next === 61) { return this.finishOp(types$1.assign, 2) }
  return this.finishOp(types$1.slash, 1)
};

pp.readToken_mult_modulo_exp = function(code) { // '%*'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  var tokentype = code === 42 ? types$1.star : types$1.modulo;

  // exponentiation operator ** and **=
  if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
    ++size;
    tokentype = types$1.starstar;
    next = this.input.charCodeAt(this.pos + 2);
  }

  if (next === 61) { return this.finishOp(types$1.assign, size + 1) }
  return this.finishOp(tokentype, size)
};

pp.readToken_pipe_amp = function(code) { // '|&'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (this.options.ecmaVersion >= 12) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 === 61) { return this.finishOp(types$1.assign, 3) }
    }
    return this.finishOp(code === 124 ? types$1.logicalOR : types$1.logicalAND, 2)
  }
  if (next === 61) { return this.finishOp(types$1.assign, 2) }
  return this.finishOp(code === 124 ? types$1.bitwiseOR : types$1.bitwiseAND, 1)
};

pp.readToken_caret = function() { // '^'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types$1.assign, 2) }
  return this.finishOp(types$1.bitwiseXOR, 1)
};

pp.readToken_plus_min = function(code) { // '+-'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 &&
        (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
      // A `-->` line comment
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken()
    }
    return this.finishOp(types$1.incDec, 2)
  }
  if (next === 61) { return this.finishOp(types$1.assign, 2) }
  return this.finishOp(types$1.plusMin, 1)
};

pp.readToken_lt_gt = function(code) { // '<>'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) { return this.finishOp(types$1.assign, size + 1) }
    return this.finishOp(types$1.bitShift, size)
  }
  if (next === 33 && code === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 &&
      this.input.charCodeAt(this.pos + 3) === 45) {
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken()
  }
  if (next === 61) { size = 2; }
  return this.finishOp(types$1.relational, size)
};

pp.readToken_eq_excl = function(code) { // '=!'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types$1.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) }
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
    this.pos += 2;
    return this.finishToken(types$1.arrow)
  }
  return this.finishOp(code === 61 ? types$1.eq : types$1.prefix, 1)
};

pp.readToken_question = function() { // '?'
  var ecmaVersion = this.options.ecmaVersion;
  if (ecmaVersion >= 11) {
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 46) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 < 48 || next2 > 57) { return this.finishOp(types$1.questionDot, 2) }
    }
    if (next === 63) {
      if (ecmaVersion >= 12) {
        var next2$1 = this.input.charCodeAt(this.pos + 2);
        if (next2$1 === 61) { return this.finishOp(types$1.assign, 3) }
      }
      return this.finishOp(types$1.coalesce, 2)
    }
  }
  return this.finishOp(types$1.question, 1)
};

pp.readToken_numberSign = function() { // '#'
  var ecmaVersion = this.options.ecmaVersion;
  var code = 35; // '#'
  if (ecmaVersion >= 13) {
    ++this.pos;
    code = this.fullCharCodeAtPos();
    if (isIdentifierStart(code, true) || code === 92 /* '\' */) {
      return this.finishToken(types$1.privateId, this.readWord1())
    }
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};

pp.getTokenFromCode = function(code) {
  switch (code) {
  // The interpretation of a dot depends on whether it is followed
  // by a digit or another two dots.
  case 46: // '.'
    return this.readToken_dot()

  // Punctuation tokens.
  case 40: ++this.pos; return this.finishToken(types$1.parenL)
  case 41: ++this.pos; return this.finishToken(types$1.parenR)
  case 59: ++this.pos; return this.finishToken(types$1.semi)
  case 44: ++this.pos; return this.finishToken(types$1.comma)
  case 91: ++this.pos; return this.finishToken(types$1.bracketL)
  case 93: ++this.pos; return this.finishToken(types$1.bracketR)
  case 123: ++this.pos; return this.finishToken(types$1.braceL)
  case 125: ++this.pos; return this.finishToken(types$1.braceR)
  case 58: ++this.pos; return this.finishToken(types$1.colon)

  case 96: // '`'
    if (this.options.ecmaVersion < 6) { break }
    ++this.pos;
    return this.finishToken(types$1.backQuote)

  case 48: // '0'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 120 || next === 88) { return this.readRadixNumber(16) } // '0x', '0X' - hex number
    if (this.options.ecmaVersion >= 6) {
      if (next === 111 || next === 79) { return this.readRadixNumber(8) } // '0o', '0O' - octal number
      if (next === 98 || next === 66) { return this.readRadixNumber(2) } // '0b', '0B' - binary number
    }

  // Anything else beginning with a digit is an integer, octal
  // number, or float.
  case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
    return this.readNumber(false)

  // Quotes produce strings.
  case 34: case 39: // '"', "'"
    return this.readString(code)

  // Operators are parsed inline in tiny state machines. '=' (61) is
  // often referred to. `finishOp` simply skips the amount of
  // characters it is given as second argument, and returns a token
  // of the type given by its first argument.
  case 47: // '/'
    return this.readToken_slash()

  case 37: case 42: // '%*'
    return this.readToken_mult_modulo_exp(code)

  case 124: case 38: // '|&'
    return this.readToken_pipe_amp(code)

  case 94: // '^'
    return this.readToken_caret()

  case 43: case 45: // '+-'
    return this.readToken_plus_min(code)

  case 60: case 62: // '<>'
    return this.readToken_lt_gt(code)

  case 61: case 33: // '=!'
    return this.readToken_eq_excl(code)

  case 63: // '?'
    return this.readToken_question()

  case 126: // '~'
    return this.finishOp(types$1.prefix, 1)

  case 35: // '#'
    return this.readToken_numberSign()
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};

pp.finishOp = function(type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str)
};

pp.readRegexp = function() {
  var escaped, inClass, start = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(start, "Unterminated regular expression"); }
    var ch = this.input.charAt(this.pos);
    if (lineBreak.test(ch)) { this.raise(start, "Unterminated regular expression"); }
    if (!escaped) {
      if (ch === "[") { inClass = true; }
      else if (ch === "]" && inClass) { inClass = false; }
      else if (ch === "/" && !inClass) { break }
      escaped = ch === "\\";
    } else { escaped = false; }
    ++this.pos;
  }
  var pattern = this.input.slice(start, this.pos);
  ++this.pos;
  var flagsStart = this.pos;
  var flags = this.readWord1();
  if (this.containsEsc) { this.unexpected(flagsStart); }

  // Validate pattern
  var state = this.regexpState || (this.regexpState = new RegExpValidationState(this));
  state.reset(start, pattern, flags);
  this.validateRegExpFlags(state);
  this.validateRegExpPattern(state);

  // Create Literal#value property value.
  var value = null;
  try {
    value = new RegExp(pattern, flags);
  } catch (e) {
    // ESTree requires null if it failed to instantiate RegExp object.
    // https://github.com/estree/estree/blob/a27003adf4fd7bfad44de9cef372a2eacd527b1c/es5.md#regexpliteral
  }

  return this.finishToken(types$1.regexp, {pattern: pattern, flags: flags, value: value})
};

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.

pp.readInt = function(radix, len, maybeLegacyOctalNumericLiteral) {
  // `len` is used for character escape sequences. In that case, disallow separators.
  var allowSeparators = this.options.ecmaVersion >= 12 && len === undefined;

  // `maybeLegacyOctalNumericLiteral` is true if it doesn't have prefix (0x,0o,0b)
  // and isn't fraction part nor exponent part. In that case, if the first digit
  // is zero then disallow separators.
  var isLegacyOctalNumericLiteral = maybeLegacyOctalNumericLiteral && this.input.charCodeAt(this.pos) === 48;

  var start = this.pos, total = 0, lastCode = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i, ++this.pos) {
    var code = this.input.charCodeAt(this.pos), val = (void 0);

    if (allowSeparators && code === 95) {
      if (isLegacyOctalNumericLiteral) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed in legacy octal numeric literals"); }
      if (lastCode === 95) { this.raiseRecoverable(this.pos, "Numeric separator must be exactly one underscore"); }
      if (i === 0) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed at the first of digits"); }
      lastCode = code;
      continue
    }

    if (code >= 97) { val = code - 97 + 10; } // a
    else if (code >= 65) { val = code - 65 + 10; } // A
    else if (code >= 48 && code <= 57) { val = code - 48; } // 0-9
    else { val = Infinity; }
    if (val >= radix) { break }
    lastCode = code;
    total = total * radix + val;
  }

  if (allowSeparators && lastCode === 95) { this.raiseRecoverable(this.pos - 1, "Numeric separator is not allowed at the last of digits"); }
  if (this.pos === start || len != null && this.pos - start !== len) { return null }

  return total
};

function stringToNumber(str, isLegacyOctalNumericLiteral) {
  if (isLegacyOctalNumericLiteral) {
    return parseInt(str, 8)
  }

  // `parseFloat(value)` stops parsing at the first numeric separator then returns a wrong value.
  return parseFloat(str.replace(/_/g, ""))
}

function stringToBigInt(str) {
  if (typeof BigInt !== "function") {
    return null
  }

  // `BigInt(value)` throws syntax error if the string contains numeric separators.
  return BigInt(str.replace(/_/g, ""))
}

pp.readRadixNumber = function(radix) {
  var start = this.pos;
  this.pos += 2; // 0x
  var val = this.readInt(radix);
  if (val == null) { this.raise(this.start + 2, "Expected number in radix " + radix); }
  if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
    val = stringToBigInt(this.input.slice(start, this.pos));
    ++this.pos;
  } else if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
  return this.finishToken(types$1.num, val)
};

// Read an integer, octal integer, or floating-point number.

pp.readNumber = function(startsWithDot) {
  var start = this.pos;
  if (!startsWithDot && this.readInt(10, undefined, true) === null) { this.raise(start, "Invalid number"); }
  var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
  if (octal && this.strict) { this.raise(start, "Invalid number"); }
  var next = this.input.charCodeAt(this.pos);
  if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
    var val$1 = stringToBigInt(this.input.slice(start, this.pos));
    ++this.pos;
    if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
    return this.finishToken(types$1.num, val$1)
  }
  if (octal && /[89]/.test(this.input.slice(start, this.pos))) { octal = false; }
  if (next === 46 && !octal) { // '.'
    ++this.pos;
    this.readInt(10);
    next = this.input.charCodeAt(this.pos);
  }
  if ((next === 69 || next === 101) && !octal) { // 'eE'
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) { ++this.pos; } // '+-'
    if (this.readInt(10) === null) { this.raise(start, "Invalid number"); }
  }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }

  var val = stringToNumber(this.input.slice(start, this.pos), octal);
  return this.finishToken(types$1.num, val)
};

// Read a string value, interpreting backslash-escapes.

pp.readCodePoint = function() {
  var ch = this.input.charCodeAt(this.pos), code;

  if (ch === 123) { // '{'
    if (this.options.ecmaVersion < 6) { this.unexpected(); }
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 0x10FFFF) { this.invalidStringToken(codePos, "Code point out of bounds"); }
  } else {
    code = this.readHexChar(4);
  }
  return code
};

pp.readString = function(quote) {
  var out = "", chunkStart = ++this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated string constant"); }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === quote) { break }
    if (ch === 92) { // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(false);
      chunkStart = this.pos;
    } else if (ch === 0x2028 || ch === 0x2029) {
      if (this.options.ecmaVersion < 10) { this.raise(this.start, "Unterminated string constant"); }
      ++this.pos;
      if (this.options.locations) {
        this.curLine++;
        this.lineStart = this.pos;
      }
    } else {
      if (isNewLine(ch)) { this.raise(this.start, "Unterminated string constant"); }
      ++this.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(types$1.string, out)
};

// Reads template string tokens.

var INVALID_TEMPLATE_ESCAPE_ERROR = {};

pp.tryReadTemplateToken = function() {
  this.inTemplateElement = true;
  try {
    this.readTmplToken();
  } catch (err) {
    if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
      this.readInvalidTemplateToken();
    } else {
      throw err
    }
  }

  this.inTemplateElement = false;
};

pp.invalidStringToken = function(position, message) {
  if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
    throw INVALID_TEMPLATE_ESCAPE_ERROR
  } else {
    this.raise(position, message);
  }
};

pp.readTmplToken = function() {
  var out = "", chunkStart = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated template"); }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) { // '`', '${'
      if (this.pos === this.start && (this.type === types$1.template || this.type === types$1.invalidTemplate)) {
        if (ch === 36) {
          this.pos += 2;
          return this.finishToken(types$1.dollarBraceL)
        } else {
          ++this.pos;
          return this.finishToken(types$1.backQuote)
        }
      }
      out += this.input.slice(chunkStart, this.pos);
      return this.finishToken(types$1.template, out)
    }
    if (ch === 92) { // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(true);
      chunkStart = this.pos;
    } else if (isNewLine(ch)) {
      out += this.input.slice(chunkStart, this.pos);
      ++this.pos;
      switch (ch) {
      case 13:
        if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; }
      case 10:
        out += "\n";
        break
      default:
        out += String.fromCharCode(ch);
        break
      }
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      chunkStart = this.pos;
    } else {
      ++this.pos;
    }
  }
};

// Reads a template token to search for the end, without validating any escape sequences
pp.readInvalidTemplateToken = function() {
  for (; this.pos < this.input.length; this.pos++) {
    switch (this.input[this.pos]) {
    case "\\":
      ++this.pos;
      break

    case "$":
      if (this.input[this.pos + 1] !== "{") {
        break
      }

    // falls through
    case "`":
      return this.finishToken(types$1.invalidTemplate, this.input.slice(this.start, this.pos))

    // no default
    }
  }
  this.raise(this.start, "Unterminated template");
};

// Used to read escaped characters

pp.readEscapedChar = function(inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
  case 110: return "\n" // 'n' -> '\n'
  case 114: return "\r" // 'r' -> '\r'
  case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
  case 117: return codePointToString(this.readCodePoint()) // 'u'
  case 116: return "\t" // 't' -> '\t'
  case 98: return "\b" // 'b' -> '\b'
  case 118: return "\u000b" // 'v' -> '\u000b'
  case 102: return "\f" // 'f' -> '\f'
  case 13: if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; } // '\r\n'
  case 10: // ' \n'
    if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
    return ""
  case 56:
  case 57:
    if (this.strict) {
      this.invalidStringToken(
        this.pos - 1,
        "Invalid escape sequence"
      );
    }
    if (inTemplate) {
      var codePos = this.pos - 1;

      this.invalidStringToken(
        codePos,
        "Invalid escape sequence in template string"
      );

      return null
    }
  default:
    if (ch >= 48 && ch <= 55) {
      var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
      var octal = parseInt(octalStr, 8);
      if (octal > 255) {
        octalStr = octalStr.slice(0, -1);
        octal = parseInt(octalStr, 8);
      }
      this.pos += octalStr.length - 1;
      ch = this.input.charCodeAt(this.pos);
      if ((octalStr !== "0" || ch === 56 || ch === 57) && (this.strict || inTemplate)) {
        this.invalidStringToken(
          this.pos - 1 - octalStr.length,
          inTemplate
            ? "Octal literal in template string"
            : "Octal literal in strict mode"
        );
      }
      return String.fromCharCode(octal)
    }
    if (isNewLine(ch)) {
      // Unicode new line characters after \ get removed from output in both
      // template literals and strings
      return ""
    }
    return String.fromCharCode(ch)
  }
};

// Used to read character escape sequences ('\x', '\u', '\U').

pp.readHexChar = function(len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) { this.invalidStringToken(codePos, "Bad character escape sequence"); }
  return n
};

// Read an identifier, and return it as a string. Sets `this.containsEsc`
// to whether the word contained a '\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.

pp.readWord1 = function() {
  this.containsEsc = false;
  var word = "", first = true, chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this.fullCharCodeAtPos();
    if (isIdentifierChar(ch, astral)) {
      this.pos += ch <= 0xffff ? 1 : 2;
    } else if (ch === 92) { // "\"
      this.containsEsc = true;
      word += this.input.slice(chunkStart, this.pos);
      var escStart = this.pos;
      if (this.input.charCodeAt(++this.pos) !== 117) // "u"
        { this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\uXXXX"); }
      ++this.pos;
      var esc = this.readCodePoint();
      if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
        { this.invalidStringToken(escStart, "Invalid Unicode escape"); }
      word += codePointToString(esc);
      chunkStart = this.pos;
    } else {
      break
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos)
};

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

pp.readWord = function() {
  var word = this.readWord1();
  var type = types$1.name;
  if (this.keywords.test(word)) {
    type = keywords[word];
  }
  return this.finishToken(type, word)
};

// Acorn is a tiny, fast JavaScript parser written in JavaScript.

var version = "8.7.1";

Parser.acorn = {
  Parser: Parser,
  version: version,
  defaultOptions: defaultOptions,
  Position: Position,
  SourceLocation: SourceLocation,
  getLineInfo: getLineInfo,
  Node: Node,
  TokenType: TokenType,
  tokTypes: types$1,
  keywordTypes: keywords,
  TokContext: TokContext,
  tokContexts: types,
  isIdentifierChar: isIdentifierChar,
  isIdentifierStart: isIdentifierStart,
  Token: Token,
  isNewLine: isNewLine,
  lineBreak: lineBreak,
  lineBreakG: lineBreakG,
  nonASCIIwhitespace: nonASCIIwhitespace
};

function resolveIdViaPlugins(source, importer, pluginDriver, moduleLoaderResolveId, skip, customOptions, isEntry) {
    let skipped = null;
    let replaceContext = null;
    if (skip) {
        skipped = new Set();
        for (const skippedCall of skip) {
            if (source === skippedCall.source && importer === skippedCall.importer) {
                skipped.add(skippedCall.plugin);
            }
        }
        replaceContext = (pluginContext, plugin) => ({
            ...pluginContext,
            resolve: (source, importer, { custom, isEntry, skipSelf } = BLANK) => {
                return moduleLoaderResolveId(source, importer, custom, isEntry, skipSelf ? [...skip, { importer, plugin, source }] : skip);
            }
        });
    }
    return pluginDriver.hookFirst('resolveId', [source, importer, { custom: customOptions, isEntry }], replaceContext, skipped);
}

async function resolveId(source, importer, preserveSymlinks, pluginDriver, moduleLoaderResolveId, skip, customOptions, isEntry) {
    const pluginResult = await resolveIdViaPlugins(source, importer, pluginDriver, moduleLoaderResolveId, skip, customOptions, isEntry);
    if (pluginResult != null)
        return pluginResult;
    // external modules (non-entry modules that start with neither '.' or '/')
    // are skipped at this stage.
    if (importer !== undefined && !isAbsolute(source) && source[0] !== '.')
        return null;
    // `resolve` processes paths from right to left, prepending them until an
    // absolute path is created. Absolute importees therefore shortcircuit the
    // resolve call and require no special handing on our part.
    // See https://nodejs.org/api/path.html#path_path_resolve_paths
    return addJsExtensionIfNecessary(importer ? resolve(dirname(importer), source) : resolve(source), preserveSymlinks);
}
async function addJsExtensionIfNecessary(file, preserveSymlinks) {
    var _a, _b;
    return ((_b = (_a = (await findFile(file, preserveSymlinks))) !== null && _a !== void 0 ? _a : (await findFile(file + '.mjs', preserveSymlinks))) !== null && _b !== void 0 ? _b : (await findFile(file + '.js', preserveSymlinks)));
}
async function findFile(file, preserveSymlinks) {
    try {
        const stats = await promises.lstat(file);
        if (!preserveSymlinks && stats.isSymbolicLink())
            return await findFile(await promises.realpath(file), preserveSymlinks);
        if ((preserveSymlinks && stats.isSymbolicLink()) || stats.isFile()) {
            // check case
            const name = basename(file);
            const files = await promises.readdir(dirname(file));
            if (files.includes(name))
                return file;
        }
    }
    catch (_a) {
        // suppress
    }
}

const ANONYMOUS_PLUGIN_PREFIX = 'at position ';
const ANONYMOUS_OUTPUT_PLUGIN_PREFIX = 'at output position ';
function throwPluginError(err, plugin, { hook, id } = {}) {
    if (typeof err === 'string')
        err = { message: err };
    if (err.code && err.code !== Errors.PLUGIN_ERROR) {
        err.pluginCode = err.code;
    }
    err.code = Errors.PLUGIN_ERROR;
    err.plugin = plugin;
    if (hook) {
        err.hook = hook;
    }
    if (id) {
        err.id = id;
    }
    return error(err);
}
const deprecatedHooks = [
    { active: true, deprecated: 'resolveAssetUrl', replacement: 'resolveFileUrl' }
];
function warnDeprecatedHooks(plugins, options) {
    for (const { active, deprecated, replacement } of deprecatedHooks) {
        for (const plugin of plugins) {
            if (deprecated in plugin) {
                warnDeprecation({
                    message: `The "${deprecated}" hook used by plugin ${plugin.name} is deprecated. The "${replacement}" hook should be used instead.`,
                    plugin: plugin.name
                }, active, options);
            }
        }
    }
}

function createPluginCache(cache) {
    return {
        delete(id) {
            return delete cache[id];
        },
        get(id) {
            const item = cache[id];
            if (!item)
                return undefined;
            item[0] = 0;
            return item[1];
        },
        has(id) {
            const item = cache[id];
            if (!item)
                return false;
            item[0] = 0;
            return true;
        },
        set(id, value) {
            cache[id] = [0, value];
        }
    };
}
function getTrackedPluginCache(pluginCache, onUse) {
    return {
        delete(id) {
            onUse();
            return pluginCache.delete(id);
        },
        get(id) {
            onUse();
            return pluginCache.get(id);
        },
        has(id) {
            onUse();
            return pluginCache.has(id);
        },
        set(id, value) {
            onUse();
            return pluginCache.set(id, value);
        }
    };
}
const NO_CACHE = {
    delete() {
        return false;
    },
    get() {
        return undefined;
    },
    has() {
        return false;
    },
    set() { }
};
function uncacheablePluginError(pluginName) {
    if (pluginName.startsWith(ANONYMOUS_PLUGIN_PREFIX) ||
        pluginName.startsWith(ANONYMOUS_OUTPUT_PLUGIN_PREFIX)) {
        return error({
            code: 'ANONYMOUS_PLUGIN_CACHE',
            message: 'A plugin is trying to use the Rollup cache but is not declaring a plugin name or cacheKey.'
        });
    }
    return error({
        code: 'DUPLICATE_PLUGIN_NAME',
        message: `The plugin name ${pluginName} is being used twice in the same build. Plugin names must be distinct or provide a cacheKey (please post an issue to the plugin if you are a plugin user).`
    });
}
function getCacheForUncacheablePlugin(pluginName) {
    return {
        delete() {
            return uncacheablePluginError(pluginName);
        },
        get() {
            return uncacheablePluginError(pluginName);
        },
        has() {
            return uncacheablePluginError(pluginName);
        },
        set() {
            return uncacheablePluginError(pluginName);
        }
    };
}

async function transform(source, module, pluginDriver, warn) {
    const id = module.id;
    const sourcemapChain = [];
    let originalSourcemap = source.map === null ? null : decodedSourcemap(source.map);
    const originalCode = source.code;
    let ast = source.ast;
    const transformDependencies = [];
    const emittedFiles = [];
    let customTransformCache = false;
    const useCustomTransformCache = () => (customTransformCache = true);
    let pluginName = '';
    const curSource = source.code;
    function transformReducer(previousCode, result, plugin) {
        let code;
        let map;
        if (typeof result === 'string') {
            code = result;
        }
        else if (result && typeof result === 'object') {
            module.updateOptions(result);
            if (result.code == null) {
                if (result.map || result.ast) {
                    warn(errNoTransformMapOrAstWithoutCode(plugin.name));
                }
                return previousCode;
            }
            ({ code, map, ast } = result);
        }
        else {
            return previousCode;
        }
        // strict null check allows 'null' maps to not be pushed to the chain,
        // while 'undefined' gets the missing map warning
        if (map !== null) {
            sourcemapChain.push(decodedSourcemap(typeof map === 'string' ? JSON.parse(map) : map) || {
                missing: true,
                plugin: plugin.name
            });
        }
        return code;
    }
    let code;
    try {
        code = await pluginDriver.hookReduceArg0('transform', [curSource, id], transformReducer, (pluginContext, plugin) => {
            pluginName = plugin.name;
            return {
                ...pluginContext,
                addWatchFile(id) {
                    transformDependencies.push(id);
                    pluginContext.addWatchFile(id);
                },
                cache: customTransformCache
                    ? pluginContext.cache
                    : getTrackedPluginCache(pluginContext.cache, useCustomTransformCache),
                emitAsset(name, source) {
                    emittedFiles.push({ name, source, type: 'asset' });
                    return pluginContext.emitAsset(name, source);
                },
                emitChunk(id, options) {
                    emittedFiles.push({ id, name: options && options.name, type: 'chunk' });
                    return pluginContext.emitChunk(id, options);
                },
                emitFile(emittedFile) {
                    emittedFiles.push(emittedFile);
                    return pluginDriver.emitFile(emittedFile);
                },
                error(err, pos) {
                    if (typeof err === 'string')
                        err = { message: err };
                    if (pos)
                        augmentCodeLocation(err, pos, curSource, id);
                    err.id = id;
                    err.hook = 'transform';
                    return pluginContext.error(err);
                },
                getCombinedSourcemap() {
                    const combinedMap = collapseSourcemap(id, originalCode, originalSourcemap, sourcemapChain, warn);
                    if (!combinedMap) {
                        const magicString = new MagicString(originalCode);
                        return magicString.generateMap({ hires: true, includeContent: true, source: id });
                    }
                    if (originalSourcemap !== combinedMap) {
                        originalSourcemap = combinedMap;
                        sourcemapChain.length = 0;
                    }
                    return new SourceMap({
                        ...combinedMap,
                        file: null,
                        sourcesContent: combinedMap.sourcesContent
                    });
                },
                setAssetSource() {
                    return this.error({
                        code: 'INVALID_SETASSETSOURCE',
                        message: `setAssetSource cannot be called in transform for caching reasons. Use emitFile with a source, or call setAssetSource in another hook.`
                    });
                },
                warn(warning, pos) {
                    if (typeof warning === 'string')
                        warning = { message: warning };
                    if (pos)
                        augmentCodeLocation(warning, pos, curSource, id);
                    warning.id = id;
                    warning.hook = 'transform';
                    pluginContext.warn(warning);
                }
            };
        });
    }
    catch (err) {
        throwPluginError(err, pluginName, { hook: 'transform', id });
    }
    if (!customTransformCache) {
        // files emitted by a transform hook need to be emitted again if the hook is skipped
        if (emittedFiles.length)
            module.transformFiles = emittedFiles;
    }
    return {
        ast,
        code,
        customTransformCache,
        originalCode,
        originalSourcemap,
        sourcemapChain,
        transformDependencies
    };
}

const RESOLVE_DEPENDENCIES = 'resolveDependencies';
class ModuleLoader {
    constructor(graph, modulesById, options, pluginDriver) {
        this.graph = graph;
        this.modulesById = modulesById;
        this.options = options;
        this.pluginDriver = pluginDriver;
        this.implicitEntryModules = new Set();
        this.indexedEntryModules = [];
        this.latestLoadModulesPromise = Promise.resolve();
        this.moduleLoadPromises = new Map();
        this.modulesWithLoadedDependencies = new Set();
        this.nextChunkNamePriority = 0;
        this.nextEntryModuleIndex = 0;
        this.resolveId = async (source, importer, customOptions, isEntry, skip = null) => {
            return this.getResolvedIdWithDefaults(this.getNormalizedResolvedIdWithoutDefaults(this.options.external(source, importer, false)
                ? false
                : await resolveId(source, importer, this.options.preserveSymlinks, this.pluginDriver, this.resolveId, skip, customOptions, typeof isEntry === 'boolean' ? isEntry : !importer), importer, source));
        };
        this.hasModuleSideEffects = options.treeshake
            ? options.treeshake.moduleSideEffects
            : () => true;
    }
    async addAdditionalModules(unresolvedModules) {
        const result = this.extendLoadModulesPromise(Promise.all(unresolvedModules.map(id => this.loadEntryModule(id, false, undefined, null))));
        await this.awaitLoadModulesPromise();
        return result;
    }
    async addEntryModules(unresolvedEntryModules, isUserDefined) {
        const firstEntryModuleIndex = this.nextEntryModuleIndex;
        this.nextEntryModuleIndex += unresolvedEntryModules.length;
        const firstChunkNamePriority = this.nextChunkNamePriority;
        this.nextChunkNamePriority += unresolvedEntryModules.length;
        const newEntryModules = await this.extendLoadModulesPromise(Promise.all(unresolvedEntryModules.map(({ id, importer }) => this.loadEntryModule(id, true, importer, null))).then(entryModules => {
            for (let index = 0; index < entryModules.length; index++) {
                const entryModule = entryModules[index];
                entryModule.isUserDefinedEntryPoint =
                    entryModule.isUserDefinedEntryPoint || isUserDefined;
                addChunkNamesToModule(entryModule, unresolvedEntryModules[index], isUserDefined, firstChunkNamePriority + index);
                const existingIndexedModule = this.indexedEntryModules.find(indexedModule => indexedModule.module === entryModule);
                if (!existingIndexedModule) {
                    this.indexedEntryModules.push({
                        index: firstEntryModuleIndex + index,
                        module: entryModule
                    });
                }
                else {
                    existingIndexedModule.index = Math.min(existingIndexedModule.index, firstEntryModuleIndex + index);
                }
            }
            this.indexedEntryModules.sort(({ index: indexA }, { index: indexB }) => indexA > indexB ? 1 : -1);
            return entryModules;
        }));
        await this.awaitLoadModulesPromise();
        return {
            entryModules: this.indexedEntryModules.map(({ module }) => module),
            implicitEntryModules: [...this.implicitEntryModules],
            newEntryModules
        };
    }
    async emitChunk({ fileName, id, importer, name, implicitlyLoadedAfterOneOf, preserveSignature }) {
        const unresolvedModule = {
            fileName: fileName || null,
            id,
            importer,
            name: name || null
        };
        const module = implicitlyLoadedAfterOneOf
            ? await this.addEntryWithImplicitDependants(unresolvedModule, implicitlyLoadedAfterOneOf)
            : (await this.addEntryModules([unresolvedModule], false)).newEntryModules[0];
        if (preserveSignature != null) {
            module.preserveSignature = preserveSignature;
        }
        return module;
    }
    async preloadModule(resolvedId) {
        const module = await this.fetchModule(this.getResolvedIdWithDefaults(resolvedId), undefined, false, resolvedId.resolveDependencies ? RESOLVE_DEPENDENCIES : true);
        return module.info;
    }
    addEntryWithImplicitDependants(unresolvedModule, implicitlyLoadedAfter) {
        const chunkNamePriority = this.nextChunkNamePriority++;
        return this.extendLoadModulesPromise(this.loadEntryModule(unresolvedModule.id, false, unresolvedModule.importer, null).then(async (entryModule) => {
            addChunkNamesToModule(entryModule, unresolvedModule, false, chunkNamePriority);
            if (!entryModule.info.isEntry) {
                this.implicitEntryModules.add(entryModule);
                const implicitlyLoadedAfterModules = await Promise.all(implicitlyLoadedAfter.map(id => this.loadEntryModule(id, false, unresolvedModule.importer, entryModule.id)));
                for (const module of implicitlyLoadedAfterModules) {
                    entryModule.implicitlyLoadedAfter.add(module);
                }
                for (const dependant of entryModule.implicitlyLoadedAfter) {
                    dependant.implicitlyLoadedBefore.add(entryModule);
                }
            }
            return entryModule;
        }));
    }
    async addModuleSource(id, importer, module) {
        timeStart('load modules', 3);
        let source;
        try {
            source = await this.graph.fileOperationQueue.run(async () => { var _a; return (_a = (await this.pluginDriver.hookFirst('load', [id]))) !== null && _a !== void 0 ? _a : (await promises.readFile(id, 'utf8')); });
        }
        catch (err) {
            timeEnd('load modules', 3);
            let msg = `Could not load ${id}`;
            if (importer)
                msg += ` (imported by ${relativeId(importer)})`;
            msg += `: ${err.message}`;
            err.message = msg;
            throw err;
        }
        timeEnd('load modules', 3);
        const sourceDescription = typeof source === 'string'
            ? { code: source }
            : source != null && typeof source === 'object' && typeof source.code === 'string'
                ? source
                : error(errBadLoader(id));
        const cachedModule = this.graph.cachedModules.get(id);
        if (cachedModule &&
            !cachedModule.customTransformCache &&
            cachedModule.originalCode === sourceDescription.code &&
            !(await this.pluginDriver.hookFirst('shouldTransformCachedModule', [
                {
                    ast: cachedModule.ast,
                    code: cachedModule.code,
                    id: cachedModule.id,
                    meta: cachedModule.meta,
                    moduleSideEffects: cachedModule.moduleSideEffects,
                    resolvedSources: cachedModule.resolvedIds,
                    syntheticNamedExports: cachedModule.syntheticNamedExports
                }
            ]))) {
            if (cachedModule.transformFiles) {
                for (const emittedFile of cachedModule.transformFiles)
                    this.pluginDriver.emitFile(emittedFile);
            }
            module.setSource(cachedModule);
        }
        else {
            module.updateOptions(sourceDescription);
            module.setSource(await transform(sourceDescription, module, this.pluginDriver, this.options.onwarn));
        }
    }
    async awaitLoadModulesPromise() {
        let startingPromise;
        do {
            startingPromise = this.latestLoadModulesPromise;
            await startingPromise;
        } while (startingPromise !== this.latestLoadModulesPromise);
    }
    extendLoadModulesPromise(loadNewModulesPromise) {
        this.latestLoadModulesPromise = Promise.all([
            loadNewModulesPromise,
            this.latestLoadModulesPromise
        ]);
        this.latestLoadModulesPromise.catch(() => {
            /* Avoid unhandled Promise rejections */
        });
        return loadNewModulesPromise;
    }
    async fetchDynamicDependencies(module, resolveDynamicImportPromises) {
        const dependencies = await Promise.all(resolveDynamicImportPromises.map(resolveDynamicImportPromise => resolveDynamicImportPromise.then(async ([dynamicImport, resolvedId]) => {
            if (resolvedId === null)
                return null;
            if (typeof resolvedId === 'string') {
                dynamicImport.resolution = resolvedId;
                return null;
            }
            return (dynamicImport.resolution = await this.fetchResolvedDependency(relativeId(resolvedId.id), module.id, resolvedId));
        })));
        for (const dependency of dependencies) {
            if (dependency) {
                module.dynamicDependencies.add(dependency);
                dependency.dynamicImporters.push(module.id);
            }
        }
    }
    // If this is a preload, then this method always waits for the dependencies of the module to be resolved.
    // Otherwise if the module does not exist, it waits for the module and all its dependencies to be loaded.
    // Otherwise it returns immediately.
    async fetchModule({ id, meta, moduleSideEffects, syntheticNamedExports }, importer, isEntry, isPreload) {
        const existingModule = this.modulesById.get(id);
        if (existingModule instanceof Module) {
            await this.handleExistingModule(existingModule, isEntry, isPreload);
            return existingModule;
        }
        const module = new Module(this.graph, id, this.options, isEntry, moduleSideEffects, syntheticNamedExports, meta);
        this.modulesById.set(id, module);
        this.graph.watchFiles[id] = true;
        const loadPromise = this.addModuleSource(id, importer, module).then(() => [
            this.getResolveStaticDependencyPromises(module),
            this.getResolveDynamicImportPromises(module),
            loadAndResolveDependenciesPromise
        ]);
        const loadAndResolveDependenciesPromise = waitForDependencyResolution(loadPromise).then(() => this.pluginDriver.hookParallel('moduleParsed', [module.info]));
        loadAndResolveDependenciesPromise.catch(() => {
            /* avoid unhandled promise rejections */
        });
        this.moduleLoadPromises.set(module, loadPromise);
        const resolveDependencyPromises = await loadPromise;
        if (!isPreload) {
            await this.fetchModuleDependencies(module, ...resolveDependencyPromises);
        }
        else if (isPreload === RESOLVE_DEPENDENCIES) {
            await loadAndResolveDependenciesPromise;
        }
        return module;
    }
    async fetchModuleDependencies(module, resolveStaticDependencyPromises, resolveDynamicDependencyPromises, loadAndResolveDependenciesPromise) {
        if (this.modulesWithLoadedDependencies.has(module)) {
            return;
        }
        this.modulesWithLoadedDependencies.add(module);
        await Promise.all([
            this.fetchStaticDependencies(module, resolveStaticDependencyPromises),
            this.fetchDynamicDependencies(module, resolveDynamicDependencyPromises)
        ]);
        module.linkImports();
        // To handle errors when resolving dependencies or in moduleParsed
        await loadAndResolveDependenciesPromise;
    }
    fetchResolvedDependency(source, importer, resolvedId) {
        if (resolvedId.external) {
            const { external, id, moduleSideEffects, meta } = resolvedId;
            if (!this.modulesById.has(id)) {
                this.modulesById.set(id, new ExternalModule(this.options, id, moduleSideEffects, meta, external !== 'absolute' && isAbsolute(id)));
            }
            const externalModule = this.modulesById.get(id);
            if (!(externalModule instanceof ExternalModule)) {
                return error(errInternalIdCannotBeExternal(source, importer));
            }
            return Promise.resolve(externalModule);
        }
        return this.fetchModule(resolvedId, importer, false, false);
    }
    async fetchStaticDependencies(module, resolveStaticDependencyPromises) {
        for (const dependency of await Promise.all(resolveStaticDependencyPromises.map(resolveStaticDependencyPromise => resolveStaticDependencyPromise.then(([source, resolvedId]) => this.fetchResolvedDependency(source, module.id, resolvedId))))) {
            module.dependencies.add(dependency);
            dependency.importers.push(module.id);
        }
        if (!this.options.treeshake || module.info.moduleSideEffects === 'no-treeshake') {
            for (const dependency of module.dependencies) {
                if (dependency instanceof Module) {
                    dependency.importedFromNotTreeshaken = true;
                }
            }
        }
    }
    getNormalizedResolvedIdWithoutDefaults(resolveIdResult, importer, source) {
        const { makeAbsoluteExternalsRelative } = this.options;
        if (resolveIdResult) {
            if (typeof resolveIdResult === 'object') {
                const external = resolveIdResult.external || this.options.external(resolveIdResult.id, importer, true);
                return {
                    ...resolveIdResult,
                    external: external &&
                        (external === 'relative' ||
                            !isAbsolute(resolveIdResult.id) ||
                            (external === true &&
                                isNotAbsoluteExternal(resolveIdResult.id, source, makeAbsoluteExternalsRelative)) ||
                            'absolute')
                };
            }
            const external = this.options.external(resolveIdResult, importer, true);
            return {
                external: external &&
                    (isNotAbsoluteExternal(resolveIdResult, source, makeAbsoluteExternalsRelative) ||
                        'absolute'),
                id: external && makeAbsoluteExternalsRelative
                    ? normalizeRelativeExternalId(resolveIdResult, importer)
                    : resolveIdResult
            };
        }
        const id = makeAbsoluteExternalsRelative
            ? normalizeRelativeExternalId(source, importer)
            : source;
        if (resolveIdResult !== false && !this.options.external(id, importer, true)) {
            return null;
        }
        return {
            external: isNotAbsoluteExternal(id, source, makeAbsoluteExternalsRelative) || 'absolute',
            id
        };
    }
    getResolveDynamicImportPromises(module) {
        return module.dynamicImports.map(async (dynamicImport) => {
            const resolvedId = await this.resolveDynamicImport(module, typeof dynamicImport.argument === 'string'
                ? dynamicImport.argument
                : dynamicImport.argument.esTreeNode, module.id);
            if (resolvedId && typeof resolvedId === 'object') {
                dynamicImport.id = resolvedId.id;
            }
            return [dynamicImport, resolvedId];
        });
    }
    getResolveStaticDependencyPromises(module) {
        return Array.from(module.sources, async (source) => [
            source,
            (module.resolvedIds[source] =
                module.resolvedIds[source] ||
                    this.handleResolveId(await this.resolveId(source, module.id, EMPTY_OBJECT, false), source, module.id))
        ]);
    }
    getResolvedIdWithDefaults(resolvedId) {
        var _a, _b;
        if (!resolvedId) {
            return null;
        }
        const external = resolvedId.external || false;
        return {
            external,
            id: resolvedId.id,
            meta: resolvedId.meta || {},
            moduleSideEffects: (_a = resolvedId.moduleSideEffects) !== null && _a !== void 0 ? _a : this.hasModuleSideEffects(resolvedId.id, !!external),
            syntheticNamedExports: (_b = resolvedId.syntheticNamedExports) !== null && _b !== void 0 ? _b : false
        };
    }
    async handleExistingModule(module, isEntry, isPreload) {
        const loadPromise = this.moduleLoadPromises.get(module);
        if (isPreload) {
            return isPreload === RESOLVE_DEPENDENCIES
                ? waitForDependencyResolution(loadPromise)
                : loadPromise;
        }
        if (isEntry) {
            module.info.isEntry = true;
            this.implicitEntryModules.delete(module);
            for (const dependant of module.implicitlyLoadedAfter) {
                dependant.implicitlyLoadedBefore.delete(module);
            }
            module.implicitlyLoadedAfter.clear();
        }
        return this.fetchModuleDependencies(module, ...(await loadPromise));
    }
    handleResolveId(resolvedId, source, importer) {
        if (resolvedId === null) {
            if (isRelative(source)) {
                return error(errUnresolvedImport(source, importer));
            }
            this.options.onwarn(errUnresolvedImportTreatedAsExternal(source, importer));
            return {
                external: true,
                id: source,
                meta: {},
                moduleSideEffects: this.hasModuleSideEffects(source, true),
                syntheticNamedExports: false
            };
        }
        else if (resolvedId.external && resolvedId.syntheticNamedExports) {
            this.options.onwarn(errExternalSyntheticExports(source, importer));
        }
        return resolvedId;
    }
    async loadEntryModule(unresolvedId, isEntry, importer, implicitlyLoadedBefore) {
        const resolveIdResult = await resolveId(unresolvedId, importer, this.options.preserveSymlinks, this.pluginDriver, this.resolveId, null, EMPTY_OBJECT, true);
        if (resolveIdResult == null) {
            return error(implicitlyLoadedBefore === null
                ? errUnresolvedEntry(unresolvedId)
                : errUnresolvedImplicitDependant(unresolvedId, implicitlyLoadedBefore));
        }
        if (resolveIdResult === false ||
            (typeof resolveIdResult === 'object' && resolveIdResult.external)) {
            return error(implicitlyLoadedBefore === null
                ? errEntryCannotBeExternal(unresolvedId)
                : errImplicitDependantCannotBeExternal(unresolvedId, implicitlyLoadedBefore));
        }
        return this.fetchModule(this.getResolvedIdWithDefaults(typeof resolveIdResult === 'object'
            ? resolveIdResult
            : { id: resolveIdResult }), undefined, isEntry, false);
    }
    async resolveDynamicImport(module, specifier, importer) {
        var _a;
        var _b;
        const resolution = await this.pluginDriver.hookFirst('resolveDynamicImport', [
            specifier,
            importer
        ]);
        if (typeof specifier !== 'string') {
            if (typeof resolution === 'string') {
                return resolution;
            }
            if (!resolution) {
                return null;
            }
            return {
                external: false,
                moduleSideEffects: true,
                ...resolution
            };
        }
        if (resolution == null) {
            return ((_a = (_b = module.resolvedIds)[specifier]) !== null && _a !== void 0 ? _a : (_b[specifier] = this.handleResolveId(await this.resolveId(specifier, module.id, EMPTY_OBJECT, false), specifier, module.id)));
        }
        return this.handleResolveId(this.getResolvedIdWithDefaults(this.getNormalizedResolvedIdWithoutDefaults(resolution, importer, specifier)), specifier, importer);
    }
}
function normalizeRelativeExternalId(source, importer) {
    return isRelative(source)
        ? importer
            ? resolve(importer, '..', source)
            : resolve(source)
        : source;
}
function addChunkNamesToModule(module, { fileName, name }, isUserDefined, priority) {
    var _a;
    if (fileName !== null) {
        module.chunkFileNames.add(fileName);
    }
    else if (name !== null) {
        // Always keep chunkNames sorted by priority
        let namePosition = 0;
        while (((_a = module.chunkNames[namePosition]) === null || _a === void 0 ? void 0 : _a.priority) < priority)
            namePosition++;
        module.chunkNames.splice(namePosition, 0, { isUserDefined, name, priority });
    }
}
function isNotAbsoluteExternal(id, source, makeAbsoluteExternalsRelative) {
    return (makeAbsoluteExternalsRelative === true ||
        (makeAbsoluteExternalsRelative === 'ifRelativeSource' && isRelative(source)) ||
        !isAbsolute(id));
}
async function waitForDependencyResolution(loadPromise) {
    const [resolveStaticDependencyPromises, resolveDynamicImportPromises] = await loadPromise;
    return Promise.all([...resolveStaticDependencyPromises, ...resolveDynamicImportPromises]);
}

class GlobalScope extends Scope$1 {
    constructor() {
        super();
        this.parent = null;
        this.variables.set('undefined', new UndefinedVariable());
    }
    findVariable(name) {
        let variable = this.variables.get(name);
        if (!variable) {
            variable = new GlobalVariable(name);
            this.variables.set(name, variable);
        }
        return variable;
    }
}

function generateAssetFileName(name, source, outputOptions, bundle) {
    const emittedName = outputOptions.sanitizeFileName(name || 'asset');
    return makeUnique(renderNamePattern(typeof outputOptions.assetFileNames === 'function'
        ? outputOptions.assetFileNames({ name, source, type: 'asset' })
        : outputOptions.assetFileNames, 'output.assetFileNames', {
        ext: () => extname(emittedName).substring(1),
        extname: () => extname(emittedName),
        hash() {
            return createHash()
                .update(emittedName)
                .update(':')
                .update(source)
                .digest('hex')
                .substring(0, 8);
        },
        name: () => emittedName.substring(0, emittedName.length - extname(emittedName).length)
    }), bundle);
}
function reserveFileNameInBundle(fileName, bundle, warn) {
    const lowercaseFileName = fileName.toLowerCase();
    if (bundle[lowercaseBundleKeys].has(lowercaseFileName)) {
        warn(errFileNameConflict(fileName));
    }
    else {
        bundle[fileName] = FILE_PLACEHOLDER;
    }
}
function hasValidType(emittedFile) {
    return Boolean(emittedFile &&
        (emittedFile.type === 'asset' ||
            emittedFile.type === 'chunk'));
}
function hasValidName(emittedFile) {
    const validatedName = emittedFile.fileName || emittedFile.name;
    return !validatedName || (typeof validatedName === 'string' && !isPathFragment(validatedName));
}
function getValidSource(source, emittedFile, fileReferenceId) {
    if (!(typeof source === 'string' || source instanceof Uint8Array)) {
        const assetName = emittedFile.fileName || emittedFile.name || fileReferenceId;
        return error(errFailedValidation(`Could not set source for ${typeof assetName === 'string' ? `asset "${assetName}"` : 'unnamed asset'}, asset source needs to be a string, Uint8Array or Buffer.`));
    }
    return source;
}
function getAssetFileName(file, referenceId) {
    if (typeof file.fileName !== 'string') {
        return error(errAssetNotFinalisedForFileName(file.name || referenceId));
    }
    return file.fileName;
}
function getChunkFileName(file, facadeChunkByModule) {
    var _a;
    const fileName = file.fileName || (file.module && ((_a = facadeChunkByModule === null || facadeChunkByModule === void 0 ? void 0 : facadeChunkByModule.get(file.module)) === null || _a === void 0 ? void 0 : _a.id));
    if (!fileName)
        return error(errChunkNotGeneratedForFileName(file.fileName || file.name));
    return fileName;
}
class FileEmitter {
    constructor(graph, options, baseFileEmitter) {
        this.graph = graph;
        this.options = options;
        this.bundle = null;
        this.facadeChunkByModule = null;
        this.outputOptions = null;
        this.assertAssetsFinalized = () => {
            for (const [referenceId, emittedFile] of this.filesByReferenceId) {
                if (emittedFile.type === 'asset' && typeof emittedFile.fileName !== 'string')
                    return error(errNoAssetSourceSet(emittedFile.name || referenceId));
            }
        };
        this.emitFile = (emittedFile) => {
            if (!hasValidType(emittedFile)) {
                return error(errFailedValidation(`Emitted files must be of type "asset" or "chunk", received "${emittedFile && emittedFile.type}".`));
            }
            if (!hasValidName(emittedFile)) {
                return error(errFailedValidation(`The "fileName" or "name" properties of emitted files must be strings that are neither absolute nor relative paths, received "${emittedFile.fileName || emittedFile.name}".`));
            }
            if (emittedFile.type === 'chunk') {
                return this.emitChunk(emittedFile);
            }
            return this.emitAsset(emittedFile);
        };
        this.getFileName = (fileReferenceId) => {
            const emittedFile = this.filesByReferenceId.get(fileReferenceId);
            if (!emittedFile)
                return error(errFileReferenceIdNotFoundForFilename(fileReferenceId));
            if (emittedFile.type === 'chunk') {
                return getChunkFileName(emittedFile, this.facadeChunkByModule);
            }
            return getAssetFileName(emittedFile, fileReferenceId);
        };
        this.setAssetSource = (referenceId, requestedSource) => {
            const consumedFile = this.filesByReferenceId.get(referenceId);
            if (!consumedFile)
                return error(errAssetReferenceIdNotFoundForSetSource(referenceId));
            if (consumedFile.type !== 'asset') {
                return error(errFailedValidation(`Asset sources can only be set for emitted assets but "${referenceId}" is an emitted chunk.`));
            }
            if (consumedFile.source !== undefined) {
                return error(errAssetSourceAlreadySet(consumedFile.name || referenceId));
            }
            const source = getValidSource(requestedSource, consumedFile, referenceId);
            if (this.bundle) {
                this.finalizeAsset(consumedFile, source, referenceId, this.bundle);
            }
            else {
                consumedFile.source = source;
            }
        };
        this.setOutputBundle = (bundle, outputOptions, facadeChunkByModule) => {
            this.outputOptions = outputOptions;
            this.bundle = bundle;
            this.facadeChunkByModule = facadeChunkByModule;
            for (const { fileName } of this.filesByReferenceId.values()) {
                if (fileName) {
                    reserveFileNameInBundle(fileName, bundle, this.options.onwarn);
                }
            }
            for (const [referenceId, consumedFile] of this.filesByReferenceId) {
                if (consumedFile.type === 'asset' && consumedFile.source !== undefined) {
                    this.finalizeAsset(consumedFile, consumedFile.source, referenceId, bundle);
                }
            }
        };
        this.filesByReferenceId = baseFileEmitter
            ? new Map(baseFileEmitter.filesByReferenceId)
            : new Map();
    }
    assignReferenceId(file, idBase) {
        let referenceId;
        do {
            referenceId = createHash()
                .update(referenceId || idBase)
                .digest('hex')
                .substring(0, 8);
        } while (this.filesByReferenceId.has(referenceId));
        this.filesByReferenceId.set(referenceId, file);
        return referenceId;
    }
    emitAsset(emittedAsset) {
        const source = typeof emittedAsset.source !== 'undefined'
            ? getValidSource(emittedAsset.source, emittedAsset, null)
            : undefined;
        const consumedAsset = {
            fileName: emittedAsset.fileName,
            name: emittedAsset.name,
            source,
            type: 'asset'
        };
        const referenceId = this.assignReferenceId(consumedAsset, emittedAsset.fileName || emittedAsset.name || emittedAsset.type);
        if (this.bundle) {
            if (emittedAsset.fileName) {
                reserveFileNameInBundle(emittedAsset.fileName, this.bundle, this.options.onwarn);
            }
            if (source !== undefined) {
                this.finalizeAsset(consumedAsset, source, referenceId, this.bundle);
            }
        }
        return referenceId;
    }
    emitChunk(emittedChunk) {
        if (this.graph.phase > BuildPhase.LOAD_AND_PARSE) {
            return error(errInvalidRollupPhaseForChunkEmission());
        }
        if (typeof emittedChunk.id !== 'string') {
            return error(errFailedValidation(`Emitted chunks need to have a valid string id, received "${emittedChunk.id}"`));
        }
        const consumedChunk = {
            fileName: emittedChunk.fileName,
            module: null,
            name: emittedChunk.name || emittedChunk.id,
            type: 'chunk'
        };
        this.graph.moduleLoader
            .emitChunk(emittedChunk)
            .then(module => (consumedChunk.module = module))
            .catch(() => {
            // Avoid unhandled Promise rejection as the error will be thrown later
            // once module loading has finished
        });
        return this.assignReferenceId(consumedChunk, emittedChunk.id);
    }
    finalizeAsset(consumedFile, source, referenceId, bundle) {
        const fileName = consumedFile.fileName ||
            findExistingAssetFileNameWithSource(bundle, source) ||
            generateAssetFileName(consumedFile.name, source, this.outputOptions, bundle);
        // We must not modify the original assets to avoid interaction between outputs
        const assetWithFileName = { ...consumedFile, fileName, source };
        this.filesByReferenceId.set(referenceId, assetWithFileName);
        const { options } = this;
        bundle[fileName] = {
            fileName,
            get isAsset() {
                warnDeprecation('Accessing "isAsset" on files in the bundle is deprecated, please use "type === \'asset\'" instead', true, options);
                return true;
            },
            name: consumedFile.name,
            source,
            type: 'asset'
        };
    }
}
// TODO This can lead to a performance problem when many assets are emitted.
//  Instead, we should only deduplicate string assets and use their sources as
//  object keys for better performance.
function findExistingAssetFileNameWithSource(bundle, source) {
    for (const [fileName, outputFile] of Object.entries(bundle)) {
        if (outputFile.type === 'asset' && areSourcesEqual(source, outputFile.source))
            return fileName;
    }
    return null;
}
function areSourcesEqual(sourceA, sourceB) {
    if (typeof sourceA === 'string') {
        return sourceA === sourceB;
    }
    if (typeof sourceB === 'string') {
        return false;
    }
    if ('equals' in sourceA) {
        return sourceA.equals(sourceB);
    }
    if (sourceA.length !== sourceB.length) {
        return false;
    }
    for (let index = 0; index < sourceA.length; index++) {
        if (sourceA[index] !== sourceB[index]) {
            return false;
        }
    }
    return true;
}

function getDeprecatedContextHandler(handler, handlerName, newHandlerName, pluginName, activeDeprecation, options) {
    let deprecationWarningShown = false;
    return ((...args) => {
        if (!deprecationWarningShown) {
            deprecationWarningShown = true;
            warnDeprecation({
                message: `The "this.${handlerName}" plugin context function used by plugin ${pluginName} is deprecated. The "this.${newHandlerName}" plugin context function should be used instead.`,
                plugin: pluginName
            }, activeDeprecation, options);
        }
        return handler(...args);
    });
}
function getPluginContext(plugin, pluginCache, graph, options, fileEmitter, existingPluginNames) {
    let cacheable = true;
    if (typeof plugin.cacheKey !== 'string') {
        if (plugin.name.startsWith(ANONYMOUS_PLUGIN_PREFIX) ||
            plugin.name.startsWith(ANONYMOUS_OUTPUT_PLUGIN_PREFIX) ||
            existingPluginNames.has(plugin.name)) {
            cacheable = false;
        }
        else {
            existingPluginNames.add(plugin.name);
        }
    }
    let cacheInstance;
    if (!pluginCache) {
        cacheInstance = NO_CACHE;
    }
    else if (cacheable) {
        const cacheKey = plugin.cacheKey || plugin.name;
        cacheInstance = createPluginCache(pluginCache[cacheKey] || (pluginCache[cacheKey] = Object.create(null)));
    }
    else {
        cacheInstance = getCacheForUncacheablePlugin(plugin.name);
    }
    return {
        addWatchFile(id) {
            if (graph.phase >= BuildPhase.GENERATE) {
                return this.error(errInvalidRollupPhaseForAddWatchFile());
            }
            graph.watchFiles[id] = true;
        },
        cache: cacheInstance,
        emitAsset: getDeprecatedContextHandler((name, source) => fileEmitter.emitFile({ name, source, type: 'asset' }), 'emitAsset', 'emitFile', plugin.name, true, options),
        emitChunk: getDeprecatedContextHandler((id, options) => fileEmitter.emitFile({ id, name: options && options.name, type: 'chunk' }), 'emitChunk', 'emitFile', plugin.name, true, options),
        emitFile: fileEmitter.emitFile.bind(fileEmitter),
        error(err) {
            return throwPluginError(err, plugin.name);
        },
        getAssetFileName: getDeprecatedContextHandler(fileEmitter.getFileName, 'getAssetFileName', 'getFileName', plugin.name, true, options),
        getChunkFileName: getDeprecatedContextHandler(fileEmitter.getFileName, 'getChunkFileName', 'getFileName', plugin.name, true, options),
        getFileName: fileEmitter.getFileName,
        getModuleIds: () => graph.modulesById.keys(),
        getModuleInfo: graph.getModuleInfo,
        getWatchFiles: () => Object.keys(graph.watchFiles),
        isExternal: getDeprecatedContextHandler((id, parentId, isResolved = false) => options.external(id, parentId, isResolved), 'isExternal', 'resolve', plugin.name, true, options),
        load(resolvedId) {
            return graph.moduleLoader.preloadModule(resolvedId);
        },
        meta: {
            rollupVersion: version$1,
            watchMode: graph.watchMode
        },
        get moduleIds() {
            function* wrappedModuleIds() {
                // We are wrapping this in a generator to only show the message once we are actually iterating
                warnDeprecation({
                    message: `Accessing "this.moduleIds" on the plugin context by plugin ${plugin.name} is deprecated. The "this.getModuleIds" plugin context function should be used instead.`,
                    plugin: plugin.name
                }, false, options);
                yield* moduleIds;
            }
            const moduleIds = graph.modulesById.keys();
            return wrappedModuleIds();
        },
        parse: graph.contextParse.bind(graph),
        resolve(source, importer, { custom, isEntry, skipSelf } = BLANK) {
            return graph.moduleLoader.resolveId(source, importer, custom, isEntry, skipSelf ? [{ importer, plugin, source }] : null);
        },
        resolveId: getDeprecatedContextHandler((source, importer) => graph.moduleLoader
            .resolveId(source, importer, BLANK, undefined)
            .then(resolveId => resolveId && resolveId.id), 'resolveId', 'resolve', plugin.name, true, options),
        setAssetSource: fileEmitter.setAssetSource,
        warn(warning) {
            if (typeof warning === 'string')
                warning = { message: warning };
            if (warning.code)
                warning.pluginCode = warning.code;
            warning.code = 'PLUGIN_WARNING';
            warning.plugin = plugin.name;
            options.onwarn(warning);
        }
    };
}

// This will make sure no input hook is omitted
const inputHookNames = {
    buildEnd: 1,
    buildStart: 1,
    closeBundle: 1,
    closeWatcher: 1,
    load: 1,
    moduleParsed: 1,
    options: 1,
    resolveDynamicImport: 1,
    resolveId: 1,
    shouldTransformCachedModule: 1,
    transform: 1,
    watchChange: 1
};
const inputHooks = Object.keys(inputHookNames);
class PluginDriver {
    constructor(graph, options, userPlugins, pluginCache, basePluginDriver) {
        this.graph = graph;
        this.options = options;
        this.pluginCache = pluginCache;
        this.sortedPlugins = new Map();
        this.unfulfilledActions = new Set();
        warnDeprecatedHooks(userPlugins, options);
        this.fileEmitter = new FileEmitter(graph, options, basePluginDriver && basePluginDriver.fileEmitter);
        this.emitFile = this.fileEmitter.emitFile.bind(this.fileEmitter);
        this.getFileName = this.fileEmitter.getFileName.bind(this.fileEmitter);
        this.finaliseAssets = this.fileEmitter.assertAssetsFinalized.bind(this.fileEmitter);
        this.setOutputBundle = this.fileEmitter.setOutputBundle.bind(this.fileEmitter);
        this.plugins = userPlugins.concat(basePluginDriver ? basePluginDriver.plugins : []);
        const existingPluginNames = new Set();
        this.pluginContexts = new Map(this.plugins.map(plugin => [
            plugin,
            getPluginContext(plugin, pluginCache, graph, options, this.fileEmitter, existingPluginNames)
        ]));
        if (basePluginDriver) {
            for (const plugin of userPlugins) {
                for (const hook of inputHooks) {
                    if (hook in plugin) {
                        options.onwarn(errInputHookInOutputPlugin(plugin.name, hook));
                    }
                }
            }
        }
    }
    createOutputPluginDriver(plugins) {
        return new PluginDriver(this.graph, this.options, plugins, this.pluginCache, this);
    }
    getUnfulfilledHookActions() {
        return this.unfulfilledActions;
    }
    // chains, first non-null result stops and returns
    hookFirst(hookName, args, replaceContext, skipped) {
        let promise = Promise.resolve(null);
        for (const plugin of this.getSortedPlugins(hookName)) {
            if (skipped && skipped.has(plugin))
                continue;
            promise = promise.then(result => {
                if (result != null)
                    return result;
                return this.runHook(hookName, args, plugin, replaceContext);
            });
        }
        return promise;
    }
    // chains synchronously, first non-null result stops and returns
    hookFirstSync(hookName, args, replaceContext) {
        for (const plugin of this.getSortedPlugins(hookName)) {
            const result = this.runHookSync(hookName, args, plugin, replaceContext);
            if (result != null)
                return result;
        }
        return null;
    }
    // parallel, ignores returns
    async hookParallel(hookName, args, replaceContext) {
        const parallelPromises = [];
        for (const plugin of this.getSortedPlugins(hookName)) {
            if (plugin[hookName].sequential) {
                await Promise.all(parallelPromises);
                parallelPromises.length = 0;
                await this.runHook(hookName, args, plugin, replaceContext);
            }
            else {
                parallelPromises.push(this.runHook(hookName, args, plugin, replaceContext));
            }
        }
        await Promise.all(parallelPromises);
    }
    // chains, reduces returned value, handling the reduced value as the first hook argument
    hookReduceArg0(hookName, [arg0, ...rest], reduce, replaceContext) {
        let promise = Promise.resolve(arg0);
        for (const plugin of this.getSortedPlugins(hookName)) {
            promise = promise.then(arg0 => this.runHook(hookName, [arg0, ...rest], plugin, replaceContext).then(result => reduce.call(this.pluginContexts.get(plugin), arg0, result, plugin)));
        }
        return promise;
    }
    // chains synchronously, reduces returned value, handling the reduced value as the first hook argument
    hookReduceArg0Sync(hookName, [arg0, ...rest], reduce, replaceContext) {
        for (const plugin of this.getSortedPlugins(hookName)) {
            const args = [arg0, ...rest];
            const result = this.runHookSync(hookName, args, plugin, replaceContext);
            arg0 = reduce.call(this.pluginContexts.get(plugin), arg0, result, plugin);
        }
        return arg0;
    }
    // chains, reduces returned value to type string, handling the reduced value separately. permits hooks as values.
    async hookReduceValue(hookName, initialValue, args, reducer) {
        const results = [];
        const parallelResults = [];
        for (const plugin of this.getSortedPlugins(hookName, validateAddonPluginHandler)) {
            if (plugin[hookName].sequential) {
                results.push(...(await Promise.all(parallelResults)));
                parallelResults.length = 0;
                results.push(await this.runHook(hookName, args, plugin));
            }
            else {
                parallelResults.push(this.runHook(hookName, args, plugin));
            }
        }
        results.push(...(await Promise.all(parallelResults)));
        return results.reduce(reducer, await initialValue);
    }
    // chains synchronously, reduces returned value to type T, handling the reduced value separately. permits hooks as values.
    hookReduceValueSync(hookName, initialValue, args, reduce, replaceContext) {
        let acc = initialValue;
        for (const plugin of this.getSortedPlugins(hookName)) {
            const result = this.runHookSync(hookName, args, plugin, replaceContext);
            acc = reduce.call(this.pluginContexts.get(plugin), acc, result, plugin);
        }
        return acc;
    }
    // chains, ignores returns
    hookSeq(hookName, args, replaceContext) {
        let promise = Promise.resolve();
        for (const plugin of this.getSortedPlugins(hookName)) {
            promise = promise.then(() => this.runHook(hookName, args, plugin, replaceContext));
        }
        return promise.then(noReturn);
    }
    getSortedPlugins(hookName, validateHandler) {
        return getOrCreate(this.sortedPlugins, hookName, () => getSortedValidatedPlugins(hookName, this.plugins, validateHandler));
    }
    // Implementation signature
    runHook(hookName, args, plugin, replaceContext) {
        // We always filter for plugins that support the hook before running it
        const hook = plugin[hookName];
        const handler = typeof hook === 'object' ? hook.handler : hook;
        let context = this.pluginContexts.get(plugin);
        if (replaceContext) {
            context = replaceContext(context, plugin);
        }
        let action = null;
        return Promise.resolve()
            .then(() => {
            if (typeof handler !== 'function') {
                return handler;
            }
            // eslint-disable-next-line @typescript-eslint/ban-types
            const hookResult = handler.apply(context, args);
            if (!(hookResult === null || hookResult === void 0 ? void 0 : hookResult.then)) {
                // short circuit for non-thenables and non-Promises
                return hookResult;
            }
            // Track pending hook actions to properly error out when
            // unfulfilled promises cause rollup to abruptly and confusingly
            // exit with a successful 0 return code but without producing any
            // output, errors or warnings.
            action = [plugin.name, hookName, args];
            this.unfulfilledActions.add(action);
            // Although it would be more elegant to just return hookResult here
            // and put the .then() handler just above the .catch() handler below,
            // doing so would subtly change the defacto async event dispatch order
            // which at least one test and some plugins in the wild may depend on.
            return Promise.resolve(hookResult).then(result => {
                // action was fulfilled
                this.unfulfilledActions.delete(action);
                return result;
            });
        })
            .catch(err => {
            if (action !== null) {
                // action considered to be fulfilled since error being handled
                this.unfulfilledActions.delete(action);
            }
            return throwPluginError(err, plugin.name, { hook: hookName });
        });
    }
    /**
     * Run a sync plugin hook and return the result.
     * @param hookName Name of the plugin hook. Must be in `PluginHooks`.
     * @param args Arguments passed to the plugin hook.
     * @param plugin The acutal plugin
     * @param replaceContext When passed, the plugin context can be overridden.
     */
    runHookSync(hookName, args, plugin, replaceContext) {
        const hook = plugin[hookName];
        const handler = typeof hook === 'object' ? hook.handler : hook;
        let context = this.pluginContexts.get(plugin);
        if (replaceContext) {
            context = replaceContext(context, plugin);
        }
        try {
            // eslint-disable-next-line @typescript-eslint/ban-types
            return handler.apply(context, args);
        }
        catch (err) {
            return throwPluginError(err, plugin.name, { hook: hookName });
        }
    }
}
function getSortedValidatedPlugins(hookName, plugins, validateHandler = validateFunctionPluginHandler) {
    const pre = [];
    const normal = [];
    const post = [];
    for (const plugin of plugins) {
        const hook = plugin[hookName];
        if (hook) {
            if (typeof hook === 'object') {
                validateHandler(hook.handler, hookName, plugin);
                if (hook.order === 'pre') {
                    pre.push(plugin);
                    continue;
                }
                if (hook.order === 'post') {
                    post.push(plugin);
                    continue;
                }
            }
            else {
                validateHandler(hook, hookName, plugin);
            }
            normal.push(plugin);
        }
    }
    return [...pre, ...normal, ...post];
}
function validateFunctionPluginHandler(handler, hookName, plugin) {
    if (typeof handler !== 'function') {
        error(errInvalidFunctionPluginHook(hookName, plugin.name));
    }
}
function validateAddonPluginHandler(handler, hookName, plugin) {
    if (typeof handler !== 'string' && typeof handler !== 'function') {
        return error(errInvalidAddonPluginHook(hookName, plugin.name));
    }
}
function noReturn() { }

class Queue {
    constructor(maxParallel) {
        this.maxParallel = maxParallel;
        this.queue = [];
        this.workerCount = 0;
    }
    run(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ reject, resolve, task });
            this.work();
        });
    }
    async work() {
        if (this.workerCount >= this.maxParallel)
            return;
        this.workerCount++;
        let entry;
        while ((entry = this.queue.shift())) {
            const { reject, resolve, task } = entry;
            try {
                const result = await task();
                resolve(result);
            }
            catch (err) {
                reject(err);
            }
        }
        this.workerCount--;
    }
}

function normalizeEntryModules(entryModules) {
    if (Array.isArray(entryModules)) {
        return entryModules.map(id => ({
            fileName: null,
            id,
            implicitlyLoadedAfter: [],
            importer: undefined,
            name: null
        }));
    }
    return Object.entries(entryModules).map(([name, id]) => ({
        fileName: null,
        id,
        implicitlyLoadedAfter: [],
        importer: undefined,
        name
    }));
}
class Graph {
    constructor(options, watcher) {
        var _a, _b;
        this.options = options;
        this.cachedModules = new Map();
        this.deoptimizationTracker = new PathTracker();
        this.entryModules = [];
        this.modulesById = new Map();
        this.needsTreeshakingPass = false;
        this.phase = BuildPhase.LOAD_AND_PARSE;
        this.scope = new GlobalScope();
        this.watchFiles = Object.create(null);
        this.watchMode = false;
        this.externalModules = [];
        this.implicitEntryModules = [];
        this.modules = [];
        this.getModuleInfo = (moduleId) => {
            const foundModule = this.modulesById.get(moduleId);
            if (!foundModule)
                return null;
            return foundModule.info;
        };
        if (options.cache !== false) {
            if ((_a = options.cache) === null || _a === void 0 ? void 0 : _a.modules) {
                for (const module of options.cache.modules)
                    this.cachedModules.set(module.id, module);
            }
            this.pluginCache = ((_b = options.cache) === null || _b === void 0 ? void 0 : _b.plugins) || Object.create(null);
            // increment access counter
            for (const name in this.pluginCache) {
                const cache = this.pluginCache[name];
                for (const value of Object.values(cache))
                    value[0]++;
            }
        }
        if (watcher) {
            this.watchMode = true;
            const handleChange = (...args) => this.pluginDriver.hookParallel('watchChange', args);
            const handleClose = () => this.pluginDriver.hookParallel('closeWatcher', []);
            watcher.onCurrentAwaited('change', handleChange);
            watcher.onCurrentAwaited('close', handleClose);
        }
        this.pluginDriver = new PluginDriver(this, options, options.plugins, this.pluginCache);
        this.acornParser = Parser.extend(...options.acornInjectPlugins);
        this.moduleLoader = new ModuleLoader(this, this.modulesById, this.options, this.pluginDriver);
        this.fileOperationQueue = new Queue(options.maxParallelFileOps);
    }
    async build() {
        timeStart('generate module graph', 2);
        await this.generateModuleGraph();
        timeEnd('generate module graph', 2);
        timeStart('sort modules', 2);
        this.phase = BuildPhase.ANALYSE;
        this.sortModules();
        timeEnd('sort modules', 2);
        timeStart('mark included statements', 2);
        this.includeStatements();
        timeEnd('mark included statements', 2);
        this.phase = BuildPhase.GENERATE;
    }
    contextParse(code, options = {}) {
        const onCommentOrig = options.onComment;
        const comments = [];
        if (onCommentOrig && typeof onCommentOrig == 'function') {
            options.onComment = (block, text, start, end, ...args) => {
                comments.push({ end, start, type: block ? 'Block' : 'Line', value: text });
                return onCommentOrig.call(options, block, text, start, end, ...args);
            };
        }
        else {
            options.onComment = comments;
        }
        const ast = this.acornParser.parse(code, {
            ...this.options.acorn,
            ...options
        });
        if (typeof onCommentOrig == 'object') {
            onCommentOrig.push(...comments);
        }
        options.onComment = onCommentOrig;
        addAnnotations(comments, ast, code);
        return ast;
    }
    getCache() {
        // handle plugin cache eviction
        for (const name in this.pluginCache) {
            const cache = this.pluginCache[name];
            let allDeleted = true;
            for (const [key, value] of Object.entries(cache)) {
                if (value[0] >= this.options.experimentalCacheExpiry)
                    delete cache[key];
                else
                    allDeleted = false;
            }
            if (allDeleted)
                delete this.pluginCache[name];
        }
        return {
            modules: this.modules.map(module => module.toJSON()),
            plugins: this.pluginCache
        };
    }
    async generateModuleGraph() {
        ({ entryModules: this.entryModules, implicitEntryModules: this.implicitEntryModules } =
            await this.moduleLoader.addEntryModules(normalizeEntryModules(this.options.input), true));
        if (this.entryModules.length === 0) {
            throw new Error('You must supply options.input to rollup');
        }
        for (const module of this.modulesById.values()) {
            if (module instanceof Module) {
                this.modules.push(module);
            }
            else {
                this.externalModules.push(module);
            }
        }
    }
    includeStatements() {
        for (const module of [...this.entryModules, ...this.implicitEntryModules]) {
            markModuleAndImpureDependenciesAsExecuted(module);
        }
        if (this.options.treeshake) {
            let treeshakingPass = 1;
            do {
                timeStart(`treeshaking pass ${treeshakingPass}`, 3);
                this.needsTreeshakingPass = false;
                for (const module of this.modules) {
                    if (module.isExecuted) {
                        if (module.info.moduleSideEffects === 'no-treeshake') {
                            module.includeAllInBundle();
                        }
                        else {
                            module.include();
                        }
                    }
                }
                if (treeshakingPass === 1) {
                    // We only include exports after the first pass to avoid issues with
                    // the TDZ detection logic
                    for (const module of [...this.entryModules, ...this.implicitEntryModules]) {
                        if (module.preserveSignature !== false) {
                            module.includeAllExports(false);
                            this.needsTreeshakingPass = true;
                        }
                    }
                }
                timeEnd(`treeshaking pass ${treeshakingPass++}`, 3);
            } while (this.needsTreeshakingPass);
        }
        else {
            for (const module of this.modules)
                module.includeAllInBundle();
        }
        for (const externalModule of this.externalModules)
            externalModule.warnUnusedImports();
        for (const module of this.implicitEntryModules) {
            for (const dependant of module.implicitlyLoadedAfter) {
                if (!(dependant.info.isEntry || dependant.isIncluded())) {
                    error(errImplicitDependantIsNotIncluded(dependant));
                }
            }
        }
    }
    sortModules() {
        const { orderedModules, cyclePaths } = analyseModuleExecution(this.entryModules);
        for (const cyclePath of cyclePaths) {
            this.options.onwarn({
                code: 'CIRCULAR_DEPENDENCY',
                cycle: cyclePath,
                importer: cyclePath[0],
                message: `Circular dependency: ${cyclePath.join(' -> ')}`
            });
        }
        this.modules = orderedModules;
        for (const module of this.modules) {
            module.bindReferences();
        }
        this.warnForMissingExports();
    }
    warnForMissingExports() {
        for (const module of this.modules) {
            for (const importDescription of module.importDescriptions.values()) {
                if (importDescription.name !== '*' &&
                    !importDescription.module.getVariableForExportName(importDescription.name)[0]) {
                    module.warn({
                        code: 'NON_EXISTENT_EXPORT',
                        message: `Non-existent export '${importDescription.name}' is imported from ${relativeId(importDescription.module.id)}`,
                        name: importDescription.name,
                        source: importDescription.module.id
                    }, importDescription.start);
                }
            }
        }
    }
}

function ensureArray(items) {
    if (Array.isArray(items)) {
        return items.filter(Boolean);
    }
    if (items) {
        return [items];
    }
    return [];
}

function formatAction([pluginName, hookName, args]) {
    const action = `(${pluginName}) ${hookName}`;
    const s = JSON.stringify;
    switch (hookName) {
        case 'resolveId':
            return `${action} ${s(args[0])} ${s(args[1])}`;
        case 'load':
            return `${action} ${s(args[0])}`;
        case 'transform':
            return `${action} ${s(args[1])}`;
        case 'shouldTransformCachedModule':
            return `${action} ${s(args[0].id)}`;
        case 'moduleParsed':
            return `${action} ${s(args[0].id)}`;
    }
    return action;
}
// We do not directly listen on process to avoid max listeners warnings for
// complicated build processes
const beforeExitEvent = 'beforeExit';
const beforeExitEmitter = new EventEmitter();
beforeExitEmitter.setMaxListeners(0);
process$1.on(beforeExitEvent, () => beforeExitEmitter.emit(beforeExitEvent));
async function catchUnfinishedHookActions(pluginDriver, callback) {
    let handleEmptyEventLoop;
    const emptyEventLoopPromise = new Promise((_, reject) => {
        handleEmptyEventLoop = () => {
            const unfulfilledActions = pluginDriver.getUnfulfilledHookActions();
            reject(new Error(`Unexpected early exit. This happens when Promises returned by plugins cannot resolve. Unfinished hook action(s) on exit:\n` +
                [...unfulfilledActions].map(formatAction).join('\n')));
        };
        beforeExitEmitter.once(beforeExitEvent, handleEmptyEventLoop);
    });
    const result = await Promise.race([callback(), emptyEventLoopPromise]);
    beforeExitEmitter.off(beforeExitEvent, handleEmptyEventLoop);
    return result;
}

const defaultOnWarn = warning => console.warn(warning.message || warning);
function warnUnknownOptions(passedOptions, validOptions, optionType, warn, ignoredKeys = /$./) {
    const validOptionSet = new Set(validOptions);
    const unknownOptions = Object.keys(passedOptions).filter(key => !(validOptionSet.has(key) || ignoredKeys.test(key)));
    if (unknownOptions.length > 0) {
        warn({
            code: 'UNKNOWN_OPTION',
            message: `Unknown ${optionType}: ${unknownOptions.join(', ')}. Allowed options: ${[
                ...validOptionSet
            ]
                .sort()
                .join(', ')}`
        });
    }
}
const treeshakePresets = {
    recommended: {
        annotations: true,
        correctVarValueBeforeDeclaration: false,
        moduleSideEffects: () => true,
        propertyReadSideEffects: true,
        tryCatchDeoptimization: true,
        unknownGlobalSideEffects: false
    },
    safest: {
        annotations: true,
        correctVarValueBeforeDeclaration: true,
        moduleSideEffects: () => true,
        propertyReadSideEffects: true,
        tryCatchDeoptimization: true,
        unknownGlobalSideEffects: true
    },
    smallest: {
        annotations: true,
        correctVarValueBeforeDeclaration: false,
        moduleSideEffects: () => false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false
    }
};
const generatedCodePresets = {
    es2015: {
        arrowFunctions: true,
        constBindings: true,
        objectShorthand: true,
        reservedNamesAsProps: true,
        symbols: true
    },
    es5: {
        arrowFunctions: false,
        constBindings: false,
        objectShorthand: false,
        reservedNamesAsProps: true,
        symbols: false
    }
};
const objectifyOption = (value) => value && typeof value === 'object' ? value : {};
const objectifyOptionWithPresets = (presets, optionName, additionalValues) => (value) => {
    if (typeof value === 'string') {
        const preset = presets[value];
        if (preset) {
            return preset;
        }
        error(errInvalidOption(optionName, getHashFromObjectOption(optionName), `valid values are ${additionalValues}${printQuotedStringList(Object.keys(presets))}. You can also supply an object for more fine-grained control`, value));
    }
    return objectifyOption(value);
};
const getOptionWithPreset = (value, presets, optionName, additionalValues) => {
    const presetName = value === null || value === void 0 ? void 0 : value.preset;
    if (presetName) {
        const preset = presets[presetName];
        if (preset) {
            return { ...preset, ...value };
        }
        else {
            error(errInvalidOption(`${optionName}.preset`, getHashFromObjectOption(optionName), `valid values are ${printQuotedStringList(Object.keys(presets))}`, presetName));
        }
    }
    return objectifyOptionWithPresets(presets, optionName, additionalValues)(value);
};
const getHashFromObjectOption = (optionName) => optionName.split('.').join('').toLowerCase();

function normalizeInputOptions(config) {
    var _a, _b, _c;
    // These are options that may trigger special warnings or behaviour later
    // if the user did not select an explicit value
    const unsetOptions = new Set();
    const context = (_a = config.context) !== null && _a !== void 0 ? _a : 'undefined';
    const onwarn = getOnwarn(config);
    const strictDeprecations = config.strictDeprecations || false;
    const maxParallelFileOps = getmaxParallelFileOps(config, onwarn, strictDeprecations);
    const options = {
        acorn: getAcorn(config),
        acornInjectPlugins: getAcornInjectPlugins(config),
        cache: getCache(config),
        context,
        experimentalCacheExpiry: (_b = config.experimentalCacheExpiry) !== null && _b !== void 0 ? _b : 10,
        external: getIdMatcher(config.external),
        inlineDynamicImports: getInlineDynamicImports$1(config, onwarn, strictDeprecations),
        input: getInput(config),
        makeAbsoluteExternalsRelative: (_c = config.makeAbsoluteExternalsRelative) !== null && _c !== void 0 ? _c : true,
        manualChunks: getManualChunks$1(config, onwarn, strictDeprecations),
        maxParallelFileOps,
        maxParallelFileReads: maxParallelFileOps,
        moduleContext: getModuleContext(config, context),
        onwarn,
        perf: config.perf || false,
        plugins: ensureArray(config.plugins),
        preserveEntrySignatures: getPreserveEntrySignatures(config, unsetOptions),
        preserveModules: getPreserveModules$1(config, onwarn, strictDeprecations),
        preserveSymlinks: config.preserveSymlinks || false,
        shimMissingExports: config.shimMissingExports || false,
        strictDeprecations,
        treeshake: getTreeshake(config, onwarn, strictDeprecations)
    };
    warnUnknownOptions(config, [...Object.keys(options), 'watch'], 'input options', options.onwarn, /^(output)$/);
    return { options, unsetOptions };
}
const getOnwarn = (config) => {
    const { onwarn } = config;
    return onwarn
        ? warning => {
            warning.toString = () => {
                let str = '';
                if (warning.plugin)
                    str += `(${warning.plugin} plugin) `;
                if (warning.loc)
                    str += `${relativeId(warning.loc.file)} (${warning.loc.line}:${warning.loc.column}) `;
                str += warning.message;
                return str;
            };
            onwarn(warning, defaultOnWarn);
        }
        : defaultOnWarn;
};
const getAcorn = (config) => ({
    allowAwaitOutsideFunction: true,
    ecmaVersion: 'latest',
    preserveParens: false,
    sourceType: 'module',
    ...config.acorn
});
const getAcornInjectPlugins = (config) => ensureArray(config.acornInjectPlugins);
const getCache = (config) => { var _a; return ((_a = config.cache) === null || _a === void 0 ? void 0 : _a.cache) || config.cache; };
const getIdMatcher = (option) => {
    if (option === true) {
        return () => true;
    }
    if (typeof option === 'function') {
        return (id, ...args) => (!id.startsWith('\0') && option(id, ...args)) || false;
    }
    if (option) {
        const ids = new Set();
        const matchers = [];
        for (const value of ensureArray(option)) {
            if (value instanceof RegExp) {
                matchers.push(value);
            }
            else {
                ids.add(value);
            }
        }
        return (id, ..._args) => ids.has(id) || matchers.some(matcher => matcher.test(id));
    }
    return () => false;
};
const getInlineDynamicImports$1 = (config, warn, strictDeprecations) => {
    const configInlineDynamicImports = config.inlineDynamicImports;
    if (configInlineDynamicImports) {
        warnDeprecationWithOptions('The "inlineDynamicImports" option is deprecated. Use the "output.inlineDynamicImports" option instead.', false, warn, strictDeprecations);
    }
    return configInlineDynamicImports;
};
const getInput = (config) => {
    const configInput = config.input;
    return configInput == null ? [] : typeof configInput === 'string' ? [configInput] : configInput;
};
const getManualChunks$1 = (config, warn, strictDeprecations) => {
    const configManualChunks = config.manualChunks;
    if (configManualChunks) {
        warnDeprecationWithOptions('The "manualChunks" option is deprecated. Use the "output.manualChunks" option instead.', false, warn, strictDeprecations);
    }
    return configManualChunks;
};
const getmaxParallelFileOps = (config, warn, strictDeprecations) => {
    var _a;
    const maxParallelFileReads = config.maxParallelFileReads;
    if (typeof maxParallelFileReads === 'number') {
        warnDeprecationWithOptions('The "maxParallelFileReads" option is deprecated. Use the "maxParallelFileOps" option instead.', false, warn, strictDeprecations);
    }
    const maxParallelFileOps = (_a = config.maxParallelFileOps) !== null && _a !== void 0 ? _a : maxParallelFileReads;
    if (typeof maxParallelFileOps === 'number') {
        if (maxParallelFileOps <= 0)
            return Infinity;
        return maxParallelFileOps;
    }
    return 20;
};
const getModuleContext = (config, context) => {
    const configModuleContext = config.moduleContext;
    if (typeof configModuleContext === 'function') {
        return id => { var _a; return (_a = configModuleContext(id)) !== null && _a !== void 0 ? _a : context; };
    }
    if (configModuleContext) {
        const contextByModuleId = Object.create(null);
        for (const [key, moduleContext] of Object.entries(configModuleContext)) {
            contextByModuleId[resolve(key)] = moduleContext;
        }
        return id => contextByModuleId[id] || context;
    }
    return () => context;
};
const getPreserveEntrySignatures = (config, unsetOptions) => {
    const configPreserveEntrySignatures = config.preserveEntrySignatures;
    if (configPreserveEntrySignatures == null) {
        unsetOptions.add('preserveEntrySignatures');
    }
    return configPreserveEntrySignatures !== null && configPreserveEntrySignatures !== void 0 ? configPreserveEntrySignatures : 'strict';
};
const getPreserveModules$1 = (config, warn, strictDeprecations) => {
    const configPreserveModules = config.preserveModules;
    if (configPreserveModules) {
        warnDeprecationWithOptions('The "preserveModules" option is deprecated. Use the "output.preserveModules" option instead.', false, warn, strictDeprecations);
    }
    return configPreserveModules;
};
const getTreeshake = (config, warn, strictDeprecations) => {
    const configTreeshake = config.treeshake;
    if (configTreeshake === false) {
        return false;
    }
    const configWithPreset = getOptionWithPreset(config.treeshake, treeshakePresets, 'treeshake', 'false, true, ');
    if (typeof configWithPreset.pureExternalModules !== 'undefined') {
        warnDeprecationWithOptions(`The "treeshake.pureExternalModules" option is deprecated. The "treeshake.moduleSideEffects" option should be used instead. "treeshake.pureExternalModules: true" is equivalent to "treeshake.moduleSideEffects: 'no-external'"`, true, warn, strictDeprecations);
    }
    return {
        annotations: configWithPreset.annotations !== false,
        correctVarValueBeforeDeclaration: configWithPreset.correctVarValueBeforeDeclaration === true,
        moduleSideEffects: typeof configTreeshake === 'object' && configTreeshake.pureExternalModules
            ? getHasModuleSideEffects(configTreeshake.moduleSideEffects, configTreeshake.pureExternalModules)
            : getHasModuleSideEffects(configWithPreset.moduleSideEffects, undefined),
        propertyReadSideEffects: configWithPreset.propertyReadSideEffects === 'always'
            ? 'always'
            : configWithPreset.propertyReadSideEffects !== false,
        tryCatchDeoptimization: configWithPreset.tryCatchDeoptimization !== false,
        unknownGlobalSideEffects: configWithPreset.unknownGlobalSideEffects !== false
    };
};
const getHasModuleSideEffects = (moduleSideEffectsOption, pureExternalModules) => {
    if (typeof moduleSideEffectsOption === 'boolean') {
        return () => moduleSideEffectsOption;
    }
    if (moduleSideEffectsOption === 'no-external') {
        return (_id, external) => !external;
    }
    if (typeof moduleSideEffectsOption === 'function') {
        return (id, external) => !id.startsWith('\0') ? moduleSideEffectsOption(id, external) !== false : true;
    }
    if (Array.isArray(moduleSideEffectsOption)) {
        const ids = new Set(moduleSideEffectsOption);
        return id => ids.has(id);
    }
    if (moduleSideEffectsOption) {
        error(errInvalidOption('treeshake.moduleSideEffects', 'treeshake', 'please use one of false, "no-external", a function or an array'));
    }
    const isPureExternalModule = getIdMatcher(pureExternalModules);
    return (id, external) => !(external && isPureExternalModule(id));
};

// https://datatracker.ietf.org/doc/html/rfc2396
// eslint-disable-next-line no-control-regex
const INVALID_CHAR_REGEX = /[\x00-\x1F\x7F<>*#"{}|^[\]`;?:&=+$,]/g;
const DRIVE_LETTER_REGEX = /^[a-z]:/i;
function sanitizeFileName(name) {
    const match = DRIVE_LETTER_REGEX.exec(name);
    const driveLetter = match ? match[0] : '';
    // A `:` is only allowed as part of a windows drive letter (ex: C:\foo)
    // Otherwise, avoid them because they can refer to NTFS alternate data streams.
    return driveLetter + name.substr(driveLetter.length).replace(INVALID_CHAR_REGEX, '_');
}

function isValidUrl(url) {
    try {
        new URL(url);
    }
    catch (_) {
        return false;
    }
    return true;
}

function normalizeOutputOptions(config, inputOptions, unsetInputOptions) {
    var _a, _b, _c, _d, _e, _f, _g;
    // These are options that may trigger special warnings or behaviour later
    // if the user did not select an explicit value
    const unsetOptions = new Set(unsetInputOptions);
    const compact = config.compact || false;
    const format = getFormat(config);
    const inlineDynamicImports = getInlineDynamicImports(config, inputOptions);
    const preserveModules = getPreserveModules(config, inlineDynamicImports, inputOptions);
    const file = getFile(config, preserveModules, inputOptions);
    const preferConst = getPreferConst(config, inputOptions);
    const generatedCode = getGeneratedCode(config, preferConst);
    const outputOptions = {
        amd: getAmd(config),
        assetFileNames: (_a = config.assetFileNames) !== null && _a !== void 0 ? _a : 'assets/[name]-[hash][extname]',
        banner: getAddon(config, 'banner'),
        chunkFileNames: (_b = config.chunkFileNames) !== null && _b !== void 0 ? _b : '[name]-[hash].js',
        compact,
        dir: getDir(config, file),
        dynamicImportFunction: getDynamicImportFunction(config, inputOptions),
        entryFileNames: getEntryFileNames(config, unsetOptions),
        esModule: (_c = config.esModule) !== null && _c !== void 0 ? _c : true,
        exports: getExports(config, unsetOptions),
        extend: config.extend || false,
        externalLiveBindings: (_d = config.externalLiveBindings) !== null && _d !== void 0 ? _d : true,
        file,
        footer: getAddon(config, 'footer'),
        format,
        freeze: (_e = config.freeze) !== null && _e !== void 0 ? _e : true,
        generatedCode,
        globals: config.globals || {},
        hoistTransitiveImports: (_f = config.hoistTransitiveImports) !== null && _f !== void 0 ? _f : true,
        indent: getIndent(config, compact),
        inlineDynamicImports,
        interop: getInterop(config, inputOptions),
        intro: getAddon(config, 'intro'),
        manualChunks: getManualChunks(config, inlineDynamicImports, preserveModules, inputOptions),
        minifyInternalExports: getMinifyInternalExports(config, format, compact),
        name: config.name,
        namespaceToStringTag: getNamespaceToStringTag(config, generatedCode, inputOptions),
        noConflict: config.noConflict || false,
        outro: getAddon(config, 'outro'),
        paths: config.paths || {},
        plugins: ensureArray(config.plugins),
        preferConst,
        preserveModules,
        preserveModulesRoot: getPreserveModulesRoot(config),
        sanitizeFileName: typeof config.sanitizeFileName === 'function'
            ? config.sanitizeFileName
            : config.sanitizeFileName === false
                ? id => id
                : sanitizeFileName,
        sourcemap: config.sourcemap || false,
        sourcemapBaseUrl: getSourcemapBaseUrl(config),
        sourcemapExcludeSources: config.sourcemapExcludeSources || false,
        sourcemapFile: config.sourcemapFile,
        sourcemapPathTransform: config.sourcemapPathTransform,
        strict: (_g = config.strict) !== null && _g !== void 0 ? _g : true,
        systemNullSetters: config.systemNullSetters || false,
        validate: config.validate || false
    };
    warnUnknownOptions(config, Object.keys(outputOptions), 'output options', inputOptions.onwarn);
    return { options: outputOptions, unsetOptions };
}
const getFile = (config, preserveModules, inputOptions) => {
    const { file } = config;
    if (typeof file === 'string') {
        if (preserveModules) {
            return error(errInvalidOption('output.file', 'outputdir', 'you must set "output.dir" instead of "output.file" when using the "output.preserveModules" option'));
        }
        if (!Array.isArray(inputOptions.input))
            return error(errInvalidOption('output.file', 'outputdir', 'you must set "output.dir" instead of "output.file" when providing named inputs'));
    }
    return file;
};
const getFormat = (config) => {
    const configFormat = config.format;
    switch (configFormat) {
        case undefined:
        case 'es':
        case 'esm':
        case 'module':
            return 'es';
        case 'cjs':
        case 'commonjs':
            return 'cjs';
        case 'system':
        case 'systemjs':
            return 'system';
        case 'amd':
        case 'iife':
        case 'umd':
            return configFormat;
        default:
            return error({
                message: `You must specify "output.format", which can be one of "amd", "cjs", "system", "es", "iife" or "umd".`,
                url: `https://rollupjs.org/guide/en/#outputformat`
            });
    }
};
const getInlineDynamicImports = (config, inputOptions) => {
    var _a;
    const inlineDynamicImports = ((_a = config.inlineDynamicImports) !== null && _a !== void 0 ? _a : inputOptions.inlineDynamicImports) || false;
    const { input } = inputOptions;
    if (inlineDynamicImports && (Array.isArray(input) ? input : Object.keys(input)).length > 1) {
        return error(errInvalidOption('output.inlineDynamicImports', 'outputinlinedynamicimports', 'multiple inputs are not supported when "output.inlineDynamicImports" is true'));
    }
    return inlineDynamicImports;
};
const getPreserveModules = (config, inlineDynamicImports, inputOptions) => {
    var _a;
    const preserveModules = ((_a = config.preserveModules) !== null && _a !== void 0 ? _a : inputOptions.preserveModules) || false;
    if (preserveModules) {
        if (inlineDynamicImports) {
            return error(errInvalidOption('output.inlineDynamicImports', 'outputinlinedynamicimports', `this option is not supported for "output.preserveModules"`));
        }
        if (inputOptions.preserveEntrySignatures === false) {
            return error(errInvalidOption('preserveEntrySignatures', 'preserveentrysignatures', 'setting this option to false is not supported for "output.preserveModules"'));
        }
    }
    return preserveModules;
};
const getPreferConst = (config, inputOptions) => {
    const configPreferConst = config.preferConst;
    if (configPreferConst != null) {
        warnDeprecation(`The "output.preferConst" option is deprecated. Use the "output.generatedCode.constBindings" option instead.`, false, inputOptions);
    }
    return !!configPreferConst;
};
const getPreserveModulesRoot = (config) => {
    const { preserveModulesRoot } = config;
    if (preserveModulesRoot === null || preserveModulesRoot === undefined) {
        return undefined;
    }
    return resolve(preserveModulesRoot);
};
const getAmd = (config) => {
    const mergedOption = {
        autoId: false,
        basePath: '',
        define: 'define',
        forceJsExtensionForImports: false,
        ...config.amd
    };
    if ((mergedOption.autoId || mergedOption.basePath) && mergedOption.id) {
        return error(errInvalidOption('output.amd.id', 'outputamd', 'this option cannot be used together with "output.amd.autoId"/"output.amd.basePath"'));
    }
    if (mergedOption.basePath && !mergedOption.autoId) {
        return error(errInvalidOption('output.amd.basePath', 'outputamd', 'this option only works with "output.amd.autoId"'));
    }
    let normalized;
    if (mergedOption.autoId) {
        normalized = {
            autoId: true,
            basePath: mergedOption.basePath,
            define: mergedOption.define,
            forceJsExtensionForImports: mergedOption.forceJsExtensionForImports
        };
    }
    else {
        normalized = {
            autoId: false,
            define: mergedOption.define,
            forceJsExtensionForImports: mergedOption.forceJsExtensionForImports,
            id: mergedOption.id
        };
    }
    return normalized;
};
const getAddon = (config, name) => {
    const configAddon = config[name];
    if (typeof configAddon === 'function') {
        return configAddon;
    }
    return () => configAddon || '';
};
const getDir = (config, file) => {
    const { dir } = config;
    if (typeof dir === 'string' && typeof file === 'string') {
        return error(errInvalidOption('output.dir', 'outputdir', 'you must set either "output.file" for a single-file build or "output.dir" when generating multiple chunks'));
    }
    return dir;
};
const getDynamicImportFunction = (config, inputOptions) => {
    const configDynamicImportFunction = config.dynamicImportFunction;
    if (configDynamicImportFunction) {
        warnDeprecation(`The "output.dynamicImportFunction" option is deprecated. Use the "renderDynamicImport" plugin hook instead.`, false, inputOptions);
    }
    return configDynamicImportFunction;
};
const getEntryFileNames = (config, unsetOptions) => {
    const configEntryFileNames = config.entryFileNames;
    if (configEntryFileNames == null) {
        unsetOptions.add('entryFileNames');
    }
    return configEntryFileNames !== null && configEntryFileNames !== void 0 ? configEntryFileNames : '[name].js';
};
function getExports(config, unsetOptions) {
    const configExports = config.exports;
    if (configExports == null) {
        unsetOptions.add('exports');
    }
    else if (!['default', 'named', 'none', 'auto'].includes(configExports)) {
        return error(errInvalidExportOptionValue(configExports));
    }
    return configExports || 'auto';
}
const getGeneratedCode = (config, preferConst) => {
    const configWithPreset = getOptionWithPreset(config.generatedCode, generatedCodePresets, 'output.generatedCode', '');
    return {
        arrowFunctions: configWithPreset.arrowFunctions === true,
        constBindings: configWithPreset.constBindings === true || preferConst,
        objectShorthand: configWithPreset.objectShorthand === true,
        reservedNamesAsProps: configWithPreset.reservedNamesAsProps === true,
        symbols: configWithPreset.symbols === true
    };
};
const getIndent = (config, compact) => {
    if (compact) {
        return '';
    }
    const configIndent = config.indent;
    return configIndent === false ? '' : configIndent !== null && configIndent !== void 0 ? configIndent : true;
};
const ALLOWED_INTEROP_TYPES = new Set([
    'auto',
    'esModule',
    'default',
    'defaultOnly',
    true,
    false
]);
const getInterop = (config, inputOptions) => {
    const configInterop = config.interop;
    const validatedInteropTypes = new Set();
    const validateInterop = (interop) => {
        if (!validatedInteropTypes.has(interop)) {
            validatedInteropTypes.add(interop);
            if (!ALLOWED_INTEROP_TYPES.has(interop)) {
                return error(errInvalidOption('output.interop', 'outputinterop', `use one of ${Array.from(ALLOWED_INTEROP_TYPES, value => JSON.stringify(value)).join(', ')}`, interop));
            }
            if (typeof interop === 'boolean') {
                warnDeprecation({
                    message: `The boolean value "${interop}" for the "output.interop" option is deprecated. Use ${interop ? '"auto"' : '"esModule", "default" or "defaultOnly"'} instead.`,
                    url: 'https://rollupjs.org/guide/en/#outputinterop'
                }, false, inputOptions);
            }
        }
        return interop;
    };
    if (typeof configInterop === 'function') {
        const interopPerId = Object.create(null);
        let defaultInterop = null;
        return id => id === null
            ? defaultInterop || validateInterop((defaultInterop = configInterop(id)))
            : id in interopPerId
                ? interopPerId[id]
                : validateInterop((interopPerId[id] = configInterop(id)));
    }
    return configInterop === undefined ? () => true : () => validateInterop(configInterop);
};
const getManualChunks = (config, inlineDynamicImports, preserveModules, inputOptions) => {
    const configManualChunks = config.manualChunks || inputOptions.manualChunks;
    if (configManualChunks) {
        if (inlineDynamicImports) {
            return error(errInvalidOption('output.manualChunks', 'outputmanualchunks', 'this option is not supported for "output.inlineDynamicImports"'));
        }
        if (preserveModules) {
            return error(errInvalidOption('output.manualChunks', 'outputmanualchunks', 'this option is not supported for "output.preserveModules"'));
        }
    }
    return configManualChunks || {};
};
const getMinifyInternalExports = (config, format, compact) => { var _a; return (_a = config.minifyInternalExports) !== null && _a !== void 0 ? _a : (compact || format === 'es' || format === 'system'); };
const getNamespaceToStringTag = (config, generatedCode, inputOptions) => {
    const configNamespaceToStringTag = config.namespaceToStringTag;
    if (configNamespaceToStringTag != null) {
        warnDeprecation(`The "output.namespaceToStringTag" option is deprecated. Use the "output.generatedCode.symbols" option instead.`, false, inputOptions);
        return configNamespaceToStringTag;
    }
    return generatedCode.symbols || false;
};
const getSourcemapBaseUrl = (config) => {
    const { sourcemapBaseUrl } = config;
    if (sourcemapBaseUrl) {
        if (isValidUrl(sourcemapBaseUrl)) {
            return sourcemapBaseUrl;
        }
        return error(errInvalidOption('output.sourcemapBaseUrl', 'outputsourcemapbaseurl', `must be a valid URL, received ${JSON.stringify(sourcemapBaseUrl)}`));
    }
};

function rollup(rawInputOptions) {
    return rollupInternal(rawInputOptions, null);
}
async function rollupInternal(rawInputOptions, watcher) {
    const { options: inputOptions, unsetOptions: unsetInputOptions } = await getInputOptions(rawInputOptions, watcher !== null);
    initialiseTimers(inputOptions);
    const graph = new Graph(inputOptions, watcher);
    // remove the cache option from the memory after graph creation (cache is not used anymore)
    const useCache = rawInputOptions.cache !== false;
    delete inputOptions.cache;
    delete rawInputOptions.cache;
    timeStart('BUILD', 1);
    await catchUnfinishedHookActions(graph.pluginDriver, async () => {
        try {
            await graph.pluginDriver.hookParallel('buildStart', [inputOptions]);
            await graph.build();
        }
        catch (err) {
            const watchFiles = Object.keys(graph.watchFiles);
            if (watchFiles.length > 0) {
                err.watchFiles = watchFiles;
            }
            await graph.pluginDriver.hookParallel('buildEnd', [err]);
            await graph.pluginDriver.hookParallel('closeBundle', []);
            throw err;
        }
        await graph.pluginDriver.hookParallel('buildEnd', []);
    });
    timeEnd('BUILD', 1);
    const result = {
        cache: useCache ? graph.getCache() : undefined,
        async close() {
            if (result.closed)
                return;
            result.closed = true;
            await graph.pluginDriver.hookParallel('closeBundle', []);
        },
        closed: false,
        async generate(rawOutputOptions) {
            if (result.closed)
                return error(errAlreadyClosed());
            return handleGenerateWrite(false, inputOptions, unsetInputOptions, rawOutputOptions, graph);
        },
        watchFiles: Object.keys(graph.watchFiles),
        async write(rawOutputOptions) {
            if (result.closed)
                return error(errAlreadyClosed());
            return handleGenerateWrite(true, inputOptions, unsetInputOptions, rawOutputOptions, graph);
        }
    };
    if (inputOptions.perf)
        result.getTimings = getTimings;
    return result;
}
async function getInputOptions(rawInputOptions, watchMode) {
    if (!rawInputOptions) {
        throw new Error('You must supply an options object to rollup');
    }
    const rawPlugins = getSortedValidatedPlugins('options', ensureArray(rawInputOptions.plugins));
    const { options, unsetOptions } = normalizeInputOptions(await rawPlugins.reduce(applyOptionHook(watchMode), Promise.resolve(rawInputOptions)));
    normalizePlugins(options.plugins, ANONYMOUS_PLUGIN_PREFIX);
    return { options, unsetOptions };
}
function applyOptionHook(watchMode) {
    return async (inputOptions, plugin) => {
        const handler = 'handler' in plugin.options ? plugin.options.handler : plugin.options;
        return ((await handler.call({ meta: { rollupVersion: version$1, watchMode } }, await inputOptions)) || inputOptions);
    };
}
function normalizePlugins(plugins, anonymousPrefix) {
    plugins.forEach((plugin, index) => {
        if (!plugin.name) {
            plugin.name = `${anonymousPrefix}${index + 1}`;
        }
    });
}
function handleGenerateWrite(isWrite, inputOptions, unsetInputOptions, rawOutputOptions, graph) {
    const { options: outputOptions, outputPluginDriver, unsetOptions } = getOutputOptionsAndPluginDriver(rawOutputOptions, graph.pluginDriver, inputOptions, unsetInputOptions);
    return catchUnfinishedHookActions(outputPluginDriver, async () => {
        const bundle = new Bundle(outputOptions, unsetOptions, inputOptions, outputPluginDriver, graph);
        const generated = await bundle.generate(isWrite);
        if (isWrite) {
            if (!outputOptions.dir && !outputOptions.file) {
                return error({
                    code: 'MISSING_OPTION',
                    message: 'You must specify "output.file" or "output.dir" for the build.'
                });
            }
            await Promise.all(Object.values(generated).map(chunk => graph.fileOperationQueue.run(() => writeOutputFile(chunk, outputOptions))));
            await outputPluginDriver.hookParallel('writeBundle', [outputOptions, generated]);
        }
        return createOutput(generated);
    });
}
function getOutputOptionsAndPluginDriver(rawOutputOptions, inputPluginDriver, inputOptions, unsetInputOptions) {
    if (!rawOutputOptions) {
        throw new Error('You must supply an options object');
    }
    const rawPlugins = ensureArray(rawOutputOptions.plugins);
    normalizePlugins(rawPlugins, ANONYMOUS_OUTPUT_PLUGIN_PREFIX);
    const outputPluginDriver = inputPluginDriver.createOutputPluginDriver(rawPlugins);
    return {
        ...getOutputOptions(inputOptions, unsetInputOptions, rawOutputOptions, outputPluginDriver),
        outputPluginDriver
    };
}
function getOutputOptions(inputOptions, unsetInputOptions, rawOutputOptions, outputPluginDriver) {
    return normalizeOutputOptions(outputPluginDriver.hookReduceArg0Sync('outputOptions', [rawOutputOptions.output || rawOutputOptions], (outputOptions, result) => result || outputOptions, pluginContext => {
        const emitError = () => pluginContext.error(errCannotEmitFromOptionsHook());
        return {
            ...pluginContext,
            emitFile: emitError,
            setAssetSource: emitError
        };
    }), inputOptions, unsetInputOptions);
}
function createOutput(outputBundle) {
    return {
        output: Object.values(outputBundle).filter(outputFile => Object.keys(outputFile).length > 0).sort((outputFileA, outputFileB) => getSortingFileType(outputFileA) - getSortingFileType(outputFileB))
    };
}
var SortingFileType;
(function (SortingFileType) {
    SortingFileType[SortingFileType["ENTRY_CHUNK"] = 0] = "ENTRY_CHUNK";
    SortingFileType[SortingFileType["SECONDARY_CHUNK"] = 1] = "SECONDARY_CHUNK";
    SortingFileType[SortingFileType["ASSET"] = 2] = "ASSET";
})(SortingFileType || (SortingFileType = {}));
function getSortingFileType(file) {
    if (file.type === 'asset') {
        return SortingFileType.ASSET;
    }
    if (file.isEntry) {
        return SortingFileType.ENTRY_CHUNK;
    }
    return SortingFileType.SECONDARY_CHUNK;
}
async function writeOutputFile(outputFile, outputOptions) {
    const fileName = resolve(outputOptions.dir || dirname(outputOptions.file), outputFile.fileName);
    // 'recursive: true' does not throw if the folder structure, or parts of it, already exist
    await promises.mkdir(dirname(fileName), { recursive: true });
    let writeSourceMapPromise;
    let source;
    if (outputFile.type === 'asset') {
        source = outputFile.source;
    }
    else {
        source = outputFile.code;
        if (outputOptions.sourcemap && outputFile.map) {
            let url;
            if (outputOptions.sourcemap === 'inline') {
                url = outputFile.map.toUrl();
            }
            else {
                const { sourcemapBaseUrl } = outputOptions;
                const sourcemapFileName = `${basename(outputFile.fileName)}.map`;
                url = sourcemapBaseUrl
                    ? new URL(sourcemapFileName, sourcemapBaseUrl).toString()
                    : sourcemapFileName;
                writeSourceMapPromise = promises.writeFile(`${fileName}.map`, outputFile.map.toString());
            }
            if (outputOptions.sourcemap !== 'hidden') {
                source += `//# ${SOURCEMAPPING_URL}=${url}\n`;
            }
        }
    }
    return Promise.all([promises.writeFile(fileName, source), writeSourceMapPromise]);
}
/**
 * Auxiliary function for defining rollup configuration
 * Mainly to facilitate IDE code prompts, after all, export default does not prompt, even if you add @type annotations, it is not accurate
 * @param options
 */
function defineConfig(options) {
    return options;
}

class WatchEmitter extends EventEmitter {
    constructor() {
        super();
        this.awaitedHandlers = Object.create(null);
        // Allows more than 10 bundles to be watched without
        // showing the `MaxListenersExceededWarning` to the user.
        this.setMaxListeners(Infinity);
    }
    // Will be overwritten by Rollup
    async close() { }
    emitAndAwait(event, ...args) {
        this.emit(event, ...args);
        return Promise.all(this.getHandlers(event).map(handler => handler(...args)));
    }
    onCurrentAwaited(event, listener) {
        this.getHandlers(event).push(listener);
        return this;
    }
    removeAwaited() {
        this.awaitedHandlers = {};
        return this;
    }
    getHandlers(event) {
        return this.awaitedHandlers[event] || (this.awaitedHandlers[event] = []);
    }
}

let fsEvents;
let fsEventsImportError;
async function loadFsEvents() {
    try {
        ({ default: fsEvents } = await import('fsevents'));
    }
    catch (err) {
        fsEventsImportError = err;
    }
}
// A call to this function will be injected into the chokidar code
function getFsEvents() {
    if (fsEventsImportError)
        throw fsEventsImportError;
    return fsEvents;
}

const fseventsImporter = /*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loadFsEvents,
  getFsEvents
}, Symbol.toStringTag, { value: 'Module' });

function watch(configs) {
    const emitter = new WatchEmitter();
    const configArray = ensureArray(configs);
    const watchConfigs = configArray.filter(config => config.watch !== false);
    if (watchConfigs.length === 0) {
        return error(errInvalidOption('watch', 'watch', 'there must be at least one config where "watch" is not set to "false"'));
    }
    loadFsEvents()
        .then(() => import('./watch.js'))
        .then(({ Watcher }) => new Watcher(watchConfigs, emitter));
    return emitter;
}

export { createFilter, defaultOnWarn, defineConfig, ensureArray, fseventsImporter, generatedCodePresets, getAugmentedNamespace, objectifyOption, objectifyOptionWithPresets, picomatch$1 as picomatch, rollup, rollupInternal, treeshakePresets, version$1 as version, warnUnknownOptions, watch };
