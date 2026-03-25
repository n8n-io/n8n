'use strict';

var common = require('@lezer/common');

const none = [];
class TestSpec {
    constructor(name, props, children = none, wildcard = false) {
        this.name = name;
        this.props = props;
        this.children = children;
        this.wildcard = wildcard;
    }
    static parse(spec) {
        let pos = 0, tok = "sof", value = "";
        function err() {
            throw new SyntaxError("Invalid test spec: " + spec);
        }
        function next() {
            while (pos < spec.length && /\s/.test(spec.charAt(pos)))
                pos++;
            if (pos == spec.length)
                return tok = "eof";
            let next = spec.charAt(pos++);
            if (next == "(" && spec.slice(pos, pos + 4) == "...)") {
                pos += 4;
                return tok = "...";
            }
            if (/[\[\](),=]/.test(next))
                return tok = next;
            if (/[^()\[\],="\s]/.test(next)) {
                let name = /[^()\[\],="\s]*/.exec(spec.slice(pos - 1));
                value = name[0];
                pos += name[0].length - 1;
                return tok = "name";
            }
            if (next == '"') {
                let content = /^"((?:[^\\"]|\\.)*)"/.exec(spec.slice(pos - 1)) || err();
                value = JSON.parse(content[0]);
                pos += content[0].length - 1;
                return tok = "name";
            }
            return err();
        }
        next();
        function parseSeq() {
            let seq = [];
            while (tok != "eof" && tok != ")") {
                seq.push(parse());
                if (tok == ",")
                    next();
            }
            return seq;
        }
        function parse() {
            let name = value, children = none, props = [], wildcard = false;
            if (tok != "name")
                err();
            next();
            if (tok == "[") {
                next();
                while (tok != "]") {
                    if (tok != "name")
                        err();
                    let prop = common.NodeProp[value], val = "";
                    if (!(prop instanceof common.NodeProp))
                        err();
                    next();
                    if (tok == "=") {
                        next();
                        if (tok != "name")
                            err();
                        val = value;
                        next();
                    }
                    props.push({ prop, value: prop.deserialize(val) });
                }
                next();
            }
            if (tok == "(") {
                next();
                children = parseSeq();
                // @ts-ignore TypeScript doesn't understand that `next` may have mutated `tok` (#9998)
                if (tok != ")")
                    err();
                next();
            }
            else if (tok == "...") {
                wildcard = true;
                next();
            }
            return new TestSpec(name, props, children, wildcard);
        }
        let result = parseSeq();
        if (tok != "eof")
            err();
        return result;
    }
    matches(type) {
        if (type.name != this.name)
            return false;
        for (let { prop, value } of this.props)
            if ((value || type.prop(prop)) && JSON.stringify(type.prop(prop)) != JSON.stringify(value))
                return false;
        return true;
    }
}
function defaultIgnore(type) { return /\W/.test(type.name); }
function testTree(tree, expect, mayIgnore = defaultIgnore) {
    let specs = TestSpec.parse(expect);
    let stack = [specs], pos = [0];
    tree.iterate({
        enter(n) {
            if (!n.name)
                return;
            let last = stack.length - 1, index = pos[last], seq = stack[last];
            let next = index < seq.length ? seq[index] : null;
            if (next && next.matches(n.type)) {
                if (next.wildcard) {
                    pos[last]++;
                    return false;
                }
                pos.push(0);
                stack.push(next.children);
                return undefined;
            }
            else if (mayIgnore(n.type)) {
                return false;
            }
            else {
                let parent = last > 0 ? stack[last - 1][pos[last - 1]].name : "tree";
                let after = next ? next.name + (parent == "tree" ? "" : " in " + parent) : `end of ${parent}`;
                throw new Error(`Expected ${after}, got ${n.name} at ${n.to} \n${tree}`);
            }
        },
        leave(n) {
            if (!n.name)
                return;
            let last = stack.length - 1, index = pos[last], seq = stack[last];
            if (index < seq.length)
                throw new Error(`Unexpected end of ${n.name}. Expected ${seq.slice(index).map(s => s.name).join(", ")} at ${n.from}\n${tree}`);
            pos.pop();
            stack.pop();
            pos[last - 1]++;
        }
    });
    if (pos[0] != specs.length)
        throw new Error(`Unexpected end of tree. Expected ${stack[0].slice(pos[0]).map(s => s.name).join(", ")} at ${tree.length}\n${tree}`);
}
function toLineContext(file, index) {
    const endEol = file.indexOf('\n', index + 80);
    const endIndex = endEol === -1 ? file.length : endEol;
    return file.substring(index, endIndex).split(/\n/).map(str => '  | ' + str).join('\n');
}
function fileTests(file, fileName, mayIgnore = defaultIgnore) {
    let caseExpr = /\s*#[ \t]*(.*)(?:\r\n|\r|\n)([^]*?)==+>([^]*?)(?:$|(?:\r\n|\r|\n)+(?=#))/gy;
    let tests = [];
    let lastIndex = 0;
    for (;;) {
        let m = caseExpr.exec(file);
        if (!m)
            throw new Error(`Unexpected file format in ${fileName} around\n\n${toLineContext(file, lastIndex)}`);
        let text = m[2].trim(), expected = m[3].trim();
        let [, name, configStr] = /(.*?)(\{.*?\})?$/.exec(m[1]);
        let config = configStr ? JSON.parse(configStr) : null;
        let strict = !/⚠|\.\.\./.test(expected);
        tests.push({
            name,
            text,
            expected,
            configStr,
            config,
            strict,
            run(parser) {
                if (parser.configure && (strict || config))
                    parser = parser.configure(Object.assign({ strict }, config));
                testTree(parser.parse(text), expected, mayIgnore);
            }
        });
        lastIndex = m.index + m[0].length;
        if (lastIndex == file.length)
            break;
    }
    return tests;
}

exports.fileTests = fileTests;
exports.testTree = testTree;
