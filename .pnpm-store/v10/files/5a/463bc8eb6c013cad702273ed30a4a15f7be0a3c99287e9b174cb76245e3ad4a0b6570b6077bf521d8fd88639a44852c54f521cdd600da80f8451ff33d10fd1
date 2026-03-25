import type { OpenAPIPath, Referenced } from '../../types';
import type { OpenAPIParser } from '../OpenAPIParser';
import { OperationModel } from './Operation';
import type { RedocNormalizedOptions } from '../RedocNormalizedOptions';
export declare class WebhookModel {
    operations: OperationModel[];
    constructor(parser: OpenAPIParser, options: RedocNormalizedOptions, infoOrRef?: Referenced<OpenAPIPath>);
    initWebhooks(parser: OpenAPIParser, webhooks: OpenAPIPath, options: RedocNormalizedOptions): void;
}
