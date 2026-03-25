import { createAggregatedClient } from "@smithy/smithy-client";
import { AssumeRoleCommand } from "./commands/AssumeRoleCommand";
import { AssumeRoleWithWebIdentityCommand, } from "./commands/AssumeRoleWithWebIdentityCommand";
import { STSClient } from "./STSClient";
const commands = {
    AssumeRoleCommand,
    AssumeRoleWithWebIdentityCommand,
};
export class STS extends STSClient {
}
createAggregatedClient(commands, STS);
