"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RangeTree {
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
            const node = new RangeTree(range.startOffset, range.endOffset, range.count, []);
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
                }
                else {
                    stack.pop();
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
            }
            else if (child.delta === head.delta && child.start === curEnd) {
                tail.push(child);
            }
            else {
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
            }
            else if (child.start >= value) {
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
exports.RangeTree = RangeTree;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9zcmMvcmFuZ2UtdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLE1BQWEsU0FBUztJQU1wQixZQUNFLEtBQWEsRUFDYixHQUFXLEVBQ1gsS0FBYSxFQUNiLFFBQXFCO1FBRXJCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDM0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQStCO1FBQ3JELElBQUksSUFBMkIsQ0FBQztRQUNoQywyQ0FBMkM7UUFDM0MsTUFBTSxLQUFLLEdBQTBCLEVBQUUsQ0FBQztRQUN4QyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUMxQixNQUFNLElBQUksR0FBYyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMzRixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ3RCLElBQUksR0FBRyxJQUFJLENBQUM7Z0JBQ1osS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDaEMsU0FBUzthQUNWO1lBQ0QsSUFBSSxNQUFpQixDQUFDO1lBQ3RCLElBQUksV0FBbUIsQ0FBQztZQUN4QixPQUFPLElBQUksRUFBRTtnQkFDWCxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDaEQsc0RBQXNEO2dCQUN0RCxJQUFJLEtBQUssQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRTtvQkFDbEMsTUFBTTtpQkFDUDtxQkFBTTtvQkFDTCxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7aUJBQ2I7YUFDRjtZQUNELElBQUksQ0FBQyxLQUFLLElBQUksV0FBVyxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDakM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxTQUFTO1FBQ1AsTUFBTSxRQUFRLEdBQWdCLEVBQUUsQ0FBQztRQUNqQyxJQUFJLE1BQWMsQ0FBQztRQUNuQixJQUFJLElBQTJCLENBQUM7UUFDaEMsTUFBTSxJQUFJLEdBQWdCLEVBQUUsQ0FBQztRQUM3QixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDakMsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUN0QixJQUFJLEdBQUcsS0FBSyxDQUFDO2FBQ2Q7aUJBQU0sSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxNQUFPLEVBQUU7Z0JBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDbEI7aUJBQU07Z0JBQ0wsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxHQUFHLEtBQUssQ0FBQzthQUNkO1lBQ0QsTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUM7U0FDcEI7UUFDRCxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDdEIsUUFBUSxFQUFFLENBQUM7U0FDWjtRQUVELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDekIsTUFBTSxLQUFLLEdBQWMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDeEQsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDO2dCQUMxQixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUM7Z0JBQy9CLCtEQUErRDtnQkFDL0QsT0FBTzthQUNSO1NBQ0Y7UUFFRCxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUV6QixTQUFTLFFBQVE7WUFDZixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNyQixJQUFLLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFDdEMsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLEVBQUU7b0JBQzNCLEtBQUssTUFBTSxRQUFRLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRTt3QkFDeEMsUUFBUSxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUssQ0FBQyxLQUFLLENBQUM7d0JBQy9DLElBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3FCQUMvQjtpQkFDRjtnQkFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzthQUNqQjtZQUNELElBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNsQixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLEtBQWE7UUFDakIsSUFBSSxZQUFZLEdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDaEQsSUFBSSxHQUEwQixDQUFDO1FBRS9CLDZDQUE2QztRQUM3QyxLQUFLLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDckQsTUFBTSxLQUFLLEdBQWMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFO2dCQUM1QyxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDekIsWUFBWSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JCLE1BQU07YUFDUDtpQkFBTSxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxFQUFFO2dCQUMvQixZQUFZLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQixNQUFNO2FBQ1A7U0FDRjtRQUVELE1BQU0sUUFBUSxHQUFXLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztRQUM3RCxNQUFNLGFBQWEsR0FBZ0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2hGLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRTtZQUNyQixhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzVCO1FBQ0QsTUFBTSxNQUFNLEdBQWMsSUFBSSxTQUFTLENBQ3JDLEtBQUssRUFDTCxJQUFJLENBQUMsR0FBRyxFQUNSLElBQUksQ0FBQyxLQUFLLEVBQ1YsYUFBYSxDQUNkLENBQUM7UUFDRixJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQztRQUNqQixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFFBQVE7UUFDTixNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUM7UUFDOUIsb0NBQW9DO1FBQ3BDLE1BQU0sS0FBSyxHQUEwQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakQsT0FBTyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN2QixNQUFNLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxHQUF3QixLQUFLLENBQUMsR0FBRyxFQUFHLENBQUM7WUFDN0QsTUFBTSxLQUFLLEdBQVcsV0FBVyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7WUFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7WUFDakUsS0FBSyxJQUFJLENBQUMsR0FBVyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDekQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUN0QztTQUNGO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUNGO0FBekpELDhCQXlKQyIsImZpbGUiOiJyYW5nZS10cmVlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUmFuZ2VDb3YgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgUmFuZ2VUcmVlIHtcbiAgc3RhcnQ6IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG4gIGRlbHRhOiBudW1iZXI7XG4gIGNoaWxkcmVuOiBSYW5nZVRyZWVbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBzdGFydDogbnVtYmVyLFxuICAgIGVuZDogbnVtYmVyLFxuICAgIGRlbHRhOiBudW1iZXIsXG4gICAgY2hpbGRyZW46IFJhbmdlVHJlZVtdLFxuICApIHtcbiAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgdGhpcy5lbmQgPSBlbmQ7XG4gICAgdGhpcy5kZWx0YSA9IGRlbHRhO1xuICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJlY29kaXRpb24gYHJhbmdlc2AgYXJlIHdlbGwtZm9ybWVkIGFuZCBwcmUtb3JkZXIgc29ydGVkXG4gICAqL1xuICBzdGF0aWMgZnJvbVNvcnRlZFJhbmdlcyhyYW5nZXM6IFJlYWRvbmx5QXJyYXk8UmFuZ2VDb3Y+KTogUmFuZ2VUcmVlIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgcm9vdDogUmFuZ2VUcmVlIHwgdW5kZWZpbmVkO1xuICAgIC8vIFN0YWNrIG9mIHBhcmVudCB0cmVlcyBhbmQgcGFyZW50IGNvdW50cy5cbiAgICBjb25zdCBzdGFjazogW1JhbmdlVHJlZSwgbnVtYmVyXVtdID0gW107XG4gICAgZm9yIChjb25zdCByYW5nZSBvZiByYW5nZXMpIHtcbiAgICAgIGNvbnN0IG5vZGU6IFJhbmdlVHJlZSA9IG5ldyBSYW5nZVRyZWUocmFuZ2Uuc3RhcnRPZmZzZXQsIHJhbmdlLmVuZE9mZnNldCwgcmFuZ2UuY291bnQsIFtdKTtcbiAgICAgIGlmIChyb290ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcm9vdCA9IG5vZGU7XG4gICAgICAgIHN0YWNrLnB1c2goW25vZGUsIHJhbmdlLmNvdW50XSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbGV0IHBhcmVudDogUmFuZ2VUcmVlO1xuICAgICAgbGV0IHBhcmVudENvdW50OiBudW1iZXI7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBbcGFyZW50LCBwYXJlbnRDb3VudF0gPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgLy8gYXNzZXJ0OiBgdG9wICE9PSB1bmRlZmluZWRgICh0aGUgcmFuZ2VzIGFyZSBzb3J0ZWQpXG4gICAgICAgIGlmIChyYW5nZS5zdGFydE9mZnNldCA8IHBhcmVudC5lbmQpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbm9kZS5kZWx0YSAtPSBwYXJlbnRDb3VudDtcbiAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgc3RhY2sucHVzaChbbm9kZSwgcmFuZ2UuY291bnRdKTtcbiAgICB9XG4gICAgcmV0dXJuIHJvb3Q7XG4gIH1cblxuICBub3JtYWxpemUoKTogdm9pZCB7XG4gICAgY29uc3QgY2hpbGRyZW46IFJhbmdlVHJlZVtdID0gW107XG4gICAgbGV0IGN1ckVuZDogbnVtYmVyO1xuICAgIGxldCBoZWFkOiBSYW5nZVRyZWUgfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgdGFpbDogUmFuZ2VUcmVlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIHRoaXMuY2hpbGRyZW4pIHtcbiAgICAgIGlmIChoZWFkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaGVhZCA9IGNoaWxkO1xuICAgICAgfSBlbHNlIGlmIChjaGlsZC5kZWx0YSA9PT0gaGVhZC5kZWx0YSAmJiBjaGlsZC5zdGFydCA9PT0gY3VyRW5kISkge1xuICAgICAgICB0YWlsLnB1c2goY2hpbGQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW5kQ2hhaW4oKTtcbiAgICAgICAgaGVhZCA9IGNoaWxkO1xuICAgICAgfVxuICAgICAgY3VyRW5kID0gY2hpbGQuZW5kO1xuICAgIH1cbiAgICBpZiAoaGVhZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBlbmRDaGFpbigpO1xuICAgIH1cblxuICAgIGlmIChjaGlsZHJlbi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbnN0IGNoaWxkOiBSYW5nZVRyZWUgPSBjaGlsZHJlblswXTtcbiAgICAgIGlmIChjaGlsZC5zdGFydCA9PT0gdGhpcy5zdGFydCAmJiBjaGlsZC5lbmQgPT09IHRoaXMuZW5kKSB7XG4gICAgICAgIHRoaXMuZGVsdGEgKz0gY2hpbGQuZGVsdGE7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZC5jaGlsZHJlbjtcbiAgICAgICAgLy8gYC5sYXp5Q291bnRgIGlzIHplcm8gZm9yIGJvdGggKGJvdGggYXJlIGFmdGVyIG5vcm1hbGl6YXRpb24pXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW47XG5cbiAgICBmdW5jdGlvbiBlbmRDaGFpbigpOiB2b2lkIHtcbiAgICAgIGlmICh0YWlsLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBoZWFkIS5lbmQgPSB0YWlsW3RhaWwubGVuZ3RoIC0gMV0uZW5kO1xuICAgICAgICBmb3IgKGNvbnN0IHRhaWxUcmVlIG9mIHRhaWwpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHN1YkNoaWxkIG9mIHRhaWxUcmVlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBzdWJDaGlsZC5kZWx0YSArPSB0YWlsVHJlZS5kZWx0YSAtIGhlYWQhLmRlbHRhO1xuICAgICAgICAgICAgaGVhZCEuY2hpbGRyZW4ucHVzaChzdWJDaGlsZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRhaWwubGVuZ3RoID0gMDtcbiAgICAgIH1cbiAgICAgIGhlYWQhLm5vcm1hbGl6ZSgpO1xuICAgICAgY2hpbGRyZW4ucHVzaChoZWFkISk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcmVjb25kaXRpb24gYHRyZWUuc3RhcnQgPCB2YWx1ZSAmJiB2YWx1ZSA8IHRyZWUuZW5kYFxuICAgKiBAcmV0dXJuIFJhbmdlVHJlZSBSaWdodCBwYXJ0XG4gICAqL1xuICBzcGxpdCh2YWx1ZTogbnVtYmVyKTogUmFuZ2VUcmVlIHtcbiAgICBsZXQgbGVmdENoaWxkTGVuOiBudW1iZXIgPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgICBsZXQgbWlkOiBSYW5nZVRyZWUgfCB1bmRlZmluZWQ7XG5cbiAgICAvLyBUT0RPKHBlcmYpOiBCaW5hcnkgc2VhcmNoIChjaGVjayBvdmVyaGVhZClcbiAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgY2hpbGQ6IFJhbmdlVHJlZSA9IHRoaXMuY2hpbGRyZW5baV07XG4gICAgICBpZiAoY2hpbGQuc3RhcnQgPCB2YWx1ZSAmJiB2YWx1ZSA8IGNoaWxkLmVuZCkge1xuICAgICAgICBtaWQgPSBjaGlsZC5zcGxpdCh2YWx1ZSk7XG4gICAgICAgIGxlZnRDaGlsZExlbiA9IGkgKyAxO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSBpZiAoY2hpbGQuc3RhcnQgPj0gdmFsdWUpIHtcbiAgICAgICAgbGVmdENoaWxkTGVuID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmlnaHRMZW46IG51bWJlciA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoIC0gbGVmdENoaWxkTGVuO1xuICAgIGNvbnN0IHJpZ2h0Q2hpbGRyZW46IFJhbmdlVHJlZVtdID0gdGhpcy5jaGlsZHJlbi5zcGxpY2UobGVmdENoaWxkTGVuLCByaWdodExlbik7XG4gICAgaWYgKG1pZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByaWdodENoaWxkcmVuLnVuc2hpZnQobWlkKTtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0OiBSYW5nZVRyZWUgPSBuZXcgUmFuZ2VUcmVlKFxuICAgICAgdmFsdWUsXG4gICAgICB0aGlzLmVuZCxcbiAgICAgIHRoaXMuZGVsdGEsXG4gICAgICByaWdodENoaWxkcmVuLFxuICAgICk7XG4gICAgdGhpcy5lbmQgPSB2YWx1ZTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmFuZ2UgY292ZXJhZ2VzIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHRyZWUuXG4gICAqXG4gICAqIFRoZSByYW5nZXMgYXJlIHByZS1vcmRlciBzb3J0ZWQuXG4gICAqL1xuICB0b1JhbmdlcygpOiBSYW5nZUNvdltdIHtcbiAgICBjb25zdCByYW5nZXM6IFJhbmdlQ292W10gPSBbXTtcbiAgICAvLyBTdGFjayBvZiBwYXJlbnQgdHJlZXMgYW5kIGNvdW50cy5cbiAgICBjb25zdCBzdGFjazogW1JhbmdlVHJlZSwgbnVtYmVyXVtdID0gW1t0aGlzLCAwXV07XG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IFtjdXIsIHBhcmVudENvdW50XTogW1JhbmdlVHJlZSwgbnVtYmVyXSA9IHN0YWNrLnBvcCgpITtcbiAgICAgIGNvbnN0IGNvdW50OiBudW1iZXIgPSBwYXJlbnRDb3VudCArIGN1ci5kZWx0YTtcbiAgICAgIHJhbmdlcy5wdXNoKHtzdGFydE9mZnNldDogY3VyLnN0YXJ0LCBlbmRPZmZzZXQ6IGN1ci5lbmQsIGNvdW50fSk7XG4gICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSBjdXIuY2hpbGRyZW4ubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgc3RhY2sucHVzaChbY3VyLmNoaWxkcmVuW2ldLCBjb3VudF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmFuZ2VzO1xuICB9XG59XG4iXSwic291cmNlUm9vdCI6IiJ9
