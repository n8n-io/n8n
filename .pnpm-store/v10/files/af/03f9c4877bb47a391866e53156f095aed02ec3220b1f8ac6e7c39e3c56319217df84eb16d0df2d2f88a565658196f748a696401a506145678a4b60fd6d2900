import { GroupModel } from './Group.model';
import { SecurityRequirementModel } from './SecurityRequirement';
import { CallbackModel } from './Callback';
import { FieldModel } from './Field';
import { RequestBodyModel } from './RequestBody';
import { ResponseModel } from './Response';
import type { OpenAPIExternalDocumentation, OpenAPIServer, OpenAPIXBadges, OpenAPIXCodeSample } from '../../types';
import type { OpenAPIParser } from '../OpenAPIParser';
import type { RedocNormalizedOptions } from '../RedocNormalizedOptions';
import type { MediaContentModel } from './MediaContent';
import type { ContentItemModel, ExtendedOpenAPIOperation, IMenuItem } from '../types';
export interface XPayloadSample {
    lang: 'payload';
    label: string;
    requestBodyContent: MediaContentModel;
    source: string;
}
export declare function isPayloadSample(sample: XPayloadSample | OpenAPIXCodeSample): sample is XPayloadSample;
/**
 * Operation model ready to be used by components
 */
export declare class OperationModel implements IMenuItem {
    private parser;
    private operationSpec;
    private options;
    id: string;
    absoluteIdx?: number;
    name: string;
    sidebarLabel: string;
    description?: string;
    type: "operation";
    parent?: GroupModel;
    externalDocs?: OpenAPIExternalDocumentation;
    items: ContentItemModel[];
    depth: number;
    ready?: boolean;
    active: boolean;
    expanded: boolean;
    pointer: string;
    operationId?: string;
    operationHash?: string;
    httpVerb: string;
    badges: OpenAPIXBadges[];
    deprecated: boolean;
    path: string;
    servers: OpenAPIServer[];
    security: SecurityRequirementModel[];
    extensions: Record<string, any>;
    isCallback: boolean;
    isWebhook: boolean;
    isEvent: boolean;
    constructor(parser: OpenAPIParser, operationSpec: ExtendedOpenAPIOperation, parent: GroupModel | undefined, options: RedocNormalizedOptions, isCallback?: boolean);
    /**
     * set operation as active (used by side menu)
     */
    activate(): void;
    /**
     * set operation as inactive (used by side menu)
     */
    deactivate(): void;
    /**
     * Toggle expansion in middle panel (for callbacks, which are operations)
     */
    toggle(): void;
    expand(): void;
    collapse(): void;
    get requestBody(): RequestBodyModel | undefined;
    get codeSamples(): (OpenAPIXCodeSample | XPayloadSample)[];
    get parameters(): FieldModel[];
    get responses(): ResponseModel[];
    get callbacks(): CallbackModel[];
}
