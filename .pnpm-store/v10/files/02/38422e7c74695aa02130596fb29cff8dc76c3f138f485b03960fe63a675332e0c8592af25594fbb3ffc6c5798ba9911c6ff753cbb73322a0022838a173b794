import MixedSchema, { create as mixedCreate } from './mixed';
import BooleanSchema, { create as boolCreate } from './boolean';
import StringSchema, { create as stringCreate } from './string';
import NumberSchema, { create as numberCreate } from './number';
import DateSchema, { create as dateCreate } from './date';
import ObjectSchema, { create as objectCreate } from './object';
import ArraySchema, { create as arrayCreate } from './array';
import { create as refCreate } from './Reference';
import { create as lazyCreate } from './Lazy';
import ValidationError from './ValidationError';
import reach from './util/reach';
import isSchema from './util/isSchema';
import setLocale from './setLocale';
import BaseSchema from './schema';

function addMethod(schemaType, name, fn) {
  if (!schemaType || !isSchema(schemaType.prototype)) throw new TypeError('You must provide a yup schema constructor function');
  if (typeof name !== 'string') throw new TypeError('A Method name must be provided');
  if (typeof fn !== 'function') throw new TypeError('Method function must be provided');
  schemaType.prototype[name] = fn;
}

export { mixedCreate as mixed, boolCreate as bool, boolCreate as boolean, stringCreate as string, numberCreate as number, dateCreate as date, objectCreate as object, arrayCreate as array, refCreate as ref, lazyCreate as lazy, reach, isSchema, addMethod, setLocale, ValidationError };
export { BaseSchema, MixedSchema, BooleanSchema, StringSchema, NumberSchema, DateSchema, ObjectSchema, ArraySchema };