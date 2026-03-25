import { validateMimeTypeOAS3 } from '../../utils';

import type { Oas3Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ResponseMimeType: Oas3Rule = ({ allowedValues }) => {
  return {
    Paths: {
      Response: {
        leave(response, ctx: UserContext) {
          validateMimeTypeOAS3({ type: 'produces', value: response }, ctx, allowedValues);
        },
      },
      Callback: {
        Response() {},
        RequestBody: {
          leave(requestBody, ctx: UserContext) {
            validateMimeTypeOAS3({ type: 'produces', value: requestBody }, ctx, allowedValues);
          },
        },
      },
    },
    WebhooksMap: {
      RequestBody: {
        leave(requestBody, ctx: UserContext) {
          validateMimeTypeOAS3({ type: 'produces', value: requestBody }, ctx, allowedValues);
        },
      },
    },
  };
};
