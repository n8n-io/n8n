import { Z } from '../../zod-class';
import { instanceAiThreadTabsStateSchema } from '../../schemas/instance-ai.schema';

export class InstanceAiThreadTabsRequestDto extends Z.class(
	instanceAiThreadTabsStateSchema.shape,
) {}
