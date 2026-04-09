import { DetectorSync } from '../types';
import { ResourceDetectionConfig } from '../config';
import { IResource } from '../IResource';
/**
 * EnvDetectorSync can be used to detect the presence of and create a Resource
 * from the OTEL_RESOURCE_ATTRIBUTES environment variable.
 */
declare class EnvDetectorSync implements DetectorSync {
    private readonly _MAX_LENGTH;
    private readonly _COMMA_SEPARATOR;
    private readonly _LABEL_KEY_VALUE_SPLITTER;
    private readonly _ERROR_MESSAGE_INVALID_CHARS;
    private readonly _ERROR_MESSAGE_INVALID_VALUE;
    /**
     * Returns a {@link Resource} populated with attributes from the
     * OTEL_RESOURCE_ATTRIBUTES environment variable. Note this is an async
     * function to conform to the Detector interface.
     *
     * @param config The resource detection config
     */
    detect(_config?: ResourceDetectionConfig): IResource;
    /**
     * Creates an attribute map from the OTEL_RESOURCE_ATTRIBUTES environment
     * variable.
     *
     * OTEL_RESOURCE_ATTRIBUTES: A comma-separated list of attributes describing
     * the source in more detail, e.g. “key1=val1,key2=val2”. Domain names and
     * paths are accepted as attribute keys. Values may be quoted or unquoted in
     * general. If a value contains whitespace, =, or " characters, it must
     * always be quoted.
     *
     * @param rawEnvAttributes The resource attributes as a comma-separated list
     * of key/value pairs.
     * @returns The sanitized resource attributes.
     */
    private _parseResourceAttributes;
    /**
     * Determines whether the given String is a valid printable ASCII string with
     * a length not exceed _MAX_LENGTH characters.
     *
     * @param str The String to be validated.
     * @returns Whether the String is valid.
     */
    private _isValid;
    private _isBaggageOctetString;
    /**
     * Determines whether the given String is a valid printable ASCII string with
     * a length greater than 0 and not exceed _MAX_LENGTH characters.
     *
     * @param str The String to be validated.
     * @returns Whether the String is valid and not empty.
     */
    private _isValidAndNotEmpty;
}
export declare const envDetectorSync: EnvDetectorSync;
export {};
//# sourceMappingURL=EnvDetectorSync.d.ts.map