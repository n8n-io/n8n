import { normalizeProvider } from "@smithy/util-middleware";
import { DEFAULT_ACCOUNT_ID_ENDPOINT_MODE, validateAccountIdEndpointMode, } from "./AccountIdEndpointModeConstants";
export const resolveAccountIdEndpointModeConfig = (input) => {
    const { accountIdEndpointMode } = input;
    const accountIdEndpointModeProvider = normalizeProvider(accountIdEndpointMode ?? DEFAULT_ACCOUNT_ID_ENDPOINT_MODE);
    return Object.assign(input, {
        accountIdEndpointMode: async () => {
            const accIdMode = await accountIdEndpointModeProvider();
            if (!validateAccountIdEndpointMode(accIdMode)) {
                throw new Error(`Invalid value for accountIdEndpointMode: ${accIdMode}. Valid values are: "required", "preferred", "disabled".`);
            }
            return accIdMode;
        },
    });
};
