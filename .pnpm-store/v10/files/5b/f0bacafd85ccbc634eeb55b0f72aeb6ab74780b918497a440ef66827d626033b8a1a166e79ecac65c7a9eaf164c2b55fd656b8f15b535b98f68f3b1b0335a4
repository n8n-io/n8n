import { ConfigurableSerdeContext, SerdeFunctions } from "@smithy/types";
/**
 * This in practice should be the client config object.
 * @internal
 */
type SerdeContextType = SerdeFunctions & {
    disableHostPrefix?: boolean;
};
/**
 * @internal
 */
export declare abstract class SerdeContext implements ConfigurableSerdeContext {
    protected serdeContext?: SerdeContextType;
    setSerdeContext(serdeContext: SerdeContextType): void;
}
export {};
