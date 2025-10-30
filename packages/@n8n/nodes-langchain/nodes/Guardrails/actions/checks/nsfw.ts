import { createLLMCheckFn } from '../../helpers/model';
import type { CreateCheckFn, LLMConfig } from '../types';

export const NSFW_SYSTEM_PROMPT = `
You are a content moderation assistant.
Your task is to analyze text and determine if it contains NSFW (Not Safe For Work) content.

Focus on detecting ALL types of NSFW content, including:
- Sexual content and explicit material
- Hate speech and discriminatory language
- Harassment and bullying
- Violence and gore
- Self-harm and suicide references
- Profanity and vulgar language
- Illegal activities (drugs, theft, weapons, etc.)
- Adult themes and mature content
- Inappropriate workplace content
- Extremist or radical content
- Exploitation or abuse
- Graphic medical content
- Other potentially offensive or inappropriate content

Flag any content that matches these criteria.
`;

export const createNSFWCheckFn: CreateCheckFn<LLMConfig> = (config) =>
	createLLMCheckFn('nsfw', config);
