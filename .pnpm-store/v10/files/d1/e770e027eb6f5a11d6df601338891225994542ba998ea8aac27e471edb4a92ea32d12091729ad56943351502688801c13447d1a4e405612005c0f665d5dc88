import { getEventStreamPlugin } from "@aws-sdk/middleware-eventstream";
import { getWebSocketPlugin } from "@aws-sdk/middleware-websocket";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { InvokeModelWithBidirectionalStream$ } from "../schemas/schemas_0";
export { $Command };
export class InvokeModelWithBidirectionalStreamCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        getEventStreamPlugin(config),
        getWebSocketPlugin(config, {
            headerPrefix: 'x-amz-bedrock-',
        }),
    ];
})
    .s("AmazonBedrockFrontendService", "InvokeModelWithBidirectionalStream", {
    eventStream: {
        input: true,
        output: true,
    },
})
    .n("BedrockRuntimeClient", "InvokeModelWithBidirectionalStreamCommand")
    .sc(InvokeModelWithBidirectionalStream$)
    .build() {
}
