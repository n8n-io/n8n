import { collectBody } from "@smithy/smithy-client";
import { toUtf8 } from "@smithy/util-utf8";
export const collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => (context?.utf8Encoder ?? toUtf8)(body));
