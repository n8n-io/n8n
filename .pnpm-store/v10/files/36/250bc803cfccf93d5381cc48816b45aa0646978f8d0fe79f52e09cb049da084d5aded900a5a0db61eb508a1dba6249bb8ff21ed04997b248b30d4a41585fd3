var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var bearerTokenAuthenticationPolicy_exports = {};
__export(bearerTokenAuthenticationPolicy_exports, {
  bearerTokenAuthenticationPolicy: () => bearerTokenAuthenticationPolicy,
  bearerTokenAuthenticationPolicyName: () => bearerTokenAuthenticationPolicyName,
  parseChallenges: () => parseChallenges
});
module.exports = __toCommonJS(bearerTokenAuthenticationPolicy_exports);
var import_tokenCycler = require("../util/tokenCycler.js");
var import_log = require("../log.js");
var import_restError = require("../restError.js");
const bearerTokenAuthenticationPolicyName = "bearerTokenAuthenticationPolicy";
async function trySendRequest(request, next) {
  try {
    return [await next(request), void 0];
  } catch (e) {
    if ((0, import_restError.isRestError)(e) && e.response) {
      return [e.response, e];
    } else {
      throw e;
    }
  }
}
async function defaultAuthorizeRequest(options) {
  const { scopes, getAccessToken, request } = options;
  const getTokenOptions = {
    abortSignal: request.abortSignal,
    tracingOptions: request.tracingOptions,
    enableCae: true
  };
  const accessToken = await getAccessToken(scopes, getTokenOptions);
  if (accessToken) {
    options.request.headers.set("Authorization", `Bearer ${accessToken.token}`);
  }
}
function isChallengeResponse(response) {
  return response.status === 401 && response.headers.has("WWW-Authenticate");
}
async function authorizeRequestOnCaeChallenge(onChallengeOptions, caeClaims) {
  const { scopes } = onChallengeOptions;
  const accessToken = await onChallengeOptions.getAccessToken(scopes, {
    enableCae: true,
    claims: caeClaims
  });
  if (!accessToken) {
    return false;
  }
  onChallengeOptions.request.headers.set(
    "Authorization",
    `${accessToken.tokenType ?? "Bearer"} ${accessToken.token}`
  );
  return true;
}
function bearerTokenAuthenticationPolicy(options) {
  const { credential, scopes, challengeCallbacks } = options;
  const logger = options.logger || import_log.logger;
  const callbacks = {
    authorizeRequest: challengeCallbacks?.authorizeRequest?.bind(challengeCallbacks) ?? defaultAuthorizeRequest,
    authorizeRequestOnChallenge: challengeCallbacks?.authorizeRequestOnChallenge?.bind(challengeCallbacks)
  };
  const getAccessToken = credential ? (0, import_tokenCycler.createTokenCycler)(
    credential
    /* , options */
  ) : () => Promise.resolve(null);
  return {
    name: bearerTokenAuthenticationPolicyName,
    /**
     * If there's no challenge parameter:
     * - It will try to retrieve the token using the cache, or the credential's getToken.
     * - Then it will try the next policy with or without the retrieved token.
     *
     * It uses the challenge parameters to:
     * - Skip a first attempt to get the token from the credential if there's no cached token,
     *   since it expects the token to be retrievable only after the challenge.
     * - Prepare the outgoing request if the `prepareRequest` method has been provided.
     * - Send an initial request to receive the challenge if it fails.
     * - Process a challenge if the response contains it.
     * - Retrieve a token with the challenge information, then re-send the request.
     */
    async sendRequest(request, next) {
      if (!request.url.toLowerCase().startsWith("https://")) {
        throw new Error(
          "Bearer token authentication is not permitted for non-TLS protected (non-https) URLs."
        );
      }
      await callbacks.authorizeRequest({
        scopes: Array.isArray(scopes) ? scopes : [scopes],
        request,
        getAccessToken,
        logger
      });
      let response;
      let error;
      let shouldSendRequest;
      [response, error] = await trySendRequest(request, next);
      if (isChallengeResponse(response)) {
        let claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate"));
        if (claims) {
          let parsedClaim;
          try {
            parsedClaim = atob(claims);
          } catch (e) {
            logger.warning(
              `The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`
            );
            return response;
          }
          shouldSendRequest = await authorizeRequestOnCaeChallenge(
            {
              scopes: Array.isArray(scopes) ? scopes : [scopes],
              response,
              request,
              getAccessToken,
              logger
            },
            parsedClaim
          );
          if (shouldSendRequest) {
            [response, error] = await trySendRequest(request, next);
          }
        } else if (callbacks.authorizeRequestOnChallenge) {
          shouldSendRequest = await callbacks.authorizeRequestOnChallenge({
            scopes: Array.isArray(scopes) ? scopes : [scopes],
            request,
            response,
            getAccessToken,
            logger
          });
          if (shouldSendRequest) {
            [response, error] = await trySendRequest(request, next);
          }
          if (isChallengeResponse(response)) {
            claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate"));
            if (claims) {
              let parsedClaim;
              try {
                parsedClaim = atob(claims);
              } catch (e) {
                logger.warning(
                  `The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`
                );
                return response;
              }
              shouldSendRequest = await authorizeRequestOnCaeChallenge(
                {
                  scopes: Array.isArray(scopes) ? scopes : [scopes],
                  response,
                  request,
                  getAccessToken,
                  logger
                },
                parsedClaim
              );
              if (shouldSendRequest) {
                [response, error] = await trySendRequest(request, next);
              }
            }
          }
        }
      }
      if (error) {
        throw error;
      } else {
        return response;
      }
    }
  };
}
function parseChallenges(challenges) {
  const challengeRegex = /(\w+)\s+((?:\w+=(?:"[^"]*"|[^,]*),?\s*)+)/g;
  const paramRegex = /(\w+)="([^"]*)"/g;
  const parsedChallenges = [];
  let match;
  while ((match = challengeRegex.exec(challenges)) !== null) {
    const scheme = match[1];
    const paramsString = match[2];
    const params = {};
    let paramMatch;
    while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
      params[paramMatch[1]] = paramMatch[2];
    }
    parsedChallenges.push({ scheme, params });
  }
  return parsedChallenges;
}
function getCaeChallengeClaims(challenges) {
  if (!challenges) {
    return;
  }
  const parsedChallenges = parseChallenges(challenges);
  return parsedChallenges.find(
    (x) => x.scheme === "Bearer" && x.params.claims && x.params.error === "insufficient_claims"
  )?.params.claims;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bearerTokenAuthenticationPolicy,
  bearerTokenAuthenticationPolicyName,
  parseChallenges
});
