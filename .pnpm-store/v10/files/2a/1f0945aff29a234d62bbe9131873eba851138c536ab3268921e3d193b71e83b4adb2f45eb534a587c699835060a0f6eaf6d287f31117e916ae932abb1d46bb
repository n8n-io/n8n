import { compareRangeCovs } from "./compare";
import { RangeCov } from "./types";

interface ReadonlyRangeTree {
  readonly start: number;
  readonly end: number;
  readonly count: number;
  readonly children: ReadonlyRangeTree[];
}

export function emitForest(trees: ReadonlyArray<ReadonlyRangeTree>): string {
  return emitForestLines(trees).join("\n");
}

export function emitForestLines(trees: ReadonlyArray<ReadonlyRangeTree>): string[] {
  const colMap: Map<number, number> = getColMap(trees);
  const header: string = emitOffsets(colMap);
  return [header, ...trees.map(tree => emitTree(tree, colMap).join("\n"))];
}

function getColMap(trees: Iterable<ReadonlyRangeTree>): Map<number, number> {
  const eventSet: Set<number> = new Set();
  for (const tree of trees) {
    const stack: ReadonlyRangeTree[] = [tree];
    while (stack.length > 0) {
      const cur: ReadonlyRangeTree = stack.pop()!;
      eventSet.add(cur.start);
      eventSet.add(cur.end);
      for (const child of cur.children) {
        stack.push(child);
      }
    }
  }
  const events: number[] = [...eventSet];
  events.sort((a, b) => a - b);
  let maxDigits: number = 1;
  for (const event of events) {
    maxDigits = Math.max(maxDigits, event.toString(10).length);
  }
  const colWidth: number = maxDigits + 3;
  const colMap: Map<number, number> = new Map();
  for (const [i, event] of events.entries()) {
    colMap.set(event, i * colWidth);
  }
  return colMap;
}

function emitTree(tree: ReadonlyRangeTree, colMap: Map<number, number>): string[] {
  const layers: ReadonlyRangeTree[][] = [];
  let nextLayer: ReadonlyRangeTree[] = [tree];
  while (nextLayer.length > 0) {
    const layer: ReadonlyRangeTree[] = nextLayer;
    layers.push(layer);
    nextLayer = [];
    for (const node of layer) {
      for (const child of node.children) {
        nextLayer.push(child);
      }
    }
  }
  return layers.map(layer => emitTreeLayer(layer, colMap));
}

export function parseFunctionRanges(text: string, offsetMap: Map<number, number>): RangeCov[] {
  const result: RangeCov[] = [];
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
function emitTreeLayer(layer: ReadonlyRangeTree[], colMap: Map<number, number>): string {
  const line: string[] = [];
  let curIdx: number = 0;
  for (const {start, end, count} of layer) {
    const startIdx: number = colMap.get(start)!;
    const endIdx: number = colMap.get(end)!;
    if (startIdx > curIdx) {
      line.push(" ".repeat(startIdx - curIdx));
    }
    line.push(emitRange(count, endIdx - startIdx));
    curIdx = endIdx;
  }
  return line.join("");
}

function parseTreeLayer(text: string, offsetMap: Map<number, number>): RangeCov[] {
  const result: RangeCov[] = [];
  const regex: RegExp = /\[(\d+)-*\)/gs;
  while (true) {
    const match: RegExpMatchArray | null = regex.exec(text);
    if (match === null) {
      break;
    }
    const startIdx: number = match.index!;
    const endIdx: number = startIdx + match[0].length;
    const count: number = parseInt(match[1], 10);
    const startOffset: number | undefined = offsetMap.get(startIdx);
    const endOffset: number | undefined = offsetMap.get(endIdx);
    if (startOffset === undefined || endOffset === undefined) {
      throw new Error(`Invalid offsets for: ${JSON.stringify(text)}`);
    }
    result.push({startOffset, endOffset, count});
  }
  return result;
}

function emitRange(count: number, len: number): string {
  const rangeStart: string = `[${count.toString(10)}`;
  const rangeEnd: string = ")";
  const hyphensLen: number = len - (rangeStart.length + rangeEnd.length);
  const hyphens: string = "-".repeat(Math.max(0, hyphensLen));
  return `${rangeStart}${hyphens}${rangeEnd}`;
}

function emitOffsets(colMap: Map<number, number>): string {
  let line: string = "";
  for (const [event, col] of colMap) {
    if (line.length < col) {
      line += " ".repeat(col - line.length);
    }
    line += event.toString(10);
  }
  return line;
}

export function parseOffsets(text: string): Map<number, number> {
  const result: Map<number, number> = new Map();
  const regex: RegExp = /\d+/gs;
  while (true) {
    const match: RegExpExecArray | null = regex.exec(text);
    if (match === null) {
      break;
    }
    result.set(match.index, parseInt(match[0], 10));
  }
  return result;
}
