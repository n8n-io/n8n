"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssertsToApply = getAssertsToApply;
exports.buildVisitorObject = buildVisitorObject;
exports.buildSubjectVisitor = buildSubjectVisitor;
exports.getIntersectionLength = getIntersectionLength;
exports.isOrdered = isOrdered;
exports.runAssertion = runAssertion;
exports.regexFromString = regexFromString;
const asserts_1 = require("./asserts");
const logger_1 = require("../../../logger");
const ref_utils_1 = require("../../../ref-utils");
const utils_1 = require("../../../utils");
const assertionMessageTemplates = {
    problems: '{{problems}}',
};
function getPredicatesFromLocators(locators) {
    const { filterInParentKeys, filterOutParentKeys, matchParentKeys } = locators;
    const keyMatcher = matchParentKeys && regexFromString(matchParentKeys);
    const matchKeysPredicate = keyMatcher && ((key) => keyMatcher.test(key.toString()));
    const filterInPredicate = Array.isArray(filterInParentKeys) &&
        ((key) => filterInParentKeys.includes(key.toString()));
    const filterOutPredicate = Array.isArray(filterOutParentKeys) &&
        ((key) => !filterOutParentKeys.includes(key.toString()));
    return [matchKeysPredicate, filterInPredicate, filterOutPredicate].filter(utils_1.isTruthy);
}
function getAssertsToApply(assertion) {
    const assertsToApply = (0, utils_1.keysOf)(asserts_1.asserts)
        .filter((assertName) => assertion.assertions[assertName] !== undefined)
        .map((assertName) => {
        return {
            name: assertName,
            conditions: assertion.assertions[assertName],
            runsOnKeys: asserts_1.runOnKeysSet.has(assertName),
            runsOnValues: asserts_1.runOnValuesSet.has(assertName),
        };
    });
    const shouldRunOnKeys = assertsToApply.find((assert) => assert.runsOnKeys && !assert.runsOnValues);
    const shouldRunOnValues = assertsToApply.find((assert) => assert.runsOnValues && !assert.runsOnKeys);
    if (shouldRunOnValues && !assertion.subject.property) {
        throw new Error(`The '${shouldRunOnValues.name}' assertion can't be used on all keys. Please provide a single property.`);
    }
    if (shouldRunOnKeys && assertion.subject.property) {
        throw new Error(`The '${shouldRunOnKeys.name}' assertion can't be used on properties. Please remove the 'property' key.`);
    }
    return assertsToApply;
}
function getAssertionProperties({ subject }) {
    return (Array.isArray(subject.property) ? subject.property : [subject?.property]).filter(Boolean);
}
function applyAssertions(assertionDefinition, asserts, ctx) {
    const properties = getAssertionProperties(assertionDefinition);
    const assertResults = [];
    for (const assert of asserts) {
        if (properties.length) {
            for (const property of properties) {
                assertResults.push(runAssertion({
                    assert,
                    ctx,
                    assertionProperty: property,
                }));
            }
        }
        else {
            assertResults.push(runAssertion({
                assert,
                ctx,
            }));
        }
    }
    return assertResults.flat();
}
function buildVisitorObject(assertion, subjectVisitor) {
    const targetVisitorLocatorPredicates = getPredicatesFromLocators(assertion.subject);
    const targetVisitorSkipFunction = targetVisitorLocatorPredicates.length
        ? (_, key) => !targetVisitorLocatorPredicates.every((predicate) => predicate(key))
        : undefined;
    const targetVisitor = {
        [assertion.subject.type]: {
            enter: subjectVisitor,
            ...(targetVisitorSkipFunction && { skip: targetVisitorSkipFunction }),
        },
    };
    if (!Array.isArray(assertion.where)) {
        return targetVisitor;
    }
    let currentVisitorLevel = {};
    const visitor = currentVisitorLevel;
    const context = assertion.where;
    for (let index = 0; index < context.length; index++) {
        const assertionDefinitionNode = context[index];
        if (!(0, utils_1.isString)(assertionDefinitionNode.subject?.type)) {
            throw new Error(`${assertion.assertionId} -> where -> [${index}]: 'type' (String) is required`);
        }
        const locatorPredicates = getPredicatesFromLocators(assertionDefinitionNode.subject);
        const assertsToApply = getAssertsToApply(assertionDefinitionNode);
        const skipFunction = (node, key, ctx) => !locatorPredicates.every((predicate) => predicate(key)) ||
            !!applyAssertions(assertionDefinitionNode, assertsToApply, { ...ctx, node }).length;
        const nodeVisitor = {
            ...((locatorPredicates.length || assertsToApply.length) && { skip: skipFunction }),
        };
        if (assertionDefinitionNode.subject.type === assertion.subject.type &&
            index === context.length - 1) {
            // We have to merge the visitors if the last node inside the `where` is the same as the subject.
            targetVisitor[assertion.subject.type] = {
                enter: subjectVisitor,
                ...((nodeVisitor.skip && { skip: nodeVisitor.skip }) ||
                    (targetVisitorSkipFunction && {
                        skip: (node, key, ctx // We may have locators defined on assertion level and on where level for the same node type
                        ) => !!(nodeVisitor.skip?.(node, key, ctx) || targetVisitorSkipFunction?.(node, key)),
                    })),
            };
        }
        else {
            currentVisitorLevel = currentVisitorLevel[assertionDefinitionNode.subject?.type] =
                nodeVisitor;
        }
    }
    currentVisitorLevel[assertion.subject.type] = targetVisitor[assertion.subject.type];
    return visitor;
}
function buildSubjectVisitor(assertId, assertion) {
    return (node, ctx) => {
        const properties = getAssertionProperties(assertion);
        const defaultMessage = `${logger_1.colorize.blue(assertId)} failed because the ${logger_1.colorize.blue(assertion.subject.type)} ${logger_1.colorize.blue(properties.join(', '))} didn't meet the assertions: ${assertionMessageTemplates.problems}`.replace(/ +/g, ' ');
        const problems = applyAssertions(assertion, getAssertsToApply(assertion), {
            ...ctx,
            node,
        });
        if (problems.length) {
            for (const problemGroup of groupProblemsByPointer(problems)) {
                const message = assertion.message || defaultMessage;
                const problemMessage = getProblemsMessage(problemGroup);
                ctx.report({
                    message: message.replace(assertionMessageTemplates.problems, problemMessage),
                    location: getProblemsLocation(problemGroup) || ctx.location,
                    forceSeverity: assertion.severity || 'error',
                    suggest: assertion.suggest || [],
                    ruleId: assertId,
                });
            }
        }
    };
}
function groupProblemsByPointer(problems) {
    const groups = {};
    for (const problem of problems) {
        if (!problem.location)
            continue;
        const pointer = problem.location.pointer;
        groups[pointer] = groups[pointer] || [];
        groups[pointer].push(problem);
    }
    return Object.values(groups);
}
function getProblemsLocation(problems) {
    return problems.length ? problems[0].location : undefined;
}
function getProblemsMessage(problems) {
    return problems.length === 1
        ? problems[0].message ?? ''
        : problems.map((problem) => `\n- ${problem.message ?? ''}`).join('');
}
function getIntersectionLength(keys, properties) {
    const props = new Set(properties);
    let count = 0;
    for (const key of keys) {
        if (props.has(key)) {
            count++;
        }
    }
    return count;
}
function isOrdered(value, options) {
    const direction = options.direction || options;
    const property = options.property;
    for (let i = 1; i < value.length; i++) {
        let currValue = value[i];
        let prevVal = value[i - 1];
        if (property) {
            const currPropValue = value[i][property];
            const prevPropValue = value[i - 1][property];
            if (!currPropValue || !prevPropValue) {
                return false; // property doesn't exist, so collection is not ordered
            }
            currValue = currPropValue;
            prevVal = prevPropValue;
        }
        if (typeof currValue === 'string' && typeof prevVal === 'string') {
            currValue = currValue.toLowerCase();
            prevVal = prevVal.toLowerCase();
        }
        const result = direction === 'asc' ? currValue >= prevVal : currValue <= prevVal;
        if (!result) {
            return false;
        }
    }
    return true;
}
function runAssertion({ assert, ctx, assertionProperty, }) {
    const currentLocation = assert.name === 'ref' ? ctx.rawLocation : ctx.location;
    if (assertionProperty) {
        const values = (0, ref_utils_1.isRef)(ctx.node[assertionProperty])
            ? ctx.resolve(ctx.node[assertionProperty])?.node
            : ctx.node[assertionProperty];
        const rawValues = ctx.rawNode[assertionProperty];
        const location = currentLocation.child(assertionProperty);
        return asserts_1.asserts[assert.name](values, assert.conditions, {
            ...ctx,
            baseLocation: location,
            rawValue: rawValues,
        });
    }
    else {
        const value = Array.isArray(ctx.node) ? ctx.node : Object.keys(ctx.node);
        return asserts_1.asserts[assert.name](value, assert.conditions, {
            ...ctx,
            rawValue: ctx.rawNode,
            baseLocation: currentLocation,
        });
    }
}
function regexFromString(input) {
    const matches = input.match(/^\/(.*)\/(.*)|(.*)/);
    return matches && new RegExp(matches[1] || matches[3], matches[2]);
}
