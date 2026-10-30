import { Z } from '../../zod-class';
import { assistantThreadTabsStateSchema } from '../../schemas/assistant-thread-tabs.schema';

export class AssistantThreadTabsRequestDto extends Z.class(assistantThreadTabsStateSchema.shape) {}
