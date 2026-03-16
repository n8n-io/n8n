import { z } from 'zod';

import { Z } from '../../zod-class';

export class MergeDevLinkTokenRequestDto extends Z.class({
	category: z.string(),
	integrationSlug: z.string().optional(),
}) {}

export class MergeDevAccountTokenRequestDto extends Z.class({
	publicToken: z.string(),
}) {}

export type MergeDevLinkTokenResponseDto = {
	linkToken: string;
};

export type MergeDevAccountTokenResponseDto = {
	accountToken: string;
};
