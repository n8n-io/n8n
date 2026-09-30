// Vendored from github.com/elsmr/n8n-expression-types@d75330c, packages/@n8n/expression-types/src.
// Emitted with tsc --declaration --removeComments. Strings, not .d.ts files: tsc does not copy
// .d.ts files to dist, and as project files they would add n8n globals to this package.

export const SHAPES_D_TS = `import type { DateTime as LuxonDateTime } from 'luxon';
declare global {
    type DateTime = LuxonDateTime;
    interface N8nBinaryData {
        data: string;
        mimeType: string;
        fileType?: string;
        fileName?: string;
        directory?: string;
        fileExtension?: string;
        fileSize?: string;
        id?: string;
    }
    interface N8nItem<J, B extends string> {
        json: J;
        binary: Record<B, N8nBinaryData>;
        pairedItem?: {
            item: number;
            input?: number;
        } | Array<{
            item: number;
            input?: number;
        }>;
    }
    interface N8nNodeData<J, B extends string, P> {
        item: N8nItem<J, B>;
        itemMatching(itemIndex: number): N8nItem<J, B>;
        pairedItem(itemIndex?: number): N8nItem<J, B>;
        first(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
        last(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
        all(branchIndex?: number, runIndex?: number): Array<N8nItem<J, B>>;
        context: Record<string, any>;
        params: P;
        isExecuted: boolean;
    }
    type N8nAnyNodeData = N8nNodeData<Record<string, any>, string, Record<string, any>>;
    interface N8nInput<J, B extends string, P> {
        item: N8nItem<J, B>;
        first(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
        last(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
        all(branchIndex?: number, runIndex?: number): Array<N8nItem<J, B>>;
        context: Record<string, any>;
        params: P;
    }
    type N8nLegacyNode<J, B extends string, P> = N8nItem<J, B> & {
        parameter: P;
        context: Record<string, any>;
        runIndex: number;
    };
    interface N8nExecution {
        id: string;
        mode: 'test' | 'production';
        resumeUrl: string;
        resumeFormUrl: string;
        customData?: {
            set(key: string, value: string): void;
            get(key: string): string;
            getAll(): Record<string, string>;
            setAll(values: Record<string, string>): void;
        };
    }
    type N8nMode = 'cli' | 'error' | 'integrated' | 'internal' | 'manual' | 'retry' | 'trigger' | 'webhook' | 'evaluation' | 'chat';
    interface N8nPrevNode {
        name: string;
        outputIndex: number;
        runIndex: number;
    }
    interface N8nWorkflow {
        id: string;
        name: string;
        active: boolean;
    }
    interface N8nAgentInfo {
        memoryConnectedToAgent: boolean;
        tools: Array<{
            connected: boolean;
            name: string;
            type: string;
            resource?: string;
            operation?: string;
            hasCredentials?: boolean;
        }>;
    }
    type N8nFromAIType = 'string' | 'number' | 'boolean' | 'json';
    type N8nLooseJson = any;
    interface N8nHttpResponse<Body> {
        body: Body;
        headers: Record<string, any>;
        statusCode: number;
        statusMessage?: string;
    }
    interface N8nHttpRequest<Body> {
        url: string;
        baseURL?: string;
        method?: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';
        headers?: Record<string, any>;
        qs?: Record<string, any>;
        body?: Body;
        json?: boolean;
        [key: string]: any;
    }
    interface N8nInvalidExpression {
        readonly __n8nInvalidExpression: true;
    }
    interface N8nResolveError {
        readonly __n8nResolveError: true;
    }
}
export {};
`;

export const EXTENSIONS_D_TS = `import type { DateTime, DurationUnit } from 'luxon';
declare module 'luxon' {
    interface DateTime {
        beginningOf(unit?: DurationUnit): DateTime;
        endOfMonth(): DateTime;
        extract(unit?: string): number;
        isBetween(date1: string | DateTime, date2: string | DateTime): boolean;
        isDst(): boolean;
        isInLast(n: number, unit?: DurationUnit): boolean;
        minus(n: number | object, unit?: string): DateTime;
        plus(n: number | object, unit?: string): DateTime;
        format(fmt: string): string;
        toDateTime(): DateTime;
        diffTo(otherDateTime: string | DateTime, unit: string | string[]): number | Record<DurationUnit, number>;
        diffToNow(unit: string | string[]): number | Record<DurationUnit, number>;
        toInt(): any;
        toFloat(): any;
        toBoolean(): any;
        isEmpty(): boolean;
        isNotEmpty(): boolean;
    }
}
declare global {
    interface String {
        hash(algo?: string): string;
        removeMarkdown(): string;
        removeTags(): string;
        toDate(): Date;
        toDateTime(format?: string): DateTime;
        toBoolean(): boolean;
        toDecimalNumber(): any;
        toNumber(): number;
        toFloat(): number;
        toInt(radix?: number): number;
        toWholeNumber(): any;
        toSentenceCase(): string;
        toSnakeCase(): string;
        toTitleCase(): string;
        urlDecode(allChars?: boolean): string;
        urlEncode(allChars?: boolean): string;
        quote(mark?: string): string;
        replaceSpecialChars(): string;
        isDomain(): boolean;
        isEmail(): boolean;
        isNumeric(): boolean;
        isUrl(): boolean;
        isEmpty(): boolean;
        isNotEmpty(): boolean;
        toJsonString(): string;
        extractEmail(): string;
        extractDomain(): string;
        extractUrl(): string;
        extractUrlPath(): string;
        parseJson(): any;
        base64Encode(): string;
        base64Decode(): string;
    }
    interface Number {
        ceil(): number;
        floor(): number;
        format(locale?: string, options?: object): string;
        round(decimalPlaces?: number): number;
        abs(): number;
        isInteger(): boolean;
        isEven(): boolean;
        isOdd(): boolean;
        toBoolean(): boolean;
        toInt(): any;
        toFloat(): any;
        toDateTime(format?: string): DateTime;
    }
    interface Boolean {
        toBoolean(): any;
        toInt(): any;
        toFloat(): any;
        toNumber(): number;
        toDateTime(): any;
    }
    interface Array<T> {
        removeDuplicates(...fieldNames: any[]): T[];
        unique(...fieldNames: any[]): T[];
        first(): T;
        last(): T;
        pluck(...fieldNames: string[]): T[];
        randomItem(): T;
        sum(): number;
        min(): number;
        max(): number;
        average(): number;
        isNotEmpty(): boolean;
        isEmpty(): boolean;
        compact(): T[];
        smartJoin(keyField: string, nameField: string): Record<string, any>;
        chunk(length: number): T[];
        renameKeys(from: string, to: string): T[];
        merge(otherArray: T[]): Record<string, any>;
        union(otherArray: T[]): T[];
        difference(otherArray: T[]): T[];
        intersection(otherArray: T[]): T[];
        append(...elements: any[]): T[];
        toJsonString(): string;
        toInt(): any;
        toFloat(): any;
        toBoolean(): any;
        toDateTime(): any;
    }
    interface Object {
        isEmpty(): boolean;
        isNotEmpty(): boolean;
        hasField(name: string): boolean;
        removeField(key: string): Record<string, any>;
        removeFieldsContaining(value: string): Record<string, any>;
        keepFieldsContaining(value: string): Record<string, any>;
        compact(): Record<string, any>;
        urlEncode(): string;
        keys(): string[];
        values(): any[];
        toJsonString(): string;
        toInt(): any;
        toFloat(): any;
        toBoolean(): any;
        toDateTime(): any;
    }
    interface Date {
        beginningOf(unit?: DurationUnit): DateTime;
        endOfMonth(): DateTime;
        extract(unit?: string): number;
        isBetween(date1: string | DateTime, date2: string | DateTime): boolean;
        isDst(): boolean;
        isInLast(n: number, unit?: DurationUnit): boolean;
        minus(n: number | object, unit?: string): DateTime;
        plus(n: number | object, unit?: string): DateTime;
        format(fmt: string): string;
        toDateTime(): DateTime;
        diffTo(otherDateTime: string | DateTime, unit: string | string[]): number | Record<DurationUnit, number>;
        diffToNow(unit: string | string[]): number | Record<DurationUnit, number>;
        toInt(): any;
        toFloat(): any;
        toBoolean(): any;
        isEmpty(): boolean;
        isNotEmpty(): boolean;
    }
    function $if<T, F = undefined>(condition: boolean, valueIfTrue: T, valueIfFalse?: F): T | F;
    function $min(...numbers: number[]): number;
    function $max(...numbers: number[]): number;
    function $average(...numbers: number[]): number;
    function $not(value: unknown): boolean;
    function $ifEmpty<V, E>(value: V, defaultValue: E): V | E;
    interface N8nHelpers {
        $if: typeof $if;
        $min: typeof $min;
        $max: typeof $max;
        $average: typeof $average;
        $not: typeof $not;
        $ifEmpty: typeof $ifEmpty;
    }
}
export {};
`;

export const CONTEXTS_D_TS = `export type Json = string | number | boolean | null | Json[] | {
    [key: string]: Json;
};
export type NodeRuntime = {
    json: Json;
    binaryKeys?: readonly string[];
    params?: Json;
};
export type RuntimeTypes = {
    context?: ExpressionContext;
    input?: NodeRuntime;
    nodes?: Record<string, NodeRuntime>;
    parameters?: Json;
    credentials?: Json;
    value?: Json;
    response?: Json;
    responseItem?: Json;
    request?: Json;
    vars?: readonly string[];
    env?: readonly string[];
};
type Prop<R, K extends string> = K extends keyof R ? Exclude<R[K], undefined> : never;
type Or<V, Fallback> = [V] extends [never] ? Fallback : V;
type Data<R, K extends string, H> = Or<Prop<R, K>, H>;
type Keys<K, H> = [K] extends [readonly (infer S extends string)[]] ? [S] extends [never] ? AnyKey<H> : S : AnyKey<H>;
type AnyKey<H> = [H] extends [never] ? never : string;
type Input<R> = Prop<R, 'input'>;
type Nodes<R> = Or<Prop<R, 'nodes'>, {}>;
type NodeData<N, H> = N8nNodeData<Data<N, 'json', H>, Keys<Prop<N, 'binaryKeys'>, H>, Data<N, 'params', H>>;
interface CommonContext<R, H> {
    $now: DateTime;
    $today: DateTime;
    $vars: Record<Keys<Prop<R, 'vars'>, H>, string>;
    $env: Record<Keys<Prop<R, 'env'>, H>, string>;
    $secrets: Record<string, Record<string, any>>;
    $execution: N8nExecution;
    $evaluation: {
        runId: string;
    } | undefined;
    $mode: N8nMode;
    $workflow: N8nWorkflow;
    $jmespath(data: Record<string, any> | any[], query: string): any;
    $jmesPath(data: Record<string, any> | any[], query: string): any;
    $evaluateExpression(expression: string, itemIndex?: number): any;
}
export interface NodeParameterContext<R = {}, H = N8nLooseJson> extends CommonContext<R, H> {
    $json: Data<Input<R>, 'json', H>;
    $data: Data<Input<R>, 'json', H>;
    $binary: Record<Keys<Prop<Input<R>, 'binaryKeys'>, H>, N8nBinaryData>;
    $input: N8nInput<Data<Input<R>, 'json', H>, Keys<Prop<Input<R>, 'binaryKeys'>, H>, Data<R, 'parameters', H>>;
    $thisItem: N8nItem<Data<Input<R>, 'json', H>, Keys<Prop<Input<R>, 'binaryKeys'>, H>>;
    $<K extends keyof Nodes<R>>(nodeName: K, resolveFullItem?: boolean): NodeData<Nodes<R>[K], H>;
    $(nodeName?: string, resolveFullItem?: boolean): [H] extends [never] ? never : N8nAnyNodeData;
    $node: {
        [K in keyof Nodes<R>]: N8nLegacyNode<Data<Nodes<R>[K], 'json', H>, Keys<Prop<Nodes<R>[K], 'binaryKeys'>, H>, Data<Nodes<R>[K], 'params', H>>;
    } & Record<AnyKey<H>, N8nLegacyNode<N8nLooseJson, string, N8nLooseJson>>;
    $items(nodeName?: string, outputIndex?: number, runIndex?: number): Array<N8nItem<N8nLooseJson, string>>;
    $item(itemIndex: number, runIndex?: number): any;
    $parameter: Data<R, 'parameters', H>;
    $rawParameter: Data<R, 'parameters', H>;
    $itemIndex: number;
    $runIndex: number;
    $position: number;
    $thisItemIndex: number;
    $thisRunIndex: number;
    $prevNode: N8nPrevNode;
    $nodeVersion: number;
    $nodeId: string;
    $webhookId: string | undefined;
    $executionId: string;
    $resumeWebhookUrl: string;
    $tool: any;
    $agentInfo: N8nAgentInfo;
    $getPairedItem(destinationNodeName: string, incomingSourceData: unknown, pairedItem: unknown): N8nItem<N8nLooseJson, string> | null;
    $fromAI(name: string, description?: string, type?: N8nFromAIType, defaultValue?: unknown): any;
    $fromAi(name: string, description?: string, type?: N8nFromAIType, defaultValue?: unknown): any;
    $fromai(name: string, description?: string, type?: N8nFromAIType, defaultValue?: unknown): any;
}
export interface HttpPaginationContext<R = {}, H = N8nLooseJson> extends NodeParameterContext<R, H> {
    $request: N8nHttpRequest<Data<R, 'request', H>>;
    $response: N8nHttpResponse<Data<R, 'response', H>>;
    $version: number;
    $pageCount: number;
}
export interface RoutingContext<R = {}, H = N8nLooseJson> extends NodeParameterContext<R, H> {
    $credentials: Data<R, 'credentials', H>;
    $value: Data<R, 'value', H>;
    $version: number;
    $response: N8nHttpResponse<Data<R, 'response', H>>;
    $responseItem: Data<R, 'responseItem', H>;
    $request: N8nHttpRequest<Data<R, 'request', H>>;
    $self: Data<R, 'credentials', H>;
}
export interface DescriptionContext<R = {}, H = N8nLooseJson> extends CommonContext<R, H> {
    $parameter: Data<R, 'parameters', H>;
    $rawParameter: Data<R, 'parameters', H>;
    $nodeVersion: number;
    $nodeId: string;
    $self: Data<R, 'credentials', H>;
}
export interface CredentialContext<R = {}, H = N8nLooseJson> extends CommonContext<R, H> {
    $self: Data<R, 'credentials', H>;
}
declare global {
    interface N8nExpressionContexts<R, H = N8nLooseJson> {
        nodeParameter: NodeParameterContext<R, H>;
        httpPagination: HttpPaginationContext<R, H>;
        routing: RoutingContext<R, H>;
        description: DescriptionContext<R, H>;
        credential: CredentialContext<R, H>;
    }
}
export type ExpressionContext = keyof N8nExpressionContexts<{}> & string;
export type ContextByName<N extends ExpressionContext, R = {}, H = N8nLooseJson> = N8nExpressionContexts<R, H>[N];
export type ContextType = ContextByName<ExpressionContext>;
export type ContextName<C> = {
    [N in ExpressionContext]: ContextByName<N> extends C ? C extends ContextByName<N> ? N : never : never;
}[ExpressionContext];
export declare const contextNames: readonly ExpressionContext[];
export declare const isContextName: (s: string | undefined) => s is ExpressionContext;
export type RuntimeShape = {
    context: ExpressionContext;
    strict?: boolean;
    inputJson?: string;
    inputBinaryKeys?: readonly string[];
    nodes: Record<string, {
        json: string;
        binaryKeys?: readonly string[];
        params?: string;
    }>;
    parameters?: string;
    credentials?: string;
    value?: string;
    response?: string;
    responseItem?: string;
    request?: string;
    vars?: readonly string[];
    env?: readonly string[];
};
export declare const emptyShape: (context?: ExpressionContext) => RuntimeShape;
export declare const renderShape: (s: RuntimeShape) => string;
export {};
`;
