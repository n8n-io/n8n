import { AwsQueryProtocol } from "./AwsQueryProtocol";
/**
 * @alpha
 */
export declare class AwsEc2QueryProtocol extends AwsQueryProtocol {
    options: {
        defaultNamespace: string;
        xmlNamespace: string;
        version: string;
    };
    constructor(options: {
        defaultNamespace: string;
        xmlNamespace: string;
        version: string;
    });
    /**
     * EC2 Query reads XResponse.XResult instead of XResponse directly.
     */
    protected useNestedResult(): boolean;
}
