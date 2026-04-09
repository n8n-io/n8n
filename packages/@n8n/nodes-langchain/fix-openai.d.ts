import * as OpenAIClient from 'openai';

declare global {
    namespace OpenAI {
        namespace Responses {
            type Response = any;
            type ResponseTextConfig = any;
            type ResponseCreateParamsNonStreaming = any;
            type FunctionTool = any;
            namespace WebSearchTool {
                type UserLocation = any;
            }
            namespace ResponseInputItem {
                type Message = any;
            }
        }
    }
}
