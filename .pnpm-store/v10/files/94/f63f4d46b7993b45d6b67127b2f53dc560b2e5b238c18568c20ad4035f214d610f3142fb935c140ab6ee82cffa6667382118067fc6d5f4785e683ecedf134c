import { LLMTool } from "../types/llm";
import { ChatMessage } from "./llm/LLMClient";
export declare function buildVerifyActCompletionSystemPrompt(): ChatMessage;
export declare function buildVerifyActCompletionUserPrompt(goal: string, steps: string, domElements: string | undefined): ChatMessage;
export declare function buildUserInstructionsString(userProvidedInstructions?: string): string;
export declare function buildActSystemPrompt(userProvidedInstructions?: string): ChatMessage;
export declare function buildActUserPrompt(action: string, steps: string, domElements: string, variables?: Record<string, string>): ChatMessage;
export declare const actTools: LLMTool[];
export declare function buildExtractSystemPrompt(isUsingPrintExtractedDataTool?: boolean, useTextExtract?: boolean, userProvidedInstructions?: string): ChatMessage;
export declare function buildExtractUserPrompt(instruction: string, domElements: string, isUsingPrintExtractedDataTool?: boolean): ChatMessage;
export declare function buildRefineSystemPrompt(): ChatMessage;
export declare function buildRefineUserPrompt(instruction: string, previouslyExtractedContent: object, newlyExtractedContent: object): ChatMessage;
export declare function buildMetadataSystemPrompt(): ChatMessage;
export declare function buildMetadataPrompt(instruction: string, extractionResponse: object, chunksSeen: number, chunksTotal: number): ChatMessage;
export declare function buildObserveSystemPrompt(userProvidedInstructions?: string, isUsingAccessibilityTree?: boolean): ChatMessage;
export declare function buildObserveUserMessage(instruction: string, domElements: string, isUsingAccessibilityTree?: boolean): ChatMessage;
/**
 * Builds the instruction for the observeAct method to find the most relevant element for an action
 */
export declare function buildActObservePrompt(action: string, supportedActions: string[], variables?: Record<string, string>): string;
