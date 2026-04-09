import { IncludeExclude } from './commonModel';
export interface Resource {
    /**
     * Configure resource attributes. Entries have higher priority than entries from .resource.attributes_list.
     * Entries must contain .name and .value, and may optionally include .type. If an entry's .type omitted or null, string is used.
     * The .value's type must match the .type. Values for .type include: string, bool, int, double, string_array, bool_array, int_array, double_array.
     */
    attributes?: AttributeNameValue[];
    /**
     * Configure resource attributes. Entries have lower priority than entries from .resource.attributes.
     * The value is a list of comma separated key-value pairs matching the format of OTEL_RESOURCE_ATTRIBUTES.
     * If omitted or null, no resource attributes are added.
     */
    attributes_list?: string;
    /**
     * Configure resource schema URL.
     * If omitted or null, no schema URL is used.
     */
    schema_url?: string;
    /**
     * Configure resource detection.
     * This type is in development and subject to breaking changes in minor versions.
     * If omitted or null, resource detection is disabled.
     */
    'detection/development'?: ExperimentalResourceDetection;
}
export interface AttributeNameValue {
    name: string;
    value: string | boolean | number | string[] | boolean[] | number[] | undefined;
    type?: 'string' | 'bool' | 'int' | 'double' | 'string_array' | 'bool_array' | 'int_array' | 'double_array';
}
export interface ExperimentalResourceDetection {
    /**
     * Configure attributes provided by resource detectors.
     */
    attributes?: IncludeExclude;
    /**
     * Configure resource detectors.
     * Resource detector names are dependent on the SDK language ecosystem. Please consult documentation for each respective language.
     * If omitted or null, no resource detectors are enabled.
     */
    detectors?: ExperimentalResourceDetector;
}
export interface ExperimentalResourceDetector {
    /**
     * Enable the container resource detector, which populates container.* attributes.
     */
    container?: object;
    /**
     * Enable the host resource detector, which populates host.* and os.* attributes.
     */
    host?: object;
    /**
     * Enable the process resource detector, which populates process.* attributes.
     */
    process?: object;
    /**
     * Enable the service detector, which populates service.name based on the OTEL_SERVICE_NAME
     * environment variable and service.instance.id.
     */
    service?: object;
}
//# sourceMappingURL=resourceModel.d.ts.map