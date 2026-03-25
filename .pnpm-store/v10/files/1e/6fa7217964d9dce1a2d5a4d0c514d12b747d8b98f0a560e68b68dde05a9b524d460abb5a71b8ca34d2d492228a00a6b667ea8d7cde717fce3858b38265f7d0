"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeVisitors = normalizeVisitors;
const types_1 = require("./types");
const legacyTypesMap = {
    Root: 'DefinitionRoot',
    ServerVariablesMap: 'ServerVariableMap',
    Paths: ['PathMap', 'PathsMap'],
    CallbacksMap: 'CallbackMap',
    MediaTypesMap: 'MediaTypeMap',
    ExamplesMap: 'ExampleMap',
    EncodingMap: 'EncodingsMap',
    HeadersMap: 'HeaderMap',
    LinksMap: 'LinkMap',
    OAuth2Flows: 'SecuritySchemeFlows',
    Responses: 'ResponsesMap',
};
function normalizeVisitors(visitorsConfig, types) {
    const normalizedVisitors = {};
    normalizedVisitors.any = {
        enter: [],
        leave: [],
    };
    for (const typeName of Object.keys(types)) {
        normalizedVisitors[typeName] = {
            enter: [],
            leave: [],
        };
    }
    normalizedVisitors.ref = {
        enter: [],
        leave: [],
    };
    for (const { ruleId, severity, message, visitor } of visitorsConfig) {
        normalizeVisitorLevel({ ruleId, severity, message }, visitor, null);
    }
    for (const v of Object.keys(normalizedVisitors)) {
        normalizedVisitors[v].enter.sort((a, b) => b.depth - a.depth);
        normalizedVisitors[v].leave.sort((a, b) => a.depth - b.depth);
    }
    return normalizedVisitors;
    function addWeakNodes(ruleConf, from, to, parentContext, stack = []) {
        if (stack.includes(from))
            return;
        stack = [...stack, from];
        const possibleChildren = new Set();
        for (const type of Object.values(from.properties)) {
            if (type === to) {
                addWeakFromStack(ruleConf, stack);
                continue;
            }
            if (typeof type === 'object' && type !== null && type.name) {
                possibleChildren.add(type);
            }
        }
        if (from.additionalProperties && typeof from.additionalProperties !== 'function') {
            if (from.additionalProperties === to) {
                addWeakFromStack(ruleConf, stack);
            }
            else if (from.additionalProperties.name !== undefined) {
                possibleChildren.add(from.additionalProperties);
            }
        }
        if (from.items && typeof from.items !== 'function') {
            if (from.items === to) {
                addWeakFromStack(ruleConf, stack);
            }
            else if (from.items.name !== undefined) {
                possibleChildren.add(from.items);
            }
        }
        if (from.extensionsPrefix) {
            possibleChildren.add(types_1.SpecExtension);
        }
        for (const fromType of Array.from(possibleChildren.values())) {
            addWeakNodes(ruleConf, fromType, to, parentContext, stack);
        }
        function addWeakFromStack(ruleConf, stack) {
            for (const interType of stack.slice(1)) {
                normalizedVisitors[interType.name] = normalizedVisitors[interType.name] || {
                    enter: [],
                    leave: [],
                };
                normalizedVisitors[interType.name].enter.push({
                    ...ruleConf,
                    visit: () => undefined,
                    depth: 0,
                    context: {
                        isSkippedLevel: true,
                        seen: new Set(),
                        parent: parentContext,
                    },
                });
            }
        }
    }
    function findLegacyVisitorNode(visitor, typeName) {
        if (Array.isArray(typeName)) {
            const name = typeName.find((name) => visitor[name]) || undefined;
            return name && visitor[name];
        }
        return visitor[typeName];
    }
    function normalizeVisitorLevel(ruleConf, visitor, parentContext, depth = 0) {
        const visitorKeys = Object.keys(types);
        if (depth === 0) {
            visitorKeys.push('any');
            visitorKeys.push('ref');
        }
        else {
            if (visitor.any) {
                throw new Error('any() is allowed only on top level');
            }
            if (visitor.ref) {
                throw new Error('ref() is allowed only on top level');
            }
        }
        for (const typeName of visitorKeys) {
            const typeVisitor = (visitor[typeName] ||
                findLegacyVisitorNode(visitor, legacyTypesMap[typeName]));
            const normalizedTypeVisitor = normalizedVisitors[typeName];
            if (!typeVisitor)
                continue;
            let visitorEnter;
            let visitorLeave;
            let visitorSkip;
            const isObjectVisitor = typeof typeVisitor === 'object';
            if (typeName === 'ref' && isObjectVisitor && typeVisitor.skip) {
                throw new Error('ref() visitor does not support skip');
            }
            if (typeof typeVisitor === 'function') {
                visitorEnter = typeVisitor;
            }
            else if (isObjectVisitor) {
                visitorEnter = typeVisitor.enter;
                visitorLeave = typeVisitor.leave;
                visitorSkip = typeVisitor.skip;
            }
            const context = {
                activatedOn: null,
                type: types[typeName],
                parent: parentContext,
                isSkippedLevel: false,
            };
            if (typeof typeVisitor === 'object') {
                normalizeVisitorLevel(ruleConf, typeVisitor, context, depth + 1);
            }
            if (parentContext) {
                addWeakNodes(ruleConf, parentContext.type, types[typeName], parentContext);
            }
            if (visitorEnter || isObjectVisitor) {
                if (visitorEnter && typeof visitorEnter !== 'function') {
                    throw new Error('DEV: should be function');
                }
                normalizedTypeVisitor.enter.push({
                    ...ruleConf,
                    visit: visitorEnter || (() => undefined),
                    skip: visitorSkip,
                    depth,
                    context,
                });
            }
            if (visitorLeave) {
                if (typeof visitorLeave !== 'function') {
                    throw new Error('DEV: should be function');
                }
                normalizedTypeVisitor.leave.push({
                    ...ruleConf,
                    visit: visitorLeave,
                    depth,
                    context,
                });
            }
        }
    }
}
