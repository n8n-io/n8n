import { asserts, runOnKeysSet, runOnValuesSet } from './asserts';
import { colorize } from '../../../logger';
import { isRef } from '../../../ref-utils';
import { isTruthy, keysOf, isString } from '../../../utils';

import type { UserContext } from 'core/src/walk';
import type { Asserts } from './asserts';
import type { AssertionContext, AssertResult } from '../../../config';
import type { Assertion, AssertionDefinition, AssertionLocators } from '.';
import type {
  Oas2Visitor,
  Oas3Visitor,
  SkipFunctionContext,
  VisitFunction,
} from '../../../visitors';

export type OrderDirection = 'asc' | 'desc';

export type OrderOptions = {
  direction: OrderDirection;
  property: string;
};

export type AssertToApply = {
  name: keyof Asserts;
  conditions: any;
  runsOnKeys: boolean;
  runsOnValues: boolean;
};

type RunAssertionParams = {
  ctx: AssertionContext;
  assert: AssertToApply;
  assertionProperty?: string;
};

const assertionMessageTemplates = {
  problems: '{{problems}}',
};

function getPredicatesFromLocators(
  locators: AssertionLocators
): ((key: string | number) => boolean)[] {
  const { filterInParentKeys, filterOutParentKeys, matchParentKeys } = locators;

  const keyMatcher = matchParentKeys && regexFromString(matchParentKeys);
  const matchKeysPredicate =
    keyMatcher && ((key: string | number) => keyMatcher.test(key.toString()));

  const filterInPredicate =
    Array.isArray(filterInParentKeys) &&
    ((key: string | number) => filterInParentKeys.includes(key.toString()));

  const filterOutPredicate =
    Array.isArray(filterOutParentKeys) &&
    ((key: string | number) => !filterOutParentKeys.includes(key.toString()));

  return [matchKeysPredicate, filterInPredicate, filterOutPredicate].filter(isTruthy);
}

export function getAssertsToApply(assertion: AssertionDefinition): AssertToApply[] {
  const assertsToApply = keysOf(asserts)
    .filter((assertName) => assertion.assertions[assertName] !== undefined)
    .map((assertName) => {
      return {
        name: assertName,
        conditions: assertion.assertions[assertName],
        runsOnKeys: runOnKeysSet.has(assertName),
        runsOnValues: runOnValuesSet.has(assertName),
      };
    });

  const shouldRunOnKeys: AssertToApply | undefined = assertsToApply.find(
    (assert: AssertToApply) => assert.runsOnKeys && !assert.runsOnValues
  );
  const shouldRunOnValues: AssertToApply | undefined = assertsToApply.find(
    (assert: AssertToApply) => assert.runsOnValues && !assert.runsOnKeys
  );

  if (shouldRunOnValues && !assertion.subject.property) {
    throw new Error(
      `The '${shouldRunOnValues.name}' assertion can't be used on all keys. Please provide a single property.`
    );
  }

  if (shouldRunOnKeys && assertion.subject.property) {
    throw new Error(
      `The '${shouldRunOnKeys.name}' assertion can't be used on properties. Please remove the 'property' key.`
    );
  }

  return assertsToApply;
}

function getAssertionProperties({ subject }: AssertionDefinition): string[] {
  return (Array.isArray(subject.property) ? subject.property : [subject?.property]).filter(
    Boolean
  ) as string[];
}

function applyAssertions(
  assertionDefinition: AssertionDefinition,
  asserts: AssertToApply[],
  ctx: AssertionContext
): AssertResult[] {
  const properties = getAssertionProperties(assertionDefinition);
  const assertResults: Array<AssertResult[]> = [];

  for (const assert of asserts) {
    if (properties.length) {
      for (const property of properties) {
        assertResults.push(
          runAssertion({
            assert,
            ctx,
            assertionProperty: property,
          })
        );
      }
    } else {
      assertResults.push(
        runAssertion({
          assert,
          ctx,
        })
      );
    }
  }

  return assertResults.flat();
}

export function buildVisitorObject(
  assertion: Assertion,
  subjectVisitor: VisitFunction<any>
): Oas2Visitor | Oas3Visitor {
  const targetVisitorLocatorPredicates = getPredicatesFromLocators(assertion.subject);
  const targetVisitorSkipFunction = targetVisitorLocatorPredicates.length
    ? (_: any, key: string | number) =>
        !targetVisitorLocatorPredicates.every((predicate) => predicate(key))
    : undefined;
  const targetVisitor: Oas2Visitor | Oas3Visitor = {
    [assertion.subject.type]: {
      enter: subjectVisitor,
      ...(targetVisitorSkipFunction && { skip: targetVisitorSkipFunction }),
    },
  };

  if (!Array.isArray(assertion.where)) {
    return targetVisitor;
  }

  let currentVisitorLevel: Record<string, any> = {};
  const visitor: Record<string, any> = currentVisitorLevel;
  const context = assertion.where;

  for (let index = 0; index < context.length; index++) {
    const assertionDefinitionNode = context[index];

    if (!isString(assertionDefinitionNode.subject?.type)) {
      throw new Error(
        `${assertion.assertionId} -> where -> [${index}]: 'type' (String) is required`
      );
    }

    const locatorPredicates = getPredicatesFromLocators(assertionDefinitionNode.subject);
    const assertsToApply = getAssertsToApply(assertionDefinitionNode);

    const skipFunction = (node: unknown, key: string | number, ctx: SkipFunctionContext): boolean =>
      !locatorPredicates.every((predicate) => predicate(key)) ||
      !!applyAssertions(assertionDefinitionNode, assertsToApply, { ...ctx, node }).length;

    const nodeVisitor = {
      ...((locatorPredicates.length || assertsToApply.length) && { skip: skipFunction }),
    };

    if (
      assertionDefinitionNode.subject.type === assertion.subject.type &&
      index === context.length - 1
    ) {
      // We have to merge the visitors if the last node inside the `where` is the same as the subject.
      targetVisitor[assertion.subject.type] = {
        enter: subjectVisitor,
        ...((nodeVisitor.skip && { skip: nodeVisitor.skip }) ||
          (targetVisitorSkipFunction && {
            skip: (
              node,
              key,
              ctx // We may have locators defined on assertion level and on where level for the same node type
            ) => !!(nodeVisitor.skip?.(node, key, ctx) || targetVisitorSkipFunction?.(node, key)),
          })),
      };
    } else {
      currentVisitorLevel = currentVisitorLevel[assertionDefinitionNode.subject?.type] =
        nodeVisitor;
    }
  }

  currentVisitorLevel[assertion.subject.type] = targetVisitor[assertion.subject.type];

  return visitor;
}

export function buildSubjectVisitor(assertId: string, assertion: Assertion): VisitFunction<any> {
  return (node: any, ctx: UserContext) => {
    const properties = getAssertionProperties(assertion);

    const defaultMessage = `${colorize.blue(assertId)} failed because the ${colorize.blue(
      assertion.subject.type
    )} ${colorize.blue(properties.join(', '))} didn't meet the assertions: ${
      assertionMessageTemplates.problems
    }`.replace(/ +/g, ' ');

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

function groupProblemsByPointer(problems: AssertResult[]): AssertResult[][] {
  const groups: Record<string, AssertResult[]> = {};
  for (const problem of problems) {
    if (!problem.location) continue;
    const pointer = problem.location.pointer;
    groups[pointer] = groups[pointer] || [];
    groups[pointer].push(problem);
  }
  return Object.values(groups);
}

function getProblemsLocation(problems: AssertResult[]) {
  return problems.length ? problems[0].location : undefined;
}

function getProblemsMessage(problems: AssertResult[]) {
  return problems.length === 1
    ? problems[0].message ?? ''
    : problems.map((problem) => `\n- ${problem.message ?? ''}`).join('');
}

export function getIntersectionLength(keys: string[], properties: string[]): number {
  const props = new Set(properties);
  let count = 0;
  for (const key of keys) {
    if (props.has(key)) {
      count++;
    }
  }
  return count;
}

export function isOrdered(value: any[], options: OrderOptions | OrderDirection): boolean {
  const direction = (options as OrderOptions).direction || (options as OrderDirection);
  const property = (options as OrderOptions).property;
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

export function runAssertion({
  assert,
  ctx,
  assertionProperty,
}: RunAssertionParams): AssertResult[] {
  const currentLocation = assert.name === 'ref' ? ctx.rawLocation : ctx.location;

  if (assertionProperty) {
    const values = isRef(ctx.node[assertionProperty])
      ? ctx.resolve(ctx.node[assertionProperty])?.node
      : ctx.node[assertionProperty];
    const rawValues = ctx.rawNode[assertionProperty];

    const location = currentLocation.child(assertionProperty);

    return asserts[assert.name](values, assert.conditions, {
      ...ctx,
      baseLocation: location,
      rawValue: rawValues,
    });
  } else {
    const value = Array.isArray(ctx.node) ? ctx.node : Object.keys(ctx.node);

    return asserts[assert.name](value, assert.conditions, {
      ...ctx,
      rawValue: ctx.rawNode,
      baseLocation: currentLocation,
    });
  }
}

export function regexFromString(input: string): RegExp | null {
  const matches = input.match(/^\/(.*)\/(.*)|(.*)/);
  return matches && new RegExp(matches[1] || matches[3], matches[2]);
}
