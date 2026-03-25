import { isTag } from 'domhandler';
import { Picker } from 'selderee';

function hp2Builder(nodes) {
    return new Picker(handleArray(nodes));
}
function handleArray(nodes) {
    const matchers = nodes.map(handleNode);
    return (el, ...tail) => matchers.flatMap(m => m(el, ...tail));
}
function handleNode(node) {
    switch (node.type) {
        case 'terminal': {
            const result = [node.valueContainer];
            return (el, ...tail) => result;
        }
        case 'tagName':
            return handleTagName(node);
        case 'attrValue':
            return handleAttrValueName(node);
        case 'attrPresence':
            return handleAttrPresenceName(node);
        case 'pushElement':
            return handlePushElementNode(node);
        case 'popElement':
            return handlePopElementNode(node);
    }
}
function handleTagName(node) {
    const variants = {};
    for (const variant of node.variants) {
        variants[variant.value] = handleArray(variant.cont);
    }
    return (el, ...tail) => {
        const continuation = variants[el.name];
        return (continuation) ? continuation(el, ...tail) : [];
    };
}
function handleAttrPresenceName(node) {
    const attrName = node.name;
    const continuation = handleArray(node.cont);
    return (el, ...tail) => (Object.prototype.hasOwnProperty.call(el.attribs, attrName))
        ? continuation(el, ...tail)
        : [];
}
function handleAttrValueName(node) {
    const callbacks = [];
    for (const matcher of node.matchers) {
        const predicate = matcher.predicate;
        const continuation = handleArray(matcher.cont);
        callbacks.push((attr, el, ...tail) => (predicate(attr) ? continuation(el, ...tail) : []));
    }
    const attrName = node.name;
    return (el, ...tail) => {
        const attr = el.attribs[attrName];
        return (attr || attr === '')
            ? callbacks.flatMap(cb => cb(attr, el, ...tail))
            : [];
    };
}
function handlePushElementNode(node) {
    const continuation = handleArray(node.cont);
    const leftElementGetter = (node.combinator === '+')
        ? getPrecedingElement
        : getParentElement;
    return (el, ...tail) => {
        const next = leftElementGetter(el);
        if (next === null) {
            return [];
        }
        return continuation(next, el, ...tail);
    };
}
const getPrecedingElement = (el) => {
    const prev = el.prev;
    if (prev === null) {
        return null;
    }
    return (isTag(prev)) ? prev : getPrecedingElement(prev);
};
const getParentElement = (el) => {
    const parent = el.parent;
    return (parent && isTag(parent)) ? parent : null;
};
function handlePopElementNode(node) {
    const continuation = handleArray(node.cont);
    return (el, next, ...tail) => continuation(next, ...tail);
}

export { hp2Builder };
