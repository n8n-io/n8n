import { Word, eq, mergeWords } from "../shell/Word.js";
import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../parse.js";
import type { Request, Warnings } from "../parse.js";
import type { DataParam } from "../Request.js";

export const supportedArgs = new Set([
  ...COMMON_SUPPORTED_ARGS,
  // TODO
  // "form",
  // "form-string",
  "max-time",
]);

// Presumably the same as C strings
// https://en.wikipedia.org/wiki/Escape_sequences_in_C#Table_of_escape_sequences
const regexEscape = /"|\\|\p{C}|[^ \P{Z}]/gu;
export function reprStr(s: string): string {
  return (
    '@"' +
    s.replace(regexEscape, (c: string) => {
      switch (c) {
        case "\x07":
          return "\\a";
        case "\b":
          return "\\b";
        case "\f":
          return "\\f";
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\t":
          return "\\t";
        case "\v":
          return "\\v";
        case "\\":
          return "\\\\";
        case '"':
          return '\\"';
      }
      const hex = (c.codePointAt(0) as number).toString(16);
      if (hex.length <= 2) {
        return "\\x" + hex.padStart(2, "0");
      }
      if (hex.length <= 4) {
        return "\\u" + hex.padStart(4, "0");
      }
      return "\\U" + hex.padStart(8, "0");
    }) +
    '"'
  );
}

export function repr(w: Word): string {
  const args: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      args.push(reprStr(t));
    } else if (t.type === "variable") {
      // TODO: turns into "(null)" if variable doesn't exist
      args.push(
        "[[[NSProcessInfo processInfo] environment] objectForKey:" +
          reprStr(t.value) +
          "]",
      );
    } else if (t.type === "command") {
      // TODO: doesn't return the output
      args.push("system(" + reprStr(t.value) + ")");
    }
  }
  if (args.length === 1) {
    return args[0];
  }
  // This is how you concatenate strings in Objective-C.
  return (
    '[NSString stringWithFormat:@"' +
    "%@".repeat(args.length) +
    '", ' +
    args.join(", ") +
    "]"
  );
}

const reservedHeaders = [
  "Content-Length",
  "Authorization",
  "Connection",
  "Host",
  "Proxy-Authenticate",
  "Proxy-Authorization",
  "WWW-Authenticate",
].map((h) => h.toLowerCase());

export function _toObjectiveC(
  requests: Request[],
  warnings: Warnings = [],
): string {
  const request = getFirst(requests, warnings, { dataReadsFile: true });
  let code = "";
  code += "#import <Foundation/Foundation.h>\n";
  code += "\n";
  code +=
    "NSURL *url = [NSURL URLWithString:" + repr(request.urls[0].url) + "];\n";

  if (request.urls[0].auth) {
    const [user, password] = request.urls[0].auth;

    code += "\n";
    code +=
      'NSString *credentials = [NSString stringWithFormat:@"%@:%@", ' +
      repr(user) +
      ", " +
      repr(password) +
      "];\n";
    code +=
      "NSData *credentialsData = [credentials dataUsingEncoding:NSUTF8StringEncoding];\n";
    code +=
      "NSString *base64Credentials = [credentialsData base64EncodedStringWithOptions:0];\n";
  }

  if (request.headers.length || request.urls[0].auth) {
    const headerLines = [];
    for (const [key, value] of request.headers) {
      if (value === null) {
        continue;
      }
      if (
        key.isString() &&
        reservedHeaders.includes(key.toLowerCase().toString())
      ) {
        warnings.push([
          "reserved-header",
          key.toString() + " is a reserved header",
        ]);
      }
      headerLines.push("    " + repr(key) + ": " + repr(value));
    }
    if (request.urls[0].auth) {
      warnings.push(["reserved-header", "Authorization is a reserved header"]);
      headerLines.push(
        '    @"Authorization": [NSString stringWithFormat:@"Basic %@", base64Credentials]',
      );
    }
    if (headerLines.length) {
      code += "NSDictionary *headers = @{\n";
      code += headerLines.join(",\n") + "\n";
      code += "};\n";
      code += "\n";
    }
  }

  let hasData = false;
  let hasDataStream = false;
  if (request.urls[0].uploadFile) {
    code +=
      "InputStream *dataStream = [InputStream fileAtPath:" +
      // TODO: might need processing
      repr(request.urls[0].uploadFile) +
      "];";
    hasDataStream = true;
  } else if (request.multipartUploads) {
    // TODO
  } else if (request.dataArray && request.dataArray.length >= 1) {
    if (
      request.dataArray.length === 1 &&
      !(request.dataArray[0] instanceof Word) &&
      !request.dataArray[0].name
    ) {
      // TODO: urlencode if necessary
      code +=
        "InputStream *dataStream = [InputStream fileAtPath:" +
        repr(request.dataArray[0].filename) +
        "];";
      hasDataStream = true;
    } else {
      const parts = [];
      if (
        request.dataArray.length === 1 &&
        request.dataArray[0] instanceof Word
      ) {
        const entries = request.dataArray[0].split("&");
        for (const [i, entry] of entries.entries()) {
          const newEntry = i === 0 ? entry : entry.prepend("&");
          parts.push(repr(newEntry));
        }
      } else {
        // TODO: this can be better
        const entries: DataParam[] = [];
        for (const d of request.dataArray) {
          if (d instanceof Word) {
            entries.push(d);
          } else {
            if (d.name) {
              const name = d.name.append("=");
              const lastEntry = entries[entries.length - 1];
              if (entries.length && lastEntry instanceof Word) {
                entries[entries.length - 1] = mergeWords(lastEntry, name);
              } else {
                entries.push(name);
              }
            }
            entries.push(d);
          }
        }
        for (const entry of entries) {
          if (entry instanceof Word) {
            parts.push(repr(entry));
          } else {
            // TODO: handle file type
            parts.push(
              "[NSString stringWithContentsOfFile:" +
                repr(entry.filename) +
                " encoding:NSUTF8StringEncoding error:nil];",
            );
          }
        }
      }

      const [firstPart, ...restParts] = parts;
      code +=
        "NSMutableData *data = [[NSMutableData alloc] initWithData:[" +
        firstPart +
        " dataUsingEncoding:NSUTF8StringEncoding]];\n";
      for (const part of restParts) {
        code +=
          "[data appendData:[" +
          part +
          " dataUsingEncoding:NSUTF8StringEncoding]];\n";
      }
      code += "\n";
      hasData = true;
    }
  }
  if (
    request.timeout &&
    !eq(request.timeout, "60") &&
    !eq(request.timeout, "60.0")
  ) {
    code +=
      "NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url\n";
    code +=
      "                                                          cachePolicy:NSURLRequestUseProtocolCachePolicy\n";
    code +=
      "                                                      timeoutInterval:" +
      // TODO: verify/escape or parse
      request.timeout.toString() +
      "];\n";
  } else {
    code +=
      "NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];\n";
  }

  if (!eq(request.urls[0].method, "GET")) {
    code += "[request setHTTPMethod:" + repr(request.urls[0].method) + "];\n";
  }
  if (request.headers.length || request.urls[0].auth) {
    code += "[request setAllHTTPHeaderFields:headers];\n";
  }
  if (hasData) {
    code += "[request setHTTPBody:data];\n";
  } else if (hasDataStream) {
    // TODO: does this work?
    code += "[request setHTTPBodyStream:dataStream];\n";
  }

  code += "\n";
  // TODO: TLSMinimumSupportedProtocolVersion
  code +=
    "NSURLSessionConfiguration *defaultSessionConfiguration = [NSURLSessionConfiguration defaultSessionConfiguration];\n";
  code +=
    "NSURLSession *session = [NSURLSession sessionWithConfiguration:defaultSessionConfiguration];\n";
  code +=
    "NSURLSessionDataTask *dataTask = [session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {\n";
  code += "    if (error) {\n";
  code += '        NSLog(@"%@", error);\n';
  code += "    } else {\n";
  code +=
    "        NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *) response;\n";
  code += '        NSLog(@"%@", httpResponse);\n';
  code += "    }\n";
  code += "}];\n";
  code += "[dataTask resume];\n";

  return code;
}

export function toObjectiveCWarn(
  curlCommand: string | string[],
  warnings: Warnings = [],
): [string, Warnings] {
  const requests = parse(curlCommand, supportedArgs, warnings);
  const code = _toObjectiveC(requests, warnings);
  return [code, warnings];
}
export function toObjectiveC(curlCommand: string | string[]): string {
  return toObjectiveCWarn(curlCommand)[0];
}
