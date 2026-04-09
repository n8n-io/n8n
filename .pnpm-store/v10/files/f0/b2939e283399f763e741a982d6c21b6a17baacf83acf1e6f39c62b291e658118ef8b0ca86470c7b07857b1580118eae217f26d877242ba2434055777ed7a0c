import type { TypeRegistry } from "@smithy/core/schema";
import { AwsQueryProtocol } from "./AwsQueryProtocol";
/**
 * @public
 */
export declare class AwsEc2QueryProtocol extends AwsQueryProtocol {
    options: {
        defaultNamespace: string;
        xmlNamespace: string;
        version: string;
        errorTypeRegistries?: TypeRegistry[];
    };
    constructor(options: {
        defaultNamespace: string;
        xmlNamespace: string;
        version: string;
        errorTypeRegistries?: TypeRegistry[];
    });
    /**
     * @override
     */
    getShapeId(): string;
    /**
     * EC2 Query reads XResponse.XResult instead of XResponse directly.
     */
    protected useNestedResult(): boolean;
}
