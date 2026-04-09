import { type ReadStream } from 'node:fs';
import FormData = require('form-data');
import { type TestContext, type RequestBody } from '../../types';
export declare function stripFileDecorator(payload: string): string;
export declare function parseRequestBody(stepRequestBody: RequestBody | undefined, ctx: TestContext): Promise<Omit<RequestBody, 'payload'> & {
    payload: string | number | boolean | Record<string, any> | ReadStream | FormData | undefined;
}>;
//# sourceMappingURL=parse-request-body.d.ts.map