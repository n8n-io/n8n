import { createAggregatedClient } from "@smithy/smithy-client";
import { BedrockRuntimeClient } from "./BedrockRuntimeClient";
import { ApplyGuardrailCommand, } from "./commands/ApplyGuardrailCommand";
import { ConverseCommand } from "./commands/ConverseCommand";
import { ConverseStreamCommand, } from "./commands/ConverseStreamCommand";
import { CountTokensCommand } from "./commands/CountTokensCommand";
import { GetAsyncInvokeCommand, } from "./commands/GetAsyncInvokeCommand";
import { InvokeModelCommand } from "./commands/InvokeModelCommand";
import { InvokeModelWithBidirectionalStreamCommand, } from "./commands/InvokeModelWithBidirectionalStreamCommand";
import { InvokeModelWithResponseStreamCommand, } from "./commands/InvokeModelWithResponseStreamCommand";
import { ListAsyncInvokesCommand, } from "./commands/ListAsyncInvokesCommand";
import { StartAsyncInvokeCommand, } from "./commands/StartAsyncInvokeCommand";
import { paginateListAsyncInvokes } from "./pagination/ListAsyncInvokesPaginator";
const commands = {
    ApplyGuardrailCommand,
    ConverseCommand,
    ConverseStreamCommand,
    CountTokensCommand,
    GetAsyncInvokeCommand,
    InvokeModelCommand,
    InvokeModelWithBidirectionalStreamCommand,
    InvokeModelWithResponseStreamCommand,
    ListAsyncInvokesCommand,
    StartAsyncInvokeCommand,
};
const paginators = {
    paginateListAsyncInvokes,
};
export class BedrockRuntime extends BedrockRuntimeClient {
}
createAggregatedClient(commands, BedrockRuntime, { paginators });
