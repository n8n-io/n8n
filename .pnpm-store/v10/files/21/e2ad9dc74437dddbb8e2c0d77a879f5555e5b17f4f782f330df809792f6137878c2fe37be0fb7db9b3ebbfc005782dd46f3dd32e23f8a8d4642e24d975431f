/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

/**
 * An object with methods that are called during the traversal of the coverage tree.
 * A visitor has the following methods that are called during tree traversal.
 *
 *   * `onStart(root, state)` - called before traversal begins
 *   * `onSummary(node, state)` - called for every summary node
 *   * `onDetail(node, state)` - called for every detail node
 *   * `onSummaryEnd(node, state)` - called after all children have been visited for
 *      a summary node.
 *   * `onEnd(root, state)` - called after traversal ends
 *
 * @param delegate - a partial visitor that only implements the methods of interest
 *  The visitor object supplies the missing methods as noops. For example, reports
 *  that only need the final coverage summary need implement `onStart` and nothing
 *  else. Reports that use only detailed coverage information need implement `onDetail`
 *  and nothing else.
 * @constructor
 */
class Visitor {
    constructor(delegate) {
        this.delegate = delegate;
    }
}

['Start', 'End', 'Summary', 'SummaryEnd', 'Detail']
    .map(k => `on${k}`)
    .forEach(fn => {
        Object.defineProperty(Visitor.prototype, fn, {
            writable: true,
            value(node, state) {
                if (typeof this.delegate[fn] === 'function') {
                    this.delegate[fn](node, state);
                }
            }
        });
    });

class CompositeVisitor extends Visitor {
    constructor(visitors) {
        super();

        if (!Array.isArray(visitors)) {
            visitors = [visitors];
        }
        this.visitors = visitors.map(v => {
            if (v instanceof Visitor) {
                return v;
            }
            return new Visitor(v);
        });
    }
}

['Start', 'Summary', 'SummaryEnd', 'Detail', 'End']
    .map(k => `on${k}`)
    .forEach(fn => {
        Object.defineProperty(CompositeVisitor.prototype, fn, {
            value(node, state) {
                this.visitors.forEach(v => {
                    v[fn](node, state);
                });
            }
        });
    });

class BaseNode {
    isRoot() {
        return !this.getParent();
    }

    /**
     * visit all nodes depth-first from this node down. Note that `onStart`
     * and `onEnd` are never called on the visitor even if the current
     * node is the root of the tree.
     * @param visitor a full visitor that is called during tree traversal
     * @param state optional state that is passed around
     */
    visit(visitor, state) {
        if (this.isSummary()) {
            visitor.onSummary(this, state);
        } else {
            visitor.onDetail(this, state);
        }

        this.getChildren().forEach(child => {
            child.visit(visitor, state);
        });

        if (this.isSummary()) {
            visitor.onSummaryEnd(this, state);
        }
    }
}

/**
 * abstract base class for a coverage tree.
 * @constructor
 */
class BaseTree {
    constructor(root) {
        this.root = root;
    }

    /**
     * returns the root node of the tree
     */
    getRoot() {
        return this.root;
    }

    /**
     * visits the tree depth-first with the supplied partial visitor
     * @param visitor - a potentially partial visitor
     * @param state - the state to be passed around during tree traversal
     */
    visit(visitor, state) {
        if (!(visitor instanceof Visitor)) {
            visitor = new Visitor(visitor);
        }
        visitor.onStart(this.getRoot(), state);
        this.getRoot().visit(visitor, state);
        visitor.onEnd(this.getRoot(), state);
    }
}

module.exports = {
    BaseTree,
    BaseNode,
    Visitor,
    CompositeVisitor
};
