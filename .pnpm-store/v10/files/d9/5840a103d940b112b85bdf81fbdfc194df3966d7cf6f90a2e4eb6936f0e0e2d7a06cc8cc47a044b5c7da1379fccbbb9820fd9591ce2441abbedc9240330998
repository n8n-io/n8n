import {
  GroundingMetadataSchema,
  PromptFeedbackSchema,
  UrlContextMetadataSchema,
  type SafetyRatingSchema,
  UsageMetadataSchema,
} from './google-generative-ai-language-model';

export type GoogleGenerativeAIPrompt = {
  systemInstruction?: GoogleGenerativeAISystemInstruction;
  contents: Array<GoogleGenerativeAIContent>;
};

export type GoogleGenerativeAISystemInstruction = {
  parts: Array<{ text: string }>;
};

export type GoogleGenerativeAIContent = {
  role: 'user' | 'model';
  parts: Array<GoogleGenerativeAIContentPart>;
};

export type GoogleGenerativeAIContentPart =
  | { text: string; thought?: boolean; thoughtSignature?: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: unknown }; thoughtSignature?: string }
  | {
      functionResponse: {
        name: string;
        response: unknown;
        parts?: Array<GoogleGenerativeAIFunctionResponsePart>;
      };
    }
  | { fileData: { mimeType: string; fileUri: string } };

export type GoogleGenerativeAIFunctionResponsePart = {
  inlineData: { mimeType: string; data: string };
};

export type GoogleGenerativeAIGroundingMetadata = GroundingMetadataSchema;

export type GoogleGenerativeAIUrlContextMetadata = UrlContextMetadataSchema;

export type GoogleGenerativeAISafetyRating = SafetyRatingSchema;

export type GoogleGenerativeAIPromptFeedback = PromptFeedbackSchema;

export type GoogleGenerativeAIUsageMetadata = UsageMetadataSchema;

export interface GoogleGenerativeAIProviderMetadata {
  promptFeedback: GoogleGenerativeAIPromptFeedback | null;
  groundingMetadata: GoogleGenerativeAIGroundingMetadata | null;
  urlContextMetadata: GoogleGenerativeAIUrlContextMetadata | null;
  safetyRatings: GoogleGenerativeAISafetyRating[] | null;
  usageMetadata: GoogleGenerativeAIUsageMetadata | null;
  finishMessage: string | null;
}
