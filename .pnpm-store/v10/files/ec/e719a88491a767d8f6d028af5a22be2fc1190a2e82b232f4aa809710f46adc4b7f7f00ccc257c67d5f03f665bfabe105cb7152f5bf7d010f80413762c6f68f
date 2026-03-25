"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asserts = exports.runOnValuesSet = exports.runOnKeysSet = void 0;
exports.buildAssertCustomFunction = buildAssertCustomFunction;
const utils_1 = require("../../../utils");
const utils_2 = require("./utils");
exports.runOnKeysSet = new Set([
    'mutuallyExclusive',
    'mutuallyRequired',
    'enum',
    'pattern',
    'notPattern',
    'minLength',
    'maxLength',
    'casing',
    'sortOrder',
    'disallowed',
    'required',
    'requireAny',
    'ref',
    'const',
    'defined', // In case if `property` for assertions is not added
]);
exports.runOnValuesSet = new Set([
    'pattern',
    'notPattern',
    'enum',
    'defined',
    'undefined',
    'nonEmpty',
    'minLength',
    'maxLength',
    'casing',
    'sortOrder',
    'ref',
    'const',
]);
exports.asserts = {
    pattern: (value, condition, { baseLocation, rawValue }) => {
        if (typeof value === 'undefined' || (0, utils_1.isPlainObject)(value))
            return []; // property doesn't exist or is an object, no need to lint it with this assert
        const values = Array.isArray(value) ? value : [value];
        const regex = (0, utils_2.regexFromString)(condition);
        return values
            .map((_val) => !regex?.test(_val) && {
            message: `"${_val}" should match a regex ${condition}`,
            location: (0, utils_1.isString)(value)
                ? baseLocation
                : (0, utils_1.isPlainObject)(rawValue)
                    ? baseLocation.child(_val).key()
                    : baseLocation.key(),
        })
            .filter(utils_1.isTruthy);
    },
    notPattern: (value, condition, { baseLocation, rawValue }) => {
        if (typeof value === 'undefined' || (0, utils_1.isPlainObject)(value))
            return []; // property doesn't exist or is an object, no need to lint it with this assert
        const values = Array.isArray(value) ? value : [value];
        const regex = (0, utils_2.regexFromString)(condition);
        return values
            .map((_val) => regex?.test(_val) && {
            message: `"${_val}" should not match a regex ${condition}`,
            location: (0, utils_1.isString)(value)
                ? baseLocation
                : (0, utils_1.isPlainObject)(rawValue)
                    ? baseLocation.child(_val).key()
                    : baseLocation.key(),
        })
            .filter(utils_1.isTruthy);
    },
    enum: (value, condition, { baseLocation }) => {
        if (typeof value === 'undefined' || (0, utils_1.isPlainObject)(value))
            return []; // property doesn't exist or is an object, no need to lint it with this assert
        const values = Array.isArray(value) ? value : [value];
        return values
            .map((_val) => !condition.includes(_val) && {
            message: `"${_val}" should be one of the predefined values`,
            location: (0, utils_1.isString)(value) ? baseLocation : baseLocation.child(_val).key(),
        })
            .filter(utils_1.isTruthy);
    },
    defined: (value, condition = true, { baseLocation }) => {
        const isDefined = typeof value !== 'undefined';
        const isValid = condition ? isDefined : !isDefined;
        return isValid
            ? []
            : [
                {
                    message: condition ? `Should be defined` : 'Should be not defined',
                    location: baseLocation,
                },
            ];
    },
    required: (value, keys, { baseLocation }) => {
        return keys
            .map((requiredKey) => !value.includes(requiredKey) && {
            message: `${requiredKey} is required`,
            location: baseLocation.key(),
        })
            .filter(utils_1.isTruthy);
    },
    disallowed: (value, condition, { baseLocation }) => {
        if (typeof value === 'undefined' || (0, utils_1.isPlainObject)(value))
            return []; // property doesn't exist or is an object, no need to lint it with this assert
        const values = Array.isArray(value) ? value : [value];
        return values
            .map((_val) => condition.includes(_val) && {
            message: `"${_val}" is disallowed`,
            location: (0, utils_1.isString)(value) ? baseLocation : baseLocation.child(_val).key(),
        })
            .filter(utils_1.isTruthy);
    },
    const: (value, condition, { baseLocation }) => {
        if (typeof value === 'undefined')
            return [];
        if (Array.isArray(value)) {
            return value
                .map((_val) => condition !== _val && {
                message: `"${_val}" should be equal ${condition} `,
                location: (0, utils_1.isString)(value) ? baseLocation : baseLocation.child(_val).key(),
            })
                .filter(utils_1.isTruthy);
        }
        else {
            return value !== condition
                ? [
                    {
                        message: `${value} should be equal ${condition}`,
                        location: baseLocation,
                    },
                ]
                : [];
        }
    },
    undefined: (value, condition = true, { baseLocation }) => {
        const isUndefined = typeof value === 'undefined';
        const isValid = condition ? isUndefined : !isUndefined;
        return isValid
            ? []
            : [
                {
                    message: condition ? `Should not be defined` : 'Should be defined',
                    location: baseLocation,
                },
            ];
    },
    nonEmpty: (value, condition = true, { baseLocation }) => {
        const isEmpty = typeof value === 'undefined' || value === null || value === '';
        const isValid = condition ? !isEmpty : isEmpty;
        return isValid
            ? []
            : [
                {
                    message: condition ? `Should not be empty` : 'Should be empty',
                    location: baseLocation,
                },
            ];
    },
    minLength: (value, condition, { baseLocation }) => {
        if (typeof value === 'undefined' || value.length >= condition)
            return []; // property doesn't exist, no need to lint it with this assert
        return [
            {
                message: `Should have at least ${condition} characters`,
                location: baseLocation,
            },
        ];
    },
    maxLength: (value, condition, { baseLocation }) => {
        if (typeof value === 'undefined' || value.length <= condition)
            return []; // property doesn't exist, no need to lint it with this assert
        return [
            {
                message: `Should have at most ${condition} characters`,
                location: baseLocation,
            },
        ];
    },
    casing: (value, condition, { baseLocation }) => {
        if (typeof value === 'undefined' || (0, utils_1.isPlainObject)(value))
            return []; // property doesn't exist or is an object, no need to lint it with this assert
        const values = Array.isArray(value) ? value : [value];
        const casingRegexes = {
            camelCase: /^[a-z][a-zA-Z0-9]*$/g,
            'kebab-case': /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/g,
            snake_case: /^([a-z][a-z0-9]*)(_[a-z0-9]+)*$/g,
            PascalCase: /^[A-Z][a-zA-Z0-9]+$/g,
            MACRO_CASE: /^([A-Z][A-Z0-9]*)(_[A-Z0-9]+)*$/g,
            'COBOL-CASE': /^([A-Z][A-Z0-9]*)(-[A-Z0-9]+)*$/g,
            flatcase: /^[a-z][a-z0-9]+$/g,
        };
        return values
            .map((_val) => !_val.match(casingRegexes[condition]) && {
            message: `"${_val}" should use ${condition}`,
            location: (0, utils_1.isString)(value) ? baseLocation : baseLocation.child(_val).key(),
        })
            .filter(utils_1.isTruthy);
    },
    sortOrder: (value, condition, { baseLocation }) => {
        const direction = condition.direction || condition;
        const property = condition.property;
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && !property) {
            return [
                {
                    message: `Please define a property to sort objects by`,
                    location: baseLocation,
                },
            ];
        }
        if (typeof value === 'undefined' || (0, utils_2.isOrdered)(value, condition))
            return [];
        return [
            {
                message: `Should be sorted in ${direction === 'asc' ? 'an ascending' : 'a descending'} order${property ? ` by property ${property}` : ''}`,
                location: baseLocation,
            },
        ];
    },
    mutuallyExclusive: (value, condition, { baseLocation }) => {
        if ((0, utils_2.getIntersectionLength)(value, condition) < 2)
            return [];
        return [
            {
                message: `${condition.join(', ')} keys should be mutually exclusive`,
                location: baseLocation.key(),
            },
        ];
    },
    mutuallyRequired: (value, condition, { baseLocation }) => {
        const isValid = (0, utils_2.getIntersectionLength)(value, condition) > 0
            ? (0, utils_2.getIntersectionLength)(value, condition) === condition.length
            : true;
        return isValid
            ? []
            : [
                {
                    message: `Properties ${condition.join(', ')} are mutually required`,
                    location: baseLocation.key(),
                },
            ];
    },
    requireAny: (value, condition, { baseLocation }) => {
        return (0, utils_2.getIntersectionLength)(value, condition) >= 1
            ? []
            : [
                {
                    message: `Should have any of ${condition.join(', ')}`,
                    location: baseLocation.key(),
                },
            ];
    },
    ref: (_value, condition, { baseLocation, rawValue }) => {
        if (typeof rawValue === 'undefined')
            return []; // property doesn't exist, no need to lint it with this assert
        const hasRef = rawValue.hasOwnProperty('$ref');
        if (typeof condition === 'boolean') {
            const isValid = condition ? hasRef : !hasRef;
            return isValid
                ? []
                : [
                    {
                        message: condition ? `should use $ref` : 'should not use $ref',
                        location: hasRef ? baseLocation : baseLocation.key(),
                    },
                ];
        }
        const regex = (0, utils_2.regexFromString)(condition);
        const isValid = hasRef && regex?.test(rawValue['$ref']);
        return isValid
            ? []
            : [
                {
                    message: `$ref value should match ${condition}`,
                    location: hasRef ? baseLocation : baseLocation.key(),
                },
            ];
    },
};
function buildAssertCustomFunction(fn) {
    return (value, options, ctx) => fn.call(null, value, options, ctx);
}
