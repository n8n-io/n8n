"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matches = exports.captor = exports.notEmpty = exports.notUndefined = exports.notNull = exports.objectContainsValue = exports.objectContainsKey = exports.mapHas = exports.setHas = exports.arrayIncludes = exports.isA = exports.anySet = exports.anyMap = exports.anyArray = exports.anyObject = exports.anySymbol = exports.anyFunction = exports.anyString = exports.anyNumber = exports.anyBoolean = exports.any = exports.CaptorMatcher = exports.Matcher = void 0;
// needs to be a class so we can instanceof
class Matcher {
    constructor(asymmetricMatch, description) {
        this.asymmetricMatch = asymmetricMatch;
        this.description = description;
        this.$$typeof = Symbol.for('jest.asymmetricMatcher');
    }
    toString() {
        return this.description;
    }
    toAsymmetricMatcher() {
        return this.description;
    }
    getExpectedType() {
        return 'undefined';
    }
}
exports.Matcher = Matcher;
class CaptorMatcher {
    constructor() {
        this.values = [];
        this.$$typeof = Symbol.for('jest.asymmetricMatcher');
        this.asymmetricMatch = (actualValue) => {
            // @ts-ignore
            this.value = actualValue;
            this.values.push(actualValue);
            return true;
        };
    }
    getExpectedType() {
        return 'Object';
    }
    toString() {
        return 'captor';
    }
    toAsymmetricMatcher() {
        return 'captor';
    }
}
exports.CaptorMatcher = CaptorMatcher;
const any = () => new Matcher(() => true, 'any()');
exports.any = any;
const anyBoolean = () => new Matcher((actualValue) => typeof actualValue === 'boolean', 'anyBoolean()');
exports.anyBoolean = anyBoolean;
const anyNumber = () => new Matcher((actualValue) => typeof actualValue === 'number' && !isNaN(actualValue), 'anyNumber()');
exports.anyNumber = anyNumber;
const anyString = () => new Matcher((actualValue) => typeof actualValue === 'string', 'anyString()');
exports.anyString = anyString;
const anyFunction = () => new Matcher((actualValue) => typeof actualValue === 'function', 'anyFunction()');
exports.anyFunction = anyFunction;
const anySymbol = () => new Matcher((actualValue) => typeof actualValue === 'symbol', 'anySymbol()');
exports.anySymbol = anySymbol;
const anyObject = () => new Matcher((actualValue) => typeof actualValue === 'object' && actualValue !== null, 'anyObject()');
exports.anyObject = anyObject;
const anyArray = () => new Matcher((actualValue) => Array.isArray(actualValue), 'anyArray()');
exports.anyArray = anyArray;
const anyMap = () => new Matcher((actualValue) => actualValue instanceof Map, 'anyMap()');
exports.anyMap = anyMap;
const anySet = () => new Matcher((actualValue) => actualValue instanceof Set, 'anySet()');
exports.anySet = anySet;
const isA = (clazz) => new Matcher((actualValue) => actualValue instanceof clazz, 'isA()');
exports.isA = isA;
const arrayIncludes = (arrayVal) => new Matcher((actualValue) => Array.isArray(actualValue) && actualValue.includes(arrayVal), 'arrayIncludes()');
exports.arrayIncludes = arrayIncludes;
const setHas = (arrayVal) => new Matcher((actualValue) => (0, exports.anySet)().asymmetricMatch(actualValue) && actualValue.has(arrayVal), 'setHas()');
exports.setHas = setHas;
const mapHas = (mapVal) => new Matcher((actualValue) => (0, exports.anyMap)().asymmetricMatch(actualValue) && actualValue.has(mapVal), 'mapHas()');
exports.mapHas = mapHas;
const objectContainsKey = (key) => new Matcher((actualValue) => (0, exports.anyObject)().asymmetricMatch(actualValue) && actualValue[key] !== undefined, 'objectContainsKey()');
exports.objectContainsKey = objectContainsKey;
const objectContainsValue = (value) => new Matcher((actualValue) => (0, exports.anyObject)().asymmetricMatch(actualValue) && Object.values(actualValue).includes(value), 'objectContainsValue()');
exports.objectContainsValue = objectContainsValue;
const notNull = () => new Matcher((actualValue) => actualValue !== null, 'notNull()');
exports.notNull = notNull;
const notUndefined = () => new Matcher((actualValue) => actualValue !== undefined, 'notUndefined()');
exports.notUndefined = notUndefined;
const notEmpty = () => new Matcher((actualValue) => actualValue !== null && actualValue !== undefined && actualValue !== '', 'notEmpty()');
exports.notEmpty = notEmpty;
const captor = () => new CaptorMatcher();
exports.captor = captor;
const matches = (matcher) => new Matcher(matcher, 'matches()');
exports.matches = matches;
