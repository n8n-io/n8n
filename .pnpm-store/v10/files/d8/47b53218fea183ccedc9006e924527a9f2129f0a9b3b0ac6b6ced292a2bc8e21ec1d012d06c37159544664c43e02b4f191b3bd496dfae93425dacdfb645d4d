Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

// Vendored / modified from @sergiodxa/remix-utils

// https://github.com/sergiodxa/remix-utils/blob/02af80e12829a53696bfa8f3c2363975cf59f55e/src/server/get-client-ip-address.ts
// MIT License

// Copyright (c) 2021 Sergio Xalambrí

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// The headers to check, in priority order
const ipHeaderNames = [
  'X-Client-IP',
  'X-Forwarded-For',
  'Fly-Client-IP',
  'CF-Connecting-IP',
  'Fastly-Client-Ip',
  'True-Client-Ip',
  'X-Real-IP',
  'X-Cluster-Client-IP',
  'X-Forwarded',
  'Forwarded-For',
  'Forwarded',
  'X-Vercel-Forwarded-For',
];

/**
 * Get the IP address of the client sending a request.
 *
 * It receives a Request headers object and use it to get the
 * IP address from one of the following headers in order.
 *
 * If the IP address is valid, it will be returned. Otherwise, null will be
 * returned.
 *
 * If the header values contains more than one IP address, the first valid one
 * will be returned.
 */
function getClientIPAddress(headers) {
  // Build a map of lowercase header names to their values for case-insensitive lookup
  // This is needed because headers from different sources may have different casings
  const lowerCaseHeaders = {};

  for (const key of Object.keys(headers)) {
    lowerCaseHeaders[key.toLowerCase()] = headers[key];
  }

  // This will end up being Array<string | string[] | undefined | null> because of the various possible values a header
  // can take
  const headerValues = ipHeaderNames.map((headerName) => {
    const rawValue = lowerCaseHeaders[headerName.toLowerCase()];
    const value = Array.isArray(rawValue) ? rawValue.join(';') : rawValue;

    if (headerName === 'Forwarded') {
      return parseForwardedHeader(value);
    }

    return value?.split(',').map((v) => v.trim());
  });

  // Flatten the array and filter out any falsy entries
  const flattenedHeaderValues = headerValues.reduce((acc, val) => {
    if (!val) {
      return acc;
    }

    return acc.concat(val);
  }, []);

  // Find the first value which is a valid IP address, if any
  const ipAddress = flattenedHeaderValues.find(ip => ip !== null && isIP(ip));

  return ipAddress || null;
}

function parseForwardedHeader(value) {
  if (!value) {
    return null;
  }

  for (const part of value.split(';')) {
    if (part.startsWith('for=')) {
      return part.slice(4);
    }
  }

  return null;
}

//
/**
 * Custom method instead of importing this from `net` package, as this only exists in node
 * Accepts:
 * 127.0.0.1
 * 192.168.1.1
 * 192.168.1.255
 * 255.255.255.255
 * 10.1.1.1
 * 0.0.0.0
 * 2b01:cb19:8350:ed00:d0dd:fa5b:de31:8be5
 *
 * Rejects:
 * 1.1.1.01
 * 30.168.1.255.1
 * 127.1
 * 192.168.1.256
 * -1.2.3.4
 * 1.1.1.1.
 * 3...3
 * 192.168.1.099
 */
function isIP(str) {
  const regex =
    /(?:^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$)|(?:^(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?$)/;
  return regex.test(str);
}

exports.getClientIPAddress = getClientIPAddress;
exports.ipHeaderNames = ipHeaderNames;
//# sourceMappingURL=getIpAddress.js.map
