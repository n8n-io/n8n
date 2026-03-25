/**
 * The `CreateAssistantOptions` interface describes the name and optional configurations that can be
 * passed when creating an Assistant.
 */
export interface CreateAssistantOptions {
    /**
     * The name of the assistant. Resource name must be 1-45 characters long, start and end with an alphanumeric character,
     * and consist only of lower case alphanumeric characters or '-'.
     */
    name: string;
    /**
     * Optional instructions for the Assistant. Instructions can [customize tone, role, and focus]https://www.pinecone.io/learn/assistant-api-deep-dive/#Custom-Instructions.
     */
    instructions?: string;
    /**
     * Optional metadata for the Assistant.
     */
    metadata?: Record<string, string>;
    /**
     * Optional region for the Assistant. The region is where the Assistant is deployed. The default region is 'us'.
     * The other option is 'eu'.
     */
    region?: string;
}
type CreateAssistantOptionsType = keyof CreateAssistantOptions;
export declare const CreateAssistantOptionsType: CreateAssistantOptionsType[];
/**
 * Options for updating an assistant's properties.
 */
export interface UpdateAssistantOptions {
    /**
     * Optional instructions for the assistant to apply to all responses.
     */
    instructions?: string;
    /**
     * Optional metadata associated with the assistant.
     */
    metadata?: Record<string, string>;
}
type UpdateAssistantOptionsType = keyof UpdateAssistantOptions;
export declare const UpdateAssistantOptionsType: UpdateAssistantOptionsType[];
/**
 * The `UpdateAssistantResponse` interface describes the response object returned when updating an Assistant.
 */
export interface UpdateAssistantResponse {
    /**
     * The name of the assistant that was updated.
     */
    assistantName?: string;
    /**
     * Description or directive for the assistant to apply to all responses.
     */
    instructions?: string;
    /**
     * Metadata associated with the assistant.
     */
    metadata?: object;
}
/**
 * Enum representing the possible statuses of an assistant.
 *
 * - `Initializing`: The assistant is initializing and is not yet ready to handle requests.
 * - `Failed`: The assistant encountered an error and cannot proceed.
 * - `Ready`: The assistant is ready to handle requests.
 * - `Terminating`: The assistant is shutting down and will soon be unavailable.
 */
export declare const AssistantStatusEnum: {
    readonly Initializing: "Initializing";
    readonly Failed: "Failed";
    readonly Ready: "Ready";
    readonly Terminating: "Terminating";
};
export type AssistantStatusEnum = (typeof AssistantStatusEnum)[keyof typeof AssistantStatusEnum];
/**
 * The `AssistantModel` interface describes the configuration and status of a Pinecone Assistant.
 */
export interface AssistantModel {
    /**
     * The name of the assistant. Resource name must be 1-45 characters long, start and end with an alphanumeric character,
     * and consist only of lower case alphanumeric characters or '-'.
     */
    name: string;
    /**
     * The current status of the assistant. Can be one of 'Initializing', 'Failed', 'Ready', or 'Terminating'.
     */
    status: AssistantStatusEnum;
    /**
     * Optional description or directive for the assistant to apply to all responses.
     */
    instructions?: string | null;
    /**
     * Optional metadata associated with the assistant.
     */
    metadata?: object | null;
    /**
     * The host where the assistant is deployed.
     */
    host?: string;
    /**
     * The date and time the assistant was created.
     */
    createdAt?: Date;
    /**
     * The date and time the assistant was last updated.
     */
    updatedAt?: Date;
}
/**
 * Represents a list of `AssistantModel` objects.
 */
export interface AssistantList {
    /**
     * The list of assistants associated with a specific project.
     */
    assistants?: Array<AssistantModel>;
}
/**
 * The `AssistantEval` interface defines the structure of the input object for the `evaluate` method.
 */
export interface AssistantEval {
    /**
     * The question to evaluate.
     */
    question: string;
    /**
     * The answer to evaluate.
     */
    answer: string;
    /**
     * The ground truth answer against which evaluate the question-answer pair.
     */
    groundTruth: string;
}
export {};
