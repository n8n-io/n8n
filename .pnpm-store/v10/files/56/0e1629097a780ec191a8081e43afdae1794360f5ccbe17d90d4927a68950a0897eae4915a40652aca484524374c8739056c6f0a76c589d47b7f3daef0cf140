import { compareVersions } from './compareVersions.js';
/**
 * Compare [semver](https://semver.org/) version strings using the specified operator.
 *
 * @param v1 First version to compare
 * @param v2 Second version to compare
 * @param operator Allowed arithmetic operator to use
 * @returns `true` if the comparison between the firstVersion and the secondVersion satisfies the operator, `false` otherwise.
 *
 * @example
 * ```
 * compare('10.1.8', '10.0.4', '>'); // return true
 * compare('10.0.1', '10.0.1', '='); // return true
 * compare('10.1.1', '10.2.2', '<'); // return true
 * compare('10.1.1', '10.2.2', '<='); // return true
 * compare('10.1.1', '10.2.2', '>='); // return false
 * ```
 */
export const compare = (v1, v2, operator) => {
    // validate input operator
    assertValidOperator(operator);
    // since result of compareVersions can only be -1 or 0 or 1
    // a simple map can be used to replace switch
    const res = compareVersions(v1, v2);
    return operatorResMap[operator].includes(res);
};
const operatorResMap = {
    '>': [1],
    '>=': [0, 1],
    '=': [0],
    '<=': [-1, 0],
    '<': [-1],
    '!=': [-1, 1],
};
const allowedOperators = Object.keys(operatorResMap);
const assertValidOperator = (op) => {
    if (typeof op !== 'string') {
        throw new TypeError(`Invalid operator type, expected string but got ${typeof op}`);
    }
    if (allowedOperators.indexOf(op) === -1) {
        throw new Error(`Invalid operator, expected one of ${allowedOperators.join('|')}`);
    }
};
//# sourceMappingURL=compare.js.map