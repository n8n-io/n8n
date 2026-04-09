import * as z from "zod/v3";
export type ConnectorGetV1Request = {
    /**
     * Fetch the customer data associated with the connector (e.g. customer secrets / config).
     */
    fetchCustomerData?: boolean | undefined;
    /**
     * Fetch the general connection secrets associated with the connector.
     */
    fetchConnectionSecrets?: boolean | undefined;
    connectorIdOrName: string;
};
/** @internal */
export type ConnectorGetV1Request$Outbound = {
    fetch_customer_data: boolean;
    fetch_connection_secrets: boolean;
    connector_id_or_name: string;
};
/** @internal */
export declare const ConnectorGetV1Request$outboundSchema: z.ZodType<ConnectorGetV1Request$Outbound, z.ZodTypeDef, ConnectorGetV1Request>;
export declare function connectorGetV1RequestToJSON(connectorGetV1Request: ConnectorGetV1Request): string;
//# sourceMappingURL=connectorgetv1.d.ts.map