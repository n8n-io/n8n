import ValidationError from '../ValidationError';
import { TestOptions } from './createValidation';
import { Callback } from '../types';
export declare type RunTest = (opts: TestOptions, cb: Callback) => void;
export declare type TestRunOptions = {
    endEarly?: boolean;
    tests: RunTest[];
    args?: TestOptions;
    errors?: ValidationError[];
    sort?: (a: ValidationError, b: ValidationError) => number;
    path?: string;
    value: any;
    sync?: boolean;
};
export default function runTests(options: TestRunOptions, cb: Callback): void;
