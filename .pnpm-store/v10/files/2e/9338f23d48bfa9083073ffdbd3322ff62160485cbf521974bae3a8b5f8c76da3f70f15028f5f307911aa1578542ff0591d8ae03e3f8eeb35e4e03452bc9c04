import { OpenAI as OpenAI$1 } from "openai";
import { BindToolsInput } from "@langchain/core/language_models/chat_models";
import "@langchain/core/language_models/base";
import { DynamicTool } from "@langchain/core/tools";

//#region src/utils/tools.d.ts

type OpenAIToolChoice = OpenAI$1.ChatCompletionToolChoiceOption | "any" | string;
type ResponsesToolChoice = NonNullable<OpenAI$1.Responses.ResponseCreateParams["tool_choice"]>;
type ChatOpenAIToolType = BindToolsInput | OpenAI$1.Chat.ChatCompletionTool | ResponsesTool;
type ResponsesTool = NonNullable<OpenAI$1.Responses.ResponseCreateParams["tools"]>[number];
//#endregion
export { ChatOpenAIToolType, OpenAIToolChoice, ResponsesTool, ResponsesToolChoice };
//# sourceMappingURL=tools.d.ts.map