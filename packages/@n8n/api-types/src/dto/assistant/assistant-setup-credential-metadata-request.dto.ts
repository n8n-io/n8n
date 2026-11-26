import { z } from 'zod';

import { Z } from '../../zod-class';
import { isInstanceAiSetupCredentialMetadataKey } from '../../schemas/instance-ai-setup-credential-selection';

/** The setup credential choices to merge into an Assistant agent thread. Other keys are refused. */
export class AssistantSetupCredentialMetadataRequestDto extends Z.class({
	metadata: z
		.record(z.unknown())
		.refine(
			(metadata) => Object.keys(metadata).every(isInstanceAiSetupCredentialMetadataKey),
			'Only setup credential keys can be saved',
		),
}) {}
