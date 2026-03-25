export const BITS = 128;
export const GROUPS = 8;

/**
 * Represents IPv6 address scopes
 * @memberof Address6
 * @static
 */
export const SCOPES: { [key: number]: string | undefined } = {
  0: 'Reserved',
  1: 'Interface local',
  2: 'Link local',
  4: 'Admin local',
  5: 'Site local',
  8: 'Organization local',
  14: 'Global',
  15: 'Reserved',
} as const;

/**
 * Represents IPv6 address types
 * @memberof Address6
 * @static
 */
export const TYPES: { [key: string]: string | undefined } = {
  'ff01::1/128': 'Multicast (All nodes on this interface)',
  'ff01::2/128': 'Multicast (All routers on this interface)',
  'ff02::1/128': 'Multicast (All nodes on this link)',
  'ff02::2/128': 'Multicast (All routers on this link)',
  'ff05::2/128': 'Multicast (All routers in this site)',
  'ff02::5/128': 'Multicast (OSPFv3 AllSPF routers)',
  'ff02::6/128': 'Multicast (OSPFv3 AllDR routers)',
  'ff02::9/128': 'Multicast (RIP routers)',
  'ff02::a/128': 'Multicast (EIGRP routers)',
  'ff02::d/128': 'Multicast (PIM routers)',
  'ff02::16/128': 'Multicast (MLDv2 reports)',
  'ff01::fb/128': 'Multicast (mDNSv6)',
  'ff02::fb/128': 'Multicast (mDNSv6)',
  'ff05::fb/128': 'Multicast (mDNSv6)',
  'ff02::1:2/128': 'Multicast (All DHCP servers and relay agents on this link)',
  'ff05::1:2/128': 'Multicast (All DHCP servers and relay agents in this site)',
  'ff02::1:3/128': 'Multicast (All DHCP servers on this link)',
  'ff05::1:3/128': 'Multicast (All DHCP servers in this site)',
  '::/128': 'Unspecified',
  '::1/128': 'Loopback',
  'ff00::/8': 'Multicast',
  'fe80::/10': 'Link-local unicast',
} as const;

/**
 * A regular expression that matches bad characters in an IPv6 address
 * @memberof Address6
 * @static
 */
export const RE_BAD_CHARACTERS = /([^0-9a-f:/%])/gi;

/**
 * A regular expression that matches an incorrect IPv6 address
 * @memberof Address6
 * @static
 */
export const RE_BAD_ADDRESS = /([0-9a-f]{5,}|:{3,}|[^:]:$|^:[^:]|\/$)/gi;

/**
 * A regular expression that matches an IPv6 subnet
 * @memberof Address6
 * @static
 */
export const RE_SUBNET_STRING = /\/\d{1,3}(?=%|$)/;

/**
 * A regular expression that matches an IPv6 zone
 * @memberof Address6
 * @static
 */
export const RE_ZONE_STRING = /%.*$/;

export const RE_URL = /^\[{0,1}([0-9a-f:]+)\]{0,1}/;
export const RE_URL_WITH_PORT = /\[([0-9a-f:]+)\]:([0-9]{1,5})/;
