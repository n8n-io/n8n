import { z } from 'zod';

export const MESSENGER_PLATFORMS = ['telegram'] as const;

export const messengerPlatformSchema = z.enum(MESSENGER_PLATFORMS);

export type MessengerPlatform = z.infer<typeof messengerPlatformSchema>;
