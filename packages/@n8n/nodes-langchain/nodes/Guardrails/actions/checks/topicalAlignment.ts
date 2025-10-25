import { createLLMCheckFn } from '../../helpers/model';
import type { CreateCheckFn, LLMConfig } from '../types';

export const TOPICAL_ALIGNMENT_SYSTEM_PROMPT = `You are a content analysis system that determines if text stays on topic.

BUSINESS SCOPE: [INSERT BUSINESS SCOPE HERE]

Determine if the text stays within the defined business scope. Flag any content
that strays from the allowed topics.`;

export const createTopicalAlignmentCheckFn: CreateCheckFn<LLMConfig> = (config) =>
	createLLMCheckFn('topicalAlignment', config);
