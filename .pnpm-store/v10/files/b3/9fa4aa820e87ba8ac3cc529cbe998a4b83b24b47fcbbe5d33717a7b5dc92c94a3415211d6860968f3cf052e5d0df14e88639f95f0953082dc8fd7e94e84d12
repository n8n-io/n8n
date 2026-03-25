"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Assertions = void 0;
const utils_1 = require("./utils");
const utils_2 = require("../../../utils");
const Assertions = (opts) => {
    const visitors = [];
    // As 'Assertions' has an array of asserts,
    // that array spreads into an 'opts' object on init rules phase here
    // https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/config/config.ts#L311
    // that is why we need to iterate through 'opts' values;
    // before - filter only object 'opts' values
    const assertions = Object.values(opts).filter((opt) => typeof opt === 'object' && opt !== null);
    for (const [_, assertion] of assertions.entries()) {
        if (!(0, utils_2.isString)(assertion.subject.type)) {
            throw new Error(`${assertion.assertionId}: 'type' (String) is required`);
        }
        const subjectVisitor = (0, utils_1.buildSubjectVisitor)(assertion.assertionId, assertion);
        const visitorObject = (0, utils_1.buildVisitorObject)(assertion, subjectVisitor);
        visitors.push(visitorObject);
    }
    return visitors;
};
exports.Assertions = Assertions;
