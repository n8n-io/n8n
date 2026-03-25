export interface OTELSpan {
    setAttribute: (key: string, value: any) => void;
    setStatus: (status: {
        code: number;
        message?: string;
    }) => void;
    recordException: (exception: Error | string) => void;
    end: (endTime?: number | Date) => void;
}
export interface OTELTracer {
    startSpan: (name: string, options?: any) => OTELSpan;
    startActiveSpan: (name: string, options: any, fn: () => any) => any;
}
export interface OTELContext {
}
export interface OTELTracerProvider {
    getTracer: (name: string, version?: string) => OTELTracer;
}
export interface OTELSpanContext {
    traceId: string;
    spanId: string;
    isRemote?: boolean;
    traceFlags: number;
    traceState?: any;
}
export interface OTELTraceFlags {
    NONE: number;
    SAMPLED: number;
}
