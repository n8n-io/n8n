import { z } from 'zod';
import { Z } from 'zod-class';

export class AiNodeConfigRequestDto extends Z.class({
	nodeType: z.string().optional(),
	nodeVersion: z.number().default(1),
	includeCredentials: z.boolean().default(false),
	includeModels: z.boolean().default(true),
}) {}

export class AiPromptTestRequestDto extends Z.class({
	nodeType: z.string(),
	nodeVersion: z.number().default(1),
	prompt: z.string(),
	configuration: z.record(z.unknown()).optional(),
	testData: z.record(z.unknown()).optional(),
	model: z.string().optional(),
	temperature: z.number().min(0).max(2).default(0.7),
	maxTokens: z.number().min(1).max(32000).optional(),
}) {}

export class AiMemoryConfigRequestDto extends Z.class({
	type: z.enum(['buffer', 'conversation', 'vectorstore', 'redis', 'postgres']),
	configuration: z.record(z.unknown()),
	sessionId: z.string().optional(),
}) {}

export class AiMemoryRetrievalRequestDto extends Z.class({
	sessionId: z.string(),
	type: z.enum(['buffer', 'conversation', 'vectorstore', 'redis', 'postgres']),
	limit: z.number().min(1).max(100).default(10),
}) {}
