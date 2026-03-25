/**
 * This file was automatically generated. DO NOT MODIFY IT BY HAND.
 */
import { RequestPattern } from './request-pattern.model';
export interface RecordSpec {
    /**
     * Headers from the request to include in the generated stub mappings, mapped to parameter
     * objects. The only parameter available is "caseInsensitive", which defaults to false
     */
    captureHeaders?: {
        [k: string]: {
            caseInsensitive?: boolean;
        };
    };
    /**
     * Criteria for extracting response bodies to a separate file instead of including it in the stub
     * mapping
     */
    extractBodyCriteria?: {
        /**
         * Size threshold for extracting binary response bodies. Supports humanized size strings, e.g.
         * "56 Mb". Default unit is bytes.
         */
        binarySizeThreshold?: string;
        /**
         * Size threshold for extracting binary response bodies. Supports humanized size strings, e.g.
         * "56 Mb". Default unit is bytes.
         */
        textSizeThreshold?: string;
        [k: string]: any;
    };
    /**
     * Whether to save stub mappings to the file system or just return them
     */
    persist?: boolean;
    /**
     * When true, duplicate requests will be added to a Scenario. When false, duplicates are discarded
     */
    repeatsAsScenarios?: boolean;
    /**
     * Control the request body matcher used in generated stub mappings
     */
    requestBodyPattern?: {
        /**
         * If equalTo is used, match body use case-insensitive string comparison
         */
        caseInsensitive?: boolean;
        /**
         * If equalToJson is used, ignore order of array elements
         */
        ignoreArrayOrder?: boolean;
        /**
         * If equalToJson is used, matcher ignores extra elements in objects
         */
        ignoreExtraElements?: boolean;
        matcher?: 'auto';
        [k: string]: any;
    } | {
        /**
         * Match body using case-insensitive string comparison
         */
        caseInsensitive?: boolean;
        matcher?: 'equalTo';
        [k: string]: any;
    } | {
        /**
         * Ignore order of array elements
         */
        ignoreArrayOrder?: boolean;
        /**
         * Ignore extra elements in objects
         */
        ignoreExtraElements?: boolean;
        matcher?: 'equalToJson';
        [k: string]: any;
    } | {
        matcher?: 'equalToXml';
        [k: string]: any;
    };
    /**
     * List of names of stub mappings transformers to apply to generated stubs
     */
    transformerParameters?: {
        [k: string]: any;
    };
    /**
     * Parameters to pass to stub mapping transformers
     */
    transformers?: string[];
    [k: string]: any;
    /**
     * If set, only record requests matching this pattern
     */
    filters?: RequestPattern;
    /**
     * The base URL of the target API to be recorded.
     */
    targetBaseUrl?: string;
}
