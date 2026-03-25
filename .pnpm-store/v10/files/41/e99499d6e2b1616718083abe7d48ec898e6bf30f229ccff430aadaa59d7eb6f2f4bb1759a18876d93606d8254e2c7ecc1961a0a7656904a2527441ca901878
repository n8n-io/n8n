import * as types from '.';
import { expectType } from 'tsd';

// builtins
expectType<types.TypesBuiltins>(types.builtins);

// getTypeParser
const noParse = types.getTypeParser(types.builtins.NUMERIC, 'text');
const numericParser = types.getTypeParser(types.builtins.NUMERIC, 'binary');
expectType<string>(noParse('noParse'));
expectType<number>(numericParser([200, 1, 0, 15]));

// getArrayParser 
const value = types.arrayParser('{1,2,3}', (num) => parseInt(num));
expectType<number[]>(value);

//setTypeParser
types.setTypeParser(types.builtins.INT8, parseInt);
types.setTypeParser(types.builtins.FLOAT8, parseFloat);
types.setTypeParser(types.builtins.FLOAT8, 'binary', (data) => data[0]);
types.setTypeParser(types.builtins.FLOAT8, 'text', parseFloat);
