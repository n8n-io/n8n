import type { ReactElement, ComponentType } from 'react';
import type { FromSchema } from 'json-schema-to-ts';
import type { Schema, ConfigFunction } from '@markdoc/markdoc/dist/src/types';
import type { redocConfigSchema } from '../redoc-config-schema';
export type RedocConfigTypes = FromSchema<typeof redocConfigSchema> & {
    markdocOptions?: {
        tags: Record<string, Schema>;
        nodes: Record<string, Schema>;
        components: Record<string, ComponentType>;
        variables?: Record<string, any>;
        partials?: Record<string, any>;
        functions?: Record<string, ConfigFunction>;
    };
    onDeepLinkClick?: ((link: string) => void) | undefined | null;
    unstable_hooks?: HooksConfig;
    requestInterceptor?: ((req: Request, operation: OperationModel) => void) | undefined | null;
    unstable_externalCodeSamples?: Unstable_ExternalCodeSample[];
    unstable_skipSamples?: boolean;
    scrollYOffset?: number | string | (() => number);
};
type HooksConfig = {
    AfterApiTitle?: HookConfig<{
        info: OpenAPIInfo;
    }>;
    BeforeOperation?: HookConfig<{
        operation: OperationModel;
    }>;
    BeforeOperationSummary?: HookConfig<{
        operation: OperationModel;
    }>;
    AfterOperationSummary?: HookConfig<{
        operation: OperationModel;
    }>;
    AfterOperation?: HookConfig<{
        operation: OperationModel;
    }>;
    onInit?: (args: {
        store: Record<string, any>;
    }) => void;
    replaceSecurityLink?: (args: {
        securityRequirementId: string;
    }) => string;
    sanitize?: (raw: string) => string;
    MiddlePanelFooter?: HookConfig<undefined>;
    MiddlePanelHeader?: HookConfig<undefined>;
};
type OpenAPIInfo = {
    title: string;
    version: string;
    description?: string;
    summary?: string;
    termsOfService?: string;
    contact?: Record<string, any>;
    license?: Record<string, any>;
    'x-logo'?: Record<string, any>;
    'x-metadata'?: Record<string, any>;
    'x-seo'?: Record<string, any>;
};
type HookResult = ReactElement | {
    html: string;
} | null;
type HookConfig<T> = (props: T) => HookResult;
type Unstable_ExternalCodeSample = {
    get: (source: ExternalSource) => string;
    lang: string;
    label?: string;
};
type ExternalSource = {
    sample: Unstable_ExternalCodeSample;
    operation: OperationModel;
    exampleName?: string;
    pathParams?: any;
    properties?: any;
};
type OperationModel = {
    id: string;
    name: string;
    description?: string | Record<string, any>;
    href: string;
    pointer: string;
    httpVerb: string;
    deprecated: boolean;
    path: string;
};
export {};
