class RangeTree {
  start;
  end;
  delta;
  children;

  constructor(start, end, delta, children) {
    this.start = start;
    this.end = end;
    this.delta = delta;
    this.children = children;
  }

  /**
   * @precodition `ranges` are well-formed and pre-order sorted
   */
  static fromSortedRanges(ranges) {
    let root;
    // Stack of parent trees and parent counts.
    const stack = [];
    for (const range of ranges) {
      const node = new RangeTree(
        range.startOffset,
        range.endOffset,
        range.count,
        [],
      );
      if (root === undefined) {
        root = node;
        stack.push([node, range.count]);
        continue;
      }
      let parent;
      let parentCount;
      while (true) {
        [parent, parentCount] = stack[stack.length - 1];
        // assert: `top !== undefined` (the ranges are sorted)
        if (range.startOffset < parent.end) {
          break;
        } else {
          stack.pop();
        }

        if (stack.length === 0) {
          break;
        }
      }
      node.delta -= parentCount;
      parent.children.push(node);
      stack.push([node, range.count]);
    }
    return root;
  }

  normalize() {
    const children = [];
    let curEnd;
    let head;
    const tail = [];
    for (const child of this.children) {
      if (head === undefined) {
        head = child;
      } else if (child.delta === head.delta && child.start === curEnd) {
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
      const child = children[0];
      if (child.start === this.start && child.end === this.end) {
        this.delta += child.delta;
        this.children = child.children;
        // `.lazyCount` is zero for both (both are after normalization)
        return;
      }
    }

    this.children = children;

    function endChain() {
      if (tail.length !== 0) {
        head.end = tail[tail.length - 1].end;
        for (const tailTree of tail) {
          for (const subChild of tailTree.children) {
            subChild.delta += tailTree.delta - head.delta;
            head.children.push(subChild);
          }
        }
        tail.length = 0;
      }
      head.normalize();
      children.push(head);
    }
  }

  /**
   * @precondition `tree.start < value && value < tree.end`
   * @return RangeTree Right part
   */
  split(value) {
    let leftChildLen = this.children.length;
    let mid;

    // TODO(perf): Binary search (check overhead)
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (child.start < value && value < child.end) {
        mid = child.split(value);
        leftChildLen = i + 1;
        break;
      } else if (child.start >= value) {
        leftChildLen = i;
        break;
      }
    }

    const rightLen = this.children.length - leftChildLen;
    const rightChildren = this.children.splice(leftChildLen, rightLen);
    if (mid !== undefined) {
      rightChildren.unshift(mid);
    }
    const result = new RangeTree(value, this.end, this.delta, rightChildren);
    this.end = value;
    return result;
  }

  /**
   * Get the range coverages corresponding to the tree.
   *
   * The ranges are pre-order sorted.
   */
  toRanges() {
    const ranges = [];
    // Stack of parent trees and counts.
    const stack = [[this, 0]];
    while (stack.length > 0) {
      const [cur, parentCount] = stack.pop();
      const count = parentCount + cur.delta;
      ranges.push({ startOffset: cur.start, endOffset: cur.end, count });
      for (let i = cur.children.length - 1; i >= 0; i--) {
        stack.push([cur.children[i], count]);
      }
    }
    return ranges;
  }
}

module.exports = {
  RangeTree,
};
