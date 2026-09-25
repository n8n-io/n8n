import { makeBearerDataListing } from '../request';

/** Source: LmChatVercelAiGateway `loadOptions` routing. */
export const listVercelModels = makeBearerDataListing('vercel', 'https://ai-gateway.vercel.sh/v1');
