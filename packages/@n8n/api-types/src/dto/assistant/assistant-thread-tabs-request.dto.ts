import { Z } from '../../zod-class';
import { assistantThreadTabsStateSchema } from '../../schemas/instance-ai.schema';

export class AssistantThreadTabsRequestDto extends Z.class(assistantThreadTabsStateSchema.shape) {}
