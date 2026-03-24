import { z } from 'zod';

import { Z } from '../../zod-class';

export class AiGatewaySettingsUpdateDto extends Z.class({
	defaultCategory: z.string().optional(),
	defaultChatModel: z.string().optional(),
	defaultTextModel: z.string().optional(),
	defaultImageModel: z.string().optional(),
	defaultFileModel: z.string().optional(),
	defaultAudioModel: z.string().optional(),
}) {}
