import * as psl from 'psl';
import type { ParsedDomain, ErrorResult, errorCodes } from './index.d.ts';

const x = (a: ParsedDomain | ErrorResult<keyof errorCodes>) => {
  return a;
};

console.log(x(psl.parse('')));

// $ExpectType string | null
console.log(psl.get('example.com'));

// $ExpectType boolean
console.log(psl.isValid('example.com'));
