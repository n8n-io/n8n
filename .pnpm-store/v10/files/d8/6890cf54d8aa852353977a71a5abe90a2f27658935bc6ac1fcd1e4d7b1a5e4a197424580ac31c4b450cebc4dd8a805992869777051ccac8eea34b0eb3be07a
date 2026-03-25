const getDefaultParent = (originalTarget) => {
    if (typeof document === 'undefined') {
        return null;
    }
    const sampleTarget = Array.isArray(originalTarget) ? originalTarget[0] : originalTarget;
    return sampleTarget.ownerDocument.body;
};
let counterMap = new WeakMap();
let uncontrolledNodes = new WeakMap();
let markerMap = {};
let lockCount = 0;
const unwrapHost = (node) => node && (node.host || unwrapHost(node.parentNode));
const correctTargets = (parent, targets) => targets
    .map((target) => {
    if (parent.contains(target)) {
        return target;
    }
    const correctedTarget = unwrapHost(target);
    if (correctedTarget && parent.contains(correctedTarget)) {
        return correctedTarget;
    }
    console.error('aria-hidden', target, 'in not contained inside', parent, '. Doing nothing');
    return null;
})
    .filter((x) => Boolean(x));
/**
 * Marks everything except given node(or nodes) as aria-hidden
 * @param {Element | Element[]} originalTarget - elements to keep on the page
 * @param [parentNode] - top element, defaults to document.body
 * @param {String} [markerName] - a special attribute to mark every node
 * @param {String} [controlAttribute] - html Attribute to control
 * @return {Undo} undo command
 */
const applyAttributeToOthers = (originalTarget, parentNode, markerName, controlAttribute) => {
    const targets = correctTargets(parentNode, Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
    if (!markerMap[markerName]) {
        markerMap[markerName] = new WeakMap();
    }
    const markerCounter = markerMap[markerName];
    const hiddenNodes = [];
    const elementsToKeep = new Set();
    const elementsToStop = new Set(targets);
    const keep = (el) => {
        if (!el || elementsToKeep.has(el)) {
            return;
        }
        elementsToKeep.add(el);
        keep(el.parentNode);
    };
    targets.forEach(keep);
    const deep = (parent) => {
        if (!parent || elementsToStop.has(parent)) {
            return;
        }
        Array.prototype.forEach.call(parent.children, (node) => {
            if (elementsToKeep.has(node)) {
                deep(node);
            }
            else {
                try {
                    const attr = node.getAttribute(controlAttribute);
                    const alreadyHidden = attr !== null && attr !== 'false';
                    const counterValue = (counterMap.get(node) || 0) + 1;
                    const markerValue = (markerCounter.get(node) || 0) + 1;
                    counterMap.set(node, counterValue);
                    markerCounter.set(node, markerValue);
                    hiddenNodes.push(node);
                    if (counterValue === 1 && alreadyHidden) {
                        uncontrolledNodes.set(node, true);
                    }
                    if (markerValue === 1) {
                        node.setAttribute(markerName, 'true');
                    }
                    if (!alreadyHidden) {
                        node.setAttribute(controlAttribute, 'true');
                    }
                }
                catch (e) {
                    console.error('aria-hidden: cannot operate on ', node, e);
                }
            }
        });
    };
    deep(parentNode);
    elementsToKeep.clear();
    lockCount++;
    return () => {
        hiddenNodes.forEach((node) => {
            const counterValue = counterMap.get(node) - 1;
            const markerValue = markerCounter.get(node) - 1;
            counterMap.set(node, counterValue);
            markerCounter.set(node, markerValue);
            if (!counterValue) {
                if (!uncontrolledNodes.has(node)) {
                    node.removeAttribute(controlAttribute);
                }
                uncontrolledNodes.delete(node);
            }
            if (!markerValue) {
                node.removeAttribute(markerName);
            }
        });
        lockCount--;
        if (!lockCount) {
            // clear
            counterMap = new WeakMap();
            counterMap = new WeakMap();
            uncontrolledNodes = new WeakMap();
            markerMap = {};
        }
    };
};
/**
 * Marks everything except given node(or nodes) as aria-hidden
 * @param {Element | Element[]} originalTarget - elements to keep on the page
 * @param [parentNode] - top element, defaults to document.body
 * @param {String} [markerName] - a special attribute to mark every node
 * @return {Undo} undo command
 */
export const hideOthers = (originalTarget, parentNode, markerName = 'data-aria-hidden') => {
    const targets = Array.from(Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
    const activeParentNode = parentNode || getDefaultParent(originalTarget);
    if (!activeParentNode) {
        return () => null;
    }
    // we should not hide aria-live elements - https://github.com/theKashey/aria-hidden/issues/10
    // and script elements, as they have no impact on accessibility.
    targets.push(...Array.from(activeParentNode.querySelectorAll('[aria-live], script')));
    return applyAttributeToOthers(targets, activeParentNode, markerName, 'aria-hidden');
};
/**
 * Marks everything except given node(or nodes) as inert
 * @param {Element | Element[]} originalTarget - elements to keep on the page
 * @param [parentNode] - top element, defaults to document.body
 * @param {String} [markerName] - a special attribute to mark every node
 * @return {Undo} undo command
 */
export const inertOthers = (originalTarget, parentNode, markerName = 'data-inert-ed') => {
    const activeParentNode = parentNode || getDefaultParent(originalTarget);
    if (!activeParentNode) {
        return () => null;
    }
    return applyAttributeToOthers(originalTarget, activeParentNode, markerName, 'inert');
};
/**
 * @returns if current browser supports inert
 */
export const supportsInert = () => typeof HTMLElement !== 'undefined' && HTMLElement.prototype.hasOwnProperty('inert');
/**
 * Automatic function to "suppress" DOM elements - _hide_ or _inert_ in the best possible way
 * @param {Element | Element[]} originalTarget - elements to keep on the page
 * @param [parentNode] - top element, defaults to document.body
 * @param {String} [markerName] - a special attribute to mark every node
 * @return {Undo} undo command
 */
export const suppressOthers = (originalTarget, parentNode, markerName = 'data-suppressed') => (supportsInert() ? inertOthers : hideOthers)(originalTarget, parentNode, markerName);
