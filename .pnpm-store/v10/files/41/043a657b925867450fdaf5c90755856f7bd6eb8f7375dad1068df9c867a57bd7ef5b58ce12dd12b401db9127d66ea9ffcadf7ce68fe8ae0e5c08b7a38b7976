import { Address4 } from './ipv4';
import { Address6 } from './ipv6';

export interface ReverseFormOptions {
  omitSuffix?: boolean;
}

export function isInSubnet(this: Address4 | Address6, address: Address4 | Address6) {
  if (this.subnetMask < address.subnetMask) {
    return false;
  }

  if (this.mask(address.subnetMask) === address.mask()) {
    return true;
  }

  return false;
}

export function isCorrect(defaultBits: number) {
  return function (this: Address4 | Address6) {
    if (this.addressMinusSuffix !== this.correctForm()) {
      return false;
    }

    if (this.subnetMask === defaultBits && !this.parsedSubnet) {
      return true;
    }

    return this.parsedSubnet === String(this.subnetMask);
  };
}
