import { collectBody } from "@smithy/smithy-client";
export const collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => context.utf8Encoder(body));
