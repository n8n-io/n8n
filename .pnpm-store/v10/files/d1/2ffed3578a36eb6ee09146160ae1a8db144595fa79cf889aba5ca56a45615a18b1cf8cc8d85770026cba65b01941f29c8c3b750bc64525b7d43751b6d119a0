import { createAggregatedClient } from "@smithy/smithy-client";
import { CreateTokenCommand } from "./commands/CreateTokenCommand";
import { SSOOIDCClient } from "./SSOOIDCClient";
const commands = {
    CreateTokenCommand,
};
export class SSOOIDC extends SSOOIDCClient {
}
createAggregatedClient(commands, SSOOIDC);
