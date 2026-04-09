import FDBKeyRange from "../FDBKeyRange.js";
import cmp from "./cmp.js";
import { ConstraintError } from "./errors.js";
// what fraction of the total number of nodes are allowed to be deleted tombstones?
const MAX_TOMBSTONE_FACTOR = 2 / 3;
const EVERYTHING_KEY_RANGE = new FDBKeyRange(undefined, undefined, false, false);
/**
 * Simple red-black binary tree with some aspects of a scapegoat tree. The main goal here is simplicity of
 * implementation, tailored to the needs of IndexedDB.
 *
 * Basically this implements a [red-black tree][1] for insertions, but uses the much simpler [scapegoat tree][2]
 * strategy for deletions. Deletions are a simple matter of rebuilding the tree from scratch if more than 2/3 of the
 * tree is full of deleted (tombstone) markers.
 *
 * [1]: https://en.wikipedia.org/wiki/Red%E2%80%93black_tree
 * [2]: https://en.wikipedia.org/wiki/Scapegoat_tree
 */
export default class BinarySearchTree {
  _numTombstones = 0;
  _numNodes = 0;

  /**
   *
   * @param keysAreUnique - whether keys can be unique, and thus whether we cn skip checking `record.value` when
   * comparing. This is basically used to distinguish ObjectStores (where the value is the entire object, not used
   * as a key) from non-unique Indexes (where both the key and the value are meaningful keys used for sorting)
   */
  constructor(keysAreUnique) {
    this._keysAreUnique = !!keysAreUnique;
  }
  size() {
    return this._numNodes - this._numTombstones;
  }
  get(record) {
    return this._getByComparator(this._root, otherRecord => this._compare(record, otherRecord));
  }
  contains(record) {
    return !!this.get(record);
  }
  _compare(a, b) {
    const keyComparison = cmp(a.key, b.key);
    if (keyComparison !== 0) {
      return keyComparison;
    }
    // if keys are unique, then we can (and must) avoid comparing the values, since they may be non-comparable
    // (e.g. in the case of an ObjectStore, they are record objects)
    return this._keysAreUnique ? 0 : cmp(a.value, b.value);
  }
  _getByComparator(node, comparator) {
    let current = node;
    while (current) {
      const comparison = comparator(current.record);
      if (comparison < 0) {
        current = current.left;
      } else if (comparison > 0) {
        current = current.right;
      } else {
        return current.record;
      }
    }
  }

  /**
   * Put a new record, and return the overwritten record if an overwrite occurred.
   * @param record
   * @param noOverwrite - throw a ConstraintError in case of overwrite
   */
  put(record, noOverwrite = false) {
    if (!this._root) {
      this._root = {
        record,
        left: undefined,
        right: undefined,
        parent: undefined,
        deleted: false,
        // the root is always black in a red-black tree
        red: false
      };
      this._numNodes++;
      return;
    }
    return this._put(this._root, record, noOverwrite);
  }
  _put(node, record, noOverwrite) {
    const comparison = this._compare(record, node.record);
    if (comparison < 0) {
      if (node.left) {
        return this._put(node.left, record, noOverwrite);
      } else {
        node.left = {
          record,
          left: undefined,
          right: undefined,
          parent: node,
          deleted: false,
          red: true
        };
        this._onNewNodeInserted(node.left);
      }
    } else if (comparison > 0) {
      if (node.right) {
        return this._put(node.right, record, noOverwrite);
      } else {
        node.right = {
          record,
          left: undefined,
          right: undefined,
          parent: node,
          deleted: false,
          red: true
        };
        this._onNewNodeInserted(node.right);
      }
    } else if (node.deleted) {
      // undelete
      node.deleted = false;
      node.record = record;
      this._numTombstones--;
    } else if (noOverwrite) {
      // replace not allowed in case of noOverwrite
      throw new ConstraintError();
    } else {
      // replace, don't add, so no need to increment. return the overwritten record
      const overwrittenRecord = node.record;
      node.record = record;
      return overwrittenRecord;
    }
  }
  delete(record) {
    if (!this._root) {
      return;
    }
    this._delete(this._root, record);
    if (this._numTombstones > this._numNodes * MAX_TOMBSTONE_FACTOR) {
      // to keep the implementation simple, and because most users of fake-indexeddb are not going to be deleting
      // a lot of nodes, just rebuild the whole tree (defragment) if the tree is too full of tombstones,
      // as inspired by the scapegoat tree: https://en.wikipedia.org/wiki/Scapegoat_tree#Deletion
      const records = [...this.getAllRecords()];
      this._root = this._rebuild(records, undefined, false);
      this._numNodes = records.length;
      this._numTombstones = 0;
    }
  }
  _delete(node, record) {
    if (!node) {
      return;
    }
    const comparison = this._compare(record, node.record);
    if (comparison < 0) {
      this._delete(node.left, record);
    } else if (comparison > 0) {
      this._delete(node.right, record);
    } else if (!node.deleted) {
      this._numTombstones++;
      node.deleted = true;
    }
  }
  *getAllRecords(descending = false) {
    yield* this.getRecords(EVERYTHING_KEY_RANGE, descending);
  }
  *getRecords(keyRange, descending = false) {
    yield* this._getRecordsForNode(this._root, keyRange, descending);
  }
  *_getRecordsForNode(node, keyRange, descending = false) {
    if (!node) {
      return;
    }
    yield* this._findRecords(node, keyRange, descending);
  }
  *_findRecords(node, keyRange, descending = false) {
    const {
      lower,
      upper,
      lowerOpen,
      upperOpen
    } = keyRange;
    const {
      record: {
        key
      }
    } = node;
    const lowerComparison = lower === undefined ? -1 : cmp(lower, key);
    const upperComparison = upper === undefined ? 1 : cmp(upper, key);

    // if keys are non-unique then we need to go left/right even for equality
    // else we can just do LT/GT rather than LTE/GTE as a slight optimization
    const moreLeft = this._keysAreUnique ? lowerComparison < 0 : lowerComparison <= 0;
    const moreRight = this._keysAreUnique ? upperComparison > 0 : upperComparison >= 0;

    // in descending mode we start with rightmost nodes, else leftmost
    const moreStart = descending ? moreRight : moreLeft;
    const moreEnd = descending ? moreLeft : moreRight;
    const start = descending ? "right" : "left";
    const end = descending ? "left" : "right";

    // does the current record actually match the key range?
    const lowerMatches = lowerOpen ? lowerComparison < 0 : lowerComparison <= 0;
    const upperMatches = upperOpen ? upperComparison > 0 : upperComparison >= 0;
    if (moreStart && node[start]) {
      yield* this._findRecords(node[start], keyRange, descending);
    }
    if (lowerMatches && upperMatches && !node.deleted) {
      yield node.record;
    }
    if (moreEnd && node[end]) {
      yield* this._findRecords(node[end], keyRange, descending);
    }
  }
  _onNewNodeInserted(newNode) {
    this._numNodes++;
    this._rebalanceTree(newNode);
  }

  // based on https://en.wikipedia.org/wiki/Red%E2%80%93black_tree#Insertion
  _rebalanceTree(node) {
    let parent = node.parent;
    do {
      // case 1 -  no red/black violation
      if (!parent.red) {
        return;
      }
      const grandparent = parent.parent;
      if (!grandparent) {
        // case #4 - parent is the red root, node is also red, so parent goes black
        parent.red = false;
        return;
      }
      const parentIsRightChild = parent === grandparent.right;
      const uncle = parentIsRightChild ? grandparent.left : grandparent.right;
      if (!uncle || !uncle.red) {
        if (node === (parentIsRightChild ? parent.left : parent.right)) {
          // case #5 - parent is red but uncle is black
          this._rotateSubtree(parent, parentIsRightChild);
          node = parent;
          parent = parentIsRightChild ? grandparent.right : grandparent.left;
        }

        // case #6 - node is "outer" grandchild of grandparent
        this._rotateSubtree(grandparent, !parentIsRightChild);
        parent.red = false;
        grandparent.red = true;
        return;
      }

      // case #2 - parent and uncle are both red, so both of them go black and grandparent goes red
      parent.red = false;
      uncle.red = false;
      grandparent.red = true;
      node = grandparent;
    } while (node.parent ? parent = node.parent : false);

    // case #3 - current node is the root, all constraints satisfied
  }

  // based on https://en.wikipedia.org/wiki/Red%E2%80%93black_tree#Implementation
  _rotateSubtree(node, right) {
    const parent = node.parent;
    const newRoot = right ? node.left : node.right; // opposite direction
    const newChild = right ? newRoot.right : newRoot.left;
    node[right ? "left" : "right"] = newChild;
    if (newChild) {
      newChild.parent = node;
    }
    newRoot[right ? "right" : "left"] = node;
    newRoot.parent = parent;
    node.parent = newRoot;
    if (parent) {
      parent[node === parent.right ? "right" : "left"] = newRoot;
    } else {
      this._root = newRoot;
    }
    return newRoot;
  }

  // rebuild the whole tree from scratch, used to avoid too many deletion tombstones accumulating
  _rebuild(records, parent, red) {
    const {
      length
    } = records;
    if (!length) {
      return undefined;
    }
    const mid = length >>> 1; // like Math.floor(records.length / 2) but fast

    const node = {
      record: records[mid],
      left: undefined,
      right: undefined,
      parent,
      deleted: false,
      red
    };
    const left = this._rebuild(records.slice(0, mid), node, !red);
    const right = this._rebuild(records.slice(mid + 1), node, !red);
    node.left = left;
    node.right = right;
    return node;
  }
}