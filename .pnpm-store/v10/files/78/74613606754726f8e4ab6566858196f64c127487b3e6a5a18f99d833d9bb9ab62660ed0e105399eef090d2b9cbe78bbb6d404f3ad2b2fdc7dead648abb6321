import { DownloadError } from './download-error';

/**
 * Validates that a URL is safe to download from, blocking private/internal addresses
 * to prevent SSRF attacks.
 *
 * @param url - The URL string to validate.
 * @throws DownloadError if the URL is unsafe.
 */
export function validateDownloadUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DownloadError({
      url,
      message: `Invalid URL: ${url}`,
    });
  }

  // Only allow http and https protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new DownloadError({
      url,
      message: `URL scheme must be http or https, got ${parsed.protocol}`,
    });
  }

  const hostname = parsed.hostname;

  // Block empty hostname
  if (!hostname) {
    throw new DownloadError({
      url,
      message: `URL must have a hostname`,
    });
  }

  // Block localhost and .local domains
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost')
  ) {
    throw new DownloadError({
      url,
      message: `URL with hostname ${hostname} is not allowed`,
    });
  }

  // Check for IPv6 addresses (enclosed in brackets in URLs)
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const ipv6 = hostname.slice(1, -1);
    if (isPrivateIPv6(ipv6)) {
      throw new DownloadError({
        url,
        message: `URL with IPv6 address ${hostname} is not allowed`,
      });
    }
    return;
  }

  // Check for IPv4 addresses
  if (isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new DownloadError({
        url,
        message: `URL with IP address ${hostname} is not allowed`,
      });
    }
    return;
  }
}

function isIPv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    const num = Number(part);
    return (
      Number.isInteger(num) && num >= 0 && num <= 255 && String(num) === part
    );
  });
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 169.254.0.0/16
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1 (loopback)
  if (normalized === '::1') return true;
  // :: (unspecified)
  if (normalized === '::') return true;

  // Check for IPv4-mapped addresses (::ffff:x.x.x.x or ::ffff:HHHH:HHHH)
  if (normalized.startsWith('::ffff:')) {
    const mappedPart = normalized.slice(7);
    // Dotted-decimal form: ::ffff:127.0.0.1
    if (isIPv4(mappedPart)) {
      return isPrivateIPv4(mappedPart);
    }
    // Hex form: ::ffff:7f00:1 (URL parser normalizes to this)
    const hexParts = mappedPart.split(':');
    if (hexParts.length === 2) {
      const high = parseInt(hexParts[0], 16);
      const low = parseInt(hexParts[1], 16);
      if (!isNaN(high) && !isNaN(low)) {
        const a = (high >> 8) & 0xff;
        const b = high & 0xff;
        const c = (low >> 8) & 0xff;
        const d = low & 0xff;
        return isPrivateIPv4(`${a}.${b}.${c}.${d}`);
      }
    }
  }

  // fc00::/7 (unique local addresses - fc00:: and fd00::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // fe80::/10 (link-local)
  if (normalized.startsWith('fe80')) return true;

  return false;
}
