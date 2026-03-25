import { NodeProp } from '@lezer/common';
import { LRParser, LocalTokenGroup } from '@lezer/lr';

class Node {
    constructor(start) {
        this.start = start;
    }
}
class GrammarDeclaration extends Node {
    constructor(start, rules, topRules, tokens, localTokens, context, externalTokens, externalSpecializers, externalPropSources, precedences, mainSkip, scopedSkip, dialects, externalProps, autoDelim) {
        super(start);
        this.rules = rules;
        this.topRules = topRules;
        this.tokens = tokens;
        this.localTokens = localTokens;
        this.context = context;
        this.externalTokens = externalTokens;
        this.externalSpecializers = externalSpecializers;
        this.externalPropSources = externalPropSources;
        this.precedences = precedences;
        this.mainSkip = mainSkip;
        this.scopedSkip = scopedSkip;
        this.dialects = dialects;
        this.externalProps = externalProps;
        this.autoDelim = autoDelim;
    }
    toString() { return Object.values(this.rules).join("\n"); }
}
class RuleDeclaration extends Node {
    constructor(start, id, props, params, expr) {
        super(start);
        this.id = id;
        this.props = props;
        this.params = params;
        this.expr = expr;
    }
    toString() {
        return this.id.name + (this.params.length ? `<${this.params.join()}>` : "") + " -> " + this.expr;
    }
}
class PrecDeclaration extends Node {
    constructor(start, items) {
        super(start);
        this.items = items;
    }
}
class TokenPrecDeclaration extends Node {
    constructor(start, items) {
        super(start);
        this.items = items;
    }
}
class TokenConflictDeclaration extends Node {
    constructor(start, a, b) {
        super(start);
        this.a = a;
        this.b = b;
    }
}
class TokenDeclaration extends Node {
    constructor(start, precedences, conflicts, rules, literals) {
        super(start);
        this.precedences = precedences;
        this.conflicts = conflicts;
        this.rules = rules;
        this.literals = literals;
    }
}
class LocalTokenDeclaration extends Node {
    constructor(start, precedences, rules, fallback) {
        super(start);
        this.precedences = precedences;
        this.rules = rules;
        this.fallback = fallback;
    }
}
class LiteralDeclaration extends Node {
    constructor(start, literal, props) {
        super(start);
        this.literal = literal;
        this.props = props;
    }
}
class ContextDeclaration extends Node {
    constructor(start, id, source) {
        super(start);
        this.id = id;
        this.source = source;
    }
}
class ExternalTokenDeclaration extends Node {
    constructor(start, id, source, tokens, conflicts) {
        super(start);
        this.id = id;
        this.source = source;
        this.tokens = tokens;
        this.conflicts = conflicts;
    }
}
class ExternalSpecializeDeclaration extends Node {
    constructor(start, type, token, id, source, tokens) {
        super(start);
        this.type = type;
        this.token = token;
        this.id = id;
        this.source = source;
        this.tokens = tokens;
    }
}
class ExternalPropSourceDeclaration extends Node {
    constructor(start, id, source) {
        super(start);
        this.id = id;
        this.source = source;
    }
}
class ExternalPropDeclaration extends Node {
    constructor(start, id, externalID, source) {
        super(start);
        this.id = id;
        this.externalID = externalID;
        this.source = source;
    }
}
class Identifier extends Node {
    constructor(start, name) {
        super(start);
        this.name = name;
    }
    toString() { return this.name; }
}
class Expression extends Node {
    walk(f) { return f(this); }
    eq(_other) { return false; }
}
Expression.prototype.prec = 10;
class NameExpression extends Expression {
    constructor(start, id, args) {
        super(start);
        this.id = id;
        this.args = args;
    }
    toString() { return this.id.name + (this.args.length ? `<${this.args.join()}>` : ""); }
    eq(other) {
        return this.id.name == other.id.name && exprsEq(this.args, other.args);
    }
    walk(f) {
        let args = walkExprs(this.args, f);
        return f(args == this.args ? this : new NameExpression(this.start, this.id, args));
    }
}
class SpecializeExpression extends Expression {
    constructor(start, type, props, token, content) {
        super(start);
        this.type = type;
        this.props = props;
        this.token = token;
        this.content = content;
    }
    toString() { return `@${this.type}[${this.props.join(",")}]<${this.token}, ${this.content}>`; }
    eq(other) {
        return this.type == other.type && Prop.eqProps(this.props, other.props) && exprEq(this.token, other.token) &&
            exprEq(this.content, other.content);
    }
    walk(f) {
        let token = this.token.walk(f), content = this.content.walk(f);
        return f(token == this.token && content == this.content ? this : new SpecializeExpression(this.start, this.type, this.props, token, content));
    }
}
class InlineRuleExpression extends Expression {
    constructor(start, rule) {
        super(start);
        this.rule = rule;
    }
    toString() {
        let rule = this.rule;
        return `${rule.id}${rule.props.length ? `[${rule.props.join(",")}]` : ""} { ${rule.expr} }`;
    }
    eq(other) {
        let rule = this.rule, oRule = other.rule;
        return exprEq(rule.expr, oRule.expr) && rule.id.name == oRule.id.name && Prop.eqProps(rule.props, oRule.props);
    }
    walk(f) {
        let rule = this.rule, expr = rule.expr.walk(f);
        return f(expr == rule.expr ? this :
            new InlineRuleExpression(this.start, new RuleDeclaration(rule.start, rule.id, rule.props, [], expr)));
    }
}
class ChoiceExpression extends Expression {
    constructor(start, exprs) {
        super(start);
        this.exprs = exprs;
    }
    toString() { return this.exprs.map(e => maybeParens(e, this)).join(" | "); }
    eq(other) {
        return exprsEq(this.exprs, other.exprs);
    }
    walk(f) {
        let exprs = walkExprs(this.exprs, f);
        return f(exprs == this.exprs ? this : new ChoiceExpression(this.start, exprs));
    }
}
ChoiceExpression.prototype.prec = 1;
class SequenceExpression extends Expression {
    constructor(start, exprs, markers, empty = false) {
        super(start);
        this.exprs = exprs;
        this.markers = markers;
        this.empty = empty;
    }
    toString() { return this.empty ? "()" : this.exprs.map(e => maybeParens(e, this)).join(" "); }
    eq(other) {
        return exprsEq(this.exprs, other.exprs) && this.markers.every((m, i) => {
            let om = other.markers[i];
            return m.length == om.length && m.every((x, i) => x.eq(om[i]));
        });
    }
    walk(f) {
        let exprs = walkExprs(this.exprs, f);
        return f(exprs == this.exprs ? this : new SequenceExpression(this.start, exprs, this.markers, this.empty && !exprs.length));
    }
}
SequenceExpression.prototype.prec = 2;
class ConflictMarker extends Node {
    constructor(start, id, type) {
        super(start);
        this.id = id;
        this.type = type;
    }
    toString() { return (this.type == "ambig" ? "~" : "!") + this.id.name; }
    eq(other) { return this.id.name == other.id.name && this.type == other.type; }
}
class RepeatExpression extends Expression {
    constructor(start, expr, kind) {
        super(start);
        this.expr = expr;
        this.kind = kind;
    }
    toString() { return maybeParens(this.expr, this) + this.kind; }
    eq(other) {
        return exprEq(this.expr, other.expr) && this.kind == other.kind;
    }
    walk(f) {
        let expr = this.expr.walk(f);
        return f(expr == this.expr ? this : new RepeatExpression(this.start, expr, this.kind));
    }
}
RepeatExpression.prototype.prec = 3;
class LiteralExpression extends Expression {
    // value.length is always > 0
    constructor(start, value) {
        super(start);
        this.value = value;
    }
    toString() { return JSON.stringify(this.value); }
    eq(other) { return this.value == other.value; }
}
class SetExpression extends Expression {
    constructor(start, ranges, inverted) {
        super(start);
        this.ranges = ranges;
        this.inverted = inverted;
    }
    toString() {
        return `[${this.inverted ? "^" : ""}${this.ranges.map(([a, b]) => {
            return String.fromCodePoint(a) + (b == a + 1 ? "" : "-" + String.fromCodePoint(b));
        })}]`;
    }
    eq(other) {
        return this.inverted == other.inverted && this.ranges.length == other.ranges.length &&
            this.ranges.every(([a, b], i) => { let [x, y] = other.ranges[i]; return a == x && b == y; });
    }
}
class AnyExpression extends Expression {
    constructor(start) {
        super(start);
    }
    toString() { return "_"; }
    eq() { return true; }
}
function walkExprs(exprs, f) {
    let result = null;
    for (let i = 0; i < exprs.length; i++) {
        let expr = exprs[i].walk(f);
        if (expr != exprs[i] && !result)
            result = exprs.slice(0, i);
        if (result)
            result.push(expr);
    }
    return result || exprs;
}
const CharClasses = {
    asciiLetter: [[65, 91], [97, 123]],
    asciiLowercase: [[97, 123]],
    asciiUppercase: [[65, 91]],
    digit: [[48, 58]],
    whitespace: [[9, 14], [32, 33], [133, 134], [160, 161], [5760, 5761], [8192, 8203],
        [8232, 8234], [8239, 8240], [8287, 8288], [12288, 12289]],
    eof: [[0xffff, 0xffff]]
};
class CharClass extends Expression {
    constructor(start, type) {
        super(start);
        this.type = type;
    }
    toString() { return "@" + this.type; }
    eq(expr) { return this.type == expr.type; }
}
function exprEq(a, b) {
    return a.constructor == b.constructor && a.eq(b);
}
function exprsEq(a, b) {
    return a.length == b.length && a.every((e, i) => exprEq(e, b[i]));
}
class Prop extends Node {
    constructor(start, at, name, value) {
        super(start);
        this.at = at;
        this.name = name;
        this.value = value;
    }
    eq(other) {
        return this.name == other.name && this.value.length == other.value.length &&
            this.value.every((v, i) => v.value == other.value[i].value && v.name == other.value[i].name);
    }
    toString() {
        let result = (this.at ? "@" : "") + this.name;
        if (this.value.length) {
            result += "=";
            for (let { name, value } of this.value)
                result += name ? `{${name}}` : /[^\w-]/.test(value) ? JSON.stringify(value) : value;
        }
        return result;
    }
    static eqProps(a, b) {
        return a.length == b.length && a.every((p, i) => p.eq(b[i]));
    }
}
class PropPart extends Node {
    constructor(start, value, name) {
        super(start);
        this.value = value;
        this.name = name;
    }
}
function maybeParens(node, parent) {
    return node.prec < parent.prec ? "(" + node.toString() + ")" : node.toString();
}

/**
The type of error raised when the parser generator finds an issue.
*/
class GenError extends Error {
}

function hasProps(props) {
    for (let _p in props)
        return true;
    return false;
}
let termHash = 0;
class Term {
    constructor(name, flags, nodeName, props = {}) {
        this.name = name;
        this.flags = flags;
        this.nodeName = nodeName;
        this.props = props;
        this.hash = ++termHash; // Used for sorting and hashing during parser generation
        this.id = -1; // Assigned in a later stage, used in actual output
        // Filled in only after the rules are simplified, used in automaton.ts
        this.rules = [];
    }
    toString() { return this.name; }
    get nodeType() { return this.top || this.nodeName != null || hasProps(this.props) || this.repeated; }
    get terminal() { return (this.flags & 1 /* TermFlag.Terminal */) > 0; }
    get eof() { return (this.flags & 4 /* TermFlag.Eof */) > 0; }
    get error() { return "error" in this.props; }
    get top() { return (this.flags & 2 /* TermFlag.Top */) > 0; }
    get interesting() { return this.flags > 0 || this.nodeName != null; }
    get repeated() { return (this.flags & 16 /* TermFlag.Repeated */) > 0; }
    set preserve(value) { this.flags = value ? this.flags | 8 /* TermFlag.Preserve */ : this.flags & ~8 /* TermFlag.Preserve */; }
    get preserve() { return (this.flags & 8 /* TermFlag.Preserve */) > 0; }
    set inline(value) { this.flags = value ? this.flags | 32 /* TermFlag.Inline */ : this.flags & ~32 /* TermFlag.Inline */; }
    get inline() { return (this.flags & 32 /* TermFlag.Inline */) > 0; }
    cmp(other) { return this.hash - other.hash; }
}
class TermSet {
    constructor() {
        this.terms = [];
        // Map from term names to Term instances
        this.names = Object.create(null);
        this.tops = [];
        this.eof = this.term("␄", null, 1 /* TermFlag.Terminal */ | 4 /* TermFlag.Eof */);
        this.error = this.term("⚠", "⚠", 8 /* TermFlag.Preserve */);
    }
    term(name, nodeName, flags = 0, props = {}) {
        let term = new Term(name, flags, nodeName, props);
        this.terms.push(term);
        this.names[name] = term;
        return term;
    }
    makeTop(nodeName, props) {
        const term = this.term("@top", nodeName, 2 /* TermFlag.Top */, props);
        this.tops.push(term);
        return term;
    }
    makeTerminal(name, nodeName, props = {}) {
        return this.term(name, nodeName, 1 /* TermFlag.Terminal */, props);
    }
    makeNonTerminal(name, nodeName, props = {}) {
        return this.term(name, nodeName, 0, props);
    }
    makeRepeat(name) {
        return this.term(name, null, 16 /* TermFlag.Repeated */);
    }
    uniqueName(name) {
        for (let i = 0;; i++) {
            let cur = i ? `${name}-${i}` : name;
            if (!this.names[cur])
                return cur;
        }
    }
    finish(rules) {
        for (let rule of rules)
            rule.name.rules.push(rule);
        this.terms = this.terms.filter(t => t.terminal || t.preserve || rules.some(r => r.name == t || r.parts.includes(t)));
        let names = {};
        let nodeTypes = [this.error];
        this.error.id = 0 /* T.Err */;
        let nextID = 0 /* T.Err */ + 1;
        // Assign ids to terms that represent node types
        for (let term of this.terms)
            if (term.id < 0 && term.nodeType && !term.repeated) {
                term.id = nextID++;
                nodeTypes.push(term);
            }
        // Put all repeated terms after the regular node types
        let minRepeatTerm = nextID;
        for (let term of this.terms)
            if (term.repeated) {
                term.id = nextID++;
                nodeTypes.push(term);
            }
        // Then comes the EOF term
        this.eof.id = nextID++;
        // And then the remaining (non-node, non-repeat) terms.
        for (let term of this.terms) {
            if (term.id < 0)
                term.id = nextID++;
            if (term.name)
                names[term.id] = term.name;
        }
        if (nextID >= 0xfffe)
            throw new GenError("Too many terms");
        return { nodeTypes, names, minRepeatTerm, maxTerm: nextID - 1 };
    }
}
function cmpSet(a, b, cmp) {
    if (a.length != b.length)
        return a.length - b.length;
    for (let i = 0; i < a.length; i++) {
        let diff = cmp(a[i], b[i]);
        if (diff)
            return diff;
    }
    return 0;
}
const none$3 = [];
class Conflicts {
    constructor(precedence, ambigGroups = none$3, cut = 0) {
        this.precedence = precedence;
        this.ambigGroups = ambigGroups;
        this.cut = cut;
    }
    join(other) {
        if (this == Conflicts.none || this == other)
            return other;
        if (other == Conflicts.none)
            return this;
        return new Conflicts(Math.max(this.precedence, other.precedence), union(this.ambigGroups, other.ambigGroups), Math.max(this.cut, other.cut));
    }
    cmp(other) {
        return this.precedence - other.precedence || cmpSet(this.ambigGroups, other.ambigGroups, (a, b) => a < b ? -1 : a > b ? 1 : 0) ||
            this.cut - other.cut;
    }
}
Conflicts.none = new Conflicts(0);
function union(a, b) {
    if (a.length == 0 || a == b)
        return b;
    if (b.length == 0)
        return a;
    let result = a.slice();
    for (let value of b)
        if (!a.includes(value))
            result.push(value);
    return result.sort();
}
let ruleID = 0;
class Rule {
    constructor(name, parts, conflicts, skip) {
        this.name = name;
        this.parts = parts;
        this.conflicts = conflicts;
        this.skip = skip;
        this.id = ruleID++;
    }
    cmp(rule) {
        return this.id - rule.id;
    }
    cmpNoName(rule) {
        return this.parts.length - rule.parts.length ||
            this.skip.hash - rule.skip.hash ||
            this.parts.reduce((r, s, i) => r || s.cmp(rule.parts[i]), 0) ||
            cmpSet(this.conflicts, rule.conflicts, (a, b) => a.cmp(b));
    }
    toString() {
        return this.name + " -> " + this.parts.join(" ");
    }
    get isRepeatWrap() {
        return this.name.repeated && this.parts.length == 2 && this.parts[0] == this.name;
    }
    sameReduce(other) {
        return this.name == other.name && this.parts.length == other.parts.length && this.isRepeatWrap == other.isRepeatWrap;
    }
}

const MAX_CHAR = 0xffff;
class Edge {
    constructor(from, to, target) {
        this.from = from;
        this.to = to;
        this.target = target;
    }
    toString() {
        return `-> ${this.target.id}[label=${JSON.stringify(this.from < 0 ? "ε" : charFor(this.from) +
            (this.to > this.from + 1 ? "-" + charFor(this.to - 1) : ""))}]`;
    }
}
function charFor(n) {
    return n > MAX_CHAR ? "∞"
        : n == 10 ? "\\n"
            : n == 13 ? "\\r"
                : n < 32 || n >= 0xd800 && n < 0xdfff ? "\\u{" + n.toString(16) + "}"
                    : String.fromCharCode(n);
}
function minimize(states, start) {
    let partition = Object.create(null);
    let byAccepting = Object.create(null);
    for (let state of states) {
        let id = ids(state.accepting);
        let group = byAccepting[id] || (byAccepting[id] = []);
        group.push(state);
        partition[state.id] = group;
    }
    for (;;) {
        let split = false, newPartition = Object.create(null);
        for (let state of states) {
            if (newPartition[state.id])
                continue;
            let group = partition[state.id];
            if (group.length == 1) {
                newPartition[group[0].id] = group;
                continue;
            }
            let parts = [];
            groups: for (let state of group) {
                for (let p of parts) {
                    if (isEquivalent(state, p[0], partition)) {
                        p.push(state);
                        continue groups;
                    }
                }
                parts.push([state]);
            }
            if (parts.length > 1)
                split = true;
            for (let p of parts)
                for (let s of p)
                    newPartition[s.id] = p;
        }
        if (!split)
            return applyMinimization(states, start, partition);
        partition = newPartition;
    }
}
function isEquivalent(a, b, partition) {
    if (a.edges.length != b.edges.length)
        return false;
    for (let i = 0; i < a.edges.length; i++) {
        let eA = a.edges[i], eB = b.edges[i];
        if (eA.from != eB.from || eA.to != eB.to || partition[eA.target.id] != partition[eB.target.id])
            return false;
    }
    return true;
}
function applyMinimization(states, start, partition) {
    for (let state of states) {
        for (let i = 0; i < state.edges.length; i++) {
            let edge = state.edges[i], target = partition[edge.target.id][0];
            if (target != edge.target)
                state.edges[i] = new Edge(edge.from, edge.to, target);
        }
    }
    return partition[start.id][0];
}
let stateID = 1;
let State$1 = class State {
    constructor(accepting = [], id = stateID++) {
        this.accepting = accepting;
        this.id = id;
        this.edges = [];
    }
    edge(from, to, target) {
        this.edges.push(new Edge(from, to, target));
    }
    nullEdge(target) { this.edge(-1, -1, target); }
    compile() {
        let labeled = Object.create(null), localID = 0;
        let startState = explore(this.closure().sort((a, b) => a.id - b.id));
        return minimize(Object.values(labeled), startState);
        function explore(states) {
            let newState = labeled[ids(states)] =
                new State(states.reduce((a, s) => union(a, s.accepting), []), localID++);
            let out = [];
            for (let state of states)
                for (let edge of state.edges) {
                    if (edge.from >= 0)
                        out.push(edge);
                }
            let transitions = mergeEdges(out);
            for (let merged of transitions) {
                let targets = merged.targets.sort((a, b) => a.id - b.id);
                newState.edge(merged.from, merged.to, labeled[ids(targets)] || explore(targets));
            }
            return newState;
        }
    }
    closure() {
        let result = [], seen = Object.create(null);
        function explore(state) {
            if (seen[state.id])
                return;
            seen[state.id] = true;
            // States with only epsilon edges and no accepting term that
            // isn't also in the next states are left out to help reduce the
            // number of unique state combinations
            if (state.edges.some(e => e.from >= 0) ||
                (state.accepting.length > 0 && !state.edges.some(e => sameSet$1(state.accepting, e.target.accepting))))
                result.push(state);
            for (let edge of state.edges)
                if (edge.from < 0)
                    explore(edge.target);
        }
        explore(this);
        return result;
    }
    findConflicts(occurTogether) {
        let conflicts = [], cycleTerms = this.cycleTerms();
        function add(a, b, soft, aEdges, bEdges) {
            if (a.id < b.id) {
                [a, b] = [b, a];
                soft = -soft;
            }
            let found = conflicts.find(c => c.a == a && c.b == b);
            if (!found)
                conflicts.push(new Conflict$1(a, b, soft, exampleFromEdges(aEdges), bEdges && exampleFromEdges(bEdges)));
            else if (found.soft != soft)
                found.soft = 0;
        }
        this.reachable((state, edges) => {
            if (state.accepting.length == 0)
                return;
            for (let i = 0; i < state.accepting.length; i++)
                for (let j = i + 1; j < state.accepting.length; j++)
                    add(state.accepting[i], state.accepting[j], 0, edges);
            state.reachable((s, es) => {
                if (s != state)
                    for (let term of s.accepting) {
                        let hasCycle = cycleTerms.includes(term);
                        for (let orig of state.accepting)
                            if (term != orig)
                                add(term, orig, hasCycle || cycleTerms.includes(orig) || !occurTogether(term, orig) ? 0 : 1, edges, edges.concat(es));
                    }
            });
        });
        return conflicts;
    }
    cycleTerms() {
        let work = [];
        this.reachable(state => {
            for (let { target } of state.edges)
                work.push(state, target);
        });
        let table = new Map;
        let haveCycle = [];
        for (let i = 0; i < work.length;) {
            let from = work[i++], to = work[i++];
            let entry = table.get(from);
            if (!entry)
                table.set(from, entry = []);
            if (entry.includes(to))
                continue;
            if (from == to) {
                if (!haveCycle.includes(from))
                    haveCycle.push(from);
            }
            else {
                for (let next of entry)
                    work.push(from, next);
                entry.push(to);
            }
        }
        let result = [];
        for (let state of haveCycle) {
            for (let term of state.accepting) {
                if (!result.includes(term))
                    result.push(term);
            }
        }
        return result;
    }
    reachable(f) {
        let seen = [], edges = [];
        (function explore(s) {
            f(s, edges);
            seen.push(s);
            for (let edge of s.edges)
                if (!seen.includes(edge.target)) {
                    edges.push(edge);
                    explore(edge.target);
                    edges.pop();
                }
        })(this);
    }
    toString() {
        let out = "digraph {\n";
        this.reachable(state => {
            if (state.accepting.length)
                out += `  ${state.id} [label=${JSON.stringify(state.accepting.join())}];\n`;
            for (let edge of state.edges)
                out += `  ${state.id} ${edge};\n`;
        });
        return out + "}";
    }
    // Tokenizer data is represented as a single flat array. This
    // contains regions for each tokenizer state. Region offsets are
    // used to identify states.
    //
    // Each state is laid out as:
    //  - Token group mask
    //  - Offset of the end of the accepting data
    //  - Number of outgoing edges in the state
    //  - Pairs of token masks and term ids that indicate the accepting
    //    states, sorted by precedence
    //  - Triples for the edges: each with a low and high bound and the
    //    offset of the next state.
    toArray(groupMasks, precedence) {
        let offsets = []; // Used to 'link' the states after building the arrays
        let data = [];
        this.reachable(state => {
            let start = data.length;
            let acceptEnd = start + 3 + state.accepting.length * 2;
            offsets[state.id] = start;
            data.push(state.stateMask(groupMasks), acceptEnd, state.edges.length);
            state.accepting.sort((a, b) => precedence.indexOf(a.id) - precedence.indexOf(b.id));
            for (let term of state.accepting)
                data.push(term.id, groupMasks[term.id] || 0xffff);
            for (let edge of state.edges)
                data.push(edge.from, edge.to, -edge.target.id - 1);
        });
        // Replace negative numbers with resolved state offsets
        for (let i = 0; i < data.length; i++)
            if (data[i] < 0)
                data[i] = offsets[-data[i] - 1];
        if (data.length > Math.pow(2, 16))
            throw new GenError("Tokenizer tables too big to represent with 16-bit offsets.");
        return Uint16Array.from(data);
    }
    stateMask(groupMasks) {
        let mask = 0;
        this.reachable(state => {
            for (let term of state.accepting)
                mask |= (groupMasks[term.id] || 0xffff);
        });
        return mask;
    }
};
let Conflict$1 = class Conflict {
    constructor(a, b, 
    // Conflicts between two non-cyclic tokens are marked as
    // 'soft', with a negative number if a is shorter than
    // b, and a positive if b is shorter than a.
    soft, exampleA, exampleB) {
        this.a = a;
        this.b = b;
        this.soft = soft;
        this.exampleA = exampleA;
        this.exampleB = exampleB;
    }
};
function exampleFromEdges(edges) {
    let str = "";
    for (let i = 0; i < edges.length; i++)
        str += String.fromCharCode(edges[i].from);
    return str;
}
function ids(elts) {
    let result = "";
    for (let elt of elts) {
        if (result.length)
            result += "-";
        result += elt.id;
    }
    return result;
}
function sameSet$1(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (a[i] != b[i])
            return false;
    return true;
}
class MergedEdge {
    constructor(from, to, targets) {
        this.from = from;
        this.to = to;
        this.targets = targets;
    }
}
// Merge multiple edges (tagged by character ranges) into a set of
// mutually exclusive ranges pointing at all target states for that
// range
function mergeEdges(edges) {
    let separate = [], result = [];
    for (let edge of edges) {
        if (!separate.includes(edge.from))
            separate.push(edge.from);
        if (!separate.includes(edge.to))
            separate.push(edge.to);
    }
    separate.sort((a, b) => a - b);
    for (let i = 1; i < separate.length; i++) {
        let from = separate[i - 1], to = separate[i];
        let found = [];
        for (let edge of edges)
            if (edge.to > from && edge.from < to) {
                for (let target of edge.target.closure())
                    if (!found.includes(target))
                        found.push(target);
            }
        if (found.length)
            result.push(new MergedEdge(from, to, found));
    }
    let eof = edges.filter(e => e.from == 65535 /* Seq.End */ && e.to == 65535 /* Seq.End */);
    if (eof.length) {
        let found = [];
        for (let edge of eof)
            for (let target of edge.target.closure())
                if (!found.includes(target))
                    found.push(target);
        if (found.length)
            result.push(new MergedEdge(65535 /* Seq.End */, 65535 /* Seq.End */, found));
    }
    return result;
}

// Note that this is the parser for grammar files, not the generated parser
let word = /[\w_-]+/gy;
// Some engines (specifically SpiderMonkey) have still not implemented \p
try {
    word = /[\p{Alphabetic}\d_-]+/ugy;
}
catch (_) { }
const none$2 = [];
class Input {
    constructor(string, fileName = null) {
        this.string = string;
        this.fileName = fileName;
        this.type = "sof";
        this.value = null;
        this.start = 0;
        this.end = 0;
        this.next();
    }
    lineInfo(pos) {
        for (let line = 1, cur = 0;;) {
            let next = this.string.indexOf("\n", cur);
            if (next > -1 && next < pos) {
                ++line;
                cur = next + 1;
            }
            else {
                return { line, ch: pos - cur };
            }
        }
    }
    message(msg, pos = -1) {
        let posInfo = this.fileName || "";
        if (pos > -1) {
            let info = this.lineInfo(pos);
            posInfo += (posInfo ? " " : "") + info.line + ":" + info.ch;
        }
        return posInfo ? msg + ` (${posInfo})` : msg;
    }
    raise(msg, pos = -1) {
        throw new GenError(this.message(msg, pos));
    }
    match(pos, re) {
        let match = re.exec(this.string.slice(pos));
        return match ? pos + match[0].length : -1;
    }
    next() {
        let start = this.match(this.end, /^(\s|\/\/.*|\/\*[^]*?\*\/)*/);
        if (start == this.string.length)
            return this.set("eof", null, start, start);
        let next = this.string[start];
        if (next == '"') {
            let end = this.match(start + 1, /^(\\.|[^"\\])*"/);
            if (end == -1)
                this.raise("Unterminated string literal", start);
            return this.set("string", readString(this.string.slice(start + 1, end - 1)), start, end);
        }
        else if (next == "'") {
            let end = this.match(start + 1, /^(\\.|[^'\\])*'/);
            if (end == -1)
                this.raise("Unterminated string literal", start);
            return this.set("string", readString(this.string.slice(start + 1, end - 1)), start, end);
        }
        else if (next == "@") {
            word.lastIndex = start + 1;
            let m = word.exec(this.string);
            if (!m)
                return this.raise("@ without a name", start);
            return this.set("at", m[0], start, start + 1 + m[0].length);
        }
        else if ((next == "$" || next == "!") && this.string[start + 1] == "[") {
            let end = this.match(start + 2, /^(?:\\.|[^\]\\])*\]/);
            if (end == -1)
                this.raise("Unterminated character set", start);
            return this.set("set", this.string.slice(start + 2, end - 1), start, end);
        }
        else if (/[\[\]()!~+*?{}<>\.,|:$=]/.test(next)) {
            return this.set(next, null, start, start + 1);
        }
        else {
            word.lastIndex = start;
            let m = word.exec(this.string);
            if (!m)
                return this.raise("Unexpected character " + JSON.stringify(next), start);
            return this.set("id", m[0], start, start + m[0].length);
        }
    }
    set(type, value, start, end) {
        this.type = type;
        this.value = value;
        this.start = start;
        this.end = end;
    }
    eat(type, value = null) {
        if (this.type == type && (value == null || this.value === value)) {
            this.next();
            return true;
        }
        else {
            return false;
        }
    }
    unexpected() {
        return this.raise(`Unexpected token '${this.string.slice(this.start, this.end)}'`, this.start);
    }
    expect(type, value = null) {
        let val = this.value;
        if (this.type != type || !(value == null || val === value))
            this.unexpected();
        this.next();
        return val;
    }
    parse() {
        return parseGrammar(this);
    }
}
function parseGrammar(input) {
    let start = input.start;
    let rules = [];
    let prec = null;
    let tokens = null;
    let localTokens = [];
    let mainSkip = null;
    let scopedSkip = [];
    let dialects = [];
    let context = null;
    let external = [];
    let specialized = [];
    let props = [];
    let propSources = [];
    let tops = [];
    let sawTop = false;
    let autoDelim = false;
    while (input.type != "eof") {
        let start = input.start;
        if (input.eat("at", "top")) {
            if (input.type != "id")
                input.raise(`Top rules must have a name`, input.start);
            tops.push(parseRule(input, parseIdent(input)));
            sawTop = true;
        }
        else if (input.type == "at" && input.value == "tokens") {
            if (tokens)
                input.raise(`Multiple @tokens declaractions`, input.start);
            else
                tokens = parseTokens(input);
        }
        else if (input.eat("at", "local")) {
            input.expect("id", "tokens");
            localTokens.push(parseLocalTokens(input, start));
        }
        else if (input.eat("at", "context")) {
            if (context)
                input.raise(`Multiple @context declarations`, start);
            let id = parseIdent(input);
            input.expect("id", "from");
            let source = input.expect("string");
            context = new ContextDeclaration(start, id, source);
        }
        else if (input.eat("at", "external")) {
            if (input.eat("id", "tokens"))
                external.push(parseExternalTokens(input, start));
            else if (input.eat("id", "prop"))
                props.push(parseExternalProp(input, start));
            else if (input.eat("id", "extend"))
                specialized.push(parseExternalSpecialize(input, "extend", start));
            else if (input.eat("id", "specialize"))
                specialized.push(parseExternalSpecialize(input, "specialize", start));
            else if (input.eat("id", "propSource"))
                propSources.push(parseExternalPropSource(input, start));
            else
                input.unexpected();
        }
        else if (input.eat("at", "dialects")) {
            input.expect("{");
            for (let first = true; !input.eat("}"); first = false) {
                if (!first)
                    input.eat(",");
                dialects.push(parseIdent(input));
            }
        }
        else if (input.type == "at" && input.value == "precedence") {
            if (prec)
                input.raise(`Multiple precedence declarations`, input.start);
            prec = parsePrecedence(input);
        }
        else if (input.eat("at", "detectDelim")) {
            autoDelim = true;
        }
        else if (input.eat("at", "skip")) {
            let skip = parseBracedExpr(input);
            if (input.type == "{") {
                input.next();
                let rules = [], topRules = [];
                while (!input.eat("}")) {
                    if (input.eat("at", "top")) {
                        topRules.push(parseRule(input, parseIdent(input)));
                        sawTop = true;
                    }
                    else {
                        rules.push(parseRule(input));
                    }
                }
                scopedSkip.push({ expr: skip, topRules, rules });
            }
            else {
                if (mainSkip)
                    input.raise(`Multiple top-level skip declarations`, input.start);
                mainSkip = skip;
            }
        }
        else {
            rules.push(parseRule(input));
        }
    }
    if (!sawTop)
        return input.raise(`Missing @top declaration`);
    return new GrammarDeclaration(start, rules, tops, tokens, localTokens, context, external, specialized, propSources, prec, mainSkip, scopedSkip, dialects, props, autoDelim);
}
function parseRule(input, named) {
    let start = named ? named.start : input.start;
    let id = named || parseIdent(input);
    let props = parseProps(input);
    let params = [];
    if (input.eat("<"))
        while (!input.eat(">")) {
            if (params.length)
                input.expect(",");
            params.push(parseIdent(input));
        }
    let expr = parseBracedExpr(input);
    return new RuleDeclaration(start, id, props, params, expr);
}
function parseProps(input) {
    if (input.type != "[")
        return none$2;
    let props = [];
    input.expect("[");
    while (!input.eat("]")) {
        if (props.length)
            input.expect(",");
        props.push(parseProp(input));
    }
    return props;
}
function parseProp(input) {
    let start = input.start, value = [], name = input.value, at = input.type == "at";
    if (!input.eat("at") && !input.eat("id"))
        input.unexpected();
    if (input.eat("="))
        for (;;) {
            if (input.type == "string" || input.type == "id") {
                value.push(new PropPart(input.start, input.value, null));
                input.next();
            }
            else if (input.eat(".")) {
                value.push(new PropPart(input.start, ".", null));
            }
            else if (input.eat("{")) {
                value.push(new PropPart(input.start, null, input.expect("id")));
                input.expect("}");
            }
            else {
                break;
            }
        }
    return new Prop(start, at, name, value);
}
function parseBracedExpr(input) {
    input.expect("{");
    let expr = parseExprChoice(input);
    input.expect("}");
    return expr;
}
const SET_MARKER = "\ufdda"; // (Invalid unicode character)
function parseExprInner(input) {
    let start = input.start;
    if (input.eat("(")) {
        if (input.eat(")"))
            return new SequenceExpression(start, none$2, [none$2, none$2]);
        let expr = parseExprChoice(input);
        input.expect(")");
        return expr;
    }
    else if (input.type == "string") {
        let value = input.value;
        input.next();
        if (value.length == 0)
            return new SequenceExpression(start, none$2, [none$2, none$2]);
        return new LiteralExpression(start, value);
    }
    else if (input.eat("id", "_")) {
        return new AnyExpression(start);
    }
    else if (input.type == "set") {
        let content = input.value, invert = input.string[input.start] == "!";
        let unescaped = readString(content.replace(/\\.|-|"/g, (m) => {
            return m == "-" ? SET_MARKER : m == '"' ? '\\"' : m;
        }));
        let ranges = [];
        for (let pos = 0; pos < unescaped.length;) {
            let code = unescaped.codePointAt(pos);
            pos += code > 0xffff ? 2 : 1;
            if (pos < unescaped.length - 1 && unescaped[pos] == SET_MARKER) {
                let end = unescaped.codePointAt(pos + 1);
                pos += end > 0xffff ? 3 : 2;
                if (end < code)
                    input.raise("Invalid character range", input.start);
                addRange(input, ranges, code, end + 1);
            }
            else {
                if (code == SET_MARKER.charCodeAt(0))
                    code = 45;
                addRange(input, ranges, code, code + 1);
            }
        }
        input.next();
        return new SetExpression(start, ranges.sort((a, b) => a[0] - b[0]), invert);
    }
    else if (input.type == "at" && (input.value == "specialize" || input.value == "extend")) {
        let { start, value } = input;
        input.next();
        let props = parseProps(input);
        input.expect("<");
        let token = parseExprChoice(input), content;
        if (input.eat(",")) {
            content = parseExprChoice(input);
        }
        else if (token instanceof LiteralExpression) {
            content = token;
        }
        else {
            input.raise(`@${value} requires two arguments when its first argument isn't a literal string`);
        }
        input.expect(">");
        return new SpecializeExpression(start, value, props, token, content);
    }
    else if (input.type == "at" && CharClasses.hasOwnProperty(input.value)) {
        let cls = new CharClass(input.start, input.value);
        input.next();
        return cls;
    }
    else if (input.type == "[") {
        let rule = parseRule(input, new Identifier(start, "_anon"));
        if (rule.params.length)
            input.raise(`Inline rules can't have parameters`, rule.start);
        return new InlineRuleExpression(start, rule);
    }
    else {
        let id = parseIdent(input);
        if (input.type == "[" || input.type == "{") {
            let rule = parseRule(input, id);
            if (rule.params.length)
                input.raise(`Inline rules can't have parameters`, rule.start);
            return new InlineRuleExpression(start, rule);
        }
        else {
            if (input.eat(".") && id.name == "std" && CharClasses.hasOwnProperty(input.value)) {
                let cls = new CharClass(start, input.value);
                input.next();
                return cls;
            }
            return new NameExpression(start, id, parseArgs(input));
        }
    }
}
function parseArgs(input) {
    let args = [];
    if (input.eat("<"))
        while (!input.eat(">")) {
            if (args.length)
                input.expect(",");
            args.push(parseExprChoice(input));
        }
    return args;
}
function addRange(input, ranges, from, to) {
    if (!ranges.every(([a, b]) => b <= from || a >= to))
        input.raise("Overlapping character range", input.start);
    ranges.push([from, to]);
}
function parseExprSuffix(input) {
    let start = input.start;
    let expr = parseExprInner(input);
    for (;;) {
        let kind = input.type;
        if (input.eat("*") || input.eat("?") || input.eat("+"))
            expr = new RepeatExpression(start, expr, kind);
        else
            return expr;
    }
}
function endOfSequence(input) {
    return input.type == "}" || input.type == ")" || input.type == "|" || input.type == "/" ||
        input.type == "/\\" || input.type == "{" || input.type == "," || input.type == ">";
}
function parseExprSequence(input) {
    let start = input.start, exprs = [], markers = [none$2];
    do {
        // Add markers at this position
        for (;;) {
            let localStart = input.start, markerType;
            if (input.eat("~"))
                markerType = "ambig";
            else if (input.eat("!"))
                markerType = "prec";
            else
                break;
            markers[markers.length - 1] =
                markers[markers.length - 1].concat(new ConflictMarker(localStart, parseIdent(input), markerType));
        }
        if (endOfSequence(input))
            break;
        exprs.push(parseExprSuffix(input));
        markers.push(none$2);
    } while (!endOfSequence(input));
    if (exprs.length == 1 && markers.every(ms => ms.length == 0))
        return exprs[0];
    return new SequenceExpression(start, exprs, markers, !exprs.length);
}
function parseExprChoice(input) {
    let start = input.start, left = parseExprSequence(input);
    if (!input.eat("|"))
        return left;
    let exprs = [left];
    do {
        exprs.push(parseExprSequence(input));
    } while (input.eat("|"));
    let empty = exprs.find(s => s instanceof SequenceExpression && s.empty);
    if (empty)
        input.raise("Empty expression in choice operator. If this is intentional, use () to make it explicit.", empty.start);
    return new ChoiceExpression(start, exprs);
}
function parseIdent(input) {
    if (input.type != "id")
        input.unexpected();
    let start = input.start, name = input.value;
    input.next();
    return new Identifier(start, name);
}
function parsePrecedence(input) {
    let start = input.start;
    input.next();
    input.expect("{");
    let items = [];
    while (!input.eat("}")) {
        if (items.length)
            input.eat(",");
        items.push({
            id: parseIdent(input),
            type: input.eat("at", "left") ? "left" : input.eat("at", "right") ? "right" : input.eat("at", "cut") ? "cut" : null
        });
    }
    return new PrecDeclaration(start, items);
}
function parseTokens(input) {
    let start = input.start;
    input.next();
    input.expect("{");
    let tokenRules = [];
    let literals = [];
    let precedences = [];
    let conflicts = [];
    while (!input.eat("}")) {
        if (input.type == "at" && input.value == "precedence") {
            precedences.push(parseTokenPrecedence(input));
        }
        else if (input.type == "at" && input.value == "conflict") {
            conflicts.push(parseTokenConflict(input));
        }
        else if (input.type == "string") {
            literals.push(new LiteralDeclaration(input.start, input.expect("string"), parseProps(input)));
        }
        else {
            tokenRules.push(parseRule(input));
        }
    }
    return new TokenDeclaration(start, precedences, conflicts, tokenRules, literals);
}
function parseLocalTokens(input, start) {
    input.expect("{");
    let tokenRules = [];
    let precedences = [];
    let fallback = null;
    while (!input.eat("}")) {
        if (input.type == "at" && input.value == "precedence") {
            precedences.push(parseTokenPrecedence(input));
        }
        else if (input.eat("at", "else") && !fallback) {
            fallback = { id: parseIdent(input), props: parseProps(input) };
        }
        else {
            tokenRules.push(parseRule(input));
        }
    }
    return new LocalTokenDeclaration(start, precedences, tokenRules, fallback);
}
function parseTokenPrecedence(input) {
    let start = input.start;
    input.next();
    input.expect("{");
    let tokens = [];
    while (!input.eat("}")) {
        if (tokens.length)
            input.eat(",");
        let expr = parseExprInner(input);
        if (expr instanceof LiteralExpression || expr instanceof NameExpression)
            tokens.push(expr);
        else
            input.raise(`Invalid expression in token precedences`, expr.start);
    }
    return new TokenPrecDeclaration(start, tokens);
}
function parseTokenConflict(input) {
    let start = input.start;
    input.next();
    input.expect("{");
    let a = parseExprInner(input);
    if (!(a instanceof LiteralExpression || a instanceof NameExpression))
        input.raise(`Invalid expression in token conflict`, a.start);
    input.eat(",");
    let b = parseExprInner(input);
    if (!(b instanceof LiteralExpression || b instanceof NameExpression))
        input.raise(`Invalid expression in token conflict`, b.start);
    input.expect("}");
    return new TokenConflictDeclaration(start, a, b);
}
function parseExternalTokenSet(input, allowConflicts) {
    let tokens = [], conflicts = [];
    input.expect("{");
    for (let first = true; !input.eat("}"); first = false) {
        if (!first)
            input.eat(",");
        if (allowConflicts && input.eat("at", "conflict")) {
            input.expect("{");
            for (let f = true; !input.eat("}"); f = false) {
                if (!f)
                    input.eat(",");
                conflicts.push(parseIdent(input));
            }
        }
        else {
            let id = parseIdent(input);
            let props = parseProps(input);
            tokens.push({ id, props });
        }
    }
    return { tokens, conflicts };
}
function parseExternalTokens(input, start) {
    let id = parseIdent(input);
    input.expect("id", "from");
    let from = input.expect("string");
    let { tokens, conflicts } = parseExternalTokenSet(input, true);
    return new ExternalTokenDeclaration(start, id, from, tokens, conflicts);
}
function parseExternalSpecialize(input, type, start) {
    let token = parseBracedExpr(input);
    let id = parseIdent(input);
    input.expect("id", "from");
    let from = input.expect("string");
    return new ExternalSpecializeDeclaration(start, type, token, id, from, parseExternalTokenSet(input, false).tokens);
}
function parseExternalPropSource(input, start) {
    let id = parseIdent(input);
    input.expect("id", "from");
    return new ExternalPropSourceDeclaration(start, id, input.expect("string"));
}
function parseExternalProp(input, start) {
    let externalID = parseIdent(input);
    let id = input.eat("id", "as") ? parseIdent(input) : externalID;
    input.expect("id", "from");
    let from = input.expect("string");
    return new ExternalPropDeclaration(start, id, externalID, from);
}
function readString(string) {
    let point = /\\(?:u\{([\da-f]+)\}|u([\da-f]{4})|x([\da-f]{2})|([ntbrf0])|(.))|[^]/yig;
    let out = "", m;
    while (m = point.exec(string)) {
        let [all, u1, u2, u3, single, unknown] = m;
        if (u1 || u2 || u3)
            out += String.fromCodePoint(parseInt(u1 || u2 || u3, 16));
        else if (single)
            out += single == "n" ? "\n" : single == "t" ? "\t" : single == "0" ? "\0" : single == "r" ? "\r" : single == "f" ? "\f" : "\b";
        else if (unknown)
            out += unknown;
        else
            out += all;
    }
    return out;
}

function hash(a, b) { return (a << 5) + a + b; }
function hashString(h, s) {
    for (let i = 0; i < s.length; i++)
        h = hash(h, s.charCodeAt(i));
    return h;
}

const verbose = (typeof process != "undefined" && process.env.LOG) || "";
const timing = /\btime\b/.test(verbose);
const time = timing ? (label, f) => {
    let t0 = Date.now();
    let result = f();
    console.log(`${label} (${((Date.now() - t0) / 1000).toFixed(2)}s)`);
    return result;
} : (_label, f) => f();

class Pos {
    constructor(rule, pos, 
    // NOTE `ahead` and `ambigAhead` aren't mutated anymore after `finish()` has been called
    ahead, ambigAhead, skipAhead, via) {
        this.rule = rule;
        this.pos = pos;
        this.ahead = ahead;
        this.ambigAhead = ambigAhead;
        this.skipAhead = skipAhead;
        this.via = via;
        this.hash = 0;
    }
    finish() {
        let h = hash(hash(this.rule.id, this.pos), this.skipAhead.hash);
        for (let a of this.ahead)
            h = hash(h, a.hash);
        for (let group of this.ambigAhead)
            h = hashString(h, group);
        this.hash = h;
        return this;
    }
    get next() {
        return this.pos < this.rule.parts.length ? this.rule.parts[this.pos] : null;
    }
    advance() {
        return new Pos(this.rule, this.pos + 1, this.ahead, this.ambigAhead, this.skipAhead, this.via).finish();
    }
    get skip() {
        return this.pos == this.rule.parts.length ? this.skipAhead : this.rule.skip;
    }
    cmp(pos) {
        return this.rule.cmp(pos.rule) || this.pos - pos.pos || this.skipAhead.hash - pos.skipAhead.hash ||
            cmpSet(this.ahead, pos.ahead, (a, b) => a.cmp(b)) || cmpSet(this.ambigAhead, pos.ambigAhead, cmpStr);
    }
    eqSimple(pos) {
        return pos.rule == this.rule && pos.pos == this.pos;
    }
    toString() {
        let parts = this.rule.parts.map(t => t.name);
        parts.splice(this.pos, 0, "·");
        return `${this.rule.name} -> ${parts.join(" ")}`;
    }
    eq(other) {
        return this == other ||
            this.hash == other.hash && this.rule == other.rule && this.pos == other.pos && this.skipAhead == other.skipAhead &&
                sameSet(this.ahead, other.ahead) &&
                sameSet(this.ambigAhead, other.ambigAhead);
    }
    trail(maxLen = 60) {
        let result = [];
        for (let pos = this; pos; pos = pos.via) {
            for (let i = pos.pos - 1; i >= 0; i--)
                result.push(pos.rule.parts[i]);
        }
        let value = result.reverse().join(" ");
        if (value.length > maxLen)
            value = value.slice(value.length - maxLen).replace(/.*? /, "… ");
        return value;
    }
    conflicts(pos = this.pos) {
        let result = this.rule.conflicts[pos];
        if (pos == this.rule.parts.length && this.ambigAhead.length)
            result = result.join(new Conflicts(0, this.ambigAhead));
        return result;
    }
    static addOrigins(group, context) {
        let result = group.slice();
        for (let i = 0; i < result.length; i++) {
            let next = result[i];
            if (next.pos == 0)
                for (let pos of context) {
                    if (pos.next == next.rule.name && !result.includes(pos))
                        result.push(pos);
                }
        }
        return result;
    }
}
function conflictsAt(group) {
    let result = Conflicts.none;
    for (let pos of group)
        result = result.join(pos.conflicts());
    return result;
}
// Applies automatic action precedence based on repeat productions.
// These are left-associative, so reducing the `R -> R R` rule has
// higher precedence.
function compareRepeatPrec(a, b) {
    for (let pos of a)
        if (pos.rule.name.repeated) {
            for (let posB of b)
                if (posB.rule.name == pos.rule.name) {
                    if (pos.rule.isRepeatWrap && pos.pos == 2)
                        return 1;
                    if (posB.rule.isRepeatWrap && posB.pos == 2)
                        return -1;
                }
        }
    return 0;
}
function cmpStr(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}
function termsAhead(rule, pos, after, first) {
    let found = [];
    for (let i = pos + 1; i < rule.parts.length; i++) {
        let next = rule.parts[i], cont = false;
        if (next.terminal) {
            addTo(next, found);
        }
        else
            for (let term of first[next.name]) {
                if (term == null)
                    cont = true;
                else
                    addTo(term, found);
            }
        if (!cont)
            return found;
    }
    for (let a of after)
        addTo(a, found);
    return found;
}
function eqSet(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (!a[i].eq(b[i]))
            return false;
    return true;
}
function sameSet(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (a[i] != b[i])
            return false;
    return true;
}
class Shift {
    constructor(term, target) {
        this.term = term;
        this.target = target;
    }
    eq(other) { return other instanceof Shift && this.term == other.term && other.target.id == this.target.id; }
    cmp(other) { return other instanceof Reduce ? -1 : this.term.id - other.term.id || this.target.id - other.target.id; }
    matches(other, mapping) {
        return other instanceof Shift && mapping[other.target.id] == mapping[this.target.id];
    }
    toString() { return "s" + this.target.id; }
    map(mapping, states) {
        let mapped = states[mapping[this.target.id]];
        return mapped == this.target ? this : new Shift(this.term, mapped);
    }
}
class Reduce {
    constructor(term, rule) {
        this.term = term;
        this.rule = rule;
    }
    eq(other) {
        return other instanceof Reduce && this.term == other.term && other.rule.sameReduce(this.rule);
    }
    cmp(other) {
        return other instanceof Shift ? 1 : this.term.id - other.term.id || this.rule.name.id - other.rule.name.id ||
            this.rule.parts.length - other.rule.parts.length;
    }
    matches(other, mapping) {
        return other instanceof Reduce && other.rule.sameReduce(this.rule);
    }
    toString() { return `${this.rule.name.name}(${this.rule.parts.length})`; }
    map() { return this; }
}
function hashPositions(set) {
    let h = 5381;
    for (let pos of set)
        h = hash(h, pos.hash);
    return h;
}
class ConflictContext {
    constructor(first) {
        this.first = first;
        this.conflicts = [];
    }
}
class State {
    constructor(id, set, flags = 0, skip, hash = hashPositions(set), startRule = null) {
        this.id = id;
        this.set = set;
        this.flags = flags;
        this.skip = skip;
        this.hash = hash;
        this.startRule = startRule;
        this.actions = [];
        this.actionPositions = [];
        this.goto = [];
        this.tokenGroup = -1;
        this.defaultReduce = null;
        this._actionsByTerm = null;
    }
    toString() {
        let actions = this.actions.map(t => t.term + "=" + t).join(",") +
            (this.goto.length ? " | " + this.goto.map(g => g.term + "=" + g).join(",") : "");
        return this.id + ": " + this.set.filter(p => p.pos > 0).join() +
            (this.defaultReduce ? `\n  always ${this.defaultReduce.name}(${this.defaultReduce.parts.length})`
                : actions.length ? "\n  " + actions : "");
    }
    addActionInner(value, positions) {
        check: for (let i = 0; i < this.actions.length; i++) {
            let action = this.actions[i];
            if (action.term == value.term) {
                if (action.eq(value))
                    return null;
                let fullPos = Pos.addOrigins(positions, this.set), actionFullPos = Pos.addOrigins(this.actionPositions[i], this.set);
                let conflicts = conflictsAt(fullPos), actionConflicts = conflictsAt(actionFullPos);
                let diff = compareRepeatPrec(fullPos, actionFullPos) || conflicts.precedence - actionConflicts.precedence;
                if (diff > 0) { // Drop the existing action
                    this.actions.splice(i, 1);
                    this.actionPositions.splice(i, 1);
                    i--;
                    continue check;
                }
                else if (diff < 0) { // Drop this one
                    return null;
                }
                else if (conflicts.ambigGroups.some(g => actionConflicts.ambigGroups.includes(g))) { // Explicitly allowed ambiguity
                    continue check;
                }
                else { // Not resolved
                    return action;
                }
            }
        }
        this.actions.push(value);
        this.actionPositions.push(positions);
        return null;
    }
    addAction(value, positions, context) {
        let conflict = this.addActionInner(value, positions);
        if (conflict) {
            let conflictPos = this.actionPositions[this.actions.indexOf(conflict)][0];
            let rules = [positions[0].rule.name, conflictPos.rule.name];
            if (context.conflicts.some(c => c.rules.some(r => rules.includes(r))))
                return;
            let error;
            if (conflict instanceof Shift)
                error = `shift/reduce conflict between\n  ${conflictPos}\nand\n  ${positions[0].rule}`;
            else
                error = `reduce/reduce conflict between\n  ${conflictPos.rule}\nand\n  ${positions[0].rule}`;
            error += `\nWith input:\n  ${positions[0].trail(70)} · ${value.term} …`;
            if (conflict instanceof Shift)
                error += findConflictShiftSource(positions[0], conflict.term, context.first);
            error += findConflictOrigin(conflictPos, positions[0]);
            context.conflicts.push(new Conflict(error, rules));
        }
    }
    getGoto(term) {
        return this.goto.find(a => a.term == term);
    }
    hasSet(set) {
        return eqSet(this.set, set);
    }
    actionsByTerm() {
        let result = this._actionsByTerm;
        if (!result) {
            this._actionsByTerm = result = Object.create(null);
            for (let action of this.actions)
                (result[action.term.id] || (result[action.term.id] = [])).push(action);
        }
        return result;
    }
    finish() {
        if (this.actions.length) {
            let first = this.actions[0];
            if (first instanceof Reduce) {
                let { rule } = first;
                if (this.actions.every(a => a instanceof Reduce && a.rule.sameReduce(rule)))
                    this.defaultReduce = rule;
            }
        }
        this.actions.sort((a, b) => a.cmp(b));
        this.goto.sort((a, b) => a.cmp(b));
    }
    eq(other) {
        let dThis = this.defaultReduce, dOther = other.defaultReduce;
        if (dThis || dOther)
            return dThis && dOther ? dThis.sameReduce(dOther) : false;
        return this.skip == other.skip &&
            this.tokenGroup == other.tokenGroup &&
            eqSet(this.actions, other.actions) &&
            eqSet(this.goto, other.goto);
    }
}
function closure(set, first) {
    let added = [], redo = [];
    function addFor(name, ahead, ambigAhead, skipAhead, via) {
        for (let rule of name.rules) {
            let add = added.find(a => a.rule == rule);
            if (!add) {
                let existing = set.find(p => p.pos == 0 && p.rule == rule);
                add = existing ? new Pos(rule, 0, existing.ahead.slice(), existing.ambigAhead, existing.skipAhead, existing.via)
                    : new Pos(rule, 0, [], none$1, skipAhead, via);
                added.push(add);
            }
            if (add.skipAhead != skipAhead)
                throw new GenError("Inconsistent skip sets after " + via.trail());
            add.ambigAhead = union(add.ambigAhead, ambigAhead);
            for (let term of ahead)
                if (!add.ahead.includes(term)) {
                    add.ahead.push(term);
                    if (add.rule.parts.length && !add.rule.parts[0].terminal)
                        addTo(add, redo);
                }
        }
    }
    for (let pos of set) {
        let next = pos.next;
        if (next && !next.terminal)
            addFor(next, termsAhead(pos.rule, pos.pos, pos.ahead, first), pos.conflicts(pos.pos + 1).ambigGroups, pos.pos == pos.rule.parts.length - 1 ? pos.skipAhead : pos.rule.skip, pos);
    }
    while (redo.length) {
        let add = redo.pop();
        addFor(add.rule.parts[0], termsAhead(add.rule, 0, add.ahead, first), union(add.rule.conflicts[1].ambigGroups, add.rule.parts.length == 1 ? add.ambigAhead : none$1), add.rule.parts.length == 1 ? add.skipAhead : add.rule.skip, add);
    }
    let result = set.slice();
    for (let add of added) {
        add.ahead.sort((a, b) => a.hash - b.hash);
        add.finish();
        let origIndex = set.findIndex(p => p.pos == 0 && p.rule == add.rule);
        if (origIndex > -1)
            result[origIndex] = add;
        else
            result.push(add);
    }
    return result.sort((a, b) => a.cmp(b));
}
function addTo(value, array) {
    if (!array.includes(value))
        array.push(value);
}
function computeFirstSets(terms) {
    let table = Object.create(null);
    for (let t of terms.terms)
        if (!t.terminal)
            table[t.name] = [];
    for (;;) {
        let change = false;
        for (let nt of terms.terms)
            if (!nt.terminal)
                for (let rule of nt.rules) {
                    let set = table[nt.name];
                    let found = false, startLen = set.length;
                    for (let part of rule.parts) {
                        found = true;
                        if (part.terminal) {
                            addTo(part, set);
                        }
                        else {
                            for (let t of table[part.name]) {
                                if (t == null)
                                    found = false;
                                else
                                    addTo(t, set);
                            }
                        }
                        if (found)
                            break;
                    }
                    if (!found)
                        addTo(null, set);
                    if (set.length > startLen)
                        change = true;
                }
        if (!change)
            return table;
    }
}
class Core {
    constructor(set, state) {
        this.set = set;
        this.state = state;
    }
}
class Conflict {
    constructor(error, rules) {
        this.error = error;
        this.rules = rules;
    }
}
function findConflictOrigin(a, b) {
    if (a.eqSimple(b))
        return "";
    function via(root, start) {
        let hist = [];
        for (let p = start.via; !p.eqSimple(root); p = p.via)
            hist.push(p);
        if (!hist.length)
            return "";
        hist.unshift(start);
        return hist.reverse().map((p, i) => "\n" + "  ".repeat(i + 1) + (p == start ? "" : "via ") + p).join("");
    }
    for (let p = a; p; p = p.via)
        for (let p2 = b; p2; p2 = p2.via) {
            if (p.eqSimple(p2))
                return "\nShared origin: " + p + via(p, a) + via(p, b);
        }
    return "";
}
// Search for the reason that a given 'after' token exists at the
// given pos, by scanning up the trail of positions. Because the `via`
// link is only one source of a pos, of potentially many, this
// requires a re-simulation of the whole path up to the pos.
function findConflictShiftSource(conflictPos, termAfter, first) {
    let pos = conflictPos, path = [];
    for (;;) {
        for (let i = pos.pos - 1; i >= 0; i--)
            path.push(pos.rule.parts[i]);
        if (!pos.via)
            break;
        pos = pos.via;
    }
    path.reverse();
    let seen = new Set();
    function explore(pos, i, hasMatch) {
        if (i == path.length && hasMatch && !pos.next)
            return `\nThe reduction of ${conflictPos.rule.name} is allowed before ${termAfter} because of this rule:\n  ${hasMatch}`;
        for (let next; next = pos.next;) {
            if (i < path.length && next == path[i]) {
                let inner = explore(pos.advance(), i + 1, hasMatch);
                if (inner)
                    return inner;
            }
            let after = pos.rule.parts[pos.pos + 1], match = pos.pos + 1 == pos.rule.parts.length ? hasMatch : null;
            if (after && (after.terminal ? after == termAfter : first[after.name].includes(termAfter)))
                match = pos.advance();
            for (let rule of next.rules) {
                let hash = (rule.id << 5) + i + (match ? 555 : 0);
                if (!seen.has(hash)) {
                    seen.add(hash);
                    let inner = explore(new Pos(rule, 0, [], [], next, pos), i, match);
                    if (inner)
                        return inner;
                }
            }
            if (!next.terminal && first[next.name].includes(null))
                pos = pos.advance();
            else
                break;
        }
        return "";
    }
    return explore(pos, 0, null);
}
// Builds a full LR(1) automaton
function buildFullAutomaton(terms, startTerms, first) {
    let states = [], statesBySetHash = {};
    let cores = {};
    let t0 = Date.now();
    function getState(core, top) {
        if (core.length == 0)
            return null;
        let coreHash = hashPositions(core), byHash = cores[coreHash];
        let skip;
        for (let pos of core) {
            if (!skip)
                skip = pos.skip;
            else if (skip != pos.skip)
                throw new GenError("Inconsistent skip sets after " + pos.trail());
        }
        if (byHash)
            for (let known of byHash)
                if (eqSet(core, known.set)) {
                    if (known.state.skip != skip)
                        throw new GenError("Inconsistent skip sets after " + known.set[0].trail());
                    return known.state;
                }
        let set = closure(core, first);
        let hash = hashPositions(set), forHash = statesBySetHash[hash] || (statesBySetHash[hash] = []);
        let found;
        if (!top)
            for (let state of forHash)
                if (state.hasSet(set))
                    found = state;
        if (!found) {
            found = new State(states.length, set, 0, skip, hash, top);
            forHash.push(found);
            states.push(found);
            if (timing && states.length % 500 == 0)
                console.log(`${states.length} states after ${((Date.now() - t0) / 1000).toFixed(2)}s`);
        }
        (cores[coreHash] || (cores[coreHash] = [])).push(new Core(core, found));
        return found;
    }
    for (const startTerm of startTerms) {
        const startSkip = startTerm.rules.length ? startTerm.rules[0].skip : terms.names["%noskip"];
        getState(startTerm.rules.map(rule => new Pos(rule, 0, [terms.eof], none$1, startSkip, null).finish()), startTerm);
    }
    let conflicts = new ConflictContext(first);
    for (let filled = 0; filled < states.length; filled++) {
        let state = states[filled];
        let byTerm = [], byTermPos = [], atEnd = [];
        for (let pos of state.set) {
            if (pos.pos == pos.rule.parts.length) {
                if (!pos.rule.name.top)
                    atEnd.push(pos);
            }
            else {
                let next = pos.rule.parts[pos.pos];
                let index = byTerm.indexOf(next);
                if (index < 0) {
                    byTerm.push(next);
                    byTermPos.push([pos]);
                }
                else {
                    byTermPos[index].push(pos);
                }
            }
        }
        for (let i = 0; i < byTerm.length; i++) {
            let term = byTerm[i], positions = byTermPos[i].map(p => p.advance());
            if (term.terminal) {
                let set = applyCut(positions);
                let next = getState(set);
                if (next)
                    state.addAction(new Shift(term, next), byTermPos[i], conflicts);
            }
            else {
                let goto = getState(positions);
                if (goto)
                    state.goto.push(new Shift(term, goto));
            }
        }
        let replaced = false;
        for (let pos of atEnd)
            for (let ahead of pos.ahead) {
                let count = state.actions.length;
                state.addAction(new Reduce(ahead, pos.rule), [pos], conflicts);
                if (state.actions.length == count)
                    replaced = true;
            }
        // If some actions were replaced by others, double-check whether
        // goto entries are now superfluous (for example, in an operator
        // precedence-related state that has a shift for `*` but only a
        // reduce for `+`, we don't need a goto entry for rules that start
        // with `+`)
        if (replaced)
            for (let i = 0; i < state.goto.length; i++) {
                let start = first[state.goto[i].term.name];
                if (!start.some(term => state.actions.some(a => a.term == term && (a instanceof Shift))))
                    state.goto.splice(i--, 1);
            }
    }
    if (conflicts.conflicts.length)
        throw new GenError(conflicts.conflicts.map(c => c.error).join("\n\n"));
    // Resolve alwaysReduce and sort actions
    for (let state of states)
        state.finish();
    if (timing)
        console.log(`${states.length} states total.`);
    return states;
}
function applyCut(set) {
    let found = null, cut = 1;
    for (let pos of set) {
        let value = pos.rule.conflicts[pos.pos - 1].cut;
        if (value < cut)
            continue;
        if (!found || value > cut) {
            cut = value;
            found = [];
        }
        found.push(pos);
    }
    return found || set;
}
// Verify that there are no conflicting actions or goto entries in the
// two given states (using the state ID remapping provided in mapping)
function canMerge(a, b, mapping) {
    // If a goto for the same term differs, that makes the states
    // incompatible
    for (let goto of a.goto)
        for (let other of b.goto) {
            if (goto.term == other.term && mapping[goto.target.id] != mapping[other.target.id])
                return false;
        }
    // If there is an action where a conflicting action exists in the
    // other state, the merge is only allowed when both states have the
    // exact same set of actions for this term.
    let byTerm = b.actionsByTerm();
    for (let action of a.actions) {
        let setB = byTerm[action.term.id];
        if (setB && setB.some(other => !other.matches(action, mapping))) {
            if (setB.length == 1)
                return false;
            let setA = a.actionsByTerm()[action.term.id];
            if (setA.length != setB.length || setA.some(a1 => !setB.some(a2 => a1.matches(a2, mapping))))
                return false;
        }
    }
    return true;
}
function mergeStates(states, mapping) {
    let newStates = [];
    for (let state of states) {
        let newID = mapping[state.id];
        if (!newStates[newID]) {
            newStates[newID] = new State(newID, state.set, 0, state.skip, state.hash, state.startRule);
            newStates[newID].tokenGroup = state.tokenGroup;
            newStates[newID].defaultReduce = state.defaultReduce;
        }
    }
    for (let state of states) {
        let newID = mapping[state.id], target = newStates[newID];
        target.flags |= state.flags;
        for (let i = 0; i < state.actions.length; i++) {
            let action = state.actions[i].map(mapping, newStates);
            if (!target.actions.some(a => a.eq(action))) {
                target.actions.push(action);
                target.actionPositions.push(state.actionPositions[i]);
            }
        }
        for (let goto of state.goto) {
            let mapped = goto.map(mapping, newStates);
            if (!target.goto.some(g => g.eq(mapped)))
                target.goto.push(mapped);
        }
    }
    return newStates;
}
class Group {
    constructor(origin, member) {
        this.origin = origin;
        this.members = [member];
    }
}
function samePosSet(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (!a[i].eqSimple(b[i]))
            return false;
    return true;
}
// Collapse an LR(1) automaton to an LALR-like automaton
function collapseAutomaton(states) {
    let mapping = [], groups = [];
    assignGroups: for (let i = 0; i < states.length; i++) {
        let state = states[i];
        if (!state.startRule)
            for (let j = 0; j < groups.length; j++) {
                let group = groups[j], other = states[group.members[0]];
                if (state.tokenGroup == other.tokenGroup &&
                    state.skip == other.skip &&
                    !other.startRule &&
                    samePosSet(state.set, other.set)) {
                    group.members.push(i);
                    mapping.push(j);
                    continue assignGroups;
                }
            }
        mapping.push(groups.length);
        groups.push(new Group(groups.length, i));
    }
    function spill(groupIndex, index) {
        let group = groups[groupIndex], state = states[group.members[index]];
        let pop = group.members.pop();
        if (index != group.members.length)
            group.members[index] = pop;
        for (let i = groupIndex + 1; i < groups.length; i++) {
            mapping[state.id] = i;
            if (groups[i].origin == group.origin &&
                groups[i].members.every(id => canMerge(state, states[id], mapping))) {
                groups[i].members.push(state.id);
                return;
            }
        }
        mapping[state.id] = groups.length;
        groups.push(new Group(group.origin, state.id));
    }
    for (let pass = 1;; pass++) {
        let conflicts = false, t0 = Date.now();
        for (let g = 0, startLen = groups.length; g < startLen; g++) {
            let group = groups[g];
            for (let i = 0; i < group.members.length - 1; i++) {
                for (let j = i + 1; j < group.members.length; j++) {
                    let idA = group.members[i], idB = group.members[j];
                    if (!canMerge(states[idA], states[idB], mapping)) {
                        conflicts = true;
                        spill(g, j--);
                    }
                }
            }
        }
        if (timing)
            console.log(`Collapse pass ${pass}${conflicts ? `` : `, done`} (${((Date.now() - t0) / 1000).toFixed(2)}s)`);
        if (!conflicts)
            return mergeStates(states, mapping);
    }
}
function mergeIdentical(states) {
    for (let pass = 1;; pass++) {
        let mapping = [], didMerge = false, t0 = Date.now();
        let newStates = [];
        // Find states that either have the same alwaysReduce or the same
        // actions, and merge them.
        for (let i = 0; i < states.length; i++) {
            let state = states[i];
            let match = newStates.findIndex(s => state.eq(s));
            if (match < 0) {
                mapping[i] = newStates.length;
                newStates.push(state);
            }
            else {
                mapping[i] = match;
                didMerge = true;
                let other = newStates[match], add = null;
                for (let pos of state.set)
                    if (!other.set.some(p => p.eqSimple(pos)))
                        (add || (add = [])).push(pos);
                if (add)
                    other.set = add.concat(other.set).sort((a, b) => a.cmp(b));
            }
        }
        if (timing)
            console.log(`Merge identical pass ${pass}${didMerge ? "" : ", done"} (${((Date.now() - t0) / 1000).toFixed(2)}s)`);
        if (!didMerge)
            return states;
        // Make sure actions point at merged state objects
        for (let state of newStates)
            if (!state.defaultReduce) {
                state.actions = state.actions.map(a => a.map(mapping, newStates));
                state.goto = state.goto.map(a => a.map(mapping, newStates));
            }
        // Renumber ids
        for (let i = 0; i < newStates.length; i++)
            newStates[i].id = i;
        states = newStates;
    }
}
const none$1 = [];
function finishAutomaton(full) {
    return mergeIdentical(collapseAutomaton(full));
}

// Encode numbers as groups of printable ascii characters
//
// - 0xffff, which is often used as placeholder, is encoded as "~"
//
// - The characters from " " (32) to "}" (125), excluding '"' and
//   "\\", indicate values from 0 to 92
//
// - The first bit in a 'digit' is used to indicate whether this is
//   the end of a number.
//
// - That leaves 46 other values, which are actually significant.
//
// - The digits in a number are ordered from high to low significance.
function digitToChar(digit) {
    let ch = digit + 32 /* Encode.Start */;
    if (ch >= 34 /* Encode.Gap1 */)
        ch++;
    if (ch >= 92 /* Encode.Gap2 */)
        ch++;
    return String.fromCharCode(ch);
}
function encode(value, max = 0xffff) {
    if (value > max)
        throw new Error("Trying to encode a number that's too big: " + value);
    if (value == 65535 /* Encode.BigVal */)
        return String.fromCharCode(126 /* Encode.BigValCode */);
    let result = "";
    for (let first = 46 /* Encode.Base */;; first = 0) {
        let low = value % 46 /* Encode.Base */, rest = value - low;
        result = digitToChar(low + first) + result;
        if (rest == 0)
            break;
        value = rest / 46 /* Encode.Base */;
    }
    return result;
}
function encodeArray(values, max = 0xffff) {
    let result = '"' + encode(values.length, 0xffffffff);
    for (let i = 0; i < values.length; i++)
        result += encode(values[i], max);
    result += '"';
    return result;
}

const none = [];
class Parts {
    constructor(terms, conflicts) {
        this.terms = terms;
        this.conflicts = conflicts;
    }
    concat(other) {
        if (this == Parts.none)
            return other;
        if (other == Parts.none)
            return this;
        let conflicts = null;
        if (this.conflicts || other.conflicts) {
            conflicts = this.conflicts ? this.conflicts.slice() : this.ensureConflicts();
            let otherConflicts = other.ensureConflicts();
            conflicts[conflicts.length - 1] = conflicts[conflicts.length - 1].join(otherConflicts[0]);
            for (let i = 1; i < otherConflicts.length; i++)
                conflicts.push(otherConflicts[i]);
        }
        return new Parts(this.terms.concat(other.terms), conflicts);
    }
    withConflicts(pos, conflicts) {
        if (conflicts == Conflicts.none)
            return this;
        let array = this.conflicts ? this.conflicts.slice() : this.ensureConflicts();
        array[pos] = array[pos].join(conflicts);
        return new Parts(this.terms, array);
    }
    ensureConflicts() {
        if (this.conflicts)
            return this.conflicts;
        let empty = [];
        for (let i = 0; i <= this.terms.length; i++)
            empty.push(Conflicts.none);
        return empty;
    }
}
Parts.none = new Parts(none, null);
function p(...terms) { return new Parts(terms, null); }
class BuiltRule {
    constructor(id, args, term) {
        this.id = id;
        this.args = args;
        this.term = term;
    }
    matches(expr) {
        return this.id == expr.id.name && exprsEq(expr.args, this.args);
    }
    matchesRepeat(expr) {
        return this.id == "+" && exprEq(expr.expr, this.args[0]);
    }
}
class Builder {
    constructor(text, options) {
        this.options = options;
        this.terms = new TermSet;
        this.specialized = Object.create(null);
        this.tokenOrigins = Object.create(null);
        this.rules = [];
        this.built = [];
        this.ruleNames = Object.create(null);
        this.namespaces = Object.create(null);
        this.namedTerms = Object.create(null);
        this.termTable = Object.create(null);
        this.knownProps = Object.create(null);
        this.dynamicRulePrecedences = [];
        this.definedGroups = [];
        this.astRules = [];
        this.currentSkip = [];
        time("Parse", () => {
            this.input = new Input(text, options.fileName);
            this.ast = this.input.parse();
        });
        let NP = NodeProp;
        for (let prop in NP) {
            if (NP[prop] instanceof NodeProp && !NP[prop].perNode)
                this.knownProps[prop] = { prop: NP[prop], source: { name: prop, from: null } };
        }
        for (let prop of this.ast.externalProps) {
            this.knownProps[prop.id.name] = {
                prop: this.options.externalProp ? this.options.externalProp(prop.id.name) : new NodeProp(),
                source: { name: prop.externalID.name, from: prop.source }
            };
        }
        this.dialects = this.ast.dialects.map(d => d.name);
        this.tokens = new MainTokenSet(this, this.ast.tokens);
        this.localTokens = this.ast.localTokens.map(g => new LocalTokenSet(this, g));
        this.externalTokens = this.ast.externalTokens.map(ext => new ExternalTokenSet(this, ext));
        this.externalSpecializers = this.ast.externalSpecializers.map(decl => new ExternalSpecializer(this, decl));
        time("Build rules", () => {
            let noSkip = this.newName("%noskip", true);
            this.defineRule(noSkip, []);
            let mainSkip = this.ast.mainSkip ? this.newName("%mainskip", true) : noSkip;
            let scopedSkip = [], topRules = [];
            for (let rule of this.ast.rules)
                this.astRules.push({ skip: mainSkip, rule });
            for (let rule of this.ast.topRules)
                topRules.push({ skip: mainSkip, rule });
            for (let scoped of this.ast.scopedSkip) {
                let skip = noSkip, found = this.ast.scopedSkip.findIndex((sc, i) => i < scopedSkip.length && exprEq(sc.expr, scoped.expr));
                if (found > -1)
                    skip = scopedSkip[found];
                else if (this.ast.mainSkip && exprEq(scoped.expr, this.ast.mainSkip))
                    skip = mainSkip;
                else if (!isEmpty(scoped.expr))
                    skip = this.newName("%skip", true);
                scopedSkip.push(skip);
                for (let rule of scoped.rules)
                    this.astRules.push({ skip, rule });
                for (let rule of scoped.topRules)
                    topRules.push({ skip, rule });
            }
            for (let { rule } of this.astRules) {
                this.unique(rule.id);
            }
            this.currentSkip.push(noSkip);
            this.skipRules = mainSkip == noSkip ? [mainSkip] : [noSkip, mainSkip];
            if (mainSkip != noSkip)
                this.defineRule(mainSkip, this.normalizeExpr(this.ast.mainSkip));
            for (let i = 0; i < this.ast.scopedSkip.length; i++) {
                let skip = scopedSkip[i];
                if (!this.skipRules.includes(skip)) {
                    this.skipRules.push(skip);
                    if (skip != noSkip)
                        this.defineRule(skip, this.normalizeExpr(this.ast.scopedSkip[i].expr));
                }
            }
            this.currentSkip.pop();
            for (let { rule, skip } of topRules.sort((a, b) => a.rule.start - b.rule.start)) {
                this.unique(rule.id);
                this.used(rule.id.name);
                this.currentSkip.push(skip);
                let { name, props } = this.nodeInfo(rule.props, "a", rule.id.name, none, none, rule.expr);
                let term = this.terms.makeTop(name, props);
                this.namedTerms[name] = term;
                this.defineRule(term, this.normalizeExpr(rule.expr));
                this.currentSkip.pop();
            }
            for (let ext of this.externalSpecializers)
                ext.finish();
            for (let { skip, rule } of this.astRules) {
                if (this.ruleNames[rule.id.name] && isExported(rule) && !rule.params.length) {
                    this.buildRule(rule, [], skip, false);
                    if (rule.expr instanceof SequenceExpression && rule.expr.exprs.length == 0)
                        this.used(rule.id.name);
                }
            }
        });
        for (let name in this.ruleNames) {
            let value = this.ruleNames[name];
            if (value)
                this.warn(`Unused rule '${value.name}'`, value.start);
        }
        this.tokens.takePrecedences();
        this.tokens.takeConflicts();
        for (let lt of this.localTokens)
            lt.takePrecedences();
        for (let { name, group, rule } of this.definedGroups)
            this.defineGroup(name, group, rule);
        this.checkGroups();
    }
    unique(id) {
        if (id.name in this.ruleNames)
            this.raise(`Duplicate definition of rule '${id.name}'`, id.start);
        this.ruleNames[id.name] = id;
    }
    used(name) {
        this.ruleNames[name] = null;
    }
    newName(base, nodeName = null, props = {}) {
        for (let i = nodeName ? 0 : 1;; i++) {
            let name = i ? `${base}-${i}` : base;
            if (!this.terms.names[name])
                return this.terms.makeNonTerminal(name, nodeName === true ? null : nodeName, props);
        }
    }
    prepareParser() {
        let rules = time("Simplify rules", () => simplifyRules(this.rules, [
            ...this.skipRules,
            ...this.terms.tops
        ]));
        let { nodeTypes, names: termNames, minRepeatTerm, maxTerm } = this.terms.finish(rules);
        for (let prop in this.namedTerms)
            this.termTable[prop] = this.namedTerms[prop].id;
        if (/\bgrammar\b/.test(verbose))
            console.log(rules.join("\n"));
        let startTerms = this.terms.tops.slice();
        let first = computeFirstSets(this.terms);
        let skipInfo = this.skipRules.map((name, id) => {
            let skip = [], startTokens = [], rules = [];
            for (let rule of name.rules) {
                if (!rule.parts.length)
                    continue;
                let start = rule.parts[0];
                for (let t of start.terminal ? [start] : first[start.name] || [])
                    if (t && !startTokens.includes(t))
                        startTokens.push(t);
                if (start.terminal && rule.parts.length == 1 && !rules.some(r => r != rule && r.parts[0] == start))
                    skip.push(start);
                else
                    rules.push(rule);
            }
            name.rules = rules;
            if (rules.length)
                startTerms.push(name);
            return { skip, rule: rules.length ? name : null, startTokens, id };
        });
        let fullTable = time("Build full automaton", () => buildFullAutomaton(this.terms, startTerms, first));
        let localTokens = this.localTokens
            .map((grp, i) => grp.buildLocalGroup(fullTable, skipInfo, i));
        let { tokenGroups, tokenPrec, tokenData } = time("Build token groups", () => this.tokens.buildTokenGroups(fullTable, skipInfo, localTokens.length));
        for (let ext of this.externalTokens)
            ext.checkConflicts(fullTable, skipInfo);
        let table = time("Finish automaton", () => finishAutomaton(fullTable));
        let skipState = findSkipStates(table, this.terms.tops);
        if (/\blr\b/.test(verbose))
            console.log(table.join("\n"));
        let specialized = [];
        for (let ext of this.externalSpecializers)
            specialized.push(ext);
        for (let name in this.specialized)
            specialized.push({ token: this.terms.names[name], table: buildSpecializeTable(this.specialized[name]) });
        let tokStart = (tokenizer) => {
            if (tokenizer instanceof ExternalTokenSet)
                return tokenizer.ast.start;
            return this.tokens.ast ? this.tokens.ast.start : -1;
        };
        let tokenizers = tokenGroups
            .concat(this.externalTokens)
            .sort((a, b) => tokStart(a) - tokStart(b))
            .concat(localTokens);
        let data = new DataBuilder;
        let skipData = skipInfo.map(info => {
            let actions = [];
            for (let term of info.skip)
                actions.push(term.id, 0, 262144 /* Action.StayFlag */ >> 16);
            if (info.rule) {
                let state = table.find(s => s.startRule == info.rule);
                for (let action of state.actions)
                    actions.push(action.term.id, state.id, 131072 /* Action.GotoFlag */ >> 16);
            }
            actions.push(65535 /* Seq.End */, 0 /* Seq.Done */);
            return data.storeArray(actions);
        });
        let states = time("Finish states", () => {
            let states = new Uint32Array(table.length * 6 /* ParseState.Size */);
            let forceReductions = this.computeForceReductions(table, skipInfo);
            let finishCx = new FinishStateContext(tokenizers, data, states, skipData, skipInfo, table, this);
            for (let s of table)
                finishCx.finish(s, skipState(s.id), forceReductions[s.id]);
            return states;
        });
        let dialects = Object.create(null);
        for (let i = 0; i < this.dialects.length; i++)
            dialects[this.dialects[i]] = data.storeArray((this.tokens.byDialect[i] || none).map(t => t.id).concat(65535 /* Seq.End */));
        let dynamicPrecedences = null;
        if (this.dynamicRulePrecedences.length) {
            dynamicPrecedences = Object.create(null);
            for (let { rule, prec } of this.dynamicRulePrecedences)
                dynamicPrecedences[rule.id] = prec;
        }
        let topRules = Object.create(null);
        for (let term of this.terms.tops)
            topRules[term.nodeName] = [table.find(state => state.startRule == term).id, term.id];
        let precTable = data.storeArray(tokenPrec.concat(65535 /* Seq.End */));
        let { nodeProps, skippedTypes } = this.gatherNodeProps(nodeTypes);
        return {
            states,
            stateData: data.finish(),
            goto: computeGotoTable(table),
            nodeNames: nodeTypes.filter(t => t.id < minRepeatTerm).map(t => t.nodeName).join(" "),
            nodeProps,
            skippedTypes,
            maxTerm,
            repeatNodeCount: nodeTypes.length - minRepeatTerm,
            tokenizers,
            tokenData,
            topRules,
            dialects,
            dynamicPrecedences,
            specialized,
            tokenPrec: precTable,
            termNames
        };
    }
    getParser() {
        let { states, stateData, goto, nodeNames, nodeProps: rawNodeProps, skippedTypes, maxTerm, repeatNodeCount, tokenizers, tokenData, topRules, dialects, dynamicPrecedences, specialized: rawSpecialized, tokenPrec, termNames } = this.prepareParser();
        let specialized = rawSpecialized.map(v => {
            if (v instanceof ExternalSpecializer) {
                let ext = this.options.externalSpecializer(v.ast.id.name, this.termTable);
                return {
                    term: v.term.id,
                    get: (value, stack) => (ext(value, stack) << 1) |
                        (v.ast.type == "extend" ? 1 /* Specialize.Extend */ : 0 /* Specialize.Specialize */),
                    external: ext,
                    extend: v.ast.type == "extend"
                };
            }
            else {
                return { term: v.token.id, get: (value) => v.table[value] || -1 };
            }
        });
        return LRParser.deserialize({
            version: 14 /* File.Version */,
            states,
            stateData,
            goto,
            nodeNames,
            maxTerm,
            repeatNodeCount,
            nodeProps: rawNodeProps.map(({ prop, terms }) => [this.knownProps[prop].prop, ...terms]),
            propSources: !this.options.externalPropSource ? undefined
                : this.ast.externalPropSources.map(s => this.options.externalPropSource(s.id.name)),
            skippedNodes: skippedTypes,
            tokenData,
            tokenizers: tokenizers.map(tok => tok.create()),
            context: !this.ast.context ? undefined
                : typeof this.options.contextTracker == "function" ? this.options.contextTracker(this.termTable)
                    : this.options.contextTracker,
            topRules,
            dialects,
            dynamicPrecedences,
            specialized,
            tokenPrec,
            termNames
        });
    }
    getParserFile() {
        let { states, stateData, goto, nodeNames, nodeProps: rawNodeProps, skippedTypes, maxTerm, repeatNodeCount, tokenizers: rawTokenizers, tokenData, topRules, dialects: rawDialects, dynamicPrecedences, specialized: rawSpecialized, tokenPrec, termNames } = this.prepareParser();
        let mod = this.options.moduleStyle || "es";
        let gen = "// This file was generated by lezer-generator. You probably shouldn't edit it.\n", head = gen;
        let imports = {}, imported = Object.create(null);
        let defined = Object.create(null);
        for (let word of KEYWORDS)
            defined[word] = true;
        let exportName = this.options.exportName || "parser";
        defined[exportName] = true;
        let getName = (prefix) => {
            for (let i = 0;; i++) {
                let id = prefix + (i ? "_" + i : "");
                if (!defined[id])
                    return id;
            }
        };
        let importName = (name, source, prefix = name) => {
            let spec = name + " from " + source;
            if (imported[spec])
                return imported[spec];
            let src = JSON.stringify(source), varName = name;
            if (name in defined) {
                varName = getName(prefix);
                name += `${mod == "cjs" ? ":" : " as"} ${varName}`;
            }
            defined[varName] = true;
            (imports[src] || (imports[src] = [])).push(name);
            return imported[spec] = varName;
        };
        let lrParser = importName("LRParser", "@lezer/lr");
        let tokenizers = rawTokenizers.map(tok => tok.createSource(importName));
        let context = this.ast.context ? importName(this.ast.context.id.name, this.ast.context.source) : null;
        let nodeProps = rawNodeProps.map(({ prop, terms }) => {
            let { source } = this.knownProps[prop];
            let propID = source.from ? importName(source.name, source.from) : JSON.stringify(source.name);
            return `[${propID}, ${terms.map(serializePropValue).join(",")}]`;
        });
        function specializationTableString(table) {
            return "{__proto__:null," + Object.keys(table).map(key => `${/^(\d+|[a-zA-Z_]\w*)$/.test(key) ? key : JSON.stringify(key)}:${table[key]}`)
                .join(", ") + "}";
        }
        let specHead = "";
        let specialized = rawSpecialized.map(v => {
            if (v instanceof ExternalSpecializer) {
                let name = importName(v.ast.id.name, v.ast.source);
                let ts = this.options.typeScript ? ": any" : "";
                return `{term: ${v.term.id}, get: (value${ts}, stack${ts}) => (${name}(value, stack) << 1)${v.ast.type == "extend" ? ` | ${1 /* Specialize.Extend */}` : ''}, external: ${name}${v.ast.type == "extend" ? ', extend: true' : ''}}`;
            }
            else {
                let tableName = getName("spec_" + v.token.name.replace(/\W/g, ""));
                defined[tableName] = true;
                specHead += `const ${tableName} = ${specializationTableString(v.table)}\n`;
                let ts = this.options.typeScript ? `: keyof typeof ${tableName}` : "";
                return `{term: ${v.token.id}, get: (value${ts}) => ${tableName}[value] || -1}`;
            }
        });
        let propSources = this.ast.externalPropSources.map(s => importName(s.id.name, s.source));
        for (let source in imports) {
            if (mod == "cjs")
                head += `const {${imports[source].join(", ")}} = require(${source})\n`;
            else
                head += `import {${imports[source].join(", ")}} from ${source}\n`;
        }
        head += specHead;
        function serializePropValue(value) {
            return typeof value != "string" || /^(true|false|\d+(\.\d+)?|\.\d+)$/.test(value) ? value : JSON.stringify(value);
        }
        let dialects = Object.keys(rawDialects).map(d => `${d}: ${rawDialects[d]}`);
        let parserStr = `${lrParser}.deserialize({
  version: ${14 /* File.Version */},
  states: ${encodeArray(states, 0xffffffff)},
  stateData: ${encodeArray(stateData)},
  goto: ${encodeArray(goto)},
  nodeNames: ${JSON.stringify(nodeNames)},
  maxTerm: ${maxTerm}${context ? `,
  context: ${context}` : ""}${nodeProps.length ? `,
  nodeProps: [
    ${nodeProps.join(",\n    ")}
  ]` : ""}${propSources.length ? `,
  propSources: [${propSources.join()}]` : ""}${skippedTypes.length ? `,
  skippedNodes: ${JSON.stringify(skippedTypes)}` : ""},
  repeatNodeCount: ${repeatNodeCount},
  tokenData: ${encodeArray(tokenData)},
  tokenizers: [${tokenizers.join(", ")}],
  topRules: ${JSON.stringify(topRules)}${dialects.length ? `,
  dialects: {${dialects.join(", ")}}` : ""}${dynamicPrecedences ? `,
  dynamicPrecedences: ${JSON.stringify(dynamicPrecedences)}` : ""}${specialized.length ? `,
  specialized: [${specialized.join(",")}]` : ""},
  tokenPrec: ${tokenPrec}${this.options.includeNames ? `,
  termNames: ${JSON.stringify(termNames)}` : ''}
})`;
        let terms = [];
        for (let name in this.termTable) {
            let id = name;
            if (KEYWORDS.includes(id))
                for (let i = 1;; i++) {
                    id = "_".repeat(i) + name;
                    if (!(id in this.termTable))
                        break;
                }
            else if (!/^[\w$]+$/.test(name)) {
                continue;
            }
            terms.push(`${id}${mod == "cjs" ? ":" : " ="} ${this.termTable[name]}`);
        }
        for (let id = 0; id < this.dialects.length; id++)
            terms.push(`Dialect_${this.dialects[id]}${mod == "cjs" ? ":" : " ="} ${id}`);
        return {
            parser: head + (mod == "cjs" ? `exports.${exportName} = ${parserStr}\n` : `export const ${exportName} = ${parserStr}\n`),
            terms: mod == "cjs" ? `${gen}module.exports = {\n  ${terms.join(",\n  ")}\n}`
                : `${gen}export const\n  ${terms.join(",\n  ")}\n`
        };
    }
    gatherNonSkippedNodes() {
        let seen = Object.create(null);
        let work = [];
        let add = (term) => {
            if (!seen[term.id]) {
                seen[term.id] = true;
                work.push(term);
            }
        };
        this.terms.tops.forEach(add);
        for (let i = 0; i < work.length; i++) {
            for (let rule of work[i].rules)
                for (let part of rule.parts)
                    add(part);
        }
        return seen;
    }
    gatherNodeProps(nodeTypes) {
        let notSkipped = this.gatherNonSkippedNodes(), skippedTypes = [];
        let nodeProps = [];
        for (let type of nodeTypes) {
            if (!notSkipped[type.id] && !type.error)
                skippedTypes.push(type.id);
            for (let prop in type.props) {
                let known = this.knownProps[prop];
                if (!known)
                    throw new GenError("No known prop type for " + prop);
                if (known.source.from == null && (known.source.name == "repeated" || known.source.name == "error"))
                    continue;
                let rec = nodeProps.find(r => r.prop == prop);
                if (!rec)
                    nodeProps.push(rec = { prop, values: {} });
                (rec.values[type.props[prop]] || (rec.values[type.props[prop]] = [])).push(type.id);
            }
        }
        return {
            nodeProps: nodeProps.map(({ prop, values }) => {
                let terms = [];
                for (let val in values) {
                    let ids = values[val];
                    if (ids.length == 1) {
                        terms.push(ids[0], val);
                    }
                    else {
                        terms.push(-ids.length);
                        for (let id of ids)
                            terms.push(id);
                        terms.push(val);
                    }
                }
                return { prop, terms };
            }),
            skippedTypes
        };
    }
    makeTerminal(name, tag, props) {
        return this.terms.makeTerminal(this.terms.uniqueName(name), tag, props);
    }
    computeForceReductions(states, skipInfo) {
        // This finds a forced reduction for every state, trying to guard
        // against cyclic forced reductions, where a given parse stack can
        // endlessly continue running forced reductions without making any
        // progress.
        //
        // This occurs with length-1 reductions. We never generate
        // length-0 reductions, and length-2+ reductions always shrink the
        // stack, so they are guaranteed to make progress.
        //
        // If there are states S1 and S2 whose forced reductions reduce
        // terms T1 and T2 respectively, both with a length of 1, _and_
        // there is a state S3, which has goto entries T1 -> S2, T2 -> S1,
        // you can get cyclic reductions. Of course, the cycle may also
        // contain more than two steps.
        let reductions = [];
        let candidates = [];
        // A map from terms to states that they are mapped to in goto
        // entries.
        let gotoEdges = Object.create(null);
        for (let state of states) {
            reductions.push(0);
            for (let edge of state.goto) {
                let array = gotoEdges[edge.term.id] || (gotoEdges[edge.term.id] = []);
                let found = array.find(o => o.target == edge.target.id);
                if (found)
                    found.parents.push(state.id);
                else
                    array.push({ parents: [state.id], target: edge.target.id });
            }
            candidates[state.id] = state.set.filter(pos => pos.pos > 0 && !pos.rule.name.top)
                .sort((a, b) => b.pos - a.pos || a.rule.parts.length - b.rule.parts.length);
        }
        // Mapping from state ids to terms that that state has a length-1
        // forced reduction for.
        let length1Reductions = Object.create(null);
        function createsCycle(term, startState, parents = null) {
            let edges = gotoEdges[term];
            if (!edges)
                return false;
            return edges.some(val => {
                let parentIntersection = parents ? parents.filter(id => val.parents.includes(id)) : val.parents;
                if (parentIntersection.length == 0)
                    return false;
                if (val.target == startState)
                    return true;
                let found = length1Reductions[val.target];
                return found != null && createsCycle(found, startState, parentIntersection);
            });
        }
        for (let state of states) {
            if (state.defaultReduce && state.defaultReduce.parts.length > 0) {
                reductions[state.id] = reduceAction(state.defaultReduce, skipInfo);
                if (state.defaultReduce.parts.length == 1)
                    length1Reductions[state.id] = state.defaultReduce.name.id;
            }
        }
        // To avoid painting states that only have one potential forced
        // reduction into a corner, reduction assignment is done by
        // candidate size, starting with the states with fewer candidates.
        for (let setSize = 1;; setSize++) {
            let done = true;
            for (let state of states) {
                if (state.defaultReduce)
                    continue;
                let set = candidates[state.id];
                if (set.length != setSize) {
                    if (set.length > setSize)
                        done = false;
                    continue;
                }
                for (let pos of set) {
                    if (pos.pos != 1 || !createsCycle(pos.rule.name.id, state.id)) {
                        reductions[state.id] = reduceAction(pos.rule, skipInfo, pos.pos);
                        if (pos.pos == 1)
                            length1Reductions[state.id] = pos.rule.name.id;
                        break;
                    }
                }
            }
            if (done)
                break;
        }
        return reductions;
    }
    substituteArgs(expr, args, params) {
        if (args.length == 0)
            return expr;
        return expr.walk(expr => {
            let found;
            if (expr instanceof NameExpression &&
                (found = params.findIndex(p => p.name == expr.id.name)) > -1) {
                let arg = args[found];
                if (expr.args.length) {
                    if (arg instanceof NameExpression && !arg.args.length)
                        return new NameExpression(expr.start, arg.id, expr.args);
                    this.raise(`Passing arguments to a parameter that already has arguments`, expr.start);
                }
                return arg;
            }
            else if (expr instanceof InlineRuleExpression) {
                let r = expr.rule, props = this.substituteArgsInProps(r.props, args, params);
                return props == r.props ? expr :
                    new InlineRuleExpression(expr.start, new RuleDeclaration(r.start, r.id, props, r.params, r.expr));
            }
            else if (expr instanceof SpecializeExpression) {
                let props = this.substituteArgsInProps(expr.props, args, params);
                return props == expr.props ? expr :
                    new SpecializeExpression(expr.start, expr.type, props, expr.token, expr.content);
            }
            return expr;
        });
    }
    substituteArgsInProps(props, args, params) {
        let substituteInValue = (value) => {
            let result = value;
            for (let i = 0; i < value.length; i++) {
                let part = value[i];
                if (!part.name)
                    continue;
                let found = params.findIndex(p => p.name == part.name);
                if (found < 0)
                    continue;
                if (result == value)
                    result = value.slice();
                let expr = args[found];
                if (expr instanceof NameExpression && !expr.args.length)
                    result[i] = new PropPart(part.start, expr.id.name, null);
                else if (expr instanceof LiteralExpression)
                    result[i] = new PropPart(part.start, expr.value, null);
                else
                    this.raise(`Trying to interpolate expression '${expr}' into a prop`, part.start);
            }
            return result;
        };
        let result = props;
        for (let i = 0; i < props.length; i++) {
            let prop = props[i], value = substituteInValue(prop.value);
            if (value != prop.value) {
                if (result == props)
                    result = props.slice();
                result[i] = new Prop(prop.start, prop.at, prop.name, value);
            }
        }
        return result;
    }
    conflictsFor(markers) {
        let here = Conflicts.none, atEnd = Conflicts.none;
        for (let marker of markers) {
            if (marker.type == "ambig") {
                here = here.join(new Conflicts(0, [marker.id.name]));
            }
            else {
                let precs = this.ast.precedences;
                let index = precs ? precs.items.findIndex(item => item.id.name == marker.id.name) : -1;
                if (index < 0)
                    this.raise(`Reference to unknown precedence: '${marker.id.name}'`, marker.id.start);
                let prec = precs.items[index], value = precs.items.length - index;
                if (prec.type == "cut") {
                    here = here.join(new Conflicts(0, none, value));
                }
                else {
                    here = here.join(new Conflicts(value << 2));
                    atEnd = atEnd.join(new Conflicts((value << 2) + (prec.type == "left" ? 1 : prec.type == "right" ? -1 : 0)));
                }
            }
        }
        return { here, atEnd };
    }
    raise(message, pos = 1) {
        return this.input.raise(message, pos);
    }
    warn(message, pos = -1) {
        let msg = this.input.message(message, pos);
        if (this.options.warn)
            this.options.warn(msg);
        else
            console.warn(msg);
    }
    defineRule(name, choices) {
        let skip = this.currentSkip[this.currentSkip.length - 1];
        for (let choice of choices)
            this.rules.push(new Rule(name, choice.terms, choice.ensureConflicts(), skip));
    }
    resolve(expr) {
        for (let built of this.built)
            if (built.matches(expr))
                return [p(built.term)];
        let found = this.tokens.getToken(expr);
        if (found)
            return [p(found)];
        for (let grp of this.localTokens) {
            let found = grp.getToken(expr);
            if (found)
                return [p(found)];
        }
        for (let ext of this.externalTokens) {
            let found = ext.getToken(expr);
            if (found)
                return [p(found)];
        }
        for (let ext of this.externalSpecializers) {
            let found = ext.getToken(expr);
            if (found)
                return [p(found)];
        }
        let known = this.astRules.find(r => r.rule.id.name == expr.id.name);
        if (!known)
            return this.raise(`Reference to undefined rule '${expr.id.name}'`, expr.start);
        if (known.rule.params.length != expr.args.length)
            this.raise(`Wrong number or arguments for '${expr.id.name}'`, expr.start);
        this.used(known.rule.id.name);
        return [p(this.buildRule(known.rule, expr.args, known.skip))];
    }
    // For tree-balancing reasons, repeat expressions X+ have to be
    // normalized to something like
    //
    //     R -> X | R R
    //
    // Returns the `R` term.
    normalizeRepeat(expr) {
        let known = this.built.find(b => b.matchesRepeat(expr));
        if (known)
            return p(known.term);
        let name = expr.expr.prec < expr.prec ? `(${expr.expr})+` : `${expr.expr}+`;
        let term = this.terms.makeRepeat(this.terms.uniqueName(name));
        this.built.push(new BuiltRule("+", [expr.expr], term));
        this.defineRule(term, this.normalizeExpr(expr.expr).concat(p(term, term)));
        return p(term);
    }
    normalizeSequence(expr) {
        let result = expr.exprs.map(e => this.normalizeExpr(e));
        let builder = this;
        function complete(start, from, endConflicts) {
            let { here, atEnd } = builder.conflictsFor(expr.markers[from]);
            if (from == result.length)
                return [start.withConflicts(start.terms.length, here.join(endConflicts))];
            let choices = [];
            for (let choice of result[from]) {
                for (let full of complete(start.concat(choice).withConflicts(start.terms.length, here), from + 1, endConflicts.join(atEnd)))
                    choices.push(full);
            }
            return choices;
        }
        return complete(Parts.none, 0, Conflicts.none);
    }
    normalizeExpr(expr) {
        if (expr instanceof RepeatExpression && expr.kind == "?") {
            return [Parts.none, ...this.normalizeExpr(expr.expr)];
        }
        else if (expr instanceof RepeatExpression) {
            let repeated = this.normalizeRepeat(expr);
            return expr.kind == "+" ? [repeated] : [Parts.none, repeated];
        }
        else if (expr instanceof ChoiceExpression) {
            return expr.exprs.reduce((o, e) => o.concat(this.normalizeExpr(e)), []);
        }
        else if (expr instanceof SequenceExpression) {
            return this.normalizeSequence(expr);
        }
        else if (expr instanceof LiteralExpression) {
            return [p(this.tokens.getLiteral(expr))];
        }
        else if (expr instanceof NameExpression) {
            return this.resolve(expr);
        }
        else if (expr instanceof SpecializeExpression) {
            return [p(this.resolveSpecialization(expr))];
        }
        else if (expr instanceof InlineRuleExpression) {
            return [p(this.buildRule(expr.rule, none, this.currentSkip[this.currentSkip.length - 1], true))];
        }
        else {
            return this.raise(`This type of expression ('${expr}') may not occur in non-token rules`, expr.start);
        }
    }
    buildRule(rule, args, skip, inline = false) {
        let expr = this.substituteArgs(rule.expr, args, rule.params);
        let { name: nodeName, props, dynamicPrec, inline: explicitInline, group, exported } = this.nodeInfo(rule.props || none, inline ? "pg" : "pgi", rule.id.name, args, rule.params, rule.expr);
        if (exported && rule.params.length)
            this.warn(`Can't export parameterized rules`, rule.start);
        if (exported && inline)
            this.warn(`Can't export inline rule`, rule.start);
        let name = this.newName(rule.id.name + (args.length ? "<" + args.join(",") + ">" : ""), nodeName || true, props);
        if (explicitInline)
            name.inline = true;
        if (dynamicPrec)
            this.registerDynamicPrec(name, dynamicPrec);
        if ((name.nodeType || exported) && rule.params.length == 0) {
            if (!nodeName)
                name.preserve = true;
            if (!inline)
                this.namedTerms[exported || rule.id.name] = name;
        }
        if (!inline)
            this.built.push(new BuiltRule(rule.id.name, args, name));
        this.currentSkip.push(skip);
        let parts = this.normalizeExpr(expr);
        if (parts.length > 100 * (expr instanceof ChoiceExpression ? expr.exprs.length : 1))
            this.warn(`Rule ${rule.id.name} is generating a lot (${parts.length}) of choices.\n  Consider splitting it up or reducing the amount of ? or | operator uses.`, rule.start);
        if (/\brulesize\b/.test(verbose) && parts.length > 10)
            console.log(`Rule ${rule.id.name}: ${parts.length} variants`);
        this.defineRule(name, parts);
        this.currentSkip.pop();
        if (group)
            this.definedGroups.push({ name, group, rule });
        return name;
    }
    nodeInfo(props, 
    // p for dynamic precedence, d for dialect, i for inline, g for group, a for disabling the ignore test for default name
    allow, defaultName = null, args = none, params = none, expr, defaultProps) {
        let result = {};
        let name = defaultName && (allow.indexOf("a") > -1 || !ignored(defaultName)) && !/ /.test(defaultName) ? defaultName : null;
        let dialect = null, dynamicPrec = 0, inline = false, group = null, exported = null;
        for (let prop of props) {
            if (!prop.at) {
                if (!this.knownProps[prop.name]) {
                    let builtin = ["name", "dialect", "dynamicPrecedence", "export", "isGroup"].includes(prop.name)
                        ? ` (did you mean '@${prop.name}'?)` : "";
                    this.raise(`Unknown prop name '${prop.name}'${builtin}`, prop.start);
                }
                result[prop.name] = this.finishProp(prop, args, params);
            }
            else if (prop.name == "name") {
                name = this.finishProp(prop, args, params);
                if (/ /.test(name))
                    this.raise(`Node names cannot have spaces ('${name}')`, prop.start);
            }
            else if (prop.name == "dialect") {
                if (allow.indexOf("d") < 0)
                    this.raise("Can't specify a dialect on non-token rules", props[0].start);
                if (prop.value.length != 1 && !prop.value[0].value)
                    this.raise("The '@dialect' rule prop must hold a plain string value");
                let dialectID = this.dialects.indexOf(prop.value[0].value);
                if (dialectID < 0)
                    this.raise(`Unknown dialect '${prop.value[0].value}'`, prop.value[0].start);
                dialect = dialectID;
            }
            else if (prop.name == "dynamicPrecedence") {
                if (allow.indexOf("p") < 0)
                    this.raise("Dynamic precedence can only be specified on nonterminals");
                if (prop.value.length != 1 || !/^-?(?:10|\d)$/.test(prop.value[0].value))
                    this.raise("The '@dynamicPrecedence' rule prop must hold an integer between -10 and 10");
                dynamicPrec = +prop.value[0].value;
            }
            else if (prop.name == "inline") {
                if (prop.value.length)
                    this.raise("'@inline' doesn't take a value", prop.value[0].start);
                if (allow.indexOf("i") < 0)
                    this.raise("Inline can only be specified on nonterminals");
                inline = true;
            }
            else if (prop.name == "isGroup") {
                if (allow.indexOf("g") < 0)
                    this.raise("'@isGroup' can only be specified on nonterminals");
                group = prop.value.length ? this.finishProp(prop, args, params) : defaultName;
            }
            else if (prop.name == "export") {
                if (prop.value.length)
                    exported = this.finishProp(prop, args, params);
                else
                    exported = defaultName;
            }
            else {
                this.raise(`Unknown built-in prop name '@${prop.name}'`, prop.start);
            }
        }
        if (expr && this.ast.autoDelim && (name || hasProps(result))) {
            let delim = this.findDelimiters(expr);
            if (delim) {
                addToProp(delim[0], "closedBy", delim[1].nodeName);
                addToProp(delim[1], "openedBy", delim[0].nodeName);
            }
        }
        if (defaultProps && hasProps(defaultProps)) {
            for (let prop in defaultProps)
                if (!(prop in result))
                    result[prop] = defaultProps[prop];
        }
        if (hasProps(result) && !name)
            this.raise(`Node has properties but no name`, props.length ? props[0].start : expr.start);
        if (inline && (hasProps(result) || dialect || dynamicPrec))
            this.raise(`Inline nodes can't have props, dynamic precedence, or a dialect`, props[0].start);
        if (inline && name)
            name = null;
        return { name, props: result, dialect, dynamicPrec, inline, group, exported };
    }
    finishProp(prop, args, params) {
        return prop.value.map(part => {
            if (part.value)
                return part.value;
            let pos = params.findIndex(param => param.name == part.name);
            if (pos < 0)
                this.raise(`Property refers to '${part.name}', but no parameter by that name is in scope`, part.start);
            let expr = args[pos];
            if (expr instanceof NameExpression && !expr.args.length)
                return expr.id.name;
            if (expr instanceof LiteralExpression)
                return expr.value;
            return this.raise(`Expression '${expr}' can not be used as part of a property value`, part.start);
        }).join("");
    }
    resolveSpecialization(expr) {
        let type = expr.type;
        let { name, props, dialect, exported } = this.nodeInfo(expr.props, "d");
        let terminal = this.normalizeExpr(expr.token);
        if (terminal.length != 1 || terminal[0].terms.length != 1 || !terminal[0].terms[0].terminal)
            this.raise(`The first argument to '${type}' must resolve to a token`, expr.token.start);
        let values, lit;
        if ((lit = isLiteralToken(expr.content)) != null)
            values = [lit];
        else if ((expr.content instanceof ChoiceExpression) && expr.content.exprs.every(e => isLiteralToken(e) != null))
            values = expr.content.exprs.map(isLiteralToken);
        else
            return this.raise(`The second argument to '${expr.type}' must be a literal or choice of literals`, expr.content.start);
        let term = terminal[0].terms[0], token = null;
        let table = this.specialized[term.name] || (this.specialized[term.name] = []);
        for (let value of values) {
            let known = table.find(sp => sp.value == value);
            if (known == null) {
                if (!token) {
                    token = this.makeTerminal(term.name + "/" + JSON.stringify(value), name, props);
                    if (dialect != null)
                        (this.tokens.byDialect[dialect] || (this.tokens.byDialect[dialect] = [])).push(token);
                }
                table.push({ value, term: token, type, dialect, name });
                this.tokenOrigins[token.name] = { spec: term };
                if (name || exported) {
                    if (!name)
                        token.preserve = true;
                    this.namedTerms[exported || name] = token;
                }
            }
            else {
                if (known.type != type)
                    this.raise(`Conflicting specialization types for ${JSON.stringify(value)} of ${term.name} (${type} vs ${known.type})`, expr.start);
                if (known.dialect != dialect)
                    this.raise(`Conflicting dialects for specialization ${JSON.stringify(value)} of ${term.name}`, expr.start);
                if (known.name != name)
                    this.raise(`Conflicting names for specialization ${JSON.stringify(value)} of ${term.name}`, expr.start);
                if (token && known.term != token)
                    this.raise(`Conflicting specialization tokens for ${JSON.stringify(value)} of ${term.name}`, expr.start);
                token = known.term;
            }
        }
        return token;
    }
    findDelimiters(expr) {
        if (!(expr instanceof SequenceExpression) || expr.exprs.length < 2)
            return null;
        let findToken = (expr) => {
            if (expr instanceof LiteralExpression)
                return { term: this.tokens.getLiteral(expr), str: expr.value };
            if (expr instanceof NameExpression && expr.args.length == 0) {
                let rule = this.ast.rules.find(r => r.id.name == expr.id.name);
                if (rule)
                    return findToken(rule.expr);
                let token = this.tokens.rules.find(r => r.id.name == expr.id.name);
                if (token && token.expr instanceof LiteralExpression)
                    return { term: this.tokens.getToken(expr), str: token.expr.value };
            }
            return null;
        };
        let lastToken = findToken(expr.exprs[expr.exprs.length - 1]);
        if (!lastToken || !lastToken.term.nodeName)
            return null;
        const brackets = ["()", "[]", "{}", "<>"];
        let bracket = brackets.find(b => lastToken.str.indexOf(b[1]) > -1 && lastToken.str.indexOf(b[0]) < 0);
        if (!bracket)
            return null;
        let firstToken = findToken(expr.exprs[0]);
        if (!firstToken || !firstToken.term.nodeName ||
            firstToken.str.indexOf(bracket[0]) < 0 || firstToken.str.indexOf(bracket[1]) > -1)
            return null;
        return [firstToken.term, lastToken.term];
    }
    registerDynamicPrec(term, prec) {
        this.dynamicRulePrecedences.push({ rule: term, prec });
        term.preserve = true;
    }
    defineGroup(rule, group, ast) {
        var _a;
        let recur = [];
        let getNamed = (rule) => {
            if (rule.nodeName)
                return [rule];
            if (recur.includes(rule))
                this.raise(`Rule '${ast.id.name}' cannot define a group because it contains a non-named recursive rule ('${rule.name}')`, ast.start);
            let result = [];
            recur.push(rule);
            for (let r of this.rules)
                if (r.name == rule) {
                    let names = r.parts.map(getNamed).filter(x => x.length);
                    if (names.length > 1)
                        this.raise(`Rule '${ast.id.name}' cannot define a group because some choices produce multiple named nodes`, ast.start);
                    if (names.length == 1)
                        for (let n of names[0])
                            result.push(n);
                }
            recur.pop();
            return result;
        };
        for (let name of getNamed(rule))
            name.props["group"] = (((_a = name.props["group"]) === null || _a === void 0 ? void 0 : _a.split(" ")) || []).concat(group).sort().join(" ");
    }
    checkGroups() {
        let groups = Object.create(null), nodeNames = Object.create(null);
        for (let term of this.terms.terms)
            if (term.nodeName) {
                nodeNames[term.nodeName] = true;
                if (term.props["group"])
                    for (let group of term.props["group"].split(" ")) {
                        (groups[group] || (groups[group] = [])).push(term);
                    }
            }
        let names = Object.keys(groups);
        for (let i = 0; i < names.length; i++) {
            let name = names[i], terms = groups[name];
            if (nodeNames[name])
                this.warn(`Group name '${name}' conflicts with a node of the same name`);
            for (let j = i + 1; j < names.length; j++) {
                let other = groups[names[j]];
                if (terms.some(t => other.includes(t)) &&
                    (terms.length > other.length ? other.some(t => !terms.includes(t)) : terms.some(t => !other.includes(t))))
                    this.warn(`Groups '${name}' and '${names[j]}' overlap without one being a superset of the other`);
            }
        }
    }
}
function isLiteralToken(expr) {
    if (expr instanceof LiteralExpression)
        return expr.value;
    if (expr instanceof SequenceExpression) {
        let result = "";
        for (let sub of expr.exprs) {
            let lit = isLiteralToken(sub);
            if (lit == null)
                return null;
            result += lit;
        }
        return result;
    }
    return null;
}
const MinSharedActions = 5;
class FinishStateContext {
    constructor(tokenizers, data, stateArray, skipData, skipInfo, states, builder) {
        this.tokenizers = tokenizers;
        this.data = data;
        this.stateArray = stateArray;
        this.skipData = skipData;
        this.skipInfo = skipInfo;
        this.states = states;
        this.builder = builder;
        this.sharedActions = [];
    }
    findSharedActions(state) {
        if (state.actions.length < MinSharedActions)
            return null;
        let found = null;
        for (let shared of this.sharedActions) {
            if ((!found || shared.actions.length > found.actions.length) &&
                shared.actions.every(a => state.actions.some(b => b.eq(a))))
                found = shared;
        }
        if (found)
            return found;
        let max = null, scratch = [];
        for (let i = state.id + 1; i < this.states.length; i++) {
            let other = this.states[i], fill = 0;
            if (other.defaultReduce || other.actions.length < MinSharedActions)
                continue;
            for (let a of state.actions)
                for (let b of other.actions)
                    if (a.eq(b))
                        scratch[fill++] = a;
            if (fill >= MinSharedActions && (!max || max.length < fill)) {
                max = scratch;
                scratch = [];
            }
        }
        if (!max)
            return null;
        let result = { actions: max, addr: this.storeActions(max, -1, null) };
        this.sharedActions.push(result);
        return result;
    }
    storeActions(actions, skipReduce, shared) {
        if (skipReduce < 0 && shared && shared.actions.length == actions.length)
            return shared.addr;
        let data = [];
        for (let action of actions) {
            if (shared && shared.actions.some(a => a.eq(action)))
                continue;
            if (action instanceof Shift) {
                data.push(action.term.id, action.target.id, 0);
            }
            else {
                let code = reduceAction(action.rule, this.skipInfo);
                if (code != skipReduce)
                    data.push(action.term.id, code & 65535 /* Action.ValueMask */, code >> 16);
            }
        }
        data.push(65535 /* Seq.End */);
        if (skipReduce > -1)
            data.push(2 /* Seq.Other */, skipReduce & 65535 /* Action.ValueMask */, skipReduce >> 16);
        else if (shared)
            data.push(1 /* Seq.Next */, shared.addr & 0xffff, shared.addr >> 16);
        else
            data.push(0 /* Seq.Done */);
        return this.data.storeArray(data);
    }
    finish(state, isSkip, forcedReduce) {
        let b = this.builder;
        let skipID = b.skipRules.indexOf(state.skip);
        let skipTable = this.skipData[skipID], skipTerms = this.skipInfo[skipID].startTokens;
        let defaultReduce = state.defaultReduce ? reduceAction(state.defaultReduce, this.skipInfo) : 0;
        let flags = isSkip ? 1 /* StateFlag.Skipped */ : 0;
        let skipReduce = -1, shared = null;
        if (defaultReduce == 0) {
            if (isSkip)
                for (const action of state.actions)
                    if (action instanceof Reduce && action.term.eof)
                        skipReduce = reduceAction(action.rule, this.skipInfo);
            if (skipReduce < 0)
                shared = this.findSharedActions(state);
        }
        if (state.set.some(p => p.rule.name.top && p.pos == p.rule.parts.length))
            flags |= 2 /* StateFlag.Accepting */;
        let external = [];
        for (let i = 0; i < state.actions.length + skipTerms.length; i++) {
            let term = i < state.actions.length ? state.actions[i].term : skipTerms[i - state.actions.length];
            for (;;) {
                let orig = b.tokenOrigins[term.name];
                if (orig && orig.spec) {
                    term = orig.spec;
                    continue;
                }
                if (orig && (orig.external instanceof ExternalTokenSet))
                    addToSet(external, orig.external);
                break;
            }
        }
        let tokenizerMask = 0;
        for (let i = 0; i < this.tokenizers.length; i++) {
            let tok = this.tokenizers[i];
            if (external.includes(tok) || tok.groupID == state.tokenGroup)
                tokenizerMask |= (1 << i);
        }
        let base = state.id * 6 /* ParseState.Size */;
        this.stateArray[base + 0 /* ParseState.Flags */] = flags;
        this.stateArray[base + 1 /* ParseState.Actions */] = this.storeActions(defaultReduce ? none : state.actions, skipReduce, shared);
        this.stateArray[base + 2 /* ParseState.Skip */] = skipTable;
        this.stateArray[base + 3 /* ParseState.TokenizerMask */] = tokenizerMask;
        this.stateArray[base + 4 /* ParseState.DefaultReduce */] = defaultReduce;
        this.stateArray[base + 5 /* ParseState.ForcedReduce */] = forcedReduce;
    }
}
function addToProp(term, prop, value) {
    let cur = term.props[prop];
    if (!cur || cur.split(" ").indexOf(value) < 0)
        term.props[prop] = cur ? cur + " " + value : value;
}
function buildSpecializeTable(spec) {
    let table = Object.create(null);
    for (let { value, term, type } of spec) {
        let code = type == "specialize" ? 0 /* Specialize.Specialize */ : 1 /* Specialize.Extend */;
        table[value] = (term.id << 1) | code;
    }
    return table;
}
function reduceAction(rule, skipInfo, depth = rule.parts.length) {
    return rule.name.id | 65536 /* Action.ReduceFlag */ |
        (rule.isRepeatWrap && depth == rule.parts.length ? 131072 /* Action.RepeatFlag */ : 0) |
        (skipInfo.some(i => i.rule == rule.name) ? 262144 /* Action.StayFlag */ : 0) |
        (depth << 19 /* Action.ReduceDepthShift */);
}
function findArray(data, value) {
    search: for (let i = 0;;) {
        let next = data.indexOf(value[0], i);
        if (next == -1 || next + value.length > data.length)
            break;
        for (let j = 1; j < value.length; j++) {
            if (value[j] != data[next + j]) {
                i = next + 1;
                continue search;
            }
        }
        return next;
    }
    return -1;
}
function findSkipStates(table, startRules) {
    let nonSkip = Object.create(null);
    let work = [];
    let add = (state) => {
        if (!nonSkip[state.id]) {
            nonSkip[state.id] = true;
            work.push(state);
        }
    };
    for (let state of table)
        if (state.startRule && startRules.includes(state.startRule))
            add(state);
    for (let i = 0; i < work.length; i++) {
        for (let a of work[i].actions)
            if (a instanceof Shift)
                add(a.target);
        for (let a of work[i].goto)
            add(a.target);
    }
    return (id) => !nonSkip[id];
}
class DataBuilder {
    constructor() {
        this.data = [];
    }
    storeArray(data) {
        let found = findArray(this.data, data);
        if (found > -1)
            return found;
        let pos = this.data.length;
        for (let num of data)
            this.data.push(num);
        return pos;
    }
    finish() {
        return Uint16Array.from(this.data);
    }
}
// The goto table maps a start state + a term to a new state, and is
// used to determine the new state when reducing. Because this allows
// more more efficient representation and access, unlike the action
// tables, the goto table is organized by term, with groups of start
// states that map to a given end state enumerated for each term.
// Since many terms only have a single valid goto target, this makes
// it cheaper to look those up.
//
// (Unfortunately, though the standard LR parsing mechanism never
// looks up invalid goto states, the incremental parsing mechanism
// needs accurate goto information for a state/term pair, so we do
// need to store state ids even for terms that have only one target.)
//
// - First comes the amount of terms in the table
//
// - Then, for each term, the offset of the term's data
//
// - At these offsets, there's a record for each target state
//
//   - Such a record starts with the amount of start states that go to
//     this target state, shifted one to the left, with the first bit
//     only set if this is the last record for this term.
//
//   - Then follows the target state id
//
//   - And then the start state ids
function computeGotoTable(states) {
    let goto = {};
    let maxTerm = 0;
    for (let state of states) {
        for (let entry of state.goto) {
            maxTerm = Math.max(entry.term.id, maxTerm);
            let set = goto[entry.term.id] || (goto[entry.term.id] = {});
            (set[entry.target.id] || (set[entry.target.id] = [])).push(state.id);
        }
    }
    let data = new DataBuilder;
    let index = [];
    let offset = maxTerm + 2; // Offset of the data, taking index size into account
    for (let term = 0; term <= maxTerm; term++) {
        let entries = goto[term];
        if (!entries) {
            index.push(1);
            continue;
        }
        let termTable = [];
        let keys = Object.keys(entries);
        for (let target of keys) {
            let list = entries[target];
            termTable.push((target == keys[keys.length - 1] ? 1 : 0) + (list.length << 1));
            termTable.push(+target);
            for (let source of list)
                termTable.push(source);
        }
        index.push(data.storeArray(termTable) + offset);
    }
    if (index.some(n => n > 0xffff))
        throw new GenError("Goto table too large");
    return Uint16Array.from([maxTerm + 1, ...index, ...data.data]);
}
class TokenGroup {
    constructor(tokens, groupID) {
        this.tokens = tokens;
        this.groupID = groupID;
    }
    create() { return this.groupID; }
    createSource() { return String(this.groupID); }
}
function addToSet(set, value) {
    if (!set.includes(value))
        set.push(value);
}
function buildTokenMasks(groups) {
    let masks = Object.create(null);
    for (let group of groups) {
        let groupMask = 1 << group.groupID;
        for (let term of group.tokens) {
            masks[term.id] = (masks[term.id] || 0) | groupMask;
        }
    }
    return masks;
}
class TokenArg {
    constructor(name, expr, scope) {
        this.name = name;
        this.expr = expr;
        this.scope = scope;
    }
}
class BuildingRule {
    constructor(name, start, to, args) {
        this.name = name;
        this.start = start;
        this.to = to;
        this.args = args;
    }
}
class TokenSet {
    constructor(b, ast) {
        this.b = b;
        this.ast = ast;
        this.startState = new State$1;
        this.built = [];
        this.building = []; // Used for recursion check
        this.byDialect = Object.create(null);
        this.precedenceRelations = [];
        this.rules = ast ? ast.rules : none;
        for (let rule of this.rules)
            b.unique(rule.id);
    }
    getToken(expr) {
        for (let built of this.built)
            if (built.matches(expr))
                return built.term;
        let name = expr.id.name;
        let rule = this.rules.find(r => r.id.name == name);
        if (!rule)
            return null;
        let { name: nodeName, props, dialect, exported } = this.b.nodeInfo(rule.props, "d", name, expr.args, rule.params.length != expr.args.length ? none : rule.params);
        let term = this.b.makeTerminal(expr.toString(), nodeName, props);
        if (dialect != null)
            (this.byDialect[dialect] || (this.byDialect[dialect] = [])).push(term);
        if ((term.nodeType || exported) && rule.params.length == 0) {
            if (!term.nodeType)
                term.preserve = true;
            this.b.namedTerms[exported || name] = term;
        }
        this.buildRule(rule, expr, this.startState, new State$1([term]));
        this.built.push(new BuiltRule(name, expr.args, term));
        return term;
    }
    buildRule(rule, expr, from, to, args = none) {
        let name = expr.id.name;
        if (rule.params.length != expr.args.length)
            this.b.raise(`Incorrect number of arguments for token '${name}'`, expr.start);
        let building = this.building.find(b => b.name == name && exprsEq(expr.args, b.args));
        if (building) {
            if (building.to == to) {
                from.nullEdge(building.start);
                return;
            }
            let lastIndex = this.building.length - 1;
            while (this.building[lastIndex].name != name)
                lastIndex--;
            this.b.raise(`Invalid (non-tail) recursion in token rules: ${this.building.slice(lastIndex).map(b => b.name).join(" -> ")}`, expr.start);
        }
        this.b.used(rule.id.name);
        let start = new State$1;
        from.nullEdge(start);
        this.building.push(new BuildingRule(name, start, to, expr.args));
        this.build(this.b.substituteArgs(rule.expr, expr.args, rule.params), start, to, expr.args.map((e, i) => new TokenArg(rule.params[i].name, e, args)));
        this.building.pop();
    }
    build(expr, from, to, args) {
        if (expr instanceof NameExpression) {
            let name = expr.id.name, arg = args.find(a => a.name == name);
            if (arg)
                return this.build(arg.expr, from, to, arg.scope);
            let rule;
            for (let i = 0, lt = this.b.localTokens; i <= lt.length; i++) {
                let set = i == lt.length ? this.b.tokens : lt[i];
                rule = set.rules.find(r => r.id.name == name);
                if (rule)
                    break;
            }
            if (!rule)
                return this.b.raise(`Reference to token rule '${name}', which isn't found`, expr.start);
            this.buildRule(rule, expr, from, to, args);
        }
        else if (expr instanceof CharClass) {
            for (let [a, b] of CharClasses[expr.type])
                from.edge(a, b, to);
        }
        else if (expr instanceof ChoiceExpression) {
            for (let choice of expr.exprs)
                this.build(choice, from, to, args);
        }
        else if (isEmpty(expr)) {
            from.nullEdge(to);
        }
        else if (expr instanceof SequenceExpression) {
            let conflict = expr.markers.find(c => c.length > 0);
            if (conflict)
                this.b.raise("Conflict marker in token expression", conflict[0].start);
            for (let i = 0; i < expr.exprs.length; i++) {
                let next = i == expr.exprs.length - 1 ? to : new State$1;
                this.build(expr.exprs[i], from, next, args);
                from = next;
            }
        }
        else if (expr instanceof RepeatExpression) {
            if (expr.kind == "*") {
                let loop = new State$1;
                from.nullEdge(loop);
                this.build(expr.expr, loop, loop, args);
                loop.nullEdge(to);
            }
            else if (expr.kind == "+") {
                let loop = new State$1;
                this.build(expr.expr, from, loop, args);
                this.build(expr.expr, loop, loop, args);
                loop.nullEdge(to);
            }
            else { // expr.kind == "?"
                from.nullEdge(to);
                this.build(expr.expr, from, to, args);
            }
        }
        else if (expr instanceof SetExpression) {
            for (let [a, b] of expr.inverted ? invertRanges(expr.ranges) : expr.ranges)
                rangeEdges(from, to, a, b);
        }
        else if (expr instanceof LiteralExpression) {
            for (let i = 0; i < expr.value.length; i++) {
                let ch = expr.value.charCodeAt(i);
                let next = i == expr.value.length - 1 ? to : new State$1;
                from.edge(ch, ch + 1, next);
                from = next;
            }
        }
        else if (expr instanceof AnyExpression) {
            let mid = new State$1;
            from.edge(0, 0xDC00, to);
            from.edge(0xDC00, MAX_CHAR + 1, to);
            from.edge(0xD800, 0xDC00, mid);
            mid.edge(0xDC00, 0xE000, to);
        }
        else {
            return this.b.raise(`Unrecognized expression type in token`, expr.start);
        }
    }
    takePrecedences() {
        let rel = this.precedenceRelations = [];
        if (this.ast)
            for (let group of this.ast.precedences) {
                let prev = [];
                for (let item of group.items) {
                    let level = [];
                    if (item instanceof NameExpression) {
                        for (let built of this.built)
                            if (item.args.length ? built.matches(item) : built.id == item.id.name)
                                level.push(built.term);
                    }
                    else {
                        let id = JSON.stringify(item.value), found = this.built.find(b => b.id == id);
                        if (found)
                            level.push(found.term);
                    }
                    if (!level.length)
                        this.b.warn(`Precedence specified for unknown token ${item}`, item.start);
                    for (let term of level)
                        addRel(rel, term, prev);
                    prev = prev.concat(level);
                }
            }
    }
    precededBy(a, b) {
        let found = this.precedenceRelations.find(r => r.term == a);
        return found && found.after.includes(b);
    }
    buildPrecTable(softConflicts) {
        let precTable = [], rel = this.precedenceRelations.slice();
        // Add entries for soft-conflicting tokens that are in the
        // precedence table, to make sure they'll appear in the right
        // order and don't mess up the longer-wins default rule.
        for (let { a, b, soft } of softConflicts)
            if (soft) {
                if (!rel.some(r => r.term == a) || !rel.some(r => r.term == b))
                    continue;
                if (soft < 0)
                    [a, b] = [b, a]; // Now a is longer than b (and should thus take precedence)
                addRel(rel, b, [a]);
                addRel(rel, a, []);
            }
        add: while (rel.length) {
            for (let i = 0; i < rel.length; i++) {
                let record = rel[i];
                if (record.after.every(t => precTable.includes(t.id))) {
                    precTable.push(record.term.id);
                    if (rel.length == 1)
                        break add;
                    rel[i] = rel.pop();
                    continue add;
                }
            }
            this.b.raise(`Cyclic token precedence relation between ${rel.map(r => r.term).join(", ")}`);
        }
        return precTable;
    }
}
class MainTokenSet extends TokenSet {
    constructor() {
        super(...arguments);
        this.explicitConflicts = [];
    }
    getLiteral(expr) {
        let id = JSON.stringify(expr.value);
        for (let built of this.built)
            if (built.id == id)
                return built.term;
        let name = null, props = {}, dialect = null, exported = null;
        let decl = this.ast ? this.ast.literals.find(l => l.literal == expr.value) : null;
        if (decl)
            ({ name, props, dialect, exported } = this.b.nodeInfo(decl.props, "da", expr.value));
        let term = this.b.makeTerminal(id, name, props);
        if (dialect != null)
            (this.byDialect[dialect] || (this.byDialect[dialect] = [])).push(term);
        if (exported)
            this.b.namedTerms[exported] = term;
        this.build(expr, this.startState, new State$1([term]), none);
        this.built.push(new BuiltRule(id, none, term));
        return term;
    }
    takeConflicts() {
        var _a;
        let resolve = (expr) => {
            if (expr instanceof NameExpression) {
                for (let built of this.built)
                    if (built.matches(expr))
                        return built.term;
            }
            else {
                let id = JSON.stringify(expr.value), found = this.built.find(b => b.id == id);
                if (found)
                    return found.term;
            }
            this.b.warn(`Conflict specified for unknown token ${expr}`, expr.start);
            return null;
        };
        for (let c of ((_a = this.ast) === null || _a === void 0 ? void 0 : _a.conflicts) || []) {
            let a = resolve(c.a), b = resolve(c.b);
            if (a && b) {
                if (a.id < b.id)
                    [a, b] = [b, a];
                this.explicitConflicts.push({ a, b });
            }
        }
    }
    // Token groups are a mechanism for allowing conflicting (matching
    // overlapping input, without an explicit precedence being given)
    // tokens to exist in a grammar _if_ they don't occur in the same
    // place (aren't used in the same states).
    //
    // States that use tokens that conflict will raise an error when any
    // of the conflicting pairs of tokens both occur in that state.
    // Otherwise, they are assigned a token group, which includes all
    // the potentially-conflicting tokens they use. If there's already a
    // group that doesn't have any conflicts with those tokens, that is
    // reused, otherwise a new group is created.
    //
    // So each state has zero or one token groups, and each conflicting
    // token may belong to one or more groups. Tokens get assigned a
    // 16-bit bitmask with the groups they belong to set to 1 (all-1s
    // for non-conflicting tokens). When tokenizing, that mask is
    // compared to the current state's group (again using all-1s for
    // group-less states) to determine whether a token is applicable for
    // this state.
    //
    // Extended/specialized tokens are treated as their parent token for
    // this purpose.
    buildTokenGroups(states, skipInfo, startID) {
        let tokens = this.startState.compile();
        if (tokens.accepting.length)
            this.b.raise(`Grammar contains zero-length tokens (in '${tokens.accepting[0].name}')`, this.rules.find(r => r.id.name == tokens.accepting[0].name).start);
        if (/\btokens\b/.test(verbose))
            console.log(tokens.toString());
        // If there is a precedence specified for the pair, the conflict is resolved
        let allConflicts = tokens.findConflicts(checkTogether(states, this.b, skipInfo))
            .filter(({ a, b }) => !this.precededBy(a, b) && !this.precededBy(b, a));
        for (let { a, b } of this.explicitConflicts) {
            if (!allConflicts.some(c => c.a == a && c.b == b))
                allConflicts.push(new Conflict$1(a, b, 0, "", ""));
        }
        let softConflicts = allConflicts.filter(c => c.soft), conflicts = allConflicts.filter(c => !c.soft);
        let errors = [];
        let groups = [];
        for (let state of states) {
            if (state.defaultReduce || state.tokenGroup > -1)
                continue;
            // Find potentially-conflicting terms (in terms) and the things
            // they conflict with (in conflicts), and raise an error if
            // there's a token conflict directly in this state.
            let terms = [], incompatible = [];
            let skip = skipInfo[this.b.skipRules.indexOf(state.skip)].startTokens;
            for (let term of skip)
                if (state.actions.some(a => a.term == term))
                    this.b.raise(`Use of token ${term.name} conflicts with skip rule`);
            let stateTerms = [];
            for (let i = 0; i < state.actions.length + (skip ? skip.length : 0); i++) {
                let term = i < state.actions.length ? state.actions[i].term : skip[i - state.actions.length];
                let orig = this.b.tokenOrigins[term.name];
                if (orig && orig.spec)
                    term = orig.spec;
                else if (orig && orig.external)
                    continue;
                addToSet(stateTerms, term);
            }
            if (stateTerms.length == 0)
                continue;
            for (let term of stateTerms) {
                for (let conflict of conflicts) {
                    let conflicting = conflict.a == term ? conflict.b : conflict.b == term ? conflict.a : null;
                    if (!conflicting)
                        continue;
                    if (stateTerms.includes(conflicting) && !errors.some(e => e.conflict == conflict)) {
                        let example = conflict.exampleA ? ` (example: ${JSON.stringify(conflict.exampleA)}${conflict.exampleB ? ` vs ${JSON.stringify(conflict.exampleB)}` : ""})` : "";
                        errors.push({
                            error: `Overlapping tokens ${term.name} and ${conflicting.name} used in same context${example}\n` +
                                `After: ${state.set[0].trail()}`,
                            conflict
                        });
                    }
                    addToSet(terms, term);
                    addToSet(incompatible, conflicting);
                }
            }
            let tokenGroup = null;
            for (let group of groups) {
                if (incompatible.some(term => group.tokens.includes(term)))
                    continue;
                for (let term of terms)
                    addToSet(group.tokens, term);
                tokenGroup = group;
                break;
            }
            if (!tokenGroup) {
                tokenGroup = new TokenGroup(terms, groups.length + startID);
                groups.push(tokenGroup);
            }
            state.tokenGroup = tokenGroup.groupID;
        }
        if (errors.length)
            this.b.raise(errors.map(e => e.error).join("\n\n"));
        if (groups.length + startID > 16)
            this.b.raise(`Too many different token groups (${groups.length}) to represent them as a 16-bit bitfield`);
        let precTable = this.buildPrecTable(softConflicts);
        return {
            tokenGroups: groups,
            tokenPrec: precTable,
            tokenData: tokens.toArray(buildTokenMasks(groups), precTable)
        };
    }
}
class LocalTokenSet extends TokenSet {
    constructor(b, ast) {
        super(b, ast);
        this.fallback = null;
        if (ast.fallback)
            b.unique(ast.fallback.id);
    }
    getToken(expr) {
        let term = null;
        if (this.ast.fallback && this.ast.fallback.id.name == expr.id.name) {
            if (expr.args.length)
                this.b.raise(`Incorrect number of arguments for ${expr.id.name}`, expr.start);
            if (!this.fallback) {
                let { name: nodeName, props, exported } = this.b.nodeInfo(this.ast.fallback.props, "", expr.id.name, none, none);
                let term = this.fallback = this.b.makeTerminal(expr.id.name, nodeName, props);
                if (term.nodeType || exported) {
                    if (!term.nodeType)
                        term.preserve = true;
                    this.b.namedTerms[exported || expr.id.name] = term;
                }
                this.b.used(expr.id.name);
            }
            term = this.fallback;
        }
        else {
            term = super.getToken(expr);
        }
        if (term && !this.b.tokenOrigins[term.name])
            this.b.tokenOrigins[term.name] = { group: this };
        return term;
    }
    buildLocalGroup(states, skipInfo, id) {
        let tokens = this.startState.compile();
        if (tokens.accepting.length)
            this.b.raise(`Grammar contains zero-length tokens (in '${tokens.accepting[0].name}')`, this.rules.find(r => r.id.name == tokens.accepting[0].name).start);
        for (let { a, b, exampleA } of tokens.findConflicts(() => true)) {
            if (!this.precededBy(a, b) && !this.precededBy(b, a))
                this.b.raise(`Overlapping tokens ${a.name} and ${b.name} in local token group${exampleA ? ` (example: ${JSON.stringify(exampleA)})` : ''}`);
        }
        for (let state of states) {
            if (state.defaultReduce)
                continue;
            // See if this state uses any of the tokens in this group, and
            // if so, make sure it *only* uses tokens from this group.
            let usesThis = null;
            let usesOther = skipInfo[this.b.skipRules.indexOf(state.skip)].startTokens[0];
            for (let { term } of state.actions) {
                let orig = this.b.tokenOrigins[term.name];
                while (orig === null || orig === void 0 ? void 0 : orig.spec)
                    orig = this.b.tokenOrigins[orig.spec.name];
                if ((orig === null || orig === void 0 ? void 0 : orig.group) == this)
                    usesThis = term;
                else
                    usesOther = term;
            }
            if (usesThis) {
                if (usesOther)
                    this.b.raise(`Tokens from a local token group used together with other tokens (${usesThis.name} with ${usesOther.name})`);
                state.tokenGroup = id;
            }
        }
        let precTable = this.buildPrecTable(none);
        let tokenData = tokens.toArray({ [id]: 65535 /* Seq.End */ }, precTable);
        let precOffset = tokenData.length;
        let fullData = new Uint16Array(tokenData.length + precTable.length + 1);
        fullData.set(tokenData, 0);
        fullData.set(precTable, precOffset);
        fullData[fullData.length - 1] = 65535 /* Seq.End */;
        return {
            groupID: id,
            create: () => new LocalTokenGroup(fullData, precOffset, this.fallback ? this.fallback.id : undefined),
            createSource: importName => `new ${importName("LocalTokenGroup", "@lezer/lr")}(${encodeArray(fullData)}, ${precOffset}${this.fallback ? `, ${this.fallback.id}` : ''})`
        };
    }
}
function checkTogether(states, b, skipInfo) {
    let cache = Object.create(null);
    function hasTerm(state, term) {
        return state.actions.some(a => a.term == term) ||
            skipInfo[b.skipRules.indexOf(state.skip)].startTokens.includes(term);
    }
    return (a, b) => {
        if (a.id < b.id)
            [a, b] = [b, a];
        let key = a.id | (b.id << 16), cached = cache[key];
        if (cached != null)
            return cached;
        return cache[key] = states.some(state => hasTerm(state, a) && hasTerm(state, b));
    };
}
function invertRanges(ranges) {
    let pos = 0, result = [];
    for (let [a, b] of ranges) {
        if (a > pos)
            result.push([pos, a]);
        pos = b;
    }
    if (pos <= MAX_CODE)
        result.push([pos, MAX_CODE + 1]);
    return result;
}
const ASTRAL = 0x10000, GAP_START = 0xd800, GAP_END = 0xe000, MAX_CODE = 0x10ffff;
const LOW_SURR_B = 0xdc00, HIGH_SURR_B = 0xdfff;
// Create intermediate states for astral characters in a range, if
// necessary, since the tokenizer acts on UTF16 characters
function rangeEdges(from, to, low, hi) {
    if (low < ASTRAL) {
        if (low < GAP_START)
            from.edge(low, Math.min(hi, GAP_START), to);
        if (hi > GAP_END)
            from.edge(Math.max(low, GAP_END), Math.min(hi, MAX_CHAR + 1), to);
        low = ASTRAL;
    }
    if (hi <= ASTRAL)
        return;
    let lowStr = String.fromCodePoint(low), hiStr = String.fromCodePoint(hi - 1);
    let lowA = lowStr.charCodeAt(0), lowB = lowStr.charCodeAt(1);
    let hiA = hiStr.charCodeAt(0), hiB = hiStr.charCodeAt(1);
    if (lowA == hiA) { // Share the first char code
        let hop = new State$1;
        from.edge(lowA, lowA + 1, hop);
        hop.edge(lowB, hiB + 1, to);
    }
    else {
        let midStart = lowA, midEnd = hiA;
        if (lowB > LOW_SURR_B) {
            midStart++;
            let hop = new State$1;
            from.edge(lowA, lowA + 1, hop);
            hop.edge(lowB, HIGH_SURR_B + 1, to);
        }
        if (hiB < HIGH_SURR_B) {
            midEnd--;
            let hop = new State$1;
            from.edge(hiA, hiA + 1, hop);
            hop.edge(LOW_SURR_B, hiB + 1, to);
        }
        if (midStart <= midEnd) {
            let hop = new State$1;
            from.edge(midStart, midEnd + 1, hop);
            hop.edge(LOW_SURR_B, HIGH_SURR_B + 1, to);
        }
    }
}
function isEmpty(expr) {
    return expr instanceof SequenceExpression && expr.exprs.length == 0;
}
function gatherExtTokens(b, tokens) {
    let result = Object.create(null);
    for (let token of tokens) {
        b.unique(token.id);
        let { name, props, dialect } = b.nodeInfo(token.props, "d", token.id.name);
        let term = b.makeTerminal(token.id.name, name, props);
        if (dialect != null)
            (b.tokens.byDialect[dialect] || (b.tokens.byDialect[dialect] = [])).push(term);
        b.namedTerms[token.id.name] = result[token.id.name] = term;
    }
    return result;
}
function findExtToken(b, tokens, expr) {
    let found = tokens[expr.id.name];
    if (!found)
        return null;
    if (expr.args.length)
        b.raise("External tokens cannot take arguments", expr.args[0].start);
    b.used(expr.id.name);
    return found;
}
function addRel(rel, term, after) {
    let found = rel.findIndex(r => r.term == term);
    if (found < 0)
        rel.push({ term, after });
    else
        rel[found] = { term, after: rel[found].after.concat(after) };
}
class ExternalTokenSet {
    constructor(b, ast) {
        this.b = b;
        this.ast = ast;
        this.tokens = gatherExtTokens(b, ast.tokens);
        for (let name in this.tokens)
            this.b.tokenOrigins[this.tokens[name].name] = { external: this };
    }
    getToken(expr) { return findExtToken(this.b, this.tokens, expr); }
    checkConflicts(states, skipInfo) {
        let conflicting = [];
        for (let id of this.ast.conflicts) {
            let term = this.b.namedTerms[id.name];
            if (!term) {
                this.b.warn(`Unknown conflict term '${id.name}'`);
            }
            else if (!term.terminal) {
                this.b.warn(`Term '${id.name}' isn't a terminal and cannot be used in a token conflict.`);
            }
            else if (this.tokens[id.name]) {
                this.b.warn(`External token set specifying a conflict with one of its own tokens ('${id.name}')`);
            }
            else {
                conflicting.push(term);
            }
        }
        if (conflicting.length)
            for (let state of states) {
                let skip = skipInfo[this.b.skipRules.indexOf(state.skip)].startTokens, relevant = false, conflict = null;
                for (let i = 0; i < state.actions.length + skip.length; i++) {
                    let term = i < state.actions.length ? state.actions[i].term : skip[i - state.actions.length];
                    if (term.name in this.tokens) {
                        relevant = true;
                    }
                    else if (conflicting.indexOf(term) > -1) {
                        conflict = term;
                    }
                }
                if (relevant && conflict)
                    this.b.raise(`Tokens from external group used together with conflicting token '${conflict.name}'
After: ${state.set[0].trail()}`, this.ast.start);
            }
    }
    create() {
        return this.b.options.externalTokenizer(this.ast.id.name, this.b.termTable);
    }
    createSource(importName) {
        let { source, id: { name } } = this.ast;
        return importName(name, source);
    }
}
class ExternalSpecializer {
    constructor(b, ast) {
        this.b = b;
        this.ast = ast;
        this.term = null;
        this.tokens = gatherExtTokens(b, ast.tokens);
    }
    finish() {
        let terms = this.b.normalizeExpr(this.ast.token);
        if (terms.length != 1 || terms[0].terms.length != 1 || !terms[0].terms[0].terminal)
            this.b.raise(`The token expression to '@external ${this.ast.type}' must resolve to a token`, this.ast.token.start);
        this.term = terms[0].terms[0];
        for (let name in this.tokens)
            this.b.tokenOrigins[this.tokens[name].name] = { spec: this.term, external: this };
    }
    getToken(expr) { return findExtToken(this.b, this.tokens, expr); }
}
function inlineRules(rules, preserve) {
    for (let pass = 0;; pass++) {
        let inlinable = Object.create(null), found;
        if (pass == 0)
            for (let rule of rules) {
                if (rule.name.inline && !inlinable[rule.name.name]) {
                    let group = rules.filter(r => r.name == rule.name);
                    if (group.some(r => r.parts.includes(rule.name)))
                        continue;
                    found = inlinable[rule.name.name] = group;
                }
            }
        for (let i = 0; i < rules.length; i++) {
            let rule = rules[i];
            if (!rule.name.interesting && !rule.parts.includes(rule.name) && rule.parts.length < 3 &&
                !preserve.includes(rule.name) &&
                (rule.parts.length == 1 || rules.every(other => other.skip == rule.skip || !other.parts.includes(rule.name))) &&
                !rule.parts.some(p => !!inlinable[p.name]) &&
                !rules.some((r, j) => j != i && r.name == rule.name))
                found = inlinable[rule.name.name] = [rule];
        }
        if (!found)
            return rules;
        let newRules = [];
        for (let rule of rules) {
            if (inlinable[rule.name.name])
                continue;
            if (!rule.parts.some(p => !!inlinable[p.name])) {
                newRules.push(rule);
                continue;
            }
            function expand(at, conflicts, parts) {
                if (at == rule.parts.length) {
                    newRules.push(new Rule(rule.name, parts, conflicts, rule.skip));
                    return;
                }
                let next = rule.parts[at], replace = inlinable[next.name];
                if (!replace) {
                    expand(at + 1, conflicts.concat(rule.conflicts[at + 1]), parts.concat(next));
                    return;
                }
                for (let r of replace)
                    expand(at + 1, conflicts.slice(0, conflicts.length - 1)
                        .concat(conflicts[at].join(r.conflicts[0]))
                        .concat(r.conflicts.slice(1, r.conflicts.length - 1))
                        .concat(rule.conflicts[at + 1].join(r.conflicts[r.conflicts.length - 1])), parts.concat(r.parts));
            }
            expand(0, [rule.conflicts[0]], []);
        }
        rules = newRules;
    }
}
function mergeRules(rules) {
    let merged = Object.create(null), found;
    for (let i = 0; i < rules.length;) {
        let groupStart = i;
        let name = rules[i++].name;
        while (i < rules.length && rules[i].name == name)
            i++;
        let size = i - groupStart;
        if (name.interesting)
            continue;
        for (let j = i; j < rules.length;) {
            let otherStart = j, otherName = rules[j++].name;
            while (j < rules.length && rules[j].name == otherName)
                j++;
            if (j - otherStart != size || otherName.interesting)
                continue;
            let match = true;
            for (let k = 0; k < size && match; k++) {
                let a = rules[groupStart + k], b = rules[otherStart + k];
                if (a.cmpNoName(b) != 0)
                    match = false;
            }
            if (match)
                found = merged[name.name] = otherName;
        }
    }
    if (!found)
        return rules;
    let newRules = [];
    for (let rule of rules)
        if (!merged[rule.name.name]) {
            newRules.push(rule.parts.every(p => !merged[p.name]) ? rule :
                new Rule(rule.name, rule.parts.map(p => merged[p.name] || p), rule.conflicts, rule.skip));
        }
    return newRules;
}
function simplifyRules(rules, preserve) {
    return mergeRules(inlineRules(rules, preserve));
}
/**
Build an in-memory parser instance for a given grammar. This is
mostly useful for testing. If your grammar uses external
tokenizers, you'll have to provide the `externalTokenizer` option
for the returned parser to be able to parse anything.
*/
function buildParser(text, options = {}) {
    let builder = new Builder(text, options), parser = builder.getParser();
    parser.termTable = builder.termTable;
    return parser;
}
const KEYWORDS = ["arguments", "await", "break", "case", "catch", "continue", "debugger", "default", "do", "else",
    "eval", "finally", "for", "function", "if", "return", "switch", "throw", "try", "var", "while",
    "with", "null", "true", "false", "instanceof", "typeof", "void", "delete", "new", "in", "this",
    "const", "class", "extends", "export", "import", "super", "enum", "implements", "interface",
    "let", "package", "private", "protected", "public", "static", "yield", "require"];
/**
Build the code that represents the parser tables for a given
grammar description. The `parser` property in the return value
holds the main file that exports the `Parser` instance. The
`terms` property holds a declaration file that defines constants
for all of the named terms in grammar, holding their ids as value.
This is useful when external code, such as a tokenizer, needs to
be able to use these ids. It is recommended to run a tree-shaking
bundler when importing this file, since you usually only need a
handful of the many terms in your code.
*/
function buildParserFile(text, options = {}) {
    return new Builder(text, options).getParserFile();
}
function ignored(name) {
    let first = name[0];
    return first == "_" || first.toUpperCase() != first;
}
function isExported(rule) {
    return rule.props.some(p => p.at && p.name == "export");
}

export { GenError, buildParser, buildParserFile };
