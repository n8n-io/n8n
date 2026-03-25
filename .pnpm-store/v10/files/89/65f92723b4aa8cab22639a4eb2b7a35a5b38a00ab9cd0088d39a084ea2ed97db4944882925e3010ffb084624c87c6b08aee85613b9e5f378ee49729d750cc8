import { RangeCov } from "./types";

export class RangeTree {
  start: number;
  end: number;
  delta: number;
  children: RangeTree[];

  constructor(
    start: number,
    end: number,
    delta: number,
    children: RangeTree[],
  ) {
    this.start = start;
    this.end = end;
    this.delta = delta;
    this.children = children;
  }

  /**
   * @precodition `ranges` are well-formed and pre-order sorted
   */
  static fromSortedRanges(ranges: ReadonlyArray<RangeCov>): RangeTree | undefined {
    let root: RangeTree | undefined;
    // Stack of parent trees and parent counts.
    const stack: [RangeTree, number][] = [];
    for (const range of ranges) {
      const node: RangeTree = new RangeTree(range.startOffset, range.endOffset, range.count, []);
      if (root === undefined) {
        root = node;
        stack.push([node, range.count]);
        continue;
      }
      let parent: RangeTree;
      let parentCount: number;
      while (true) {
        [parent, parentCount] = stack[stack.length - 1];
        // assert: `top !== undefined` (the ranges are sorted)
        if (range.startOffset < parent.end) {
          break;
        } else {
          stack.pop();
        }
      }
      node.delta -= parentCount;
      parent.children.push(node);
      stack.push([node, range.count]);
    }
    return root;
  }

  normalize(): void {
    const children: RangeTree[] = [];
    let curEnd: number;
    let head: RangeTree | undefined;
    const tail: RangeTree[] = [];
    for (const child of this.children) {
      if (head === undefined) {
        head = child;
      } else if (child.delta === head.delta && child.start === curEnd!) {
        tail.push(child);
      } else {
        endChain();
        head = child;
      }
      curEnd = child.end;
    }
    if (head !== undefined) {
      endChain();
    }

    if (children.length === 1) {
      const child: RangeTree = children[0];
      if (child.start === this.start && child.end === this.end) {
        this.delta += child.delta;
        this.children = child.children;
        // `.lazyCount` is zero for both (both are after normalization)
        return;
      }
    }

    this.children = children;

    function endChain(): void {
      if (tail.length !== 0) {
        head!.end = tail[tail.length - 1].end;
        for (const tailTree of tail) {
          for (const subChild of tailTree.children) {
            subChild.delta += tailTree.delta - head!.delta;
            head!.children.push(subChild);
          }
        }
        tail.length = 0;
      }
      head!.normalize();
      children.push(head!);
    }
  }

  /**
   * @precondition `tree.start < value && value < tree.end`
   * @return RangeTree Right part
   */
  split(value: number): RangeTree {
    let leftChildLen: number = this.children.length;
    let mid: RangeTree | undefined;

    // TODO(perf): Binary search (check overhead)
    for (let i: number = 0; i < this.children.length; i++) {
      const child: RangeTree = this.children[i];
      if (child.start < value && value < child.end) {
        mid = child.split(value);
        leftChildLen = i + 1;
        break;
      } else if (child.start >= value) {
        leftChildLen = i;
        break;
      }
    }

    const rightLen: number = this.children.length - leftChildLen;
    const rightChildren: RangeTree[] = this.children.splice(leftChildLen, rightLen);
    if (mid !== undefined) {
      rightChildren.unshift(mid);
    }
    const result: RangeTree = new RangeTree(
      value,
      this.end,
      this.delta,
      rightChildren,
    );
    this.end = value;
    return result;
  }

  /**
   * Get the range coverages corresponding to the tree.
   *
   * The ranges are pre-order sorted.
   */
  toRanges(): RangeCov[] {
    const ranges: RangeCov[] = [];
    // Stack of parent trees and counts.
    const stack: [RangeTree, number][] = [[this, 0]];
    while (stack.length > 0) {
      const [cur, parentCount]: [RangeTree, number] = stack.pop()!;
      const count: number = parentCount + cur.delta;
      ranges.push({startOffset: cur.start, endOffset: cur.end, count});
      for (let i: number = cur.children.length - 1; i >= 0; i--) {
        stack.push([cur.children[i], count]);
      }
    }
    return ranges;
  }
}
