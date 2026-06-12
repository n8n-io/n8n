import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Request body for `POST /desktop-assistant/chat-thread` — ensures a fresh
 * Instance AI chat thread exists (in the caller's personal project) so the
 * desktop chat view can open it before the first message is sent. The id is
 * generated server-side; an optional one may be supplied for symmetry/testing.
 */
export class DesktopAssistantChatThreadRequestDto extends Z.class({
	threadId: z.string().uuid().optional(),
}) {}

export type DesktopAssistantChatThreadRequest = z.infer<
	typeof DesktopAssistantChatThreadRequestDto.schema
>;

export interface DesktopAssistantChatThreadResponse {
	threadId: string;
}
