import { z } from 'zod';

import { desktopAssistantContextSchema } from './desktop-assistant-context.schema';
import { Z } from '../../zod-class';

/**
 * Request body for `POST /desktop-assistant/recommendations` — asks the
 * instance to generate a few one-shot task suggestions for the desktop
 * assistant's empty state. `context` is what the user is currently looking at
 * (optional); when absent, the instance returns generic recommendations.
 */
export class DesktopAssistantRecommendationsRequestDto extends Z.class({
	context: desktopAssistantContextSchema.optional(),
}) {}

export type DesktopAssistantRecommendationsRequest = z.infer<
	typeof DesktopAssistantRecommendationsRequestDto.schema
>;

/**
 * A single suggested task. `prompt` is the exact text fired through the one-shot
 * task path when the user clicks the card; `title` is the short card label;
 * `icon` is a single emoji shown in the card's tile.
 */
export interface DesktopAssistantRecommendation {
	title: string;
	prompt: string;
	icon: string;
}

export interface DesktopAssistantRecommendationsResponse {
	recommendations: DesktopAssistantRecommendation[];
}
