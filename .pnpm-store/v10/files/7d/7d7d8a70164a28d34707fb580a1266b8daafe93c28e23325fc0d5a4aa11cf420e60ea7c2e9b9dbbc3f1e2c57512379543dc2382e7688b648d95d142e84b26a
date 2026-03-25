// src/utils/ipaddr.ts
var expandIPv6 = (ipV6) => {
  const sections = ipV6.split(":");
  if (IPV4_REGEX.test(sections.at(-1))) {
    sections.splice(
      -1,
      1,
      ...convertIPv6BinaryToString(convertIPv4ToBinary(sections.at(-1))).substring(2).split(":")
      // => ['7f00', '0001']
    );
  }
  for (let i = 0; i < sections.length; i++) {
    const node = sections[i];
    if (node !== "") {
      sections[i] = node.padStart(4, "0");
    } else {
      sections[i + 1] === "" && sections.splice(i + 1, 1);
      sections[i] = new Array(8 - sections.length + 1).fill("0000").join(":");
    }
  }
  return sections.join(":");
};
var IPV4_OCTET_PART = "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])";
var IPV4_REGEX = new RegExp(`^(?:${IPV4_OCTET_PART}\\.){3}${IPV4_OCTET_PART}$`);
var distinctRemoteAddr = (remoteAddr) => {
  if (IPV4_REGEX.test(remoteAddr)) {
    return "IPv4";
  }
  if (remoteAddr.includes(":")) {
    return "IPv6";
  }
};
var convertIPv4ToBinary = (ipv4) => {
  const parts = ipv4.split(".");
  let result = 0n;
  for (let i = 0; i < 4; i++) {
    result <<= 8n;
    result += BigInt(parts[i]);
  }
  return result;
};
var convertIPv6ToBinary = (ipv6) => {
  const sections = expandIPv6(ipv6).split(":");
  let result = 0n;
  for (let i = 0; i < 8; i++) {
    result <<= 16n;
    result += BigInt(parseInt(sections[i], 16));
  }
  return result;
};
var convertIPv4BinaryToString = (ipV4) => {
  const sections = [];
  for (let i = 0; i < 4; i++) {
    sections.push(ipV4 >> BigInt(8 * (3 - i)) & 0xffn);
  }
  return sections.join(".");
};
var convertIPv6BinaryToString = (ipV6) => {
  if (ipV6 >> 32n === 0xffffn) {
    return `::ffff:${convertIPv4BinaryToString(ipV6 & 0xffffffffn)}`;
  }
  const sections = [];
  for (let i = 0; i < 8; i++) {
    sections.push((ipV6 >> BigInt(16 * (7 - i)) & 0xffffn).toString(16));
  }
  let currentZeroStart = -1;
  let maxZeroStart = -1;
  let maxZeroEnd = -1;
  for (let i = 0; i < 8; i++) {
    if (sections[i] === "0") {
      if (currentZeroStart === -1) {
        currentZeroStart = i;
      }
    } else {
      if (currentZeroStart > -1) {
        if (i - currentZeroStart > maxZeroEnd - maxZeroStart) {
          maxZeroStart = currentZeroStart;
          maxZeroEnd = i;
        }
        currentZeroStart = -1;
      }
    }
  }
  if (currentZeroStart > -1) {
    if (8 - currentZeroStart > maxZeroEnd - maxZeroStart) {
      maxZeroStart = currentZeroStart;
      maxZeroEnd = 8;
    }
  }
  if (maxZeroStart !== -1) {
    sections.splice(maxZeroStart, maxZeroEnd - maxZeroStart, ":");
  }
  return sections.join(":").replace(/:{2,}/g, "::");
};
export {
  convertIPv4BinaryToString,
  convertIPv4ToBinary,
  convertIPv6BinaryToString,
  convertIPv6ToBinary,
  distinctRemoteAddr,
  expandIPv6
};
