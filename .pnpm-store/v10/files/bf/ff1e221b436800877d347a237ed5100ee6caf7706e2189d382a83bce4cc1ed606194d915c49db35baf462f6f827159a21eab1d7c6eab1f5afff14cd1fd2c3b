import { createAggregatedClient } from "@smithy/smithy-client";
import { GetRoleCredentialsCommand } from "./commands/GetRoleCredentialsCommand";
import { SSOClient } from "./SSOClient";
const commands = {
    GetRoleCredentialsCommand,
};
export class SSO extends SSOClient {
}
createAggregatedClient(commands, SSO);
