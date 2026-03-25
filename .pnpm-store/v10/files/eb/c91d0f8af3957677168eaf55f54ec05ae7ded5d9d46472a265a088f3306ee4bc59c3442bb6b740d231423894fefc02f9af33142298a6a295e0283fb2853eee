import { Word, eq } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";
import { parseQueryString, type QueryList, type QueryDict } from "../Query.js";

import yaml from "yamljs";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  "compressed",
  "no-compressed", // only explicitly disabling compression has an effect

  "netrc",
  "netrc-optional",
  "no-netrc", // only explicitly disabling netrc has an effect
  "no-netrc-optional",

  "cacert",
  "cert",
  "key",
  "ciphers",
  "insecure",
  "no-insecure",

  "anyauth",
  "no-anyauth",
  "digest",
  "no-digest",
  "aws-sigv4",
  "negotiate",
  "no-negotiate",
  // "delegation", // GSS/kerberos
  // Not suported, just more specific warning
  "ntlm",
  "no-ntlm",
  "ntlm-wb",
  "no-ntlm-wb",

  "unix-socket",
  "abstract-unix-socket",

  "max-time",

  "location",
  "no-location",
  "location-trusted",
  "no-location-trusted",

  "upload-file",
  "output",

  "form",
  "form-string",
]);

// https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
type BodyFormat =
  | "form-urlencoded"
  | "json"
  | "raw" // default
  | "form-multipart";
type AnsibleForm = {
  [key: string]: {
    content?: string;
    filename?: string;
    mime_type?: string;
  };
};
type Body = QueryList | QueryDict | object | string | AnsibleForm;
type AnsibleURI = {
  url: string;
  method?: string;
  headers?: { [key: string]: string };
  body?: Body;
  body_format?: BodyFormat;
  src?: string; // shouldn't have body if has src
  dest?: string;

  url_username?: string;
  url_password?: string;
  force_basic_auth?: boolean;
  use_gssapi?: boolean;
  use_netrc?: boolean; // true

  // String won't work, it's in case we can't parse it as a number
  timeout?: number | string; // 30

  decompress?: boolean;
  follow_redirects?:
    | "all"
    | "no"
    | "none"
    | "safe" // default
    | "urllib2"
    | "yes";

  ca_path?: string;
  ciphers?: string;
  client_cert?: string;
  client_key?: string;
  validate_certs?: boolean;

  unix_socket?: string;
};

function getDataString(
  request: Request,
  warnings: Warnings,
): [Body, BodyFormat] | [string, "src"] | undefined {
  if (!request.data || !request.data.isString()) {
    return;
  }
  const data = request.data.toString();

  const contentType = request.headers.getContentType();
  // TODO: delete Content-Type header when it's what Ansible will send anyway
  // const exactContentType = request.headers.get("Content-Type");
  if (contentType === "application/json") {
    try {
      const dataAsJson = JSON.parse(data);
      // TODO: if doesn't roundtrip, add commented out raw string
      // TODO: we actually want to know how it's serialized by Ansible
      // const roundtrips = JSON.stringify(dataAsJson) === dataStr;
      return [dataAsJson, "json"];
    } catch {}
  } else if (contentType === "application/x-www-form-urlencoded") {
    if (
      request.dataArray &&
      request.dataArray.length === 1 &&
      !(request.dataArray[0] instanceof Word) &&
      !request.dataArray[0].name
    ) {
      const filetype = request.dataArray[0].filetype;
      const filename = request.dataArray[0].filename.toString();
      // TODO: and newlines have to be stripped for others
      if (filetype === "urlencode") {
        // TODO: or the other ones don't need to be?
        warnings.push([
          "urlencoded-file",
          "the file needs to be urlencoded: " + JSON.stringify(filename),
        ]);
      }
      return [filename, "src"];
    }
    const [queryList, queryDict] = parseQueryString(request.data);
    if (queryDict) {
      return [
        Object.fromEntries(
          queryDict.map((q) => [
            q[0].toString(),
            Array.isArray(q[1])
              ? q[1].map((qv) => qv.toString())
              : q[1].toString(),
          ]),
        ),
        "form-urlencoded",
      ];
    }
    if (queryList) {
      return [
        queryList.map((q) => [q[0].toString(), q[1].toString()]),
        "form-urlencoded",
      ];
    }
  }
  return;
}

export function _toAnsible(
  requests: Request[],
  warnings: Warnings = [],
): string {
  // Only supported if there's one file and nothing else
  const request = getFirst(requests, warnings, { dataReadsFile: true });
  if (
    request.dataReadsFile &&
    request.dataArray &&
    (request.dataArray.length > 1 ||
      (!(request.dataArray[0] instanceof Word) && request.dataArray[0].name))
  ) {
    warnings.push([
      "unsafe-data",
      "the generated body is wrong, " +
        JSON.stringify("@" + request.dataReadsFile) +
        " means read the file " +
        JSON.stringify(request.dataReadsFile),
    ]);
  }

  const r: AnsibleURI = {
    url: request.urls[0].url.toString(),
    method: request.urls[0].method.toString(),
  };
  if (request.multipartUploads) {
    const form: AnsibleForm = {};
    for (const m of request.multipartUploads) {
      // TODO: can't have duplicate keys
      const name = m.name.toString();
      form[name] = {};
      if ("content" in m) {
        form[name].content = m.content.toString();
      } else {
        // TODO: get basename
        form[name].filename = m.contentFile.toString();
        if (m.filename && !eq(m.filename, m.contentFile)) {
          warnings.push([
            "multipart-fake-filename",
            // TODO: check if this is true, the only source is it's not in the example
            // https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html#examples
            "Ansible doesn't allow reading from a file and changing the sent filename: " +
              JSON.stringify(m.contentFile.toString()),
          ]);
        }
      }
      if ("contentType" in m && m.contentType) {
        form[name].mime_type = m.contentType.toString();
      }
    }
    r.body = form;
    r.body_format = "form-multipart";
  } else if (request.data) {
    const d = getDataString(request, warnings);
    if (d) {
      const [body, format] = d;
      if (format === "src") {
        r.src = body;
      } else {
        r.body = body;
        if (format !== "raw") {
          r.body_format = format;
        }
      }
    } else {
      r.body = request.data.toString();
    }
  } else if (request.urls[0].uploadFile) {
    r.src = request.urls[0].uploadFile.toString();
  }
  if (request.urls[0].output) {
    r.dest = request.urls[0].output.toString();
  }

  if (request.headers.length) {
    r.headers = {};
    for (const h of request.headers) {
      const [k, v] = h;
      if (v !== null) {
        r.headers[k.toString()] = v.toString();
      }
    }
  }
  if (request.urls[0].auth) {
    const [username, password] = request.urls[0].auth;
    if (username.toBool()) {
      r.url_username = username.toString();
    }
    if (password.toBool()) {
      r.url_password = password.toString();
    }
  }
  // No idea if this stuff is correct
  switch (request.authType) {
    case "basic":
      // TODO: if --basic explicitly passed, set this?
      // r.force_basic_auth = true;
      break;
    case "negotiate":
      r.use_gssapi = true;
      break;
    case "ntlm":
    case "ntlm-wb":
      // https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html#parameter-use_gssapi
      warnings.push(["ntlm", "Ansible doesn't support NTLM authentication."]);
      break;
  }

  if (request.cacert) {
    r.ca_path = request.cacert.toString();
  }
  if (request.cert) {
    // TODO: might have password
    const [cert, password] = request.cert;
    r.client_cert = cert.toString();
    if (password) {
      warnings.push([
        "cert-password",
        "Ansible does not support client certificate passwords: " +
          JSON.stringify(password.toString()),
      ]);
    }
  }
  if (request.key) {
    r.client_key = request.key.toString();
  }
  if (request.ciphers) {
    r.ciphers = request.ciphers.toString();
  }
  if (request.insecure) {
    r.validate_certs = false;
  }
  if (request.netrc === "ignored") {
    r.use_netrc = false;
  }

  if (request.compressed === false) {
    r.decompress = false;
  }
  // curl defaults to not following redirects, Ansible defaults to following
  // safe redirects. Don't change that default unless it's explicitly set.
  if (request.followRedirects === false) {
    r.follow_redirects = "none";
  } else if (request.followRedirects === true) {
    // curl will follow redirects to a different host but not send credentials
    // Ansible will only follow redirects for GET or HEAD to the same host
    r.follow_redirects = request.followRedirectsTrusted ? "all" : "safe";
  }

  if (request.timeout) {
    const timeoutStr = request.timeout.toString();
    const timeoutInt = parseInt(timeoutStr); // TODO: warn if wasn't int

    if (isNaN(timeoutInt)) {
      r.timeout = timeoutStr;
      warnings.push([
        "ansible-timeout-not-int",
        "couldn't parse timeout as an integer: " + JSON.stringify(timeoutStr),
      ]);
    } else {
      r.timeout = timeoutInt;
    }

    warnings.push([
      "ansible-timeout",
      "Ansible's timeout is socket-level but curl's is for the entire request.",
    ]);
  }

  if (request.unixSocket) {
    r.unix_socket = request.unixSocket.toString();
  }

  return yaml.stringify(
    [
      {
        name: request.urls[0].urlWithoutQueryList.toString(),
        uri: r,
        register: "result",
      },
    ],
    100,
    2,
  );
}
export function toAnsibleWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const ansible = _toAnsible(requests, warnings);
  return [ansible, warnings];
}
export function toAnsible(curlCommand: string | string[]): string {
  return toAnsibleWarn(curlCommand)[0];
}
