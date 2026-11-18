import { declareCapability } from '../declareCapability';
import type { PublishJudgeAssistantHandoff } from '../types/capability';

/** Call during component setup so the shell can capture its router and toast context. */
export const createPublishJudgeAssistantHandoff = declareCapability<
	() => PublishJudgeAssistantHandoff
>('create-publish-judge-assistant-handoff');
