import { makeBearerDataListing } from '../request';

/** Source: LmChatMoonshot `loadOptions` routing. */
export const listMoonshotAiModels = makeBearerDataListing(
	'moonshotai',
	'https://api.moonshot.ai/v1',
);
