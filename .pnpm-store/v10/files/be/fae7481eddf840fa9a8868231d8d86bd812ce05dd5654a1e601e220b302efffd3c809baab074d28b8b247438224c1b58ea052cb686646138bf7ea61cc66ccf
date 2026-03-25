import { HttpResponse } from "@smithy/protocol-http";
import { Logger } from "@smithy/types";
import { PreviouslyResolved } from "./configuration";
export interface ValidateChecksumFromResponseOptions {
  config: PreviouslyResolved;
  responseAlgorithms?: string[];
  logger?: Logger;
}
export declare const validateChecksumFromResponse: (
  response: HttpResponse,
  { config, responseAlgorithms, logger }: ValidateChecksumFromResponseOptions
) => Promise<void>;
