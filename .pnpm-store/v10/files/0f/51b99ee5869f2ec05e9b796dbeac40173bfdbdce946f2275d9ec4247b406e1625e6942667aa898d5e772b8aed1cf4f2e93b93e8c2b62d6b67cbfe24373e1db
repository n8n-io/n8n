"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkDocument = walkDocument;
const ref_utils_1 = require("./ref-utils");
const utils_1 = require("./utils");
const resolve_1 = require("./resolve");
const types_1 = require("./types");
function collectParents(ctx) {
    const parents = {};
    while (ctx.parent) {
        parents[ctx.parent.type.name] = ctx.parent.activatedOn?.value.node;
        ctx = ctx.parent;
    }
    return parents;
}
function collectParentsLocations(ctx) {
    const locations = {};
    while (ctx.parent) {
        if (ctx.parent.activatedOn?.value.location) {
            locations[ctx.parent.type.name] = ctx.parent.activatedOn?.value.location;
        }
        ctx = ctx.parent;
    }
    return locations;
}
function walkDocument(opts) {
    const { document, rootType, normalizedVisitors, resolvedRefMap, ctx } = opts;
    const seenNodesPerType = {};
    const ignoredNodes = new Set();
    walkNode(document.parsed, rootType, new ref_utils_1.Location(document.source, '#/'), undefined, '');
    function walkNode(node, type, location, parent, key) {
        const resolve = (ref, from = currentLocation.source.absoluteRef) => {
            if (!(0, ref_utils_1.isRef)(ref))
                return { location, node: ref };
            const refId = (0, resolve_1.makeRefId)(from, ref.$ref);
            const resolvedRef = resolvedRefMap.get(refId);
            if (!resolvedRef) {
                return {
                    location: undefined,
                    node: undefined,
                };
            }
            const { resolved, node, document, nodePointer, error } = resolvedRef;
            const newLocation = resolved
                ? new ref_utils_1.Location(document.source, nodePointer)
                : error instanceof resolve_1.YamlParseError
                    ? new ref_utils_1.Location(error.source, '')
                    : undefined;
            return { location: newLocation, node, error };
        };
        const rawLocation = location;
        let currentLocation = location;
        const { node: resolvedNode, location: resolvedLocation, error } = resolve(node);
        const enteredContexts = new Set();
        if ((0, ref_utils_1.isRef)(node)) {
            const refEnterVisitors = normalizedVisitors.ref.enter;
            for (const { visit: visitor, ruleId, severity, message, context } of refEnterVisitors) {
                enteredContexts.add(context);
                const report = reportFn.bind(undefined, ruleId, severity, message);
                visitor(node, {
                    report,
                    resolve,
                    rawNode: node,
                    rawLocation,
                    location,
                    type,
                    parent,
                    key,
                    parentLocations: {},
                    oasVersion: ctx.oasVersion,
                    getVisitorData: getVisitorDataFn.bind(undefined, ruleId),
                }, { node: resolvedNode, location: resolvedLocation, error });
                if (resolvedLocation?.source.absoluteRef && ctx.refTypes) {
                    ctx.refTypes.set(resolvedLocation?.source.absoluteRef, type);
                }
            }
        }
        if (resolvedNode !== undefined && resolvedLocation && type.name !== 'scalar') {
            currentLocation = resolvedLocation;
            const isNodeSeen = seenNodesPerType[type.name]?.has?.(resolvedNode);
            let visitedBySome = false;
            const anyEnterVisitors = normalizedVisitors.any.enter;
            const currentEnterVisitors = anyEnterVisitors.concat(normalizedVisitors[type.name]?.enter || []);
            const activatedContexts = [];
            for (const { context, visit, skip, ruleId, severity, message } of currentEnterVisitors) {
                if (ignoredNodes.has(`${currentLocation.absolutePointer}${currentLocation.pointer}`))
                    break;
                if (context.isSkippedLevel) {
                    if (context.parent.activatedOn &&
                        !context.parent.activatedOn.value.nextLevelTypeActivated &&
                        !context.seen.has(node)) {
                        // TODO: test for walk through duplicated $ref-ed node
                        context.seen.add(node);
                        visitedBySome = true;
                        activatedContexts.push(context);
                    }
                }
                else {
                    if ((context.parent && // if nested
                        context.parent.activatedOn &&
                        context.activatedOn?.value.withParentNode !== context.parent.activatedOn.value.node &&
                        // do not enter if visited by parent children (it works thanks because deeper visitors are sorted before)
                        context.parent.activatedOn.value.nextLevelTypeActivated?.value !== type) ||
                        (!context.parent && !isNodeSeen) // if top-level visit each node just once
                    ) {
                        activatedContexts.push(context);
                        const activatedOn = {
                            node: resolvedNode,
                            location: resolvedLocation,
                            nextLevelTypeActivated: null,
                            withParentNode: context.parent?.activatedOn?.value.node,
                            skipped: (context.parent?.activatedOn?.value.skipped ||
                                skip?.(resolvedNode, key, {
                                    location,
                                    rawLocation,
                                    resolve,
                                    rawNode: node,
                                })) ??
                                false,
                        };
                        context.activatedOn = (0, utils_1.pushStack)(context.activatedOn, activatedOn);
                        let ctx = context.parent;
                        while (ctx) {
                            ctx.activatedOn.value.nextLevelTypeActivated = (0, utils_1.pushStack)(ctx.activatedOn.value.nextLevelTypeActivated, type);
                            ctx = ctx.parent;
                        }
                        if (!activatedOn.skipped) {
                            visitedBySome = true;
                            enteredContexts.add(context);
                            visitWithContext(visit, resolvedNode, node, context, ruleId, severity, message);
                        }
                    }
                }
            }
            if (visitedBySome || !isNodeSeen) {
                seenNodesPerType[type.name] = seenNodesPerType[type.name] || new Set();
                seenNodesPerType[type.name].add(resolvedNode);
                if (Array.isArray(resolvedNode)) {
                    const itemsType = type.items;
                    if (itemsType !== undefined) {
                        const isTypeAFunction = typeof itemsType === 'function';
                        for (let i = 0; i < resolvedNode.length; i++) {
                            const itemType = isTypeAFunction
                                ? itemsType(resolvedNode[i], resolvedLocation.child([i]).absolutePointer)
                                : itemsType;
                            if ((0, types_1.isNamedType)(itemType)) {
                                walkNode(resolvedNode[i], itemType, resolvedLocation.child([i]), resolvedNode, i);
                            }
                        }
                    }
                }
                else if (typeof resolvedNode === 'object' && resolvedNode !== null) {
                    // visit in order from type-tree first
                    const props = Object.keys(type.properties);
                    if (type.additionalProperties) {
                        props.push(...Object.keys(resolvedNode).filter((k) => !props.includes(k)));
                    }
                    else if (type.extensionsPrefix) {
                        props.push(...Object.keys(resolvedNode).filter((k) => k.startsWith(type.extensionsPrefix)));
                    }
                    if ((0, ref_utils_1.isRef)(node)) {
                        props.push(...Object.keys(node).filter((k) => k !== '$ref' && !props.includes(k))); // properties on the same level as $ref
                    }
                    for (const propName of props) {
                        let value = resolvedNode[propName];
                        let loc = resolvedLocation;
                        if (value === undefined) {
                            value = node[propName];
                            loc = location; // properties on the same level as $ref should resolve against original location, not target
                        }
                        let propType = type.properties[propName];
                        if (propType === undefined)
                            propType = type.additionalProperties;
                        if (typeof propType === 'function')
                            propType = propType(value, propName);
                        if (propType === undefined &&
                            type.extensionsPrefix &&
                            propName.startsWith(type.extensionsPrefix)) {
                            propType = types_1.SpecExtension;
                        }
                        if (!(0, types_1.isNamedType)(propType) && propType?.directResolveAs) {
                            propType = propType.directResolveAs;
                            value = { $ref: value };
                        }
                        if (propType && propType.name === undefined && propType.resolvable !== false) {
                            propType = { name: 'scalar', properties: {} };
                        }
                        if (!(0, types_1.isNamedType)(propType) || (propType.name === 'scalar' && !(0, ref_utils_1.isRef)(value))) {
                            continue;
                        }
                        walkNode(value, propType, loc.child([propName]), resolvedNode, propName);
                    }
                }
            }
            const anyLeaveVisitors = normalizedVisitors.any.leave;
            const currentLeaveVisitors = (normalizedVisitors[type.name]?.leave || []).concat(anyLeaveVisitors);
            for (const context of activatedContexts.reverse()) {
                if (context.isSkippedLevel) {
                    context.seen.delete(resolvedNode);
                }
                else {
                    context.activatedOn = (0, utils_1.popStack)(context.activatedOn);
                    if (context.parent) {
                        let ctx = context.parent;
                        while (ctx) {
                            ctx.activatedOn.value.nextLevelTypeActivated = (0, utils_1.popStack)(ctx.activatedOn.value.nextLevelTypeActivated);
                            ctx = ctx.parent;
                        }
                    }
                }
            }
            for (const { context, visit, ruleId, severity, message } of currentLeaveVisitors) {
                if (!context.isSkippedLevel && enteredContexts.has(context)) {
                    visitWithContext(visit, resolvedNode, node, context, ruleId, severity, message);
                }
            }
        }
        currentLocation = location;
        if ((0, ref_utils_1.isRef)(node)) {
            const refLeaveVisitors = normalizedVisitors.ref.leave;
            for (const { visit: visitor, ruleId, severity, context, message } of refLeaveVisitors) {
                if (enteredContexts.has(context)) {
                    const report = reportFn.bind(undefined, ruleId, severity, message);
                    visitor(node, {
                        report,
                        resolve,
                        rawNode: node,
                        rawLocation,
                        location,
                        type,
                        parent,
                        key,
                        parentLocations: {},
                        oasVersion: ctx.oasVersion,
                        getVisitorData: getVisitorDataFn.bind(undefined, ruleId),
                    }, { node: resolvedNode, location: resolvedLocation, error });
                }
            }
        }
        // returns true ignores all the next visitors on the specific node
        function visitWithContext(visit, resolvedNode, node, context, ruleId, severity, customMessage) {
            const report = reportFn.bind(undefined, ruleId, severity, customMessage);
            visit(resolvedNode, {
                report,
                resolve,
                rawNode: node,
                location: currentLocation,
                rawLocation,
                type,
                parent,
                key,
                parentLocations: collectParentsLocations(context),
                oasVersion: ctx.oasVersion,
                ignoreNextVisitorsOnNode: () => {
                    ignoredNodes.add(`${currentLocation.absolutePointer}${currentLocation.pointer}`);
                },
                getVisitorData: getVisitorDataFn.bind(undefined, ruleId),
            }, collectParents(context), context);
        }
        function reportFn(ruleId, severity, customMessage, opts) {
            const normalizedLocation = opts.location
                ? Array.isArray(opts.location)
                    ? opts.location
                    : [opts.location]
                : [{ ...currentLocation, reportOnKey: false }];
            const location = normalizedLocation.map((l) => ({
                ...currentLocation,
                reportOnKey: false,
                ...l,
            }));
            const ruleSeverity = opts.forceSeverity || severity;
            if (ruleSeverity !== 'off') {
                ctx.problems.push({
                    ruleId: opts.ruleId || ruleId,
                    severity: ruleSeverity,
                    ...opts,
                    message: customMessage
                        ? customMessage.replace('{{message}}', opts.message)
                        : opts.message,
                    suggest: opts.suggest || [],
                    location,
                });
            }
        }
        function getVisitorDataFn(ruleId) {
            ctx.visitorsData[ruleId] = ctx.visitorsData[ruleId] || {};
            return ctx.visitorsData[ruleId];
        }
    }
}
