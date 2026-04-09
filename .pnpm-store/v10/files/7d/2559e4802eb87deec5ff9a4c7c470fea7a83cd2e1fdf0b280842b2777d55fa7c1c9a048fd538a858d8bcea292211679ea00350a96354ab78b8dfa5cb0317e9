import { BasicTracerProvider, PROPAGATOR_FACTORY, SDKRegistrationConfig } from '@opentelemetry/sdk-trace-base';
import { NodeTracerConfig } from './config';
/**
 * Register this TracerProvider for use with the OpenTelemetry API.
 * Undefined values may be replaced with defaults, and
 * null values will be skipped.
 *
 * @param config Configuration object for SDK registration
 */
export declare class NodeTracerProvider extends BasicTracerProvider {
    protected static readonly _registeredPropagators: Map<string, PROPAGATOR_FACTORY>;
    constructor(config?: NodeTracerConfig);
    register(config?: SDKRegistrationConfig): void;
}
//# sourceMappingURL=NodeTracerProvider.d.ts.map