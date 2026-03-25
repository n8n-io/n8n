import { OperationModel } from './Operation';
import type { OpenAPIParser } from '../OpenAPIParser';
import type { OpenAPICallback, Referenced } from '../../types';
import type { RedocNormalizedOptions } from '../RedocNormalizedOptions';
export declare class CallbackModel {
    expanded: boolean;
    name: string;
    operations: OperationModel[];
    constructor(parser: OpenAPIParser, name: string, infoOrRef: Referenced<OpenAPICallback>, pointer: string, options: RedocNormalizedOptions);
    toggle(): void;
}
