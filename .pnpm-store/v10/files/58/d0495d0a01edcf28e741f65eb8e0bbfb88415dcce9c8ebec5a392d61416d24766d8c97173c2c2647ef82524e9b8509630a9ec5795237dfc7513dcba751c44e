import { HeadersFactory } from './otlp-http-configuration';
export interface OTLPExporterConfigBase {
    /**
     * Custom headers that will be attached to the HTTP request that's sent to the endpoint.
     *
     * @remarks
     * Prefer using a plain object over a factory function wherever possible.
     * If using a factory function (`HttpAgentFactory`), **do not import `http` or `https` at the top of the file**
     * Instead, use dynamic `import()` or `require()` to load the module. This ensures that the `http` or `https`
     * module is not loaded before `@opentelemetry/instrumentation-http` can instrument it.
     *
     * Functions passed to the exporter MUST NOT throw errors.
     *
     * @example <caption> Using headers options directly: </caption>
     * headers: {
     *  Authorization: "Api-Token my-secret-token",
     * }
     *
     * @example <caption> Using a custom factory function </caption>
     * headers: async () => {
     *   // ... do whatever you need to obtain the headers, ensuring you `await import('your-library')` to avoid breaking instrumentations ...
     *   return {
     *     Authorization: `Bearer ${token}`,
     *   };
     * };
     */
    headers?: Record<string, string> | HeadersFactory;
    url?: string;
    concurrencyLimit?: number;
    /** Maximum time the OTLP exporter will wait for each batch export.
     * The default value is 10000ms. */
    timeoutMillis?: number;
}
//# sourceMappingURL=legacy-base-configuration.d.ts.map