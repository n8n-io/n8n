import { createAggregatedClient } from "@smithy/smithy-client";
import { BatchGetSecretValueCommand, } from "./commands/BatchGetSecretValueCommand";
import { CancelRotateSecretCommand, } from "./commands/CancelRotateSecretCommand";
import { CreateSecretCommand, } from "./commands/CreateSecretCommand";
import { DeleteResourcePolicyCommand, } from "./commands/DeleteResourcePolicyCommand";
import { DeleteSecretCommand, } from "./commands/DeleteSecretCommand";
import { DescribeSecretCommand, } from "./commands/DescribeSecretCommand";
import { GetRandomPasswordCommand, } from "./commands/GetRandomPasswordCommand";
import { GetResourcePolicyCommand, } from "./commands/GetResourcePolicyCommand";
import { GetSecretValueCommand, } from "./commands/GetSecretValueCommand";
import { ListSecretsCommand } from "./commands/ListSecretsCommand";
import { ListSecretVersionIdsCommand, } from "./commands/ListSecretVersionIdsCommand";
import { PutResourcePolicyCommand, } from "./commands/PutResourcePolicyCommand";
import { PutSecretValueCommand, } from "./commands/PutSecretValueCommand";
import { RemoveRegionsFromReplicationCommand, } from "./commands/RemoveRegionsFromReplicationCommand";
import { ReplicateSecretToRegionsCommand, } from "./commands/ReplicateSecretToRegionsCommand";
import { RestoreSecretCommand, } from "./commands/RestoreSecretCommand";
import { RotateSecretCommand, } from "./commands/RotateSecretCommand";
import { StopReplicationToReplicaCommand, } from "./commands/StopReplicationToReplicaCommand";
import { TagResourceCommand } from "./commands/TagResourceCommand";
import { UntagResourceCommand, } from "./commands/UntagResourceCommand";
import { UpdateSecretCommand, } from "./commands/UpdateSecretCommand";
import { UpdateSecretVersionStageCommand, } from "./commands/UpdateSecretVersionStageCommand";
import { ValidateResourcePolicyCommand, } from "./commands/ValidateResourcePolicyCommand";
import { SecretsManagerClient } from "./SecretsManagerClient";
const commands = {
    BatchGetSecretValueCommand,
    CancelRotateSecretCommand,
    CreateSecretCommand,
    DeleteResourcePolicyCommand,
    DeleteSecretCommand,
    DescribeSecretCommand,
    GetRandomPasswordCommand,
    GetResourcePolicyCommand,
    GetSecretValueCommand,
    ListSecretsCommand,
    ListSecretVersionIdsCommand,
    PutResourcePolicyCommand,
    PutSecretValueCommand,
    RemoveRegionsFromReplicationCommand,
    ReplicateSecretToRegionsCommand,
    RestoreSecretCommand,
    RotateSecretCommand,
    StopReplicationToReplicaCommand,
    TagResourceCommand,
    UntagResourceCommand,
    UpdateSecretCommand,
    UpdateSecretVersionStageCommand,
    ValidateResourcePolicyCommand,
};
export class SecretsManager extends SecretsManagerClient {
}
createAggregatedClient(commands, SecretsManager);
