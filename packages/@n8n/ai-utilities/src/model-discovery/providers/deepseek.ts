import { makeBearerDataListing } from '../request';

/** Source: LmChatDeepSeek `loadOptions` routing. */
export const listDeepSeekModels = makeBearerDataListing('deepseek', 'https://api.deepseek.com');
