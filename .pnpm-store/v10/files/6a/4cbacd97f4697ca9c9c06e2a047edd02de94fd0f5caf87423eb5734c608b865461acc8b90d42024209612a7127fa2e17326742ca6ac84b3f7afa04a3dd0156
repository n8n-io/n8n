import { Model } from "../../resources.js";
export declare const DEFAULT_TOKEN_THRESHOLD = 100000;
export declare const DEFAULT_SUMMARY_PROMPT = "You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:\n1. Task Overview\nThe user's core request and success criteria\nAny clarifications or constraints they specified\n2. Current State\nWhat has been completed so far\nFiles created, modified, or analyzed (with paths if relevant)\nKey outputs or artifacts produced\n3. Important Discoveries\nTechnical constraints or requirements uncovered\nDecisions made and their rationale\nErrors encountered and how they were resolved\nWhat approaches were tried that didn't work (and why)\n4. Next Steps\nSpecific actions needed to complete the task\nAny blockers or open questions to resolve\nPriority order if multiple steps remain\n5. Context to Preserve\nUser preferences or style requirements\nDomain-specific details that aren't obvious\nAny promises made to the user\nBe concise but complete\u2014err on the side of including information that would prevent duplicate work or repeated mistakes. Write in a way that enables immediate resumption of the task.\nWrap your summary in <summary></summary> tags.";
export interface CompactionControl {
    /**
     * The context token threshold at which to trigger compaction.
     *
     * When the cumulative token count (input + output) across all messages exceeds this threshold,
     * the message history will be automatically summarized and compressed.
     *
     * @default 100000
     */
    contextTokenThreshold?: number;
    /**
     * The model to use for generating the compaction summary.
     * If not specified, defaults to the same model used for the tool runner.
     */
    model?: Model;
    /**
     * The prompt used to instruct the model on how to generate the summary.
     */
    summaryPrompt?: string;
    enabled: boolean;
}
//# sourceMappingURL=CompactionControl.d.ts.map