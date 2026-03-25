export const CURLAUTH_BASIC = 1 << 0;
export const CURLAUTH_DIGEST = 1 << 1;
export const CURLAUTH_NEGOTIATE = 1 << 2;
export const CURLAUTH_NTLM = 1 << 3;
export const CURLAUTH_DIGEST_IE = 1 << 4;
export const CURLAUTH_NTLM_WB = 1 << 5;
export const CURLAUTH_BEARER = 1 << 6;
export const CURLAUTH_AWS_SIGV4 = 1 << 7;
export const CURLAUTH_ANY = ~CURLAUTH_DIGEST_IE;

export type ProxyAuthType = "basic" | "digest" | "ntlm" | "negotiate" | "none";

export type AuthType = ProxyAuthType | "ntlm-wb" | "bearer" | "aws-sigv4";

// This is this function
// https://github.com/curl/curl/blob/curl-7_86_0/lib/http.c#L455
// which is not the correct function, since it works on the response.
//
// Curl also filters out auth schemes it doesn't support,
// https://github.com/curl/curl/blob/curl-7_86_0/lib/setopt.c#L970
// but we "support" all of them, so we don't need to do that.
export function pickAuth(mask: number): AuthType {
  if (mask === CURLAUTH_ANY) {
    return "basic";
  }

  const auths: [number, AuthType][] = [
    [CURLAUTH_NEGOTIATE, "negotiate"],
    [CURLAUTH_BEARER, "bearer"],
    [CURLAUTH_DIGEST, "digest"],
    [CURLAUTH_NTLM, "ntlm"],
    [CURLAUTH_NTLM_WB, "ntlm-wb"],
    [CURLAUTH_BASIC, "basic"],
    // This check happens outside this function because we obviously
    // don't need to to specify --no-basic to use aws-sigv4
    // https://github.com/curl/curl/blob/curl-7_86_0/lib/setopt.c#L678-L679
    [CURLAUTH_AWS_SIGV4, "aws-sigv4"],
  ];
  for (const [auth, authName] of auths) {
    if (mask & auth) {
      return authName;
    }
  }
  return "none";
}
