"use strict";

// eslint-disable-next-line no-console
const assert = console.assert;

const buildCtx = opts => {
  const ctx = {
    joined: true,
    spacerNoNeighbour: '   ',
    spacerNeighbour: '│  ',
    keyNoNeighbour: '└─ ',
    keyNeighbour: '├─ ',
    sortFn: null,
    ...opts
  };
  assert(Object.keys(ctx).length === 6, 'Unexpected Option(s) provided');
  assert(typeof ctx.joined === 'boolean', 'Option "joined" has invalid format');
  assert(typeof ctx.spacerNoNeighbour === 'string', 'Option "spacerNoNeighbour" has invalid format');
  assert(typeof ctx.spacerNeighbour === 'string', 'Option "spacerNeighbour" has invalid format');
  assert(typeof ctx.keyNoNeighbour === 'string', 'Option "keyNoNeighbour" has invalid format');
  assert(typeof ctx.keyNeighbour === 'string', 'Option "keyNeighbour" has invalid format');
  assert(typeof ctx.sortFn === 'function' || ctx.sortFn === null, 'Option "sortFn" has invalid format');
  return ctx;
};

module.exports = (tree, opts = {}) => {
  const ctx = buildCtx(opts);
  const result = [];

  const sort = input => ctx.sortFn === null ? input.reverse() : input.sort((a, b) => ctx.sortFn(b, a));

  const neighbours = [];
  const keys = sort(Object.keys(tree)).map(k => [k]);
  const lookup = [tree];

  while (keys.length !== 0) {
    const key = keys.pop();
    const node = lookup[key.length - 1][key[key.length - 1]];
    neighbours[key.length - 1] = keys.length !== 0 && keys[keys.length - 1].length === key.length;
    result.push([neighbours.slice(0, key.length - 1).map(n => n ? ctx.spacerNeighbour : ctx.spacerNoNeighbour).join(''), neighbours[key.length - 1] ? ctx.keyNeighbour : ctx.keyNoNeighbour, key[key.length - 1], ['boolean', 'string', 'number'].includes(typeof node) ? `: ${node}` : ''].join(''));

    if (node instanceof Object && !Array.isArray(node)) {
      keys.push(...sort(Object.keys(node)).map(k => key.concat(k)));
      lookup[key.length] = node;
    }
  }

  return ctx.joined === true ? result.join('\n') : result;
};