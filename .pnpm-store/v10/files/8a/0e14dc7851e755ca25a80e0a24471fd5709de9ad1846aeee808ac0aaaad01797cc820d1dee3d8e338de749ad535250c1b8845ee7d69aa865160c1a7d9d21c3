"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSpace = isSpace;
exports.hasCR = hasCR;
exports.splitCR = splitCR;
exports.splitSpace = splitSpace;
exports.splitLines = splitLines;
exports.seedBlock = seedBlock;
exports.seedSpec = seedSpec;
exports.seedTokens = seedTokens;
exports.rewireSource = rewireSource;
exports.rewireSpecs = rewireSpecs;
function isSpace(source) {
  return /^\s+$/.test(source);
}
function hasCR(source) {
  return /\r$/.test(source);
}
function splitCR(source) {
  const matches = source.match(/\r+$/);
  return matches == null ? ['', source] : [source.slice(-matches[0].length), source.slice(0, -matches[0].length)];
}
function splitSpace(source) {
  const matches = source.match(/^\s+/);
  return matches == null ? ['', source] : [source.slice(0, matches[0].length), source.slice(matches[0].length)];
}
function splitLines(source) {
  return source.split(/\n/);
}
function seedBlock(block = {}) {
  return Object.assign({
    description: '',
    tags: [],
    source: [],
    problems: []
  }, block);
}
function seedSpec(spec = {}) {
  return Object.assign({
    tag: '',
    name: '',
    type: '',
    optional: false,
    description: '',
    problems: [],
    source: []
  }, spec);
}
function seedTokens(tokens = {}) {
  return Object.assign({
    start: '',
    delimiter: '',
    postDelimiter: '',
    tag: '',
    postTag: '',
    name: '',
    postName: '',
    type: '',
    postType: '',
    description: '',
    end: '',
    lineEnd: ''
  }, tokens);
}
/**
 * Assures Block.tags[].source contains references to the Block.source items,
 * using Block.source as a source of truth. This is a counterpart of rewireSpecs
 * @param block parsed coments block
 */
function rewireSource(block) {
  const source = block.source.reduce((acc, line) => acc.set(line.number, line), new Map());
  for (const spec of block.tags) {
    spec.source = spec.source.map(line => source.get(line.number));
  }
  return block;
}
/**
 * Assures Block.source contains references to the Block.tags[].source items,
 * using Block.tags[].source as a source of truth. This is a counterpart of rewireSource
 * @param block parsed coments block
 */
function rewireSpecs(block) {
  const source = block.tags.reduce((acc, spec) => spec.source.reduce((acc, line) => acc.set(line.number, line), acc), new Map());
  block.source = block.source.map(line => source.get(line.number) || line);
  return block;
}
//# sourceMappingURL=util.cjs.map
