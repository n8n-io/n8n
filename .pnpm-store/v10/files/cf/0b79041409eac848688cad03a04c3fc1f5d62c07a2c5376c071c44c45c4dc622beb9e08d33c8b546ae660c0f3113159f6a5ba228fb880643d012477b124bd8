const { compareRangeCovs } = require("./compare");

function emitForest(trees) {
  return emitForestLines(trees).join("\n");
}

function emitForestLines(trees) {
  const colMap = getColMap(trees);
  const header = emitOffsets(colMap);
  return [header, ...trees.map((tree) => emitTree(tree, colMap).join("\n"))];
}

function getColMap(trees) {
  const eventSet = new Set();
  for (const tree of trees) {
    const stack = [tree];
    while (stack.length > 0) {
      const cur = stack.pop();
      eventSet.add(cur.start);
      eventSet.add(cur.end);
      for (const child of cur.children) {
        stack.push(child);
      }
    }
  }
  const events = [...eventSet];
  events.sort((a, b) => a - b);
  let maxDigits = 1;
  for (const event of events) {
    maxDigits = Math.max(maxDigits, event.toString(10).length);
  }
  const colWidth = maxDigits + 3;
  const colMap = new Map();
  for (const [i, event] of events.entries()) {
    colMap.set(event, i * colWidth);
  }
  return colMap;
}

function emitTree(tree, colMap) {
  const layers = [];
  let nextLayer = [tree];
  while (nextLayer.length > 0) {
    const layer = nextLayer;
    layers.push(layer);
    nextLayer = [];
    for (const node of layer) {
      for (const child of node.children) {
        nextLayer.push(child);
      }
    }
  }
  return layers.map((layer) => emitTreeLayer(layer, colMap));
}

function parseFunctionRanges(text, offsetMap) {
  const result = [];
  for (const line of text.split("\n")) {
    for (const range of parseTreeLayer(line, offsetMap)) {
      result.push(range);
    }
  }
  result.sort(compareRangeCovs);
  return result;
}

/**
 *
 * @param layer Sorted list of disjoint trees.
 * @param colMap
 */
function emitTreeLayer(layer, colMap) {
  const line = [];
  let curIdx = 0;
  for (const { start, end, count } of layer) {
    const startIdx = colMap.get(start);
    const endIdx = colMap.get(end);
    if (startIdx > curIdx) {
      line.push(" ".repeat(startIdx - curIdx));
    }
    line.push(emitRange(count, endIdx - startIdx));
    curIdx = endIdx;
  }
  return line.join("");
}

function parseTreeLayer(text, offsetMap) {
  const result = [];
  const regex = /\[(\d+)-*\)/gs;
  while (true) {
    const match = regex.exec(text);
    if (match === null) {
      break;
    }
    const startIdx = match.index;
    const endIdx = startIdx + match[0].length;
    const count = parseInt(match[1], 10);
    const startOffset = offsetMap.get(startIdx);
    const endOffset = offsetMap.get(endIdx);
    if (startOffset === undefined || endOffset === undefined) {
      throw new Error(`Invalid offsets for: ${JSON.stringify(text)}`);
    }
    result.push({ startOffset, endOffset, count });
  }
  return result;
}

function emitRange(count, len) {
  const rangeStart = `[${count.toString(10)}`;
  const rangeEnd = ")";
  const hyphensLen = len - (rangeStart.length + rangeEnd.length);
  const hyphens = "-".repeat(Math.max(0, hyphensLen));
  return `${rangeStart}${hyphens}${rangeEnd}`;
}

function emitOffsets(colMap) {
  let line = "";
  for (const [event, col] of colMap) {
    if (line.length < col) {
      line += " ".repeat(col - line.length);
    }
    line += event.toString(10);
  }
  return line;
}

function parseOffsets(text) {
  const result = new Map();
  const regex = /\d+/gs;
  while (true) {
    const match = regex.exec(text);
    if (match === null) {
      break;
    }
    result.set(match.index, parseInt(match[0], 10));
  }
  return result;
}

module.exports = {
  emitForest,
  emitForestLines,
  parseFunctionRanges,
  parseOffsets,
};
